import { authService } from "@/services/auth.service";
import { profileService } from "@/services/profile.service";
import { registerPushToken } from "@/services/notifications";
import type { Profile, UserPreferences } from "@/types";
import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

// Check if all 4 preference sections are filled
const generateRandomUsername = () => `user_${Math.random().toString(36).substring(2, 10)}`;

const isPreferenceComplete = (preferences: UserPreferences | null): boolean => {
  if (!preferences) return false;
  
  const hasCountry = Array.isArray(preferences.preferred_country) && preferences.preferred_country.length >= 1;
  const hasCuisines = Array.isArray(preferences.preferred_cuisines) && preferences.preferred_cuisines.length >= 5;
  const hasAllergyAck = true; // Allergies step is optional — acknowledged by reaching step 4
  const hasSpice = typeof preferences.spice_level === 'number' && preferences.spice_level >= 1 && preferences.spice_level <= 5;

  return hasCountry && hasCuisines && hasAllergyAck && hasSpice;
};

// Calculate completion percentage for display (0-100)
const calculatePreferenceCompletion = (preferences: UserPreferences | null): number => {
  if (!preferences) return 0;
  if (preferences.preference_completed) return 100;

  let score = 0;
  if (Array.isArray(preferences.preferred_country) && preferences.preferred_country.length >= 1) score += 25;
  if (Array.isArray(preferences.preferred_cuisines) && preferences.preferred_cuisines.length >= 5) score += 25;
  // Allergies are optional, so they always count once the user passes step 3
  if (Array.isArray(preferences.allergies)) score += 25;
  if (typeof preferences.spice_level === 'number' && preferences.spice_level >= 1) score += 25;

  return score;
};

