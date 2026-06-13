import { Button } from "@/components/ui/button";
import CircleBackButton from "@/components/ui/circle-back-button";
import { Password } from "@/components/ui/password";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SetNewPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = (params?.email as string) || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      await authService.updatePassword(password);

      Alert.alert("Success", "Your password has been successfully updated.");

      // Navigate to tabs or preferences based on completion status
      const isPreferenceDone = useAuthStore.getState().isPreferenceDone();
      if (isPreferenceDone) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/userpreference");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update password");
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
          {/* Back Button */}
          <CircleBackButton className="ml-4 mt-2 mb-2" />

          <View className="px-4 mt-2">
            <View>
              <Text
                className="text-5xl text-primary mt-2 mb-1 font-poppins-semibold"
                style={{ lineHeight: 55 }}
              >
                New Password
              </Text>
              <Text className="text-text text-sm font-poppins-light mb-2">
                Enter your new password below
              </Text>
            </View>

            {/* Illustration - Uses Forgot-Pass image for password reset flow */}
            <View className="items-center justify-center mb-6">
              <Image
                source={require("@/assets/images/Forgot-Pass.webp")}
                style={{
                  width: wp("75%"),
                  height: hp("38%"),
                  resizeMode: "contain",
                  alignSelf: "center",
                }}
              />
            </View>

            {/* Form */}
            <View>
              <View className="mb-1 mx-2">
                <Password
                  variant="form"
                  placeholder="Set New Password"
                  value={password}
                  onChangeText={setPassword}
                  fieldClassName="bg-interactive/80 rounded-lg px-6 py-5 flex-row items-center"
                />

                <Password
                  variant="form"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  containerClassName="mt-2"
                  fieldClassName="bg-interactive/80 rounded-lg px-6 py-5 flex-row items-center"
                />
              </View>

              {/* Reset Button */}
              <Button
                onPress={handleResetPassword}
                disabled={isLoading}
                isLoading={isLoading}
                size="lg"
                className="w-full mt-6"
              >
                Reset Password
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
