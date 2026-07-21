import { NetworkBoundary } from "@/components/ui/network-boundary";
import { useAuthStore } from "@/store/auth.store";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Stack, useNavigationContainerRef } from "expo-router";
import { verifyInstallation } from "nativewind";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../../global.css";
import "@/i18n";

// Configure Reanimated logger to suppress strict mode rendering warnings
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// Ignore third-party package deprecation warnings
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  "Non-serializable values",
]);
// Keep the splash screen visible while we fetch resources (disabled to prevent native splash screen registration errors)
// try {
//   SplashScreen.preventAutoHideAsync().catch(() => {});
// } catch (e) {}

const linking = {
  prefixes: ["flavourflow://", "exp://"],
  config: {
    screens: {
      index: "/",
      "(tabs)": "home",
      "(auth)": {
        screens: {
          entry: "entry",
          login: "login",
          signup: "signup",
        },
      },
    },
  },
};

export default function RootLayout() {
  if (__DEV__) verifyInstallation();
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const setSessionFromUrl = useAuthStore((state) => state.setSessionFromUrl);
  const navigationRef = useNavigationContainerRef();

  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle deep links (OAuth redirects and email confirmations)
  useEffect(() => {
    // Check initial URL (cold start)
    Linking.getInitialURL()
      .then(async (url) => {
        if (url) {
          console.log("[Deep Link] Initial URL received (cold start):", url);
          if (url.includes("flavourflow://") || url.includes("exp://")) {
            try {
              await setSessionFromUrl(url);
            } catch (err) {
              console.error("Error setting session from initial URL:", err);
            }
            await refreshProfile();
          }
        }
      })
      .catch((err) => {
        console.error("Error getting initial URL:", err);
      });

    const subscription = Linking.addEventListener("url", async ({ url }) => {
      console.log("[Deep Link] Deep link received (hot/warm start):", url);
      if (url.includes("flavourflow://") || url.includes("exp://")) {
        try {
          await setSessionFromUrl(url);
        } catch (err) {
          console.error("Error setting session from deep link:", err);
        }
        await refreshProfile();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [setSessionFromUrl, refreshProfile]);

  useEffect(() => {
    if (fontsLoaded && isInitialized) {
      // Keep splash screen visible for at least 2 seconds so users can see it
      const timer = setTimeout(() => {
        // try {
        //   SplashScreen.hideAsync().catch(() => {});
        // } catch (e) {}
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, isInitialized]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NetworkBoundary>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="recipe-detail"
              options={{
                animation: "slide_from_bottom",
                gestureEnabled: true,
                gestureDirection: "vertical",
              }}
            />
            <Stack.Screen
              name="cooking-mode"
              options={{
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="create-recipe"
              options={{
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
                gestureEnabled: true,
                gestureDirection: "vertical",
              }}
            />
            <Stack.Screen
              name="user-profile"
              options={{
                animation: "slide_from_right",
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="search"
              options={{
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
                gestureEnabled: true,
              }}
            />
          </Stack>
        </NetworkBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
