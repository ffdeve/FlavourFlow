import { useAuthStore } from "@/store/auth.store";
import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import * as Linking from 'expo-linking';
import { Stack, useNavigationContainerRef } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import "../../global.css";

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
// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const linking = {
  prefixes: ['flavourflow://', 'exp://'],
  config: {
    screens: {
      index: '/',
      '(tabs)': 'home',
      '(auth)': {
        screens: {
          entry: 'entry',
          login: 'login',
          signup: 'signup',
        },
      },
    },
  },
};

export default function RootLayout() {
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
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle deep links (OAuth redirects and email confirmations)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      console.log('Deep link received:', url);
      if (url.includes('flavourflow://')) {
        try {
          await setSessionFromUrl(url);
        } catch (err) {
          console.error('Error setting session from deep link:', err);
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
        SplashScreen.hideAsync().catch(() => {
          // Silently fail if splash screen can't be hidden
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, isInitialized]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
