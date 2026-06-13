import { Button } from "@/components/ui/button";
import CircleBackButton from "@/components/ui/circle-back-button";
import { Input } from "@/components/ui/input";
import { Password } from "@/components/ui/password";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth.store";

export default function LoginEmailScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      await signIn(email, password);

      const isPreferenceDone = useAuthStore.getState().isPreferenceDone();
      if (isPreferenceDone) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/userpreference");
      }
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 p-2 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Back Button - Outside main content padding */}
          <CircleBackButton className="ml-4 mt-2" />

          <View className="px-4 mt-2">
            {/* Title */}
            <Text
              className="text-5xl text-primary mt-2 mb-1 font-poppins-semibold"
              style={{ lineHeight: 55 }}
            >
              Sign In
            </Text>

            {/* Subtitle */}
            <Text className="text-sm text-text mb-2 font-poppins-light">
              Enter Your Email and Password
            </Text>

            {/* Image */}
            <View className="items-center justify-center mb-6">
              <Image
                source={require("@/assets/images/knife_carrot_2x.webp")}
                style={{
                  width: wp("75%"),
                  height: hp("34%"),
                  paddingTop: 8,
                  paddingBottom: 8,
                  resizeMode: "contain",
                  transform: [{ scaleX: -1 }],
                  alignSelf: "center",
                }}
              />
            </View>

            {/* Email/Number Input */}
            <Input
              containerClassName="mb-4 mx-2"
              fieldClassName="bg-interactive/80 rounded-lg px-6 py-4 flex-row items-center border-0"
              placeholder="Email / Number"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              inputClassName="text-base text-black font-poppins-light py-0"
            />

            {/* Password Input with Eye Icon */}
            <View>
              <Password
                variant="inline"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Forgot Password Link */}
            <View className="mt-2 mb-6 w-full flex-row flex-wrap items-center justify-center">
              <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot-password")}
                className="px-2"
              >
                <Text className="text-sm text-text font-poppins-medium text-center">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Continue Button */}
            <Button
              onPress={handleLogin}
              disabled={isLoading}
              isLoading={isLoading}
              size="lg"
              className="w-full mb-6"
            >
              Continue
            </Button>

            {/* Sign Up Link */}
            <View className="flex-row items-center justify-center mx-2 mb-6 ">
              <Text className="text-text text-base font-poppins-regular">
                {"Don't have an account?"}{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                <Text className="text-primary text-base font-poppins-semibold">
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
