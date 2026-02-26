# FlavourFlow Setup Guide

## ✅ Pre-Flight Checklist Before Running

Follow these steps to ensure the app runs without issues after cloning:

### 1. **Environment Variables** ⚠️
The app requires Supabase environment variables. There's a naming inconsistency to be aware of:

**Current `.env` file uses:**
```env


```

**⚠️ Issue:** The variable name is `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` but the `.env.example` and TypeScript types reference `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

**Fix:** When cloning, make sure your `.env` file matches:
```env
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key
```

### 2. **Update TypeScript Declarations**
Update [`types/env.d.ts`](types/env.d.ts) to match the actual env variable names:
```typescript
declare module "@env" {
  export const EXPO_PUBLIC_SUPABASE_URL: string;
  export const EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
}
```

### 3. **Update `.env.example`**
Update [`.env.example`](.env.example) for consistency:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 4. **Install Dependencies**
```bash
npm install
```

### 5. **Clear Expo Cache (if experiencing issues)**
```bash
npx expo start --clear
```

### 6. **Verify All Assets Exist**
All image assets are already in place at `/FF-ChefBoo/`:
- ✅ `onbarding_image_transparent.png` (Welcome screen)
- ✅ `knife_carrot_2x.png` (Login screen)
- ✅ `Register1st_2x.png` (Signup step 1)
- ✅ `Register2nd.png` (Signup step 2 - Password)
- ✅ `SignUpHome_2x.png` (Signup home)

### 7. **Verify Core Layout Files**
All layout files exist:
- ✅ `app/_layout.tsx` - Root layout with fonts
- ✅ `app/index.tsx` - Entry point with auth routing
- ✅ `app/(auth)/_layout.tsx` - Auth stack
- ✅ `app/(tabs)/_layout.tsx` - Tabs layout
- ✅ `app/(auth)/welcome.tsx` - First auth screen

## 🚀 How to Run

```bash
# Start the development server
npm start
# or
npx expo start

# Run on device
# - Scan QR code with Expo Go
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
```

## ✅ Expected Behavior

When you run the app:
1. **Initial Load:** Shows loading state
2. **First Screen:** Welcome screen with "FlavourFlow" title (not the default black screen with touch/_layout.tsx button)
3. **Navigation:** Routes to `/(auth)/welcome` on first load
4. **Auth Flow:** Welcome → Signup/Login → Onboarding → Home

## 🐛 Troubleshooting

### Black Screen with "touch/_layout.tsx" Button
This indicates the app failed to navigate properly. Causes:
1. Missing or invalid Supabase credentials in `.env`
2. Auth initialization failed
3. Font loading failed

**Solution:**
- Ensure `.env` has correct `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Check console logs: `npm start` shows detailed error messages
- Try clearing cache: `npx expo start --clear`

### Font Not Loading
Error mentioning Poppins fonts:
- Fonts are loaded in `app/_layout.tsx`
- Wait for fonts to load before first render
- If stuck, restart: `npm start`

### Image Not Found
If images fail to load:
- Ensure all files exist in `/FF-ChefBoo/` directory
- Check file names are exactly as referenced (case-sensitive)
- Current images: `Register1st_2x.png`, `Register2nd.png`, etc.

## 📋 Files with Inconsistencies (Ready to Fix)

These files have environment variable naming issues that should be updated together:
1. `types/env.d.ts` - Update `EXPO_PUBLIC_SUPABASE_ANON_KEY` → `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
2. `.env.example` - Update key name to match `.env`
3. `lib/supabase.ts` - Already correct ✅

---

**Last Updated:** February 17, 2026
