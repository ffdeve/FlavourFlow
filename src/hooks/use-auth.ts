import { useAuthStore } from "@/store/auth.store";

export function useAuth() {
  const {
    session,
    user,
    profile,
    preferences,
    isLoading,
    isInitialized,
    signIn,
    signUp,
    verifyOtp,
    resendOtp,
    signInWithOAuth,
    setSessionFromUrl,
    signOut,
    updateProfile,
    updatePreferences,
    getPreferenceCompletion,
    isPreferenceDone,
  } = useAuthStore();

  const isAuthenticated = !!session && !!user;
  const preferenceCompletion = getPreferenceCompletion();
  const preferenceDone = isPreferenceDone();

  return {
    session,
    user,
    profile,
    preferences,
    isLoading,
    isInitialized,
    isAuthenticated,
    preferenceCompletion,
    preferenceDone,
    signIn,
    signUp,
    verifyOtp,
    resendOtp,
    signInWithOAuth,
    setSessionFromUrl,
    signOut,
    updateProfile,
    updatePreferences,
  };
}
