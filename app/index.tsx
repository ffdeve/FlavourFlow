import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();
  const navigationAttempted = useRef(false);

  useEffect(() => {
    // Give a 2 second timeout for initialization, then navigate anyway
    const initTimeout = setTimeout(() => {
      if (navigationAttempted.current) return;
      
      navigationAttempted.current = true;
      
      if (isAuthenticated) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/welcome");
      }
    }, 2000);

    // If initialized quickly, navigate immediately
    if (isInitialized && !navigationAttempted.current) {
      clearTimeout(initTimeout);
      navigationAttempted.current = true;

      const timer = setTimeout(() => {
        if (isAuthenticated) {
          router.replace("/(tabs)");
        } else {
          router.replace("/(auth)/welcome");
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        clearTimeout(initTimeout);
      };
    }

    return () => clearTimeout(initTimeout);
  }, [isAuthenticated, isInitialized, router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#FBA82E" />
    </View>
  );
}
