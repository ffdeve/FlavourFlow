# FlavourFlow 🍽️

AI-powered cooking app for Pakistani households that suggests recipes from available ingredients, guides step-by-step cooking, supports Urdu and voice input, with a social food community.

## 🚀 Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials (already configured)

3. **Start the app**

   ```bash
   npx expo start
   ```

4. **Run on device**
   - Scan QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

## 📁 Project Structure

```
flavourflow/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication flow
│   │   ├── welcome.tsx    # Landing page
│   │   ├── login.tsx      # Sign in
│   │   ├── signup.tsx     # Create account
│   │   └── onboarding.tsx # Preferences setup
│   ├── (tabs)/            # Main app tabs
│   │   ├── index.tsx      # Home (recommendations)
│   │   ├── search.tsx     # Recipe search
│   │   ├── community.tsx  # Social feed
│   │   └── profile.tsx    # User profile
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── components/
│   └── ui/               # Reusable UI components
│       ├── button.tsx
│       ├── input.tsx
│       └── card.tsx
├── screens/              # Feature screens (organized by feature)
│   ├── auth/
│   ├── home/
│   ├── recipe/
│   ├── community/
│   └── profile/
├── services/             # API services
│   ├── auth.service.ts
│   └── profile.service.ts
├── store/               # Zustand state management
│   └── auth.store.ts
├── hooks/               # Custom React hooks
│   └── use-auth.ts
├── lib/                 # Utilities & config
│   ├── supabase.ts     # Supabase client
│   └── utils.ts        # Helper functions
├── types/              # TypeScript definitions
│   ├── index.ts
│   └── env.d.ts
└── constants/          # App constants
    └── colors.ts
```

## ✅ Setup Complete - Foundation Ready

### What's Implemented:

- ✅ **Authentication System**: Email/password auth with Supabase
- ✅ **User Profiles**: Profile creation and management
- ✅ **Onboarding Flow**: Diet preferences, cuisines, allergies
- ✅ **Navigation**: File-based routing with protected routes
- ✅ **State Management**: Zustand for global state
- ✅ **UI Components**: Button, Input, Card with NativeWind
- ✅ **Database**: Supabase with full schema
- ✅ **Type Safety**: Complete TypeScript definitions

### Next Steps to Build:

1. **Recipe Services** - API calls for recipes CRUD
2. **AI Recommendations** - Meal suggestion algorithm
3. **Smart Pantry** - Ingredient management + voice input
4. **Recipe Search** - Filters, sorting, search
5. **Cooking Mode** - Step-by-step with timers
6. **Community Feed** - Posts, comments, likes
7. **Recipe Upload** - User-generated content
8. **Ratings & Reviews** - 5-star system
9. **Trending Section** - Popular recipes
10. **Localization** - Urdu translation system

## 🛠 Tech Stack

- **Frontend**: React Native + Expo SDK 54
- **Navigation**: Expo Router v6 (file-based)
- **Styling**: NativeWind v4 (Tailwind for RN)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State**: Zustand
- **Language**: TypeScript
- **Animations**: React Native Reanimated

## 📱 Features Roadmap

### MVP (Current Phase)

- [x] Authentication & user profiles
- [x] Onboarding with preferences
- [ ] AI meal recommendations
- [ ] Smart pantry management
- [ ] Recipe search & filters
- [ ] Interactive cooking mode
- [ ] Community feed
- [ ] User recipe uploads
- [ ] Ratings & reviews
- [ ] Trending recipes

### V2 (Future)

- [ ] Voice commands in cooking mode
- [ ] Video recipe tutorials
- [ ] Meal planning calendar
- [ ] Shopping list generation
- [ ] Advanced AI (ML-based recommendations)
- [ ] Push notifications
- [ ] Offline mode
- [ ] Social features (follow, share)

## 🗄️ Database Schema

All tables created in Supabase:

- `profiles` - User profile data
- `user_preferences` - Diet/allergies/cuisines
- `recipes` - Recipe catalog
- `pantry_items` - User ingredients
- `recipe_interactions` - Likes, saves, views
- `reviews` - Ratings & text reviews
- `posts` - Community feed posts
- `comments` - Post comments
- `post_likes` - Post engagement

## 🔐 Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://gcuunqmbapmoelvczanv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

## 📝 Development

Run with cache clearing:

```bash
npx expo start -c
```

Type checking:

```bash
npx tsc --noEmit
```

## 🎨 Design System

- **Primary Color**: #FBA82E (Golden Yellow)
- **Background**: #FCF0D6 (Cream)
- **Interactive**: #EDD8A9 (Darker Cream)
- **Text**: #3B3328 (Dark Brown)
- **Font**: Poppins (300, 400, 500, 600, 700)
- **Spacing**: 4px base unit
- **Border Radius**: 8px standard

**See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for complete design documentation.**

---

**Status**: Foundation complete, ready for feature development! 🚀

