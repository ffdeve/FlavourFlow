# FlavourFlow 🍽️

**FlavourFlow** is an AI-powered cooking companion built for Pakistani households. It suggests recipes from the ingredients you already have, guides you hands-free through each cooking step, understands Urdu and voice, and connects home cooks in a social food community.

> Final Year Project — BS Computer Science, The University of Lahore.
> This repository is private to the project team; it is not intended for public distribution or reuse.

---

## What FlavourFlow Does

- **ChefBoo, the AI sous-chef** — chat with an AI cooking assistant that answers questions, suggests recipes, and can generate brand-new recipes tailored to your taste, powered by Google Gemini.
- **"What's in Your Fridge?"** — tell ChefBoo the ingredients you have and get recipes you can actually make right now.
- **Personalized recommendations** — a learning recommendation engine ranks recipes for you using your preferences, cooking history, and real-time trending signals, presented in Netflix-style rows (For You, Trending, Cook It Again, Jump Back In).
- **Hands-free cooking mode** — step-by-step guidance with smart timers, embedded videos, heat/temperature cues, and voice control so you never touch the screen with messy hands.
- **Recipe creation** — build and publish your own recipes with a structured, multi-step editor (ingredients, steps, kitchen essentials, images, video).
- **Ratings & reviews** — rate and review a recipe after you've cooked it; ratings feed back into the recommendation engine.
- **Social community** — a feed to post cooking photos, comment, like, follow other cooks, and share recipes.
- **Notifications** — real-time in-app and push notifications for follows, likes, comments, reviews, and cooking timers.
- **Urdu & voice** — recipe translation (English / Urdu / Roman Urdu) and voice-to-text throughout.
- **Allergy & diet awareness** — recipes are screened against your allergies, dislikes, and dietary preferences with clear on-screen warnings.

## Requirement Coverage

The app implements all 12 functional requirements from the project SRS:

| # | Requirement | Where it lives |
|---|-------------|----------------|
| FR-01 | Account Management | Supabase Auth · onboarding & profile screens |
| FR-02 | User Preference Management | preferences onboarding · `user_preferences` |
| FR-03 | Meal Recommendation | `generate-recommendations` engine · home feed |
| FR-04 | Recipe Interactions | like / save / share / comment + interaction logging |
| FR-05 | Recipe Search & Discovery | search screen · filters · fuzzy search |
| FR-06 | Community Dashboard | community tab · posts · comments |
| FR-07 | Recipe Upload & Management | create-recipe wizard · edit / delete |
| FR-08 | Rate & Review | reviews (gated on having cooked the recipe) |
| FR-09 | Smart Pantry / "What's in Your Fridge?" | ChefBoo ingredient-based generation |
| FR-10 | Cooking Assistance | cooking mode · timers · voice · video |
| FR-11 | Trending & Popular | trending section in recommendations |
| FR-12 | Manage Application Settings | settings · language · notification toggles |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile app | React Native + Expo SDK 54 (Expo Router) |
| Styling | NativeWind (Tailwind for React Native) |
| State | Zustand |
| Backend | Supabase — PostgreSQL, Auth, Storage, Realtime, Edge Functions |
| AI | Google Gemini 2.5 Flash (ChefBoo, recipe generation, translation) |
| Serverless | Deno (Supabase Edge Functions) |
| Push | Expo Push Service |
| Build & deploy | EAS Build (Android APK / AAB) |

## Getting Started

### Prerequisites

- **Node.js 18+** and **npm**
- The **Expo Go** app on a physical device, or an Android/iOS emulator
- A **`.env`** file in the project root — copy `.env.example` and fill in the Supabase URL and publishable key

### 1. Install dependencies

```bash
npm install
```

Run this first, and again any time `package.json` changes or after pulling new code.

### 2. Run the app

```bash
npx expo start
```

Then scan the QR code with **Expo Go** (Android) or the **Camera** app (iOS), or press `a` / `i` to open an emulator.

> **App not showing, blank screen, stale content, or a "unable to resolve module" error?**
> Restart with a cleared Metro cache:
>
> ```bash
> npx expo start --clear      # or the short form:  npx expo start -c
> ```
>
> Clearing the cache resolves most blank-screen, stale-asset, and module-resolution issues — especially after switching branches, installing dependencies, or changing configuration.

### Useful commands

| Command | What it does |
|---------|--------------|
| `npx expo start` | Start the Metro dev server |
| `npx expo start -c` | Start with a **cleared cache** (use if the app won't load) |
| `npm run android` | Build & run a native Android dev build |
| `npm run ios` | Build & run a native iOS dev build (macOS + Xcode) |
| `npm run lint` | Run ESLint |

> **Note:** Some native features — voice-to-text, push notifications, and background cooking timers — require a **native dev build** (`npm run android` / `npm run ios` or an EAS build) and do **not** work in Expo Go.

## Architecture at a Glance

```
Mobile App (Expo / React Native)
        │
        ▼
Supabase  ──  Auth · PostgreSQL (RLS) · Storage · Realtime · Edge Functions
        │
        ├── ai-chat                 → ChefBoo (Gemini) + recipe translation + rate limiting
        ├── generate-recommendations → personalization / ranking engine
        └── send-push               → Expo push delivery on new notifications
```

For a deep technical walkthrough of the codebase, database schema, AI logic, and the recommendation algorithm, see [CODEBASE_GUIDE.md](CODEBASE_GUIDE.md).

## Security

- All backend traffic runs over TLS; Postgres Row Level Security restricts every table to its owner.
- Passwords are hashed by Supabase Auth; the client only ever holds the public *publishable* key.
- All secrets (Gemini API key, Supabase service-role key) live in server-side environment variables and are **never** committed to the repository.

## Team

Muhammad Usman · Muhammad Haroon Hanif · Abdul Mateen — supervised by Mishal Muneer & M. Ali Ilyas.
