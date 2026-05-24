import BackButton from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
      // TODO: Add Supabase password reset
      Alert.alert("Success", "Verification code sent to your email");
      router.push({
        pathname: "/(auth)/verify-email",
        params: { email },
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
          <BackButton />

          {/* Title */}
          <Text
            className="text-5xl font-semibold text-primary mt-4 mb-1"
            style={{ fontFamily: "Poppins_600SemiBold" }}
          >
            Forgot Password?
          </Text>

          {/* Subtitle */}
          <Text
            className="text-sm text-text mb-6"
            style={{ fontFamily: "Poppins_300Light" }}
          >
            Enter your email to reset your password
          </Text>

          {/* Email Input */}
          <Input
            containerClassName="mb-6"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            fieldClassName="bg-interactive/80 rounded-lg px-6 flex-row items-center border-0"
            inputClassName="text-base text-black font-poppins-light"
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
          <View className="flex-row items-center justify-center">
            <Text className="text-text text-base">
              Remember your password?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-semibold text-base">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
