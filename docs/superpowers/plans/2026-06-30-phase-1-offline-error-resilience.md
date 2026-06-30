# Phase 1 — Offline & Error Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gracefully handle no-network and server errors across the key data screens with a branded retry experience, using the existing `Network_Error.webp` / `Unknown_Error.webp` illustrations.

**Architecture:** One network hook (`useNetworkStatus`) wraps `@react-native-community/netinfo`. One reusable `<ErrorState>` component renders the offline/error illustration + retry. One `<OfflineBanner>` overlay mounts globally in the root layout. Data screens render `<ErrorState>` in place of content when a fetch fails, calling their existing refetch on retry.

**Tech Stack:** React Native, Expo SDK 54, NativeWind, expo-image, `@react-native-community/netinfo`, react-native-safe-area-context.

## Global Constraints

- **Style guide is law:** colors `#FBA82E` (primary), `#FFFDF5` (bg), `#3B3328` (charcoal), `#8B7D6F` (text-secondary). Fonts: `font-jakarta-bold` (titles), `font-jakarta-semibold` (buttons), `font-inter-regular`/`font-inter-medium` (body/meta). No emoji — use Feather/Ionicons.
- `CookingLoader` (`@/components/ui/cooking-loader`, props `{ scale?, isAnimating? }`) is the standard loading visual.
- Conventional commits; end messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Branch: `feat/app-completion`.
- **No test framework exists** in this repo. Verification = `npx tsc --noEmit` (no NEW type errors beyond the one known pre-existing `src/services/profile.service.ts:240` error, which Phase 2 fixes) + manual airplane-mode check. Do not scaffold Jest.

---

### Task 1: `useNetworkStatus` hook + install NetInfo

**Files:**
- Create: `src/hooks/useNetworkStatus.ts`
- Modify: `package.json` (via `expo install`)

**Interfaces:**
- Produces: `useNetworkStatus(): { isConnected: boolean; isInternetReachable: boolean }` and exported `interface NetworkStatus`.

- [ ] **Step 1: Install the Expo-compatible NetInfo**

Run:
```bash
cd /Users/azaxghulam/flavourflow
npx expo install @react-native-community/netinfo
```
Expected: package added to `package.json` at the SDK-54-compatible version; install completes.

- [ ] **Step 2: Create the hook**

Create `src/hooks/useNetworkStatus.ts`:
```tsx
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable:
          state.isInternetReachable ?? (state.isConnected ?? false),
      });
    });
    return () => unsubscribe();
  }, []);

  return status;
}
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit 2>&1 | grep -E "useNetworkStatus" || echo "hook OK"`
Expected: `hook OK` (no type errors in the new file).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/hooks/useNetworkStatus.ts
git commit -m "feat: add useNetworkStatus hook backed by NetInfo

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `<ErrorState>` reusable component

**Files:**
- Create: `src/components/ui/error-state.tsx`

**Interfaces:**
- Consumes: `CookingLoader` from `@/components/ui/cooking-loader`; assets `@/assets/images/Network_Error.webp`, `@/assets/images/Unknown_Error.webp`.
- Produces: `ErrorState({ variant?: "offline" | "error"; onRetry?: () => void | Promise<void>; retrying?: boolean })`.

- [ ] **Step 1: Create the component**

Create `src/components/ui/error-state.tsx`:
```tsx
import { CookingLoader } from "@/components/ui/cooking-loader";
import { Image } from "expo-image";
import { Text, TouchableOpacity, View } from "react-native";

const IMAGES = {
  offline: require("@/assets/images/Network_Error.webp"),
  error: require("@/assets/images/Unknown_Error.webp"),
};

const COPY = {
  offline: {
    title: "No Internet Connection",
    message: "Check your connection and try again — your recipes are waiting.",
  },
  error: {
    title: "Something Went Wrong",
    message: "We couldn't load this right now. Please try again in a moment.",
  },
};

interface ErrorStateProps {
  variant?: "offline" | "error";
  onRetry?: () => void | Promise<void>;
  retrying?: boolean;
}

export function ErrorState({
  variant = "error",
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  if (retrying) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFFDF5]">
        <CookingLoader scale={0.8} />
      </View>
    );
  }

  const copy = COPY[variant];

  return (
    <View className="flex-1 items-center justify-center bg-[#FFFDF5] px-8">
      <Image
        source={IMAGES[variant]}
        style={{ width: 200, height: 200, marginBottom: 24 }}
        contentFit="contain"
      />
      <Text className="text-[22px] font-jakarta-bold text-[#3B3328] text-center mb-2">
        {copy.title}
      </Text>
      <Text className="text-[15px] font-inter-regular text-text-secondary text-center mb-7 leading-5">
        {copy.message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.85}
          className="bg-primary rounded-full px-8 py-3.5"
          style={{
            shadowColor: "#FBA82E",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <Text className="text-white font-jakarta-semibold text-[15px]">
            Try Again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "error-state" || echo "ErrorState OK"`
