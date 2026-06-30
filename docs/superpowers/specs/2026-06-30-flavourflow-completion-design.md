# FlavourFlow Completion — Master Design Spec

**Date:** 2026-06-30
**Goal:** Close the real gaps between `plan.md` and the shipped app so FlavourFlow is a complete, polished, production-grade product for the university final evaluation and demo.
**Approach:** One master spec, built in **sequenced phases**. Each phase is independently shippable and committed on its own.

---

## Guiding principles

- **Build on what exists — do not rebuild.** Most of `plan.md` is already implemented (community, ChefBoo AI, recommendations, image upload, glassmorphism cards, cooking-timer notifications, RLS on notifications/follows/profiles).
- **Polish + production-grade** (user directive): every phase must both look great in a live demo and be genuinely robust.
- **FlavourFlow style guide is law.** Reference mockups (e.g. the blue notification screens) define *structure only* — never their palette. Use `flavourflow_style_guide.md` tokens.
- **No emoji in app UI or AI text** — custom fonts render emoji as tofu. Use Feather/Ionicons in tinted circles instead.
- **`CookingLoader` is the standard loading state** for full-page/section loads.

---

## Already done (do NOT rebuild)

- Notification **table + RLS** (`20260630161500_notifications_and_follows_rls.sql`) and realtime publication.
- Cooking-timer **local notifications** (`src/services/notifications.ts`).
- Community (posts, comments, follows, post-detail, followers/following), ChefBoo AI + voice, recommendation engine, recipe translation, WebP image upload, glassmorphism `frosted-recipe-card.tsx`.

## Out of scope (deferred / explicitly skipped)

- **Deferred to a later cycle:** Production hardening (AI rate limiting, Sentry, input-validation pass) and Deployment readiness (EAS/Play Store/docs). These were the original Phase 4 and Phase 6.
- **Explicitly skipped per `plan.md`:** Jira, AWS, Docker/Kubernetes, standalone Activity Feed screen, cross-device cooking recovery, complex DevOps.

---

## Style tokens (applied across all phases)

| Token | Hex | Usage |
|---|---|---|
| Primary Golden | `#FBA82E` | buttons, active state, **unread dots**, badge background, retry button |
| Cream Background | `#FAF5EF` | page background |
| Pale Cream | `#FFFDF5` | screen fallback bg |
| Soft Peach | `#F5E3D8` | cards, borders, input fields |
| Dark Charcoal | `#3B3328` | headings, body text |
| Text Secondary | `#8B7D6F` | metadata, subtitles, timestamps |
| Red Accent | `#E05252` | delete/destructive actions |

Fonts: `font-jakarta-bold` (titles), `font-jakarta-semibold` (card titles/buttons), `font-inter-medium` (metadata/timestamps), `font-inter-regular` (body). Cards: `rounded-3xl`, `border border-[#F5E3D8]/30`, soft shadow (`shadowColor:#3B3328, offset 0/4, opacity 0.04, radius 12, elevation 3`).

---

## Phase 0 — Cleanup & repo hygiene

**Goal:** Remove dead weight; verify no secrets are hardcoded. Supports "clean backend/system/workspace" and git-quality marks.

**Scope:**
- Delete one-off scripts and artifacts from repo root: `fix_*.py`, `move_fridge.py`, `restore_index.py`, `refine_*.py`, `update_*.py`, `test-db.js`, `test-db-cols.js`, `test_api.js`, `fetch-schema.js`, `temp_migration.sql`, `html_snippet.txt`, `recent_chat`, and any `*.rej` / `*.swp` (`src/app/(tabs)/index.tsx.rej`, `.index.tsx.swp`, `.chefboo-preferences.tsx.swp`).
- Confirm each deletion is safe (not imported, not a referenced asset) before removing.
- Verify `.env` holds only env-referenced keys and nothing secret is hardcoded in `src/`. `.gitignore` already covers `.env` and `*.orig`.
- **DB refinement (live audit):** the captured `remote_schema.sql` migration is empty (0 bytes), so the real schema lives only in the linked project (`gcuunqmbapmoelvczanv`). Run `supabase db dump --schema public` (CLI is installed + linked; may prompt for DB password once) to enumerate the live schema. Compare against the **18 tables the app actually references** (`recipes, profiles, follows, posts, post_likes, comments, favorites, user_preferences, recipe_interactions, recipe_recommendations, recipe_translations, ai_generated_recipes, notifications, kitchen_essentials, ingredients, cuisine_items, search_history, chefboo_events`). Anything not in that list — plus any **dangling bookmark/save-related table or column** (community posts have no save feature) and the removed Urdu columns — is a drop candidate. **Present the drop list to the user and get approval before any destructive migration.**

