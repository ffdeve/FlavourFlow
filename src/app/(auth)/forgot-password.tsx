import { Button } from "@/components/ui/button";
import CircleBackButton from "@/components/ui/circle-back-button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    try {
      setIsLoading(true);
      await authService.resetPassword(email);
      Alert.alert("Success", "Verification code sent to your email");
      router.push({
        pathname: "/(auth)/verify-email",
        params: { email, type: "recovery" },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-4">
          {/* Back Button */}
          <CircleBackButton className="mb-2" />

          <View className="mt-2">
            {/* Title */}
            <Text
              className="text-5xl font-poppins-semibold text-primary mt-4 mb-1"
              style={{ lineHeight: 55 }}
            >
              Forgot Password?
            </Text>

            {/* Subtitle */}
            <Text className="text-sm text-text font-poppins-light mb-6">
              Enter your email to reset your password
            </Text>
          </View>

          {/* Illustration */}
          <View className="items-center justify-center mb-6">
            <Image
              source={require("@/assets/images/Forgot-Pass.webp")}
              style={{
                width: wp("75%"),
                height: hp("36%"),
                resizeMode: "contain",
                alignSelf: "center",
              }}
            />
          </View>

          {/* Email Input */}
          <Input
            containerClassName="mb-6"
            placeholder="Your Registered Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            fieldClassName="bg-interactive/80 rounded-lg px-6 py-4 flex-row items-center border-0"
            inputClassName="text-base text-black font-poppins-light py-0"
          />

          {/* Reset Button */}
          <Button
            onPress={handleResetPassword}
            disabled={isLoading}
            isLoading={isLoading}
            size="lg"
            className="w-full mb-6"
          >
            Send Reset Link
          </Button>

          {/* Back to Login Link */}
          <View className="flex-row items-center justify-center mb-8">
            <Text className="text-text text-base font-poppins-regular">
              Remember your password?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-poppins-semibold text-base">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
