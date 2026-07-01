import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/utils";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Ensure the auth session component closes properly after redirect
WebBrowser.maybeCompleteAuthSession();

export default function LogInHomeScreen() {
  const router = useRouter();
  const { signInWithOAuth, setSessionFromUrl } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [socialProvider, setSocialProvider] = useState<
    "google" | "facebook" | "apple" | null
  >(null);
  const insets = useSafeAreaInsets();

  const handleSocialLogin = async (
    provider: "google" | "facebook" | "apple",
  ) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setSocialProvider(provider);
    try {
      // Generate redirect URL dynamically (supports both Expo Go exp:// and standalone flavourflow://)
      const redirectUrl = Linking.createURL("", { scheme: "flavourflow" });

      const data = await signInWithOAuth(provider, redirectUrl);

      // Open the system browser to handle Google/Facebook Login safely inside the app
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
        );

        if (result.type === "success" && result.url) {
          await setSessionFromUrl(result.url);

          const isPreferenceDone = useAuthStore.getState().isPreferenceDone();
          if (isPreferenceDone) {
            router.replace("/(tabs)");
          } else {
            router.replace("/(auth)/userpreference");
          }
        }
      } else {
        Alert.alert(
          "Login Error",
          "Unable to initiate Google Sign-in. Please try again.",
        );
      }
    } catch (error: any) {
      const errorMessage = error?.message || "";
      // Catch browser conflict errors and dismiss the browser instead of showing a scary popup
      if (
        errorMessage.includes("already open") ||
        errorMessage.includes("openAuthSessionAsync")
      ) {
        try {
          await WebBrowser.dismissBrowser();
        } catch (dismissError) {
          console.error("Failed to dismiss browser:", dismissError);
        }
      } else {
        Alert.alert(
          "Login Error",
          errorMessage || `Failed to sign in with ${provider}`,
        );
      }
    } finally {
      setIsLoggingIn(false);
      setSocialProvider(null);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top }}>
          {/* Title Header above the image */}
          <View className="items-center justify-center pt-4 pb-2">
            <Text
              style={{ fontSize: wp("12%") }}
              className="font-poppins-semibold text-primary text-center"
            >
              FlavourFlow
            </Text>
          </View>

          {/* Image Container - Edge-to-Edge */}
          <View
            style={{ height: hp("52%"), width: wp("100%") }}
            className="mb-8 items-center justify-center"
          >
            <Image
              source={require("@/assets/images/LogIn_front_photo.webp")}
              style={{
                resizeMode: "contain",
                width: "100%",
                height: "100%",
                alignSelf: "center",
              }}
            />
          </View>

          <View style={{ paddingHorizontal: wp("8%"), paddingTop: hp("1%") }}>
            {/* Email Button */}
            <Button
              className="w-full mb-3"
              size="lg"
              disabled={isLoggingIn}
              onPress={() => router.push("/(auth)/login-email")}
              leftIcon={
                <MaterialIcons
                  name="mail-outline"
                  size={wp("7%")}
                  color="white"
                />
              }
            >
              Continue with Email
            </Button>

            <View className="flex-wrap">
              {/* Social Buttons Row */}
              <View className="flex-row items-center justify-center gap-4 mb-6">
                <TouchableOpacity
                  onPress={() => handleSocialLogin("google")}
                  disabled={isLoggingIn}
                  className={cn(
                    "flex-1 bg-primary rounded-2xl items-center justify-center",
                    isLoggingIn && "opacity-50",
                  )}
                  style={{ paddingVertical: hp("1.2%") }}
                >
                  {isLoggingIn && socialProvider === "google" ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <View
                      className="bg-white rounded-full items-center justify-center"
                      style={{ width: wp("10%"), height: wp("10%") }}
                    >
                      <FontAwesome6
                        name="google"
                        size={wp("5.5%")}
                        color="#4285F4"
                      />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSocialLogin("facebook")}
                  disabled={isLoggingIn}
                  className={cn(
                    "flex-1 bg-primary rounded-2xl items-center justify-center",
                    isLoggingIn && "opacity-50",
                  )}
                  style={{ paddingVertical: hp("1.2%") }}
                >
                  {isLoggingIn && socialProvider === "facebook" ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <View
                      className="bg-[#1877F2] rounded-full items-center justify-center"
                      style={{ width: wp("10%"), height: wp("10%") }}
                    >
                      <FontAwesome6
                        name="facebook-f"
                        size={wp("4.5%")}
                        color="white"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Sign Up Link */}
          <View className="flex-row items-center justify-center">
            <Text className="text-text text-base font-poppins-regular">
              {"Don't have an account?"}{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text className="text-primary font-poppins-semibold text-base">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
