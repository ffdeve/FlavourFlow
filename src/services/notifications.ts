import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
// Cooking-timer notifications.
//
// Mechanism (the only background-safe way on iOS): when a timer starts we schedule
// a local notification for its finish time up-front. The on-screen countdown only
// ticks live in the foreground; remaining time is always recomputed from wall-clock.
// Pausing/resetting/finishing-early cancels (and re-scheduling reschedules) it.
//
// Foreground vs background presentation: the handler SUPPRESSES the banner while the
// app is active (the in-app alarm — sound + haptics + banner — covers it) but still
// plays the sound, so there's no duplicate banner. When backgrounded/locked the OS
// presents the notification normally (the handler isn't consulted).
// ─────────────────────────────────────────────────────────────────────────────

export const TIMER_CHANNEL_ID = "cooking-timers";

let configured = false;


/**
 * One-time setup: notification handler (above), Android channel, and permission.
 * Safe to call repeatedly — the heavy work runs once. Returns whether the user
 * granted permission (timers still run in-app without it, just no background alert).
 */
export async function ensureNotificationSetup(): Promise<boolean> {
  try {
    // Set handler once, safely inside a called function (not at module load)
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        const active = AppState.currentState === "active";
        return {
          shouldShowBanner: !active,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      },
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(TIMER_CHANNEL_ID, {
        name: "Cooking Timers",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    configured = true;
    return status === "granted";
  } catch (e) {
    console.error("ensureNotificationSetup failed:", e);
    return false;
  }
}

export function isNotificationConfigured(): boolean {
  return configured;
}

/** Internal: schedule one notification `secondsFromNow`. Returns id or null. */
async function scheduleAt(
  title: string,
  body: string,
  secondsFromNow: number,
): Promise<string | null> {
  try {
    if (secondsFromNow <= 0) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "default" },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(secondsFromNow)),
        ...(Platform.OS === "android" ? { channelId: TIMER_CHANNEL_ID } : {}),
      },
    });
  } catch (e) {
    console.error("scheduleAt failed:", e);
    return null;
  }
}

/**
 * Schedule the "timer done" alert for `secondsFromNow` in the future.
 * Returns the notification id (to cancel/reschedule) or null on failure.
 */
export async function scheduleTimerDone(
  label: string,
  secondsFromNow: number,
): Promise<string | null> {
  return scheduleAt("Timer finished", `${label} is done.`, secondsFromNow);
}

/**
 * Adaptive schedule — denser warnings for longer timers, sparse for short ones:
 *   <5 min:        completion only
 *   5–30 min:      5 min left + completion
 *   30 min–2 hr:   5 min left + 1 min left + completion
 *   >2 hr:         30 min left + completion
 * `remainingSeconds` is the time left now (re-derived on every (re)start). Returns
 * all scheduled notification ids so the caller can cancel/reschedule the set.
 */
export async function scheduleAdaptiveTimer(
  label: string,
  remainingSeconds: number,
): Promise<string[]> {
  const total = Math.round(remainingSeconds);
  if (total <= 0) return [];

  // Warning offsets (seconds remaining) by tier.
  let warnAt: number[];
  if (total < 300) warnAt = [];
  else if (total < 1800) warnAt = [300];
  else if (total <= 7200) warnAt = [300, 60];
  else warnAt = [1800];

  const ids: string[] = [];
  for (const left of warnAt) {
    const fireIn = total - left;
    if (fireIn <= 0) continue; // already past this mark
    const mins = left >= 60 ? `${Math.round(left / 60)} min` : `${left} sec`;
    const id = await scheduleAt(
      "Almost done",
      `${mins} left on ${label}.`,
      fireIn,
    );
    if (id) ids.push(id);
  }

  const doneId = await scheduleAt("Timer finished", `${label} is done.`, total);
  if (doneId) ids.push(doneId);
  return ids;
}

/**
 * Present a "timer done" notification immediately. Used for the foreground case so
 * an audible cue plays even though the handler suppresses the foreground banner.
 */
export async function presentTimerDoneNow(label: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Timer finished",
        body: `${label} is done.`,
        sound: "default",
      },
      trigger: null,
    });
  } catch (e) {
    console.error("presentTimerDoneNow failed:", e);
  }
}

export async function cancelTimerNotification(
  id: string | string[] | null,
): Promise<void> {
  if (!id) return;
  const ids = Array.isArray(id) ? id : [id];
  await Promise.all(
    ids.map(async (one) => {
      if (!one) return;
      try {
        await Notifications.cancelScheduledNotificationAsync(one);
      } catch (e) {
        console.error("cancelTimerNotification failed:", e);
      }
    }),
  );
}
