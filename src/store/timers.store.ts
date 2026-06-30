import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  cancelTimerNotification,
  scheduleTimerDone,
} from "@/services/notifications";

// ─────────────────────────────────────────────────────────────────────────────
// Multi-timer engine for Cooking Mode.
//
// Timers are decoupled from the current step so several can run at once (rice +
// chicken + sauce). Each timer stores wall-clock anchors (`startedAt`,
// `pausedElapsedSec`) rather than a ticking number, so remaining time is always
// recomputed from `Date.now()` — surviving backgrounding and app kill. Persisted
// to AsyncStorage; reconciled on rehydrate so timers that finished while away are
// marked done.
// ─────────────────────────────────────────────────────────────────────────────

export type TimerStatus = "paused" | "running" | "done";

export interface CookTimer {
  id: string;
  label: string;
  durationSec: number; // total length (grows with +1 min)
  startedAt: number | null; // wall-clock ms of the current running stretch
  pausedElapsedSec: number; // elapsed accumulated before the current stretch
  status: TimerStatus;
  notificationId: string | null;
  recipeId: string | null;
  stepIndex: number | null; // step it was auto-created from (null = manual/ChefBoo)
  createdAt: number;
}

/** Remaining seconds for a timer, computed from wall-clock `now` (defaults Date.now()). */
export function remainingSec(t: CookTimer, now: number = Date.now()): number {
  if (t.status === "done") return 0;
  const liveElapsed =
    t.status === "running" && t.startedAt != null
      ? (now - t.startedAt) / 1000
      : 0;
  const elapsed = t.pausedElapsedSec + liveElapsed;
  return Math.max(0, Math.round(t.durationSec - elapsed));
}

interface AddTimerInput {
  label: string;
  durationSec: number;
  recipeId?: string | null;
  stepIndex?: number | null;
}

interface TimersState {
  timers: CookTimer[];
  addTimer: (input: AddTimerInput) => string;
  start: (id: string) => Promise<void>;
  pause: (id: string) => Promise<void>;
  reset: (id: string) => Promise<void>;
  addMinute: (id: string) => Promise<void>;
  markDone: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  /** Mark any running timers that already elapsed as done (on resume/rehydrate). */
  reconcile: () => void;
}

const genId = () => `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useTimersStore = create<TimersState>()(
  persist(
    (set, get) => ({
      timers: [],

      addTimer: ({ label, durationSec, recipeId = null, stepIndex = null }) => {
        const id = genId();
        const timer: CookTimer = {
          id,
          label,
          durationSec: Math.max(1, Math.round(durationSec)),
          startedAt: null,
          pausedElapsedSec: 0,
          status: "paused",
          notificationId: null,
          recipeId,
          stepIndex,
          createdAt: Date.now(),
        };
        set((s) => ({ timers: [...s.timers, timer] }));
        return id;
      },

      start: async (id) => {
        const t = get().timers.find((x) => x.id === id);
        if (!t || t.status === "running") return;

        const remaining = remainingSec(t);
        if (remaining <= 0) {
          await get().markDone(id);
          return;
        }

        const startedAt = Date.now();
        set((s) => ({
          timers: s.timers.map((x) =>
            x.id === id ? { ...x, status: "running", startedAt } : x,
          ),
        }));

        const notificationId = await scheduleTimerDone(t.label, remaining);
        set((s) => ({
          timers: s.timers.map((x) =>
            x.id === id ? { ...x, notificationId } : x,
          ),
        }));
      },

      pause: async (id) => {
        const t = get().timers.find((x) => x.id === id);
        if (!t || t.status !== "running") return;

        const elapsed = t.durationSec - remainingSec(t); // clamped 0..durationSec
        await cancelTimerNotification(t.notificationId);
        set((s) => ({
          timers: s.timers.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "paused",
                  startedAt: null,
                  pausedElapsedSec: elapsed,
                  notificationId: null,
                }
              : x,
          ),
        }));
      },

      reset: async (id) => {
        const t = get().timers.find((x) => x.id === id);
        if (!t) return;
        await cancelTimerNotification(t.notificationId);
        set((s) => ({
          timers: s.timers.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "paused",
                  startedAt: null,
                  pausedElapsedSec: 0,
                  notificationId: null,
                }
              : x,
          ),
        }));
      },

      addMinute: async (id) => {
        const t = get().timers.find((x) => x.id === id);
        if (!t) return;
        const newDuration = t.durationSec + 60;
        set((s) => ({
          timers: s.timers.map((x) =>
            x.id === id ? { ...x, durationSec: newDuration } : x,
          ),
        }));

        // If running, reschedule the completion notification for the new remaining.
        if (t.status === "running") {
          await cancelTimerNotification(t.notificationId);
          const updated = get().timers.find((x) => x.id === id);
          const remaining = updated ? remainingSec(updated) : 0;
          const notificationId = await scheduleTimerDone(t.label, remaining);
          set((s) => ({
            timers: s.timers.map((x) =>
              x.id === id ? { ...x, notificationId } : x,
            ),
          }));
        }
      },

      markDone: async (id) => {
        const t = get().timers.find((x) => x.id === id);
        if (!t) return;
        await cancelTimerNotification(t.notificationId);
        set((s) => ({
          timers: s.timers.map((x) =>
            x.id === id
              ? { ...x, status: "done", startedAt: null, notificationId: null }
              : x,
          ),
        }));
      },

      remove: async (id) => {
        const t = get().timers.find((x) => x.id === id);
        if (t) await cancelTimerNotification(t.notificationId);
        set((s) => ({ timers: s.timers.filter((x) => x.id !== id) }));
      },

      clearAll: async () => {
        await Promise.all(
          get().timers.map((t) => cancelTimerNotification(t.notificationId)),
        );
        set({ timers: [] });
      },

      reconcile: () => {
        const now = Date.now();
        set((s) => ({
          timers: s.timers.map((t) =>
            t.status === "running" && remainingSec(t, now) <= 0
              ? { ...t, status: "done", startedAt: null }
              : t,
          ),
        }));
      },
    }),
    {
      name: "flavourflow-cooking-timers",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Timers that finished while the app was killed → mark done on load.
        state?.reconcile();
      },
    },
  ),
);
