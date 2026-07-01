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

WebBrowser.maybeCompleteAuthSession();

export default function SignupHomeScreen() {
  const router = useRouter();
  const { signInWithOAuth, setSessionFromUrl } = useAuth();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [socialProvider, setSocialProvider] = useState<
    "google" | "facebook" | "apple" | null
  >(null);
  const insets = useSafeAreaInsets();

  const handleSocialSignup = async (
    provider: "google" | "facebook" | "apple",
  ) => {
    if (isSigningUp) return;
    setIsSigningUp(true);
    setSocialProvider(provider);
    try {
      // Generate redirect URL dynamically (supports both Expo Go exp:// and standalone flavourflow://)
      const redirectUrl = Linking.createURL("", { scheme: "flavourflow" });

      const data = await signInWithOAuth(provider, redirectUrl);

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
          "Signup Error",
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
          "Signup Error",
          errorMessage || `Failed to sign in with ${provider}`,
        );
      }
    } finally {
      setIsSigningUp(false);
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
            style={{ height: hp("48%"), width: wp("100%") }}
            className="mb-2 items-center justify-center"
          >
            <Image
              source={require("@/assets/images/SignUpHome_2x.webp")}
              style={{
                width: "100%",
                height: "100%",
                resizeMode: "contain",
                alignSelf: "center",
              }}
            />
          </View>

          <Text
            style={{ fontSize: wp("6%") }}
            className="text-primary font-poppins-semibold mt-4 mb-4 text-center"
          >
            Create Your Account
          </Text>

          {/* Register Button */}
          <View>
            <Button
              className="w-auto mb-3"
              style={{ marginHorizontal: wp("8%") }}
              size="lg"
              disabled={isSigningUp}
              onPress={() => router.push("/(auth)/register-email")}
              leftIcon={
                <MaterialIcons
                  name="mail-outline"
                  size={wp("7%")}
                  color="white"
                />
              }
            >
              Register with Email
            </Button>

            {/* Social Buttons Row */}
            <View style={{ marginHorizontal: wp("8%") }} className="flex-wrap">
              <View className="flex-row items-center justify-center gap-4 mb-6">
                <TouchableOpacity
                  onPress={() => handleSocialSignup("google")}
                  disabled={isSigningUp}
                  className={cn(
                    "flex-1 bg-primary rounded-2xl items-center justify-center",
                    isSigningUp && "opacity-50",
                  )}
                  style={{ paddingVertical: hp("1.2%") }}
                >
                  {isSigningUp && socialProvider === "google" ? (
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
                  onPress={() => handleSocialSignup("facebook")}
                  disabled={isSigningUp}
                  className={cn(
                    "flex-1 bg-primary rounded-2xl items-center justify-center",
                    isSigningUp && "opacity-50",
                  )}
                  style={{ paddingVertical: hp("1.2%") }}
                >
                  {isSigningUp && socialProvider === "facebook" ? (
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

          {/* Sign In Link */}
          <View className="flex-row items-center justify-center">
            <Text className="text-text text-base font-poppins-regular">
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text className="text-primary font-poppins-semibold text-base">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