Expected: `ErrorState OK`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/error-state.tsx
git commit -m "feat: add reusable ErrorState (offline/error) with retry

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Global `<OfflineBanner>` + mount in root layout

**Files:**
- Create: `src/components/ui/offline-banner.tsx`
- Modify: `src/app/_layout.tsx` (mount the banner inside the SafeAreaProvider tree, as an overlay sibling of the navigator)

**Interfaces:**
- Consumes: `useNetworkStatus`.
- Produces: `OfflineBanner` (no props) — renders nothing when connected.

- [ ] **Step 1: Create the banner**

Create `src/components/ui/offline-banner.tsx`:
```tsx
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (isConnected) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingTop: insets.top,
      }}
      className="bg-[#3B3328]"
    >
      <View className="flex-row items-center justify-center px-4 py-2">
        <Feather name="wifi-off" size={14} color="#FBA82E" />
        <Text className="ml-2 text-white font-inter-medium text-[13px]">
          You&apos;re offline — some features may not work
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Mount it in the root layout**

In `src/app/_layout.tsx`, locate the JSX returned from the root component (the tree containing `<Stack ...>` inside `<SafeAreaProvider>` / `<GestureHandlerRootView>`). Add the import at the top:
```tsx
import { OfflineBanner } from "@/components/ui/offline-banner";
```
Then render `<OfflineBanner />` as the LAST child inside the `<SafeAreaProvider>` (after the navigator/`<Stack>`), so it overlays all screens. Example shape:
```tsx
<GestureHandlerRootView style={{ flex: 1 }}>
  <SafeAreaProvider>
    <Stack screenOptions={{ headerShown: false }}>
      {/* ...existing screens... */}
    </Stack>
    <OfflineBanner />
  </SafeAreaProvider>
</GestureHandlerRootView>
```
(Match the existing wrapper components exactly — only add the `<OfflineBanner />` line and its import; do not restructure the rest.)

- [ ] **Step 3: Verify typecheck + manual offline check**

Run: `npx tsc --noEmit 2>&1 | grep -E "offline-banner|_layout" || echo "banner OK"`
Expected: `banner OK`.
Manual: run the app (`npm start`), enable airplane mode → a charcoal bar with "You're offline…" appears at the top; disable → it disappears.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/offline-banner.tsx src/app/_layout.tsx
git commit -m "feat: add global offline banner overlay in root layout

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Wire `<ErrorState>` into the four data screens

**Files:**
- Modify: `src/app/(tabs)/index.tsx` (home)
- Modify: `src/app/recipe-detail.tsx`
- Modify: `src/app/(tabs)/community.tsx`
- Modify: `src/app/ai-chat.tsx`

**Interfaces:**
- Consumes: `ErrorState` from `@/components/ui/error-state`, `useNetworkStatus`.

**Shared pattern (apply to each screen):**
1. Add an error flag to the screen's state: `const [loadError, setLoadError] = useState(false);`
2. In the primary data-loading function, set `setLoadError(false)` before the fetch, and in the `catch` block add `setLoadError(true);` (keep the existing `console.error`).
3. Add a `retrying` flag and a `handleRetry` that sets `retrying`, re-runs the loader, then clears it.
4. In render, when `loadError && !loading`, return `<ErrorState variant={isConnected ? "error" : "offline"} onRetry={handleRetry} retrying={retrying} />` instead of the empty/broken content. Use `const { isConnected } = useNetworkStatus();`.

- [ ] **Step 1: Wire home (`src/app/(tabs)/index.tsx`)**

The initial recipe + section load is in the effect around lines 165–188 (the `try/catch` blocks that currently only `console.error`). Add `const [loadError, setLoadError] = useState(false);` and `const [retrying, setRetrying] = useState(false);` near the other `useState`s (e.g. by line 150). In the catch blocks of the initial featured/section load, call `setLoadError(true)`. Add:
```tsx
const { isConnected } = useNetworkStatus();