**Done when:** repo root contains only real project files; `git status` clean after commit; app still builds; live-schema drop list presented and approved (destructive DB changes applied only after sign-off).

---

## Phase 1 — Offline & error resilience *(foundation)*

**Goal:** Graceful handling of no-network / server errors with retry, using the provided WebP illustrations. Every later feature inherits this.

**Scope:**
- Add dependency `@react-native-community/netinfo` (Expo-compatible).
- `src/hooks/useNetworkStatus.ts` — subscribes to NetInfo, exposes `{ isConnected, isInternetReachable }`.
- `src/components/ui/error-state.tsx` — reusable full-section component:
  - `variant: "offline" | "error"` → renders `src/assets/images/Network_Error.webp` or `Unknown_Error.webp` via `expo-image`.
  - Title + secondary copy (FlavourFlow tone), and a **retry pill button** (primary golden, `rounded-full`, white Jakarta-semibold text) calling an `onRetry` prop.
  - While retrying, shows `<CookingLoader />`.
- Global offline banner: thin bar under the status bar ("You're offline — some features may not work") shown app-wide when `isConnected === false`, mounted in `src/app/_layout.tsx`.
- Wire `<ErrorState>` into the primary data screens' fetch failure / empty-due-to-no-network paths: home (`(tabs)/index.tsx`), `recipe-detail.tsx`, `(tabs)/community.tsx`, `ai-chat.tsx`. Pattern: on fetch catch → set an error flag → render `<ErrorState variant=... onRetry={refetch} />` in place of content.

**Done when:** turning off WiFi shows the offline banner; a failed screen load shows the correct WebP + working retry; retry succeeds once network returns.

---

## Phase 2 — Notification & Activity System

**Goal:** Complete the notification backend's **dynamic logic** and build the full UI. Backend table/RLS/realtime already exist; the service is only ~30% wired.

### 2a. Backend / service (`src/services/notification.service.ts`)

Current state: only `createFollowNotification` + `subscribeToNotifications` exist; a duplicate follow-insert lives in `profile.service.ts:228`.

Add **creator methods** (each no-ops when `recipientId === senderId`):
- `createLikeNotification(recipientId, senderId, senderName, recipeId, recipeTitle)`
- `createCommentNotification(recipientId, senderId, senderName, postId, snippet)`
- `createBookmarkNotification(recipientId, senderId, senderName, recipeId, recipeTitle)` — **recipes only** (fired from the existing `favorites` heart). Community posts have no save feature (out of scope, per user).
- `createShareNotification(recipientId, senderId, senderName, targetId)`

Each writes `{ recipient_id, sender_id, type, title, message, data }` with `data` holding the deep-link target (`recipeId`/`postId`/`profileId`). Consolidate the duplicate follow insert in `profile.service.ts` to call `createFollowNotification`.

Add **read-side methods**:
- `getNotifications(userId, { limit, before? })` — paginated, newest-first, joins sender profile (avatar, name).
- `groupByTime(notifications)` → `{ today, yesterday, thisWeek, earlier }` buckets.
- `getUnreadCount(userId)` — count where `is_read = false`.
- `markAsRead(id)`, `markAllAsRead(userId)`, `deleteNotification(id)`, `clearAll(userId)`.