interface AuthState {
  // State
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsEmailVerification: boolean }>;
  verifyOtp: (email: string, token: string, type: 'signup' | 'recovery', fullName?: string) => Promise<void>;
  resendOtp: (email: string, type: 'signup' | 'recovery') => Promise<void>;
  signInWithOAuth: (provider: "google" | "facebook" | "apple", redirectTo?: string) => Promise<any>;
  setSessionFromUrl: (url: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  markPreferencesComplete: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getPreferenceCompletion: () => number;
  isPreferenceDone: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  preferences: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Get current session
      const session = await authService.getSession();

      if (session?.user) {
        // Load profile and preferences
        let [profile, preferences] = await Promise.all([
          profileService.getProfile(session.user.id),
          profileService.getPreferences(session.user.id),
        ]);

        if (!profile) {
          profile = await profileService.upsertProfile({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
            username: generateRandomUsername(),
            language: "en",
          });
        }

        set({
          session,
          user: session.user,
          profile,
          preferences,
          isLoading: false,
          isInitialized: true,
        });

        // Fire-and-forget: register this device for background push.
        registerPushToken(session.user.id);
      } else {
        set({
          session: null,
          user: null,
          profile: null,
          preferences: null,
          isLoading: false,
          isInitialized: true,
        });
      }

      // Subscribe to auth changes
      authService.onAuthStateChange(async (session) => {
        if (session?.user) {
          let [profile, preferences] = await Promise.all([
            profileService.getProfile(session.user.id),
            profileService.getPreferences(session.user.id),
          ]);

          if (!profile) {
            profile = await profileService.upsertProfile({
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
              username: generateRandomUsername(),
              language: "en",
            });
          }

          set({
            session,
            user: session.user,
            profile,
            preferences,
          });
        } else {
          set({
            session: null,
            user: null,
            profile: null,
            preferences: null,
          });
        }
      });
    } catch (error) {
      console.error("Auth initialization error:", error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const { session, user } = await authService.signIn(email, password);

      let [profile, preferences] = await Promise.all([
        profileService.getProfile(user.id),
        profileService.getPreferences(user.id),
      ]);

      if (!profile) {
        profile = await profileService.upsertProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || email.split("@")[0] || "User",
          username: generateRandomUsername(),
          language: "en",
        });
      }

      set({
        session,
        user,
        profile,
        preferences,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signInWithOAuth: async (provider: "google" | "facebook" | "apple", redirectTo?: string) => {
    try {
      set({ isLoading: true });
      const data = await authService.signInWithOAuth(provider, redirectTo);
      set({ isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setSessionFromUrl: async (url: string) => {
    try {
      set({ isLoading: true });
      const sessionData = await authService.setSessionFromUrl(url);
      if (sessionData && sessionData.user) {
        const { session, user } = sessionData;
        const [profile, preferences] = await Promise.all([
          profileService.getProfile(user.id),
          profileService.getPreferences(user.id),
        ]);
        set({
          session,
          user,
          profile,
          preferences,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    try {
      set({ isLoading: true });
      const { session, user } = await authService.signUp(
        email,
        password,
        fullName,
      );

      if (user) {
        if (session) {
          // If we have a session immediately (email confirmation OFF), create profile now
          const profile = await profileService.upsertProfile({
            id: user.id,
            full_name: fullName,
            username: generateRandomUsername(),
            language: "en",
          });

          set({
            session,
            user,
            profile,
            isLoading: false,
          });
          return { needsEmailVerification: false };
        } else {
          set({ isLoading: false });
          // If no session exists, Supabase requires Email Confirmation.
          // We WAIT to create the profile until verifyOtp is called to avoid RLS errors.
          return { needsEmailVerification: true };
        }
      }
      return { needsEmailVerification: false };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  verifyOtp: async (email: string, token: string, type: 'signup' | 'recovery', fullName?: string) => {
    try {
      set({ isLoading: true });
      const { session, user } = await authService.verifyOtp(email, token, type);
      
      if (session && user) {
        // Now that we HAVE a session, we can safely create or fetch the profile
        let profile = await profileService.getProfile(user.id);
        
        if (!profile && fullName) {
          // Create the missing profile now that we are authenticated
          profile = await profileService.upsertProfile({
            id: user.id,
            full_name: fullName,
            username: generateRandomUsername(),
            language: "en",
          });
        }

        const preferences = await profileService.getPreferences(user.id);

        set({
          session,
          user,
          profile,
          preferences,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  resendOtp: async (email: string, type: 'signup' | 'recovery') => {
    try {
      set({ isLoading: true });
      await authService.resendOtp(email, type);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      await authService.signOut();
      set({
        session: null,
        user: null,
        profile: null,
        preferences: null,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user, profile } = get();
    if (!user || !profile) throw new Error("Not authenticated");

    const updatedProfile = await profileService.upsertProfile({
      ...profile,
      ...updates,
      id: user.id,
    });

    set({ profile: updatedProfile });
  },

  updatePreferences: async (updates: Partial<UserPreferences>) => {
    const { user, preferences } = get();
    if (!user) throw new Error("Not authenticated");

    // Safeguard: Check database directly to see if profile exists to prevent FK constraint error
    let activeProfile = await profileService.getProfile(user.id);
    if (!activeProfile) {
      activeProfile = await profileService.upsertProfile({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        username: generateRandomUsername(),
        language: "en",
      });
    }
    set({ profile: activeProfile });

    const updatedPreferences = await profileService.upsertPreferences({
      ...(preferences || {}),
      ...updates,
      user_id: user.id,
    });

    set({ preferences: updatedPreferences });
  },

  markPreferencesComplete: async () => {
    const { user } = get();
    if (!user) throw new Error("Not authenticated");

    const updatedPreferences = await profileService.markPreferencesCompleted(user.id);
    set({ preferences: updatedPreferences });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    const [profile, preferences] = await Promise.all([
      profileService.getProfile(user.id),
      profileService.getPreferences(user.id),
    ]);

    set({ profile, preferences });
  },

  getPreferenceCompletion: () => {
    const { preferences } = get();
    return calculatePreferenceCompletion(preferences);
  },

  isPreferenceDone: () => {
    const { preferences } = get();
    return preferences?.preference_completed === true || isPreferenceComplete(preferences);
  },
}));
