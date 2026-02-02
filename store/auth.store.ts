import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile, UserPreferences } from '@/types';
import { authService } from '@/services/auth.service';
import { profileService } from '@/services/profile.service';

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
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
        const [profile, preferences] = await Promise.all([
          profileService.getProfile(session.user.id),
          profileService.getPreferences(session.user.id),
        ]);

        set({
          session,
          user: session.user,
          profile,
          preferences,
          isLoading: false,
          isInitialized: true,
        });
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
          const [profile, preferences] = await Promise.all([
            profileService.getProfile(session.user.id),
            profileService.getPreferences(session.user.id),
          ]);

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
      console.error('Auth initialization error:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const { session, user } = await authService.signIn(email, password);
      
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
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    try {
      set({ isLoading: true });
      const { session, user } = await authService.signUp(email, password, fullName);
      
      if (user) {
        // Create profile
        const profile = await profileService.upsertProfile({
          id: user.id,
          full_name: fullName,
          language: 'en',
        });

        set({
          session,
          user,
          profile,
          isLoading: false,
        });
      }
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
    if (!user || !profile) throw new Error('Not authenticated');

    const updatedProfile = await profileService.upsertProfile({
      ...profile,
      ...updates,
      id: user.id,
    });

    set({ profile: updatedProfile });
  },

  updatePreferences: async (updates: Partial<UserPreferences>) => {
    const { user, preferences } = get();
    if (!user) throw new Error('Not authenticated');

    const updatedPreferences = await profileService.upsertPreferences({
      ...(preferences || {}),
      ...updates,
      user_id: user.id,
    });

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
}));