**Wire creators into real action sites:**
- `recipe.service.ts` `toggleLikeRecipe` → on like, fire `createLikeNotification` to recipe owner.
- `community.service.ts` `addComment` → fire `createCommentNotification` to post owner.
- Recipe favorite (`recipe.service.ts` `toggleFavoriteRecipe` / `favorites` table) → fire `createBookmarkNotification` to recipe owner.
- Share action site → fire `createShareNotification`.
- Type-to-icon/haptic mapping per `plan.md`: LIKE = `selectionAsync` (subtle), COMMENT = `impactAsync(Medium)`, FOLLOW = `impactAsync(Light)`, timer/system = `notificationAsync(Success/Warning)`.

### 2b. UI — `src/app/(tabs)/alerts.tsx` (replace the stub)

Structure from reference mockups, **FlavourFlow palette**:
- Header: back chevron, centered "Notifications" (`font-jakarta-bold`), gear icon → notification settings. Optional one-time "Customize your notifications!" tooltip pointing at the gear.
- **Bell badge** unread count, capped at `99+`, golden background — also surfaced on the tab-bar Activity icon (`custom-tab-bar.tsx`) and any home header bell.
- **Clear All** action (calls `clearAll`).
- **Grouped sections:** TODAY / YESTERDAY / THIS WEEK / EARLIER (omit empty groups). Section labels in `font-inter-medium` uppercase `text-text-secondary`.
- **Row:** sender avatar (or type-tinted circle w/ vector icon for system types), title (`font-jakarta-semibold`), message (`font-inter-regular`, `text-text-secondary`), relative timestamp (`font-inter-medium`), golden unread dot on the right. Tap → mark read + deep-link via `data`.
- **Swipe actions:** swipe-to-delete (`#E05252`) and swipe mark-read. (Use existing swipe approach already in the codebase / `react-native-gesture-handler`.)
- **Empty state:** centered illustration + "No notifications yet" + supporting copy (FlavourFlow tone, no emoji).
- **Realtime:** subscribe via `subscribeToNotifications`; new notification → prepend, bump badge, haptic, optional in-app toast.
- Loading uses `<CookingLoader />`; pull-to-refresh reloads. Failure path uses Phase-1 `<ErrorState>`.

### 2c. Notification settings screen

New screen (or section) with persisted toggles (AsyncStorage + `user_preferences` where applicable): Likes, Comments, Followers, Community Activity, ChefBoo Tips, Cooking Timers, Push Notifications, Sound, Haptic Feedback. Creators/handlers respect these toggles.

### 2d. Push notifications (production)

- Store Expo push token on `profiles` (migration: add `push_token text`).
- On app start (post-permission), register token via `expo-notifications` and upsert to profile.
- Edge function (or DB trigger → function) that, on notification insert, looks up the recipient's `push_token` + settings and sends an Expo push. **Note:** push delivery is only testable on a *physical device* via EAS — built here, user verifies on-device.

**Done when:** liking/commenting/following/bookmarking generates a stored notification for the target user; the Activity screen shows them grouped with working unread badge, mark-read, swipe-delete, realtime updates, and settings toggles; empty/offline states render correctly.

---

## Phase 3 — Reviews & Ratings

**Goal:** Replace the hardcoded `recipe.rating || "4.5"` with real, stored, per-user reviews shown on the recipe and on recipe cards (explicit `plan.md` requirement).

