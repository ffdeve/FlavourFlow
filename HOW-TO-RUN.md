# FlavourFlow — How to Run (Evaluator Guide)

**FlavourFlow** is an AI-powered cooking companion (a cross-platform mobile app for Android & iOS).
This guide explains, step by step, how to unzip and run the app from source. No prior React Native
experience is needed — just follow the steps in order.

> **Estimated time:** ~10 minutes (most of it is the one-time `npm install`).

---

## What you need first (prerequisites)

1. **A computer** (Windows, macOS, or Linux).
2. **Node.js 18 or newer** — download from <https://nodejs.org> (the "LTS" version is fine).
   To check if it's already installed, open a terminal / command prompt and run:
   ```bash
   node --version
   ```
   You should see something like `v18.x` or higher.
3. **A phone** with the free **Expo Go** app installed:
   - Android: search "Expo Go" on the Google Play Store.
   - iPhone: search "Expo Go" on the App Store.

   *(Alternatively, an Android emulator or iOS simulator works too, but a real phone is easiest.)*

---

## Step-by-step

### 1. Unzip the project
Extract `FlavourFlow-App-Code.zip`. You will get a folder named **`flavourflow`** containing the
project files (`src/`, `package.json`, `README.md`, etc.).

### 2. Open a terminal inside that folder
- **Windows:** open the `flavourflow` folder, then in the address bar type `cmd` and press Enter.
- **macOS:** right-click the folder → *New Terminal at Folder*.
- Or open your terminal and `cd` into the folder, e.g. `cd Downloads/flavourflow`.

### 3. Install the dependencies (one time)
```bash
npm install
```
This downloads the libraries the app needs. It takes a few minutes the first time — that is normal.

### 4. Create the configuration file
The app connects to a cloud backend (Supabase). Create a file named **`.env`** in the `flavourflow`
folder with the two lines below.

The quickest way: copy the included `.env.example` file, rename the copy to `.env`, and paste in
these values:

```
EXPO_PUBLIC_SUPABASE_URL=https://gcuunqmbapmoelvczanv.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_m1FVWBhsdK8WDFT001qS7g_s_zAMsuy
```

> These are the app's **public** client keys (the same ones inside the published app). They are safe
> to use here; all data is protected server-side by row-level security.

### 5. Start the app
```bash
npx expo start
```
A **QR code** will appear in the terminal. Then:
- **On Android:** open **Expo Go** → *Scan QR code* → point it at the QR code.
- **On iPhone:** open the **Camera** app → point it at the QR code → tap the banner that appears.
- **On an emulator/simulator:** press `a` (Android) or `i` (iOS) in the terminal.

The app will build and open on your phone in a few moments.

### 6. Sign in
The fastest way to get in is **"Continue with Google"** on the login screen — it logs you straight in.
You can also register with an email and password if you prefer.

---

## If the app doesn't open or shows a blank/stale screen

Stop the server (press `Ctrl + C` in the terminal) and restart it with the **cache cleared**:

```bash
npx expo start -c
```

(`-c` is short for `--clear`.) This fixes almost all "blank screen", "stuck loading", or
"unable to resolve module" issues. Wait for the QR code, then scan again.

---

## Quick troubleshooting

| Problem | Fix |
|---------|-----|
| `node` or `npm` "not recognized" | Node.js isn't installed — install it from <https://nodejs.org> and reopen the terminal. |
| App won't load / blank screen | Restart with `npx expo start -c` (clears the cache). |
| "Unable to resolve module …" | Run `npm install` again, then `npx expo start -c`. |
| QR code won't scan / phone can't connect | Make sure the phone and computer are on the **same Wi-Fi network**. |
| Phone shows an old version after a change | Shake the phone → *Reload*, or restart with `npx expo start -c`. |

---

## Good to know

- **Core features** (recipes, AI chat with ChefBoo, "What's in Your Fridge?", search, community,
  cooking mode, settings, Urdu) all work in **Expo Go**.
- A few **device-only features** — voice-to-text, push notifications, and background cooking timers —
  need a full native build (`npm run android` / `npm run ios`) and are limited inside Expo Go. This is
  a normal Expo constraint, not a bug.
- For a deeper technical walkthrough of the code, database, and AI logic, see **`README.md`** and
  **`CODEBASE_GUIDE.md`** in the same folder.

---

*FlavourFlow — BS Computer Science Final Year Project, The University of Lahore.
Muhammad Usman · Muhammad Haroon Hanif · Abdul Mateen.*
