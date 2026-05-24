import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useRouter } from "expo-router";
import { useCallback } from "react";

import { TouchableOpacity } from "react-native";

interface BackButtonProps {
  className?: string;
  fallbackHref?: string;
}

export default function BackButton({
  className = "w-fit h-fit mt-2 pt-2 px-4",
  fallbackHref,
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = useCallback(() => {
    if (!router) return;
    
    try {
      // In Expo Router, router.canGoBack() sometimes incorrectly returns true
      // right after a reset or in the root stack. Safest is to catch the error
      // or rely entirely on a fallback if provided.
      if (fallbackHref && router.replace) {
        router.replace(fallbackHref as any);
        return;
      }

      if (router.canGoBack()) {
        router.back();
        return;
      }
      
      // If we get here, fall back to root
      if (router.replace) {
        router.replace('/');
      }
    } catch (e) {
      // Silently fail if navigation is not ready
      console.warn("Navigation not ready:", e);
    }
  }, [router, fallbackHref]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{ alignSelf: "flex-start" }}
      className={className}
      activeOpacity={0.7}
    >
      <FontAwesome6 name="arrow-left-long" size={24} color="#3B3328" />
    </TouchableOpacity>
  );
}