# FlavourFlow

# FlavourFlow

```
flavourflow
├─ DESIGN_SYSTEM.md
├─ FF-ChefBoo
│  ├─ 0130(1).mov
│  ├─ 0130.mov
│  ├─ ChatGPT Image Dec 21, 2025, 04_48_02 PM.png
│  ├─ Chef_Ghost_Animation_Video_Generated.mp4
│  ├─ Cute_Character_Animation_Generation.mp4
│  ├─ Cute_D_Character_Animation_Generation-Picsart-BackgroundRemover (1).mp4
│  ├─ Cute_D_Character_Animation_Generation.mp4
│  ├─ Gemini_Generated_Image_14y93o14y93o14y9.png
│  ├─ Gemini_Generated_Image_1rgr4y1rgr4y1rgr.png
│  ├─ Gemini_Generated_Image_2d8kh32d8kh32d8k.png
│  ├─ Gemini_Generated_Image_39hgwk39hgwk39hg.png
│  ├─ Gemini_Generated_Image_3ib2eb3ib2eb3ib2.png
│  ├─ Gemini_Generated_Image_4ynnth4ynnth4ynn.png
│  ├─ Gemini_Generated_Image_5blr8l5blr8l5blr.png
│  ├─ Gemini_Generated_Image_69t8fm69t8fm69t8.png
│  ├─ Gemini_Generated_Image_80rzw580rzw580rz.png
│  ├─ Gemini_Generated_Image_89xrxb89xrxb89xr.png
│  ├─ Gemini_Generated_Image_a66ipda66ipda66i.png
│  ├─ Gemini_Generated_Image_adxkf2adxkf2adxk.png
│  ├─ Gemini_Generated_Image_ancrs3ancrs3ancr.png
│  ├─ Gemini_Generated_Image_bjkhpzbjkhpzbjkh.png
│  ├─ Gemini_Generated_Image_bqv6lrbqv6lrbqv6.png
│  ├─ Gemini_Generated_Image_byt46pbyt46pbyt4.png
│  ├─ Gemini_Generated_Image_c7j17fc7j17fc7j1.png
│  ├─ Gemini_Generated_Image_fl16jsfl16jsfl16.png
│  ├─ Gemini_Generated_Image_i7y8w4i7y8w4i7y8.png
│  ├─ Gemini_Generated_Image_ic1jrqic1jrqic1j.png
│  ├─ Gemini_Generated_Image_jvmbimjvmbimjvmb.png
│  ├─ Gemini_Generated_Image_kkluk1kkluk1kklu.png
│  ├─ Gemini_Generated_Image_l5s3rol5s3rol5s3 (1).png
│  ├─ Gemini_Generated_Image_l5s3rol5s3rol5s3.png
│  ├─ Gemini_Generated_Image_nohyjmnohyjmnohy.png
│  ├─ Gemini_Generated_Image_oqbt5ooqbt5ooqbt-Photoroom.png
│  ├─ Gemini_Generated_Image_oqbt5ooqbt5ooqbt.png
│  ├─ Gemini_Generated_Image_pl8w0spl8w0spl8w.png
│  ├─ Gemini_Generated_Image_rj3krrj3krrj3krr.png
│  ├─ Gemini_Generated_Image_rk75zbrk75zbrk75 (1).png
│  ├─ Gemini_Generated_Image_rk75zbrk75zbrk75.png
│  ├─ Gemini_Generated_Image_s4d0ozs4d0ozs4d0.png
│  ├─ Gemini_Generated_Image_wcposdwcposdwcpo.png
│  ├─ Gemini_Generated_Image_wl0q5hwl0q5hwl0q.png
│  ├─ Gemini_Generated_Image_xqa2avxqa2avxqa2.png
│  ├─ Gemini_Generated_Image_y2goney2goney2go.png
│  ├─ Gemini_Generated_Image_z482ouz482ouz482.png
│  ├─ Gemini_Generated_Image_z7wpa0z7wpa0z7wp.png
│  ├─ Gemini_Generated_Image_zf76pozf76pozf76.png
│  ├─ Login_Main_Page.png
│  ├─ Register1st.png
│  ├─ Register1st_2x.png
│  ├─ Register2nd.png
│  ├─ SignUpHome.png
│  ├─ SignUpHome_2x.png
│  ├─ Untitled design (15).png
│  ├─ Untitled design (16).png
│  ├─ Untitled design (19).png
│  ├─ Untitled design (2)
│  │  ├─ 2.png
│  │  ├─ 3.png
│  │  ├─ 4.png
│  │  └─ 5.png
│  ├─ Untitled design (20).png
│  ├─ Untitled design (22).png
│  ├─ Untitled design (27).png
│  ├─ Untitled design (28).png
│  ├─ front-view-woman-looking-man-cooking.jpg
│  ├─ ghost-8356786_1920.png
│  ├─ kitchen-interior-design-with-wooden-table.jpg
│  ├─ knife_carrot_1x.png
│  ├─ knife_carrot_2x.png
│  ├─ onbarding_image.png
│  ├─ onbarding_image_transparent.png
│  ├─ onboardingclip-green.mp4
│  └─ onboardingclip.mov
├─ README.md
├─ app
│  ├─ (auth)
│  │  ├─ _layout.tsx
│  │  ├─ forgot-password.tsx
│  │  ├─ forgotPasword
│  │  │  └─ forgot-password.tsx
│  │  ├─ login
│  │  │  ├─ LogInHomeScreen.tsx
│  │  │  └─ login-email.tsx
│  │  ├─ onboarding.tsx
│  │  ├─ signup
│  │  │  ├─ SignupHomeScreen.tsx
│  │  │  ├─ register-with-email-setup.tsx
│  │  │  └─ regitser-with-email-password-setup.tsx
│  │  └─ welcome.tsx
│  ├─ (tabs)
│  │  ├─ _layout.tsx
│  │  ├─ community.tsx
│  │  ├─ index.tsx
│  │  ├─ profile.tsx
│  │  └─ search.tsx
│  ├─ _layout.tsx
│  ├─ globals.css
│  ├─ index.tsx
│  └─ screens
│     ├─ auth
│     ├─ community
│     ├─ home
│     ├─ profile
│     └─ recipe
├─ app.json
├─ assets
│  └─ images
│     ├─ android-icon-background.png
│     ├─ android-icon-foreground.png
│     ├─ android-icon-monochrome.png
│     ├─ favicon.png
│     ├─ icon.png
│     ├─ partial-react-logo.png
│     ├─ react-logo.png
│     ├─ react-logo@2x.png
│     ├─ react-logo@3x.png
│     └─ splash-icon.png
├─ babel.config.js
├─ components
│  └─ ui
│     ├─ back-button.tsx
│     ├─ button.tsx
│     ├─ card.tsx
│     └─ input.tsx
├─ constants
│  ├─ colors.ts
│  └─ typography.ts
├─ eslint.config.js
├─ examples
│  └─ design-system-usage.tsx
├─ figma-desgin
│  ├─ Bottom Bar.png
│  ├─ Continue with Email.png
│  ├─ Create recipe.png
│  ├─ Far far away, behind.png
│  ├─ FlavourFLow.png
│  ├─ Forgot Password.png
│  ├─ Heading.png
│  ├─ Home Indicator.png
│  ├─ Home.png
│  ├─ Icon
│  │  ├─ Arrow-Right-1.svg
│  │  ├─ Arrow-Right-2.svg
│  │  ├─ Arrow-Right-3.svg
│  │  ├─ Arrow-Right-4.svg
│  │  ├─ Arrow-Right.svg
│  │  ├─ Edit.svg
│  │  ├─ Filter.svg
│  │  ├─ Minus-Border-1.svg
│  │  ├─ Minus-Border.svg
│  │  ├─ Plus-Border.svg
│  │  └─ Plus.svg
│  ├─ LogIn_front_photo.png
│  ├─ Notifications.png
│  ├─ Onboarding.png
│  ├─ Profile page.png
│  ├─ Recipe detail-cahnged.png
│  ├─ Register with Email-1.png
│  ├─ Register with Email-2.png
│  ├─ Set New Password.png
│  ├─ Set Prefernces-Complete.png
│  ├─ Set Prefernces-Country.png
│  ├─ Set Prefernces-Cusinies.png
│  ├─ Set Prefernces-Dislikes.png
│  ├─ Sign-In.png
│  ├─ Sign-Up.png
│  ├─ Status Bar.png
│  ├─ Tabs.png
│  ├─ Today.png
│  ├─ Verify Email -forgot passoword.png
│  ├─ Verify Email-success.png
│  ├─ Verify Email.png
│  └─ Yesterday.png
├─ hooks
│  └─ use-auth.ts
├─ lib
│  ├─ supabase.ts
│  └─ utils.ts
├─ metro.config.js
├─ nativewind-env.d.ts
├─ package-lock.json
├─ package.json
├─ services
│  ├─ auth.service.ts
│  └─ profile.service.ts
├─ store
│  └─ auth.store.ts
├─ supabase
│  ├─ README.md
│  └─ migrations
│     ├─ 001_create_ingredients.sql
│     ├─ 002_create_recipe_ingredients.sql
│     ├─ 003_create_ratings.sql
│     ├─ 004_create_application_settings.sql
│     ├─ 005_create_recipe_recommendations.sql
│     ├─ 006_create_cooking_sessions.sql
│     └─ 007_create_likes.sql
├─ tailwind.config.js
├─ tsconfig.json
└─ types
   ├─ env.d.ts
   ├─ index.ts
   └─ react-native-country-picker-modal.d.ts

```