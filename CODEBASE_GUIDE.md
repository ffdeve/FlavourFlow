# FlavourFlow — Complete Codebase & System Guide

> Written in plain language. If something is technical, it is explained.
> Last updated: 2026-07-01

---

## Table of Contents

1. [What Is This App?](#1-what-is-this-app)
2. [Tech Stack — What Tools We Used](#2-tech-stack--what-tools-we-used)
3. [Libraries & What Each One Does](#3-libraries--what-each-one-does)
4. [Workspace Structure — Every File Explained](#4-workspace-structure--every-file-explained)
5. [Database — Full Schema](#5-database--full-schema)
6. [Authentication System](#6-authentication-system)
7. [Cooking Assistant](#7-cooking-assistant)
8. [Recommendation Algorithm](#8-recommendation-algorithm)
9. [Notification System](#9-notification-system)
10. [Edge Functions & Webhooks](#10-edge-functions--webhooks)
11. [Migrations — History of DB Changes](#11-migrations--history-of-db-changes)
12. [Security (RLS)](#12-security-rls)
13. [How Data Flows — End to End](#13-how-data-flows--end-to-end)

---

## 1. What Is This App?

FlavourFlow is a mobile recipe app for South Asian cuisine (Pakistani, Mughlai, Punjabi, etc.).

**What users can do:**
- Browse and search recipes
- Follow other users
- Create and share their own recipes
- Post to a community feed
- Cook step-by-step with a guided cooking mode and built-in assistant
- Get personalized recipe recommendations
- Receive notifications when people like, comment, or follow them
- Translate recipes into Urdu and Roman Urdu
- Set timers while cooking, with alerts
- Ask the in-app cooking assistant questions in English, Urdu, or Roman Urdu

---

## 2. Tech Stack — What Tools We Used

| Layer | Tool | What It Does |
|-------|------|--------------|
| Mobile App | React Native + Expo SDK 54 | Builds the iOS and Android app from one codebase |
| Navigation | Expo Router v6 | File-based routing (screens = files in `src/app/`) |
| Styling | NativeWind (Tailwind for RN) | CSS utility classes, works on phone |
| State (auth) | Zustand | Stores who is logged in, globally accessible |
| State (timers) | Zustand | Stores active cooking timers |
| Backend | Supabase | Database, Auth, File Storage, Realtime, Edge Functions |
| Database | PostgreSQL (inside Supabase) | SQL database with tables and relationships |
| Assistant model | Google Gemini 2.5 Flash | Powers the in-app cooking assistant and recipe generation |
| Serverless runtime | Deno (Supabase Edge Functions) | Runs server-side logic near the user |
| Push Notifs | Expo Push Service | Delivers background notifications to devices |
| Fonts | Plus Jakarta Sans + Inter | All text in the app uses these two fonts |

---

## 3. Libraries & What Each One Does

### Core
| Library | Purpose |
|---------|---------|
| `expo` | Main Expo framework, manages app lifecycle |
| `expo-router` | Turns files in `src/app/` into screens automatically |
| `react-native` | Core mobile UI components (View, Text, Image, etc.) |
| `nativewind` | Write Tailwind class names on React Native components |
| `zustand` | Simple global state (like Redux but simpler) |
| `@supabase/supabase-js` | Client to talk to our Supabase backend |

### UI & Animation
| Library | Purpose |
|---------|---------|
| `expo-linear-gradient` | Gradient backgrounds (gold fades, etc.) |
| `expo-blur` | Frosted glass effect on cards |
| `expo-image` | Faster/better image loading than built-in Image, supports WebP |
| `lottie-react-native` | Plays `.lottie` animation files (cooking loader) |
| `react-native-reanimated` | Smooth, 60fps animations |
| `react-native-gesture-handler` | Swipe gestures (swipe-to-delete notifications) |
| `expo-symbols` | SF Symbols icons (iOS) |
| `@expo/vector-icons` | Feather, Ionicons, FontAwesome icon sets |

### Navigation & Layout
| Library | Purpose |
|---------|---------|
| `react-native-safe-area-context` | Keeps content away from phone notch/home bar |
| `react-native-screens` | Native screen transitions |
| `@react-navigation/bottom-tabs` | The 5-tab bar at the bottom |

### Media & Input
| Library | Purpose |
|---------|---------|
| `expo-image-picker` | Pick photos from camera roll |
| `expo-image-manipulator` | Resize/compress photos before upload |
| `expo-camera` | (Available but camera is accessed through image-picker) |
| `expo-av` | Play audio/video |
| `expo-speech` | Text-to-speech (assistant reads step instructions aloud) |
| `expo-speech-recognition` | Voice-to-text (speak your message to the assistant) |
| `expo-file-system` | Read/write files on device |

### Notifications & Device
| Library | Purpose |
|---------|---------|
| `expo-notifications` | Local timers + request push permission |
| `expo-haptics` | Vibration feedback (light tap when notif arrives, heavy on timer done) |
| `@react-native-community/netinfo` | Detect if user is online or offline |
| `expo-constants` | Read app config like EAS project ID |
| `expo-localization` | Detect device language/region |

### Data & Storage
| Library | Purpose |
|---------|---------|
| `@react-native-async-storage/async-storage` | Key-value store on device (saves cooking resume state) |
| `expo-sqlite` | Local SQLite DB (used for offline ingredient cache) |
| `fuse.js` | Fuzzy search on local data (ingredient name matching) |

### Utility
| Library | Purpose |
|---------|---------|
| `i18next` + `react-i18next` | Internationalization (English ↔ Urdu translations in UI) |
| `world-countries` | Full list of countries with codes (for preference onboarding) |
| `country-flag-icons` | Flag icons for country selection |
| `clsx` + `tailwind-merge` | Combine Tailwind class names safely |
| `react-native-url-polyfill` | Makes URL work in React Native (required by Supabase) |

---

## 4. Workspace Structure — Every File Explained

```
flavourflow/
├── src/
│   ├── app/                  ← All SCREENS (each file = one screen)
│   ├── components/ui/        ← Reusable UI building blocks
│   ├── services/             ← Code that talks to Supabase / AI
│   ├── hooks/                ← Reusable logic (network status, auth)
│   ├── store/                ← Global state (auth, timers)
│   ├── types/                ← TypeScript type definitions
│   ├── constants/            ← Colors, fonts
│   ├── i18n/                 ← Language translation files
│   └── assets/               ← Images, icons, animations
├── supabase/
│   ├── functions/            ← AI + Push serverless code (runs on Supabase)
│   └── migrations/           ← DB schema changes, in order
└── (config files)
```

---

### `src/app/` — Screens

Every file here is a full screen. Expo Router turns the filename into the URL.

#### Auth Flow (`src/app/(auth)/`)
These screens show when the user is NOT logged in.

| File | Screen | What It Does |
|------|--------|------|
| `entry.tsx` | Welcome | First screen. "Continue with Google/Apple/Email" buttons |
| `login.tsx` | Login | Email + password login form |
| `login-email.tsx` | Login Email | Step 2 of email login (enter email) |
| `signup.tsx` | Sign Up | OAuth signup options |
| `register-email.tsx` | Register Email | Enter name + email for new account |
| `register-password.tsx` | Register Password | Create password step |
| `verify-email.tsx` | Verify OTP | 6-digit code from email. User types it here |
| `forgot-password.tsx` | Forgot Password | Enter email to receive reset link |
| `set-new-password.tsx` | Set Password | Enter new password after reset |
| `userpreference.tsx` | Onboarding | 4-step wizard: Country → Cuisines → Allergies → Spice Level |

#### Main Tabs (`src/app/(tabs)/`)
These are the 5 screens at the bottom tab bar.

| File | Tab | What It Does |
|------|-----|------|
| `index.tsx` | Home | Netflix-style rows of recipe sections |
| `community.tsx` | Community | Instagram-like social feed of food posts |
| `create.tsx` | Create | Button/chooser: create recipe OR create community post |
| `alerts.tsx` | Notifications | Grouped list of all notifications with swipe-to-delete |
| `profile.tsx` | Profile | Your profile: stats, recipes you made, favorites |

#### Stack Screens (push on top of tabs)

| File | What It Does |
|------|------|
| `recipe-detail.tsx` | Full recipe page: image, ingredients, steps, author |
| `cooking-mode.tsx` | Step-by-step cooking with the assistant, timers, voice |
| `ai-chat.tsx` | Full assistant chat screen with fridge ingredient picker |
| `ai-recipe-detail.tsx` | Shows an AI-generated recipe as a full card |
| `create-recipe.tsx` | 4-step form to publish a new recipe |
| `search.tsx` | Search recipes by keyword |
| `category-details.tsx` | Filtered list of recipes in a category |
| `user-profile.tsx` | Another user's profile (tap "Created by X" to get here) |
| `user-followers.tsx` | List of who follows a user |
| `user-following.tsx` | List of who a user follows |
| `post-detail.tsx` | Expanded community post with comments |
| `community-search.tsx` | Search community posts |
| `my-favorites.tsx` | Your saved/liked recipes |
| `manage-profile.tsx` | Edit your name, bio, avatar, banner |
| `settings.tsx` | App settings (notifications, language, assistant preferences) |
| `security.tsx` | Change password, manage account security |
| `chefboo-preferences.tsx` | Customize assistant personality, language, skill level |

---

### `src/components/ui/` — Reusable Components

These are building blocks. Screens import and use them.

| Component | What It Is |
|-----------|-----------|
| `cooking-loader.tsx` | Animated lottie knife-and-carrot spinner. Used as full-page loader everywhere |
| `error-state.tsx` | Full-screen error view. Shows `Network_Error.webp` or `Unknown_Error.webp`. Has "Try Again" button |
| `offline-banner.tsx` | Dark banner at top of screen when internet is off. Always visible (z-index 9999) |
| `avatar.tsx` | Round profile picture with fallback to initials |
| `custom-tab-bar.tsx` | The 5-button tab bar at the bottom. Shows red badge dot on alerts tab when unread notifications exist |
| `featured-recipe-card.tsx` | Large card at top of Home with big image |
| `frosted-recipe-card.tsx` | Card with blurred glass overlay at bottom |
| `popular-recipe-card.tsx` | Compact card for horizontal scroll rows |
| `full-width-recipe-card.tsx` | Wide card spanning full screen width |
| `recommendation-card.tsx` | Card used in Netflix-style recommendation rows |
| `section-recipe-card.tsx` | Small card for category grid views |
| `post-card.tsx` | Community post card (image + text + like/comment counts) |
| `comments-modal.tsx` | Bottom sheet that slides up showing comments on a post |
| `create-post-modal.tsx` | Bottom sheet for creating a new community post |
| `heart-button.tsx` | Like button that animates on press |
| `animated-search-bar.tsx` | Search bar with expand animation |
| `category-pill.tsx` | Rounded filter chip (e.g. "Pakistani", "Vegan") |
| `diamond-chip.tsx` | Diamond-shaped tag used on recipe cards |
| `spice-selector.tsx` | 1-5 spice level picker with chilli icons |
| `swipeable-card-stack.tsx` | Stack of recipe cards you can swipe through |
| `ai-recipe-carousel.tsx` | Horizontal scroll row of AI-generated recipe cards |
| `brick-wall-carousel.tsx` | Masonry-style card layout |
| `ingredient-selector-modal.tsx` | Modal with ingredient chips from the fridge (for the assistant) |
| `promotion-carousel.tsx` | Banner carousel at top of Home |
| `user-list-item.tsx` | Row in a followers/following list |
| `button.tsx` | Standard themed button component |
| `input.tsx` | Styled text input with border/focus states |
| `password.tsx` | Password input with show/hide eye toggle |
| `back-button.tsx` | "<" back navigation button |
| `circle-back-button.tsx` | Circular back button (used on recipe detail) |

---

### `src/services/` — Backend Communication

These files contain all the logic that talks to Supabase or external APIs. Screens should not write raw Supabase queries — they call these services.

| File | What It Does |
|------|------|
| `supabase.ts` | Creates the Supabase client using env vars. One single connection object used everywhere |
| `auth.service.ts` | Sign in, sign up, sign out, OTP verify, password reset, OAuth (Google/Facebook/Apple) |
| `profile.service.ts` | Read/write user profiles, preferences, follow/unfollow, block. Also fires follow notifications |
| `recipe.service.ts` | Fetch recipes, create recipes, toggle like/favorite. Fires like notifications |
| `community.service.ts` | Fetch posts, create posts, like posts, add comments. Fires comment notifications |
| `recommendation.service.ts` | Reads precomputed `recipe_recommendations` table. Falls back to top-rated/new recipes when no data |
| `notification.service.ts` | Insert notifications, read them, mark read/unread, delete, realtime subscription |
| `notifications.ts` | Device-level: local cooking timer scheduling (scheduleAdaptiveTimer), push token registration |
| `ai.service.ts` | Handles recipe translation (calls the `ai-chat` edge fn with `action: "translate_recipe"`, caches result in `recipe_translations`) |
| `chefboo-analytics.ts` | Logs assistant events (what users ask, what recipes are shown) to `chefboo_events` table |
| `ingredient-engine.ts` | Local ingredient search — loads ingredient list, does fuzzy matching with fuse.js |
| `geolocation.service.ts` | Detects user's country via device location (used for default cuisine preferences) |

---

### `src/store/` — Global State

| File | What It Stores |
|------|------|
| `auth.store.ts` | Logged-in session, user object, profile, preferences. `initialize()` is called once on app launch. Also calls `registerPushToken` after login |
| `timers.store.ts` | All active cooking timers: label, endTime, notificationId. Persists across navigation |

---

### `src/hooks/` — Reusable Logic

| File | What It Does |
|------|------|
| `use-auth.ts` | Simple hook that returns the current user from `auth.store.ts` |
| `useNetworkStatus.ts` | Returns `{ isConnected, isInternetReachable }`. Defaults to `true` to avoid flash on mount |

---

### `src/i18n/` — Translations

| File | What It Does |
|------|------|
| `index.ts` | Sets up i18next with auto-detected device language |
| `locales/en.json` | English strings for UI labels |
| `locales/ur.json` | Urdu strings for UI labels |

Note: the assistant's responses are translated by the model in real time, not from these files.

---

### `src/constants/`

| File | What It Does |
|------|------|
| `colors.ts` | Brand color tokens: primary `#FBA82E` (gold), cream, charcoal, peach, red, etc. |
| `typography.ts` | Font names: `font-jakarta-bold`, `font-inter-regular`, etc. |

---

### `src/assets/`

| Folder | Contents |
|--------|---------|
| `images/` | Full-screen WebP images: login backgrounds, onboarding, error screens (`Network_Error.webp`, `Unknown_Error.webp`) |
| `icons/` | All small WebP icons: heart, timer, settings, step icons, spice levels, diet badges |
| `lottie_animations/` | `.lottie` animation file for the cooking loader |

---

## 5. Database — Full Schema

The database lives inside Supabase (PostgreSQL). Here is every table.

---

### `profiles`
Stores public user info. One row per user.

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Same as `auth.users.id`. The link between auth and profile |
| `full_name` | text | Display name |
| `username` | text | Unique @handle |
| `avatar_url` | text | Profile photo URL (Supabase Storage) |
| `banner_url` | text | Profile banner/cover image URL |
| `bio` | text | Short bio text |
| `language` | text | `"en"` or `"ur"` |
| `is_private` | boolean | Private account (hides from strangers) |
| `assistant_settings` | jsonb | Assistant personalization: language, personality, skill level, voice, etc. |
| `last_username_change` | timestamptz | Prevents username spam — enforces 30-day cooldown |
| `created_at` | timestamptz | When account was created |

---

### `user_preferences`
Stores the onboarding choices. One row per user.

| Column | Type | What It Is |
|--------|------|-----------|
| `user_id` | UUID | Links to `profiles.id` |
| `preferred_country` | text[] | Countries the user selects (array, e.g. `["PK"]`) |
| `preferred_cuisines` | text[] | Cuisines they like (e.g. `["Pakistani","Mughlai"]`) |
| `allergies` | text[] | Allergens to avoid (e.g. `["Nuts","Dairy"]`) |
| `dislikes` | text[] | Ingredients they dislike |
| `diet_type` | text | e.g. `"halal"`, `"vegan"` |
| `spice_level` | integer | 1 (mild) to 5 (very spicy) |
| `preference_completed` | boolean | Gate: if false, onboarding screen shows on launch |

---

### `recipes`
The main recipe table. One row per recipe.

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Unique recipe ID |
| `created_by` | UUID | `profiles.id` of the author |
| `title` | text | Recipe name |
| `description` | text | Short intro paragraph |
| `image_url` | text | Main photo URL |
| `cuisine_type` | text | e.g. `"Pakistani"`, `"Italian"` |
| `dish_category` | text | e.g. `"Breakfast"`, `"Dinner"`, `"Dessert"` |
| `prep_time` | integer | Prep minutes |
| `cook_time` | integer | Cook minutes |
| `servings` | integer | How many people it serves |
| `spice_level` | integer | 1-5 |
| `difficulty` | text | `"easy"`, `"medium"`, `"hard"` |
| `ingredients` | jsonb | Array of `{ name, quantity }` objects |
| `steps` | jsonb | Array of step objects (see RecipeStep type) |
| `tags` | text[] | Free-form tags |
| `diet_tags` | text[] | e.g. `["Vegan","Gluten-Free"]` |
| `allergens` | text[] | e.g. `["Nuts","Dairy"]` |
| `average_rating` | numeric | Calculated average of all reviews (1.00-5.00) |
| `likes_count` | integer | Denormalized count of favorites |
| `views_count` | integer | How many times the detail screen was opened |
| `video_url` | text | Optional YouTube/video link |
| `created_at` | timestamptz | When the recipe was published |

**Each step object looks like:**
```json
{
  "step": 1,
  "instruction": "Add oil to pan",
  "duration": 5,
  "heatSetting": "medium",
  "temperature": 180,
  "hasTimer": true,
  "timerMinutes": "5",
  "linkedIngredients": [{ "name": "oil", "quantity": "2 tbsp" }],
  "note": "Don't let it smoke"
}
```

---

### `recipe_interactions`
Every time a user does something with a recipe, it is logged here. This is the fuel for the recommendation engine.

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Row ID |
| `user_id` | UUID | Who did the action |
| `recipe_id` | UUID | Which recipe |
| `interaction_type` | text | One of: `VIEW`, `FAVORITE`, `COOK_START`, `COOK_COMPLETE`, `COOK_ABANDONED`, `SHARE`, `SEARCH_CLICK`, `RECIPE_IMPRESSION` |
| `metadata` | jsonb | Extra context, e.g. `{ engagement: { is_quick_exit: true, duration_seconds: 3 } }` |
| `created_at` | timestamptz | When it happened |

RLS is ON — users can only see their own rows. The recommendation engine uses service role (bypasses RLS).

---

### `favorites`
When a user saves/hearts a recipe.

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Row ID |
| `user_id` | UUID | Who saved it |
| `recipe_id` | UUID | What they saved |
| `created_at` | timestamptz | When |

RLS is ON — owner-only access.

---

### `reviews`
User-written reviews with star ratings. Repurposed (was empty, now active).

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Row ID |
| `recipe_id` | UUID | Which recipe |
| `user_id` | UUID | Who wrote it |
| `rating` | integer | 1-5 stars |
| `created_at` | timestamptz | When |

**Business rule:** One review per user per recipe (enforced by `UNIQUE(recipe_id, user_id)`). Rating must be 1-5 (enforced by `CHECK` constraint).

---

### `follows`
Social graph — who follows whom.

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Row ID |
| `follower_id` | UUID | The person who clicked "Follow" |
| `following_id` | UUID | The person being followed |
| `created_at` | timestamptz | When |

---

### `posts`
Community feed posts (user-shared food photos).

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Post ID |
| `user_id` | UUID | Author |
| `content` | text | Caption/text |
| `image_url` | text | Single image URL |
| `images` | text[] | Multi-image array |
| `recipe_id` | UUID | Optional: links post to a recipe |
| `category` | text | e.g. `"cooking"`, `"plating"` |
| `likes_count` | integer | Denormalized like count |
| `comments_count` | integer | Denormalized comment count |
| `created_at` | timestamptz | When posted |

---

### `post_likes`
Who liked which community post.

| Column | Type | What It Is |
|--------|------|-----------|
| `user_id` | UUID | Who liked |
| `post_id` | UUID | Which post |
| `created_at` | timestamptz | When |

---

### `comments`
Comments on community posts.

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Comment ID |
| `post_id` | UUID | Which post |
| `user_id` | UUID | Who commented |
| `content` | text | The comment text |
| `created_at` | timestamptz | When |

---

### `notifications`
All in-app notifications (likes, follows, comments, reviews, shares).

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Notification ID |
| `recipient_id` | UUID | Who receives it |
| `sender_id` | UUID | Who triggered it |
| `type` | text | `FOLLOW`, `LIKE`, `COMMENT`, `BOOKMARK`, `SHARE`, or `REVIEW` |
| `title` | text | Short headline e.g. "New Follower" |
| `message` | text | Full message e.g. "Ahmed started following you" |
| `data` | jsonb | Navigation payload: `{ recipeId, postId, or profileId }` |
| `is_read` | boolean | Has the recipient seen it |
| `created_at` | timestamptz | When |

When a new row is inserted, Supabase Realtime pushes it instantly to the recipient's app. The `send-push` webhook also fires to deliver a background push to their device.

---

### `user_push_tokens`
Stores each device's push token. Separate from profiles (because profiles are public).

| Column | Type | What It Is |
|--------|------|-----------|
| `user_id` | UUID | Owner (primary key) |
| `token` | text | Expo push token: `ExponentPushToken[...]` |
| `updated_at` | timestamptz | When it was last registered (refreshes on app open) |

RLS is ON — users can only see/write their own row.

---

### `recipe_recommendations`
Precomputed scores from the recommendation engine. Updated by the `generate-recommendations` cron job.

| Column | Type | What It Is |
|--------|------|-----------|
| `user_id` | UUID | Who this recommendation is for |
| `recipe_id` | UUID | The recommended recipe |
| `section_type` | text | `CORE`, `TRENDING`, `JUMP_BACK_IN`, `COOK_IT_AGAIN`, `SIMILAR` |
| `score` | numeric | Computed relevance score |
| `trend_score` | numeric | Trending signal component |
| `behavior_score` | numeric | User behavior signal component |
| `content_score` | numeric | Content match signal component |
| `negative_penalty` | numeric | Penalty for recipes user abandoned or quick-exited |

---

### `recommendation_events_queue`
A queue of user actions that need the recommendation engine to recompute.

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Event ID |
| `user_id` | UUID | Who triggered it |
| `event_type` | text | What happened (VIEW, FAVORITE, etc.) |
| `payload` | jsonb | Extra context |
| `status` | text | `pending` or `completed` |
| `processed_at` | timestamptz | When the cron picked it up |

When a user favorites or completes a recipe, a row is inserted here. The cron job claims a batch of 500 rows, recomputes recommendations for the affected users, and marks them completed.

---

### `ai_generated_recipes`
Recipes the assistant generated on the fly. Stored permanently so the user can cook them later.

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Recipe ID |
| `user_id` | UUID | Who asked for it |
| `title` | text | Recipe name |
| `description` | text | Short description |
| `ingredients` | jsonb | Array of `{ name, quantity }` |
| `steps` | jsonb | Cooking steps |
| `cuisine_type` | text | Detected cuisine |
| `spice_level` | integer | 1-5 |
| `prep_time` | integer | Minutes |
| `cook_time` | integer | Minutes |
| `servings` | integer | Portions |
| `image_url` | text | null at creation (no image for AI recipes yet) |
| `prompt_context` | jsonb | What the user typed that triggered this generation |
| `created_at` | timestamptz | When |

---

### `recipe_translations`
Cache for Urdu translations. Gemini is only called once per recipe per language, then the result is saved here.

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Row ID |
| `recipe_id` | UUID | Which recipe was translated |
| `language` | text | `"ur"` or `"roman_ur"` |
| `translated_data` | jsonb | Full translated title, description, ingredients, steps |
| `created_at` | timestamptz | When translation was cached |

---

### `chefboo_events`
Analytics: logs what users do with the assistant (for product improvement).

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Event ID |
| `user_id` | UUID | Who |
| `event_type` | text | `PROMPT`, `COOKING_PROMPT`, `INGREDIENTS_SELECTED`, `RECIPE_GENERATED` |
| `payload` | jsonb | e.g. `{ intent: "RECIPE_SEARCH", text: "chicken..." }` |
| `created_at` | timestamptz | When |

---

### `cuisine_items`
Master list of cuisines, allergens, and countries shown during onboarding.
(Queried in code as `cuisine_items`. An older migration referenced a
`cuisine_catalog` name; the live table is `cuisine_items`.)

| Column | Type | What It Is |
|--------|------|-----------|
| `id` | UUID | Row ID |
| `name` | text | e.g. `"Pakistani"`, `"Nuts"`, `"Pakistan"` |
| `category` | text | `"cuisine"`, `"allergen"`, or `"country"` |
| `emoji` | text | Flag or food emoji |
| `country_code` | text | ISO country code (for country category) |
| `sort_order` | integer | Display order |
| `is_active` | boolean | Show or hide from UI |

---

## 6. Authentication System

FlavourFlow uses **Supabase Auth**, which provides:

### How login works

1. User enters email + password (or taps Google/Facebook/Apple)
2. Supabase Auth validates and returns a **session** (a JWT token)
3. The session is stored on the device automatically by the Supabase SDK
4. Every API call automatically includes the JWT in the header
5. PostgreSQL uses the JWT to know who is making the request (via `auth.uid()`)

### OAuth (Social Login)
- Google, Facebook, Apple login open a browser via `expo-web-browser`
- After the user approves, the browser redirects back to the app with a URL containing the session
- The app captures this URL and calls `setSessionFromUrl()` to finish login

### Email Verification (OTP)
- When a user signs up, Supabase sends a 6-digit code to their email
- The user types the code in the `verify-email.tsx` screen
- If correct, Supabase creates the session
- **Note:** Our email domain (marylandpk.com) was blocked by spam filters, so OTP emails may not always deliver. The fix is to switch to a transactional email provider like Resend or SendGrid.

### Password Reset
1. User requests reset → Supabase sends a link to their email
2. Link opens the app → `set-new-password.tsx` screen appears
3. User types new password → saved

### Session Persistence
The Supabase SDK auto-saves the session to AsyncStorage. On next app launch, `auth.store.ts` calls `authService.getSession()` which reads from storage and restores the session silently.

---

## 7. Cooking Assistant

The in-app cooking assistant runs inside a Supabase Edge Function (`supabase/functions/ai-chat/index.ts`) powered by **Google Gemini 2.5 Flash**. Most requests are handled by fast, free pattern matching first; the model is only called when needed.

### Two Modes

**1. Chat Mode (normal)**
Available from the assistant tab. The user can ask anything food-related.

**2. Cooking Mode (guided)**
Available while step-cooking. The assistant knows which recipe is being cooked, the current step, the ingredients on hand, and any running timers. It answers only about the current dish.

---

### Intent Classification

Before calling the model (which costs money), the code classifies what the user wants using pattern matching. This is fast and free.

| Intent | Example | What Happens |
|--------|---------|------|
| `GREETING` | "Hi!", "Hello", "Salam" | Returns a canned greeting. No Gemini called. |
| `OFF_TOPIC` | "What's the weather?", "Show me a Python script" | Returns a canned redirect. No model called. |
| `VARIETY` | "More", "Different", "Something else" | Fetches different DB recommendations. No Gemini. |
| `FOLLOW_UP` | "Tell me more", "The first one" | Calls Gemini with full chat history |
| `INGREDIENT_SEARCH` | "I have chicken and rice" | DB search first, then Gemini if no match |
| `RECIPE_SEARCH` | "Show me biryani" | DB search first, then Gemini if no match |
| `AI_RECIPE_GENERATION` | "Create a recipe for me" | Calls the model in JSON mode directly |
| `COOKING_HELP` | "Why is my curry too salty?" | Calls Gemini for a direct answer |
| `SUBSTITUTION` | "Can I replace cream with yogurt?" | Calls Gemini for a direct answer |
| `MEAL_PLANNING` | "Plan my week" | DB search first |

**Safety Filter:** Before any processing, the message is checked against a pattern that blocks attempts to extract passwords, API keys, or credentials. The system returns a polite redirect with no model call. (The pattern deliberately does *not* match the ordinary word "table" — that previously false-flagged normal cooking phrases like "dinner table.")

---

### DB-First Strategy (Confidence Scoring)

When a user searches for a recipe, the system first searches the app's own database using a PostgreSQL function called `search_recipes_ranked`. This function returns recipes with a **confidence score** (0-100).

| Confidence | Action |
|------------|--------|
| ≥ 80 | Show DB recipes only |
| 50–79 | Show DB recipes + offer to generate a custom one |
| < 50 | Skip DB, generate with Gemini |

This means the model is only called when the database doesn't have a good enough match — saving API costs.

---

### Recipe Generation (JSON Mode)

When the model generates recipes, it is given a strict JSON schema to follow:

```
{
  reply: "Short friendly message",
  recipes: [
    {
      title: "Chicken Karahi",
      description: "...",
      ingredients: [ { name: "chicken", quantity: "500g" } ],
      steps: [ "Step 1...", "Step 2..." ],
      cuisine_type: "Pakistani",
      spice_level: 3,
      prep_time: 15,
      cook_time: 30,
      servings: 4
    }
  ]
}
```

The model returns up to a few recipes. They are immediately saved to `ai_generated_recipes` so the user can access them later. That table has owner-only SELECT/UPDATE policies (added in migration `20260704120000`), since the app reads it and toggles `is_saved` with the user's own token while the edge function writes with the service role.

**Thinking Budget:** For cooking-mode replies (short answers), a small thinking budget is allowed. For recipe-generation JSON, thinking is disabled (`thinkingBudget: 0`) because thinking tokens were consuming the JSON output budget.

---

### Behavior-Weighted Taste Profile

The assistant doesn't just use what the user said during onboarding — it builds a live taste profile from behavior:

```
Weights:
  COOK_COMPLETE = 5 points  (strongest signal — they finished cooking it)
  FAVORITE      = 3 points
  COOK_START    = 2 points
  VIEW          = 1 point

For each interaction:
  → Find the cuisine_type of that recipe
  → Add the weight to that cuisine's running score
  → Find the protein used
  → Add weight to that protein's score
  → Add spice_level × weight to spice average

Result: inferred_cuisines, inferred_proteins, inferred_spice_level

This is injected into the assistant's system prompt:
"Inferred tastes: cuisines: Pakistani, Mughlai; proteins: chicken; preferred spice: ~3/5"
```

---

### Assistant Personality Settings

Users can customize the assistant in `chefboo-preferences.tsx`. Settings are saved to `profiles.assistant_settings` (jsonb column). The settings change the system prompt sent to the model:

| Setting | Options |
|---------|---------|
| Language | Auto-detect, English only, Urdu script, Roman Urdu |
| Personality | Friendly Chef (default), Professional Chef, Cooking Teacher, Grandma Style |
| Skill Level | Beginner (explains terms), Intermediate, Expert (brief/technical) |
| Response Style | Short (1 sentence), Balanced, Detailed (explains reasoning) |
| Voice | Female 1/2, Male 1/2 (for text-to-speech readback) |

---

### Recipe Translation (ai.service.ts)

When the user switches to Urdu / Roman Urdu on recipe-detail:

1. Check the `recipe_translations` table for an existing cache entry
2. If found → return the cached translation instantly
3. If not → call the `ai-chat` edge function with `action: "translate_recipe"` and the recipe data
4. The model translates title, description, ingredients, and steps
5. Units like `"180°C"`, `"500g"` are NOT translated (the model is instructed to keep them)
6. Save the result to `recipe_translations`
7. Next request for the same recipe in the same language → instant from cache

> The translation path uses the deployed `ai-chat` function. (An earlier version called a function named `ai-assistant`, which did not exist and returned 404 on every request.)

---

## 8. Recommendation Algorithm

The recommendation system pre-computes scores in a background job so the app screen loads instantly without any heavy calculation on the device.

### How It Works (Step by Step)

**Step 1: User does something**
User views/favorites/cooks a recipe. The app logs it to `recipe_interactions` AND inserts a row into `recommendation_events_queue` with status `pending`.

**Step 2: Cron job runs**
The `generate-recommendations` edge function is called on a schedule. It:
1. Claims up to 500 pending queue events atomically
2. Gets all unique user IDs from those events
3. Fetches ALL recipes from the database

**Step 3: Global Trending Score**
For each recipe, calculate how popular it has been in the last 7 days:

```
trend_score =
  0.4 × log(impressions + 1)       ← How many people saw it
  + 0.3 × log(cook_starts + 1)     ← How many started cooking
  + 0.2 × completion_rate           ← (completions / starts)
  + 0.1 × freshness                 ← e^(-0.1 × age_in_days)
```

`freshness` = newer recipes get a boost. A recipe from today decays less than one from a month ago.

**Step 4: Per-User Scoring**
For each user, for each recipe:

**(A) Behavior Score** — weighted sum of the user's past interactions with that recipe:

```
For each interaction with this recipe:
  base_weight =
    COOK_COMPLETE: 5
    FAVORITE:      3
    COOK_START:    2
    VIEW:          1

  time_decay = e^(-lambda × days_old)
    where lambda =
      VIEW: 0.20  (old views decay fast — you may have just browsed)
      FAVORITE: 0.05  (favorites stay relevant longer)
      COOK_COMPLETE: 0.03  (very sticky — you cooked it, you'll cook it again)
      COOK_START: 0.10
      COOK_ABANDONED: 0.10  (signal to jump back in)

  behavior_score += base_weight × time_decay
```

**(B) Negative Penalty** — recipes the user clearly didn't like get penalized:

```
penalty =
  (-2.0 × quick_exit_count)          ← opened and closed in under 3 seconds
  + (-1.5 × abandonment_count)       ← started cooking but quit
  + (-1.0 × repeated_short_views)    ← kept skipping it

clamped to range [-10, 0]
```

**(C) Content Score** — simple preference match:

```
If |recipe.spice_level - user.spice_level| <= 1:
  content_score += 2
```

**(D) Context Boost** — time of day and day of week:

```
If it's 5am–11am and recipe.dish_category = "Breakfast":
  context_boost += 3

If it's 5pm–11pm and dish_category = "Dinner" or "Comfort":
  context_boost += 3

If it's Saturday or Sunday and dish_category = "Heavy":
  context_boost += 2
```

**(E) Final Score:**

```
final_score = content_score + behavior_score + trend_score - |penalty| + context_boost
```

Only recipes with `final_score > 0` are inserted.

**Step 5: Section Assignment**
The same recipe can appear in multiple sections:

| Section | Condition |
|---------|-----------|
| `CORE` | final_score > 0 (main "Meals for You" row) |
| `JUMP_BACK_IN` | User abandoned cooking this recipe AND spent >30 seconds in it |
| `COOK_IT_AGAIN` | User has completed cooking this recipe at least once |
| `TRENDING` | trend_score > 0.5 |
| `SIMILAR` | cuisine_type matches last cooked recipe + ≥3 shared ingredients |

**Step 6: Cold Start (New Users)**
If no precomputed data exists (brand new user with no interactions), the app falls back to:
- Their onboarding cuisine preferences → filter top-rated recipes
- Global top-rated recipes
- Newest recipes
- Quick & Easy recipes (cook_time ≤ 30 min)

---

## 9. Notification System

### How a Notification Gets Created

Example: User A likes User B's recipe.

1. `recipe.service.ts` → `toggleLikeRecipe()` → inserts row into `favorites`
2. Then an async IIFE fires (fire-and-forget, doesn't block):
   - Looks up recipe creator's `profiles.id`
   - Looks up sender's `profiles.full_name`
   - Calls `notificationService.createLikeNotification(recipientId, senderId, senderName, recipeId, recipeTitle)`
3. `notificationService.createLikeNotification()` → inserts into `notifications` table
4. Supabase Realtime detects the INSERT → pushes to User B's app in real time
5. The `send-push` webhook fires → Expo push delivery to User B's device

### How Notifications Appear in the App

`alerts.tsx` (the notifications tab):
- On load: fetches last 60 notifications from DB
- On screen focus: marks all as read + emits `"notifications:read"` event
- Realtime subscription: prepends new arrivals with light haptic
- Swipe left on any row: delete it
- "Clear All" button: removes all
- Tap a notification: navigate to the relevant recipe/post/profile

The red badge on the alerts tab in `custom-tab-bar.tsx`:
- Loads unread count on mount
- Realtime subscription increments it (+1) for each new notification
- Resets to 0 when `"notifications:read"` DeviceEventEmitter event fires (emitted when user opens alerts tab)

### Notification Types

| Type | Trigger | Navigates To |
|------|---------|------|
| `FOLLOW` | Someone follows you | Their profile |
| `LIKE` | Someone likes your recipe | That recipe |
| `COMMENT` | Someone comments on your post | That post |
| `BOOKMARK` | Someone bookmarks your recipe | That recipe |
| `SHARE` | Someone shares your recipe | That recipe |
| `REVIEW` | Someone reviews your recipe | That recipe |

---

## 10. Edge Functions & Webhooks

Edge Functions are small serverless programs that run on Supabase's servers (using Deno runtime). They can't be called from the frontend with sensitive keys — they use the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.

### `ai-chat` (Called from app)
**Location:** `supabase/functions/ai-chat/index.ts`  
**Called by:** `ai-chat.tsx` screen and `cooking-mode.tsx`  
**What it does:** The full cooking-assistant logic. Receives the user message + history + context, classifies intent, searches the DB or calls the model, and returns the response. Also handles `action: "translate_recipe"` for on-demand recipe translation.  
**Key env vars:** `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### `generate-recommendations` (Cron job)
**Location:** `supabase/functions/generate-recommendations/index.ts`  
**Called by:** Supabase cron (scheduled) — triggered by queue events  
**What it does:** Runs the recommendation algorithm for all users who have new interaction data. Replaces their rows in `recipe_recommendations`.  
**Key env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### `send-push` (Database Webhook)
**Location:** `supabase/functions/send-push/index.ts`  
**Called by:** Supabase Database Webhook — fires on every INSERT into `public.notifications`  
**What it does:**
1. Reads `recipient_id` from the new notification row
2. Looks up the recipient's token in `user_push_tokens`
3. POSTs to Expo Push API: `https://exp.host/--/api/v2/push/send`
4. Always returns 200 (even on failure) to prevent webhook retry loops

**Setup required (one time, in Supabase dashboard):**
- Database → Webhooks → New Webhook
- Table: `notifications`, Event: INSERT
- URL: your `send-push` function URL

---

## 11. Migrations — History of DB Changes

Migrations are SQL files that changed the database over time. They run in order by filename (timestamp prefix).

| Migration File | What It Did |
|----------------|-------------|
| `20260621120126_remote_schema.sql` | Base schema — created all original tables |
| `20260630161500_notifications_and_follows_rls.sql` | Enabled RLS on notifications and follows tables |
| `20260630170000_add_banner_url_to_profiles.sql` | Added `banner_url` column to profiles (profile cover photo) |
| `20260630180000_add_is_private_to_profiles.sql` | Added `is_private` column (private accounts) |
| `20260630190000_remove_urdu_columns.sql` | Removed old `title_ur`, `description_ur` columns from recipes (replaced by `recipe_translations` table) |
| `20260630191500_create_recipe_translations.sql` | Created `recipe_translations` table for Gemini translation cache |
| `20260630200000_phase0_drop_cooking_sessions.sql` | Dropped `cooking_sessions` table — its job was already done by AsyncStorage in the app |
| `20260701123000_security_rls_and_push_tokens.sql` | **Security hardening:** Added RLS to `favorites` and `recipe_interactions` (were world-readable). Created `user_push_tokens` table with owner-only RLS. Removed `push_token` from profiles |
| `20260701160000_cascade_user_deletion.sql` | Cascade user deletion through all foreign keys to `profiles` / `auth.users` so account removal cleans up related rows |
| `20260704120000_fix_lookup_rls_and_ai_recipes.sql` | Guarantees a public SELECT policy on lookup tables (`ingredients`, `kitchen_essentials`, `cuisine_items`) so pickers never render empty; adds owner SELECT/UPDATE policies on `ai_generated_recipes` |

> **Reproducibility note:** `20260621120126_remote_schema.sql` is currently empty in the repo. Re-dump the live schema (`supabase db dump --schema public -f supabase/migrations/20260621120126_remote_schema.sql`) so the database can be rebuilt from scratch — the ranked-search function and core tables live only on the remote otherwise.

---

## 12. Security (RLS)

Row Level Security = PostgreSQL's system for controlling who can read/write each row.

When RLS is enabled on a table and a user queries it, PostgreSQL checks the policies before returning data. `auth.uid()` returns the logged-in user's UUID from the JWT token.

### Our Policies

| Table | Who Can Read | Who Can Write |
|-------|-------------|---------------|
| `profiles` | Anyone (public profiles) | Owner only |
| `recipes` | Anyone | Owner only |
| `user_preferences` | Owner only | Owner only |
| `favorites` | Owner only | Owner only |
| `recipe_interactions` | Owner only | Owner only |
| `follows` | Anyone | Owner only (follower) |
| `notifications` | Recipient only | Any authenticated user (to send) |
| `user_push_tokens` | Owner only | Owner only |
| `posts` | Anyone | Owner only |
| `comments` | Anyone | Any authenticated user |

**Service Role bypasses all RLS.** Edge Functions use the service role key, so the recommendation engine and push sender can read any data they need.

**Why `favorites` and `recipe_interactions` are private:**
An audit found that anonymous users could read these tables (3 rows each were exposed). Even though the app only reads your own rows, leaving them world-readable violates privacy. Fixed in migration `20260701123000`.

---

## 13. How Data Flows — End to End

### Scenario: User opens the app for the first time

```
App launches
→ _layout.tsx renders
→ auth.store.ts initialize() runs
→ authService.getSession() reads from device storage
→ No session found
→ Redirect to (auth)/entry.tsx (welcome screen)
```

### Scenario: User logs in

```
User types email + password → taps Login
→ auth.store.ts signIn()
→ authService.signIn() → Supabase Auth API
→ Returns { session, user }
→ profileService.getProfile(user.id) → reads profiles table
→ profileService.getPreferences(user.id) → reads user_preferences
→ Store saves all to global state
→ registerPushToken(user.id) fires in background
  → checks AsyncStorage for "pushNotificationsEnabled"
  → requests device push permission
  → gets Expo token
  → upserts to user_push_tokens table
→ Expo Router sees isAuthenticated = true
→ Redirects to (tabs)/index (Home screen)
```

### Scenario: Home screen loads

```
(tabs)/index.tsx mounts
→ recommendationService.getNetflixStyleRecommendations(userId)
→ Query recipe_recommendations table (precomputed, fast)
→ If no data: fallback queries (top-rated, new, quick, preferences)
→ Renders 5+ horizontal scroll rows
→ User scrolls, taps recipe card
→ router.push('/recipe-detail?id=...')
→ recipe-detail.tsx fetches recipe from recipes table
→ Also fetches: liked status from favorites, author from profiles
→ Logs VIEW interaction to recipe_interactions
→ Inserts row into recommendation_events_queue
```

### Scenario: User messages the assistant

```
User types "I have chicken and potatoes, what can I cook?"
→ ai-chat.tsx sends to ai-chat edge function:
   { message, userId, history, ingredients: [], mode: "chat" }
→ Edge function:
  1. Safety check → no block
  2. classifyIntent() → "INGREDIENT_SEARCH"
  3. extractKeywords("chicken potatoes") → ["chicken", "potatoes"]
  4. call search_recipes_ranked(userId, "chicken potatoes", keywords, 6)
  5. Gets back 4 results with confidence 65, 55, 50, 48
  6. Top confidence = 65 (< 80) → show results + offer to generate
  7. Canned reply: "Here are a few that fit perfectly:\n\nNot quite right? Say 'create a recipe' and I'll make one for you."
  8. Returns recipes[] to app
→ App shows reply text + 4 recipe cards
→ User taps "create a recipe"
→ classifyIntent() → "AI_RECIPE_GENERATION"
→ generateAndStore() → fresh recipes in JSON
→ Saved to ai_generated_recipes table (owner-only RLS)
→ App shows the generated recipe cards
```

### Scenario: Push notification delivered

```
User A taps the heart on User B's recipe
→ recipe.service.ts toggleLikeRecipe()
→ Inserts into favorites
→ Fire-and-forget:
  → lookup recipe.created_by + recipe.title
  → lookup sender.full_name
  → notificationService.createLikeNotification(B, A, "Ahmed", recipeId, "Chicken Biryani")
  → INSERT into notifications table
→ Supabase Realtime fires instantly to User B's app (if open)
  → alerts.tsx Realtime subscription receives new row
  → Prepends to list, light haptic
  → Badge on tab increases by 1
→ Database Webhook fires to send-push edge function
  → Looks up user_push_tokens WHERE user_id = B
  → token = "ExponentPushToken[abc123]"
  → POST to https://exp.host/--/api/v2/push/send:
     { to: "ExponentPushToken[abc123]", title: "New Like", body: "Ahmed liked your Chicken Biryani" }
  → Expo delivers push notification to User B's device
```

---

*This document covers the entire FlavourFlow system as of 2026-07-01. The codebase lives at `/Users/azaxghulam/flavourflow`.*