**Scope:**
- **Creator name → profile tap:** the author row in `recipe-detail.tsx` (line ~837, `By {recipe.authorName}` + avatar) is currently static. Wrap it in a `TouchableOpacity` that navigates to `user-profile` with `recipe.created_by` (the author's user id). No-op / non-interactive when the author is the current user (or route to own profile). Verified existing route param name during implementation.
- **Repurpose the existing `reviews` table** (Phase 0 audit found it: empty, unused, columns `id, recipe_id, user_id, rating, created_at`). Migration ALTERs it rather than creating a new table: add `comment text`, add `updated_at timestamptz default now()`, add `UNIQUE (recipe_id, user_id)` (one review per user per recipe → upsert to edit), add a `rating` CHECK (1–5), and add RLS (any authenticated user reads; users insert/update/delete only their own row). RLS may be absent today — add the policies.
- **Aggregate into the existing `recipes.average_rating` column** (Phase 0 audit confirmed it exists). Maintain it from `reviews` via a trigger (recompute avg on review insert/update/delete) or recompute app-side; also surface `review_count`. Optionally a `recipe_rating_summary` view for `avg_rating + review_count` per recipe.
- **Fix the rating bug:** `recipe-detail.tsx` currently reads `recipe.rating` — a column that does **not exist** (real column is `average_rating`) — which is why it always falls back to the hardcoded `"4.5"`. Switch to `average_rating` and show the live value (or a "New" state when `review_count === 0`).
- `src/services/review.service.ts` (queries the `reviews` table) — `getReviews(recipeId)`, `getUserReview(recipeId, userId)`, `submitReview(recipeId, userId, rating, comment)` (upsert), `deleteReview(id)`, `getRatingSummary(recipeId)`.
- `recipe-detail.tsx`: real rating in the title row (avg + count), a **reviews section** (list with avatar/name/stars/text/date), and a **write/edit review** control (star picker + text input) for the signed-in user.
- Recipe cards (`section-recipe-card`, `full-width-recipe-card`, `popular-recipe-card`, `frosted-recipe-card`, `recommendation-card`): show real `average_rating`/`review_count`; graceful "New" state when no reviews (no fake number).
- Submitting a review fires a `createCommentNotification`-style "reviewed your recipe" notification to the recipe owner.
- Validate input (rating 1–5 required, comment length bounded).

**Done when:** a user can rate+review a recipe once, edit it, see it listed; aggregate rating shows consistently on detail and cards; no hardcoded `4.5` remains.

---

## Phase 4 — Permissions & hands-free polish *(was Phase 5)*

**Goal:** Ensure users grant the permissions the app needs (camera, microphone, notifications), handle denial gracefully, and tighten hands-free responsiveness.

**Scope:**
- **Rationale-first requests:** before the OS prompt, show a short FlavourFlow-styled explainer for camera (recipe/avatar photos), microphone (voice cooking/ChefBoo), notifications (timers + community). Request at the right moment, not all upfront.
- **Permissions status in Settings:** a section listing each permission with granted/denied state and a "Open Settings" deep link (`Linking.openSettings()`) when denied.
- **Graceful denial:** every feature behind a permission degrades cleanly (e.g. voice button disabled with a tap-to-explain) instead of crashing or silently failing.
- **Hands-free responsiveness:** review `cooking-mode.tsx` + `ai-chat.tsx` voice flows — faster start/stop feedback, clearer listening state, larger touch targets, reduce latency between speech end and action.

**Done when:** first-run users are guided through camera/mic/notification permissions with rationale; denied permissions show recovery UI in Settings; hands-free cooking feels responsive.

---

## Testing strategy

- **Phase 0:** app builds + runs after deletions; `git status` clean.
- **Phase 1:** manual airplane-mode test on each wired screen; retry path verified.
- **Phase 2:** trigger each notification type via a second account/seed; verify storage, grouping, badge, mark-read, swipe, realtime, settings toggles; on-device push test (user).
- **Phase 3:** submit/edit/delete review; verify aggregate on detail + cards; verify RLS (can't edit others' reviews).
- **Phase 4:** fresh-install permission flow on device; deny-then-recover path.
- Follow existing project test conventions where present; otherwise manual verification documented per phase.

## External dependencies (user-provided)

- **Push notification on-device test** (Phase 2) — physical device + EAS build; built here, verified by user.

## Build order

Phase 0 → 1 → 2 → 3 → 4. Each phase ends with a working app and its own conventional commit (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
