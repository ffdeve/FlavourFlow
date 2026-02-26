# Fresh Clone Setup Guide

If you're cloning this repository for the first time, follow these steps carefully:

## Step 1: Install Dependencies
```bash
git clone <repository-url>
cd flavourflow
npm install
```

## Step 2: Setup Environment Variables (IMPORTANT!)
Before running the app, you must create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` and add your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
```

**If you skip this step or create `.env` after starting the dev server, the app will show the Expo welcome screen!**

## Step 3: Clear Cache and Start
```bash
npx expo start --clear
```

Press `i` for iOS or `a` for Android in the terminal.

---

## Troubleshooting

### Still seeing the Expo welcome screen?

1. **Make sure .env exists** - Check that you created the `.env` file BEFORE running `expo start`
2. **Clear everything**:
   ```bash
   rm -rf node_modules .expo
   npm install
   npx expo start --clear
   ```
3. **Check console logs** - Look for error messages about missing Supabase credentials
4. **Verify .env values** - Double-check that your Supabase URL and key are correct

### Environment variables not loading?

If you created `.env` AFTER running `expo start`:
1. Stop the dev server (Ctrl+C)
2. Clear cache: `rm -rf .expo`
3. Restart: `npx expo start --clear`

The Metro bundler caches files at startup, so the `.env` file must exist before the first build.

---

## Getting Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Sign in to your project
3. Go to **Settings → API**
4. Copy the **Project URL** and **Anon Public Key**
5. Paste them into your `.env` file

