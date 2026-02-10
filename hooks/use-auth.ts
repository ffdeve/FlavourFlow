import { useEffect } from "react";
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
    signOut,
    updateProfile,
    updatePreferences,
  } = useAuthStore();

  const isAuthenticated = !!session && !!user;

  return {
    session,
    user,
    profile,
    preferences,
    isLoading,
    isInitialized,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    updateProfile,
    updatePreferences,
  };
}