const handleRetry = useCallback(async () => {
  setRetrying(true);
  setLoadError(false);
  try {
    await loadInitialData(); // the existing initial-load function; call the same loader the mount effect uses
  } catch {
    setLoadError(true);
  } finally {
    setRetrying(false);
  }
}, []);
```
If the initial load is inline in a `useEffect` rather than a named function, extract it into a `loadInitialData` callback and call it from both the effect and `handleRetry` (DRY). In the component's return, before the normal content, add:
```tsx
if (loadError && !loading) {
  return (
    <ErrorState
      variant={isConnected ? "error" : "offline"}
      onRetry={handleRetry}
      retrying={retrying}
    />
  );
}
```
Add imports: `import { ErrorState } from "@/components/ui/error-state";` and `import { useNetworkStatus } from "@/hooks/useNetworkStatus";` (and `useCallback` if not already imported).

- [ ] **Step 2: Wire recipe-detail (`src/app/recipe-detail.tsx`)**

Find the recipe-fetch effect/function (the one that sets the `recipe` state). Add `loadError`/`retrying` state, set `setLoadError(true)` in its catch, extract the fetch into a `loadRecipe` callback, and add a `handleRetry` that re-runs `loadRecipe`. In render, when `loadError && !loading && !recipe`, return the same `<ErrorState ... />` block (variant offline/error by `isConnected`, `onRetry={handleRetry}`, `retrying`). Add the two imports.

- [ ] **Step 3: Wire community (`src/app/(tabs)/community.tsx`)**

Find the posts-fetch function. Add `loadError`/`retrying` state, set it in the catch, extract a `loadPosts` callback shared by mount + retry, add `handleRetry`. In render, when `loadError && !loading && posts.length === 0`, return the `<ErrorState ... />` block. Add the two imports.

- [ ] **Step 4: Wire ai-chat (`src/app/ai-chat.tsx`)**

The AI request can fail on no-network. On a send failure, instead of (or in addition to) the existing error handling, surface an inline retry affordance: when the last send failed due to network, show a small inline "Couldn't send — Retry" row (reuse FlavourFlow styles) that re-sends the last message. (A full-screen `<ErrorState>` is wrong mid-conversation; use an inline retry.) Wire `useNetworkStatus` so the send button is disabled with a hint when `!isConnected`.

- [ ] **Step 5: Verify typecheck + manual airplane-mode test**

Run: `npx tsc --noEmit 2>&1 | tail -15`
Expected: no NEW errors (the single pre-existing `profile.service.ts:240` error may still appear — that is Phase 2's fix, not a regression here).
Manual: with airplane mode ON, cold-load home / open a recipe / open community → each shows the offline illustration + working "Try Again"; turn airplane mode OFF and tap Try Again → content loads. In ai-chat, sending while offline shows the inline retry.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(tabs)/index.tsx" src/app/recipe-detail.tsx "src/app/(tabs)/community.tsx" src/app/ai-chat.tsx
git commit -m "feat: show ErrorState with retry on fetch failure across key screens

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (Phase 1 of design spec):**
- "Add `@react-native-community/netinfo`" → Task 1 ✓
- "`useNetworkStatus` hook" → Task 1 ✓
- "reusable `error-state.tsx` … WebP via expo-image … retry pill … CookingLoader" → Task 2 ✓
- "Global offline banner … mounted in `_layout.tsx`" → Task 3 ✓
- "Wire into home, recipe-detail, community, ai-chat … on fetch catch → render ErrorState" → Task 4 ✓ (ai-chat uses inline retry, the correct UX mid-conversation)

**Placeholder scan:** Task 4 references each screen's existing loader by description (exact function names vary per screen and are located at implementation time) — the pattern, state, and JSX are fully specified, so no step is left to guesswork. New-file tasks (1–3) contain complete code.

**Type consistency:** `useNetworkStatus` returns `{ isConnected, isInternetReachable }` consistently; `ErrorState` prop names (`variant`/`onRetry`/`retrying`) identical across definition and all call sites.
