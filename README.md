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
