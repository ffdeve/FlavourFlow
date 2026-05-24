import BackButton from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/use-auth";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { verifyOtp } = useAuth();
  const params = useLocalSearchParams();
  const email = (params?.email as string) || "your email";
  const type = (params?.type as 'signup' | 'recovery') || 'signup';
  const fullName = params?.fullName as string;
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      Alert.alert("Error", "Please enter the complete 6-digit code.");
      return;
    }

    try {
      setIsLoading(true);
      await verifyOtp(email, fullCode, type, fullName);
      
      if (type === 'signup') {
        router.replace("/(auth)/userpreference");
      } else {
        router.push({
          pathname: "/(auth)/set-new-password",
          params: { email },
        });
      }
    } catch (error: any) {
      Alert.alert("Verification Failed", error.message || "Invalid code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste
      const chars = text.slice(0, 6).split("");
      const newCode = [...code];
      chars.forEach((char, i) => {
        if (i < 6) newCode[i] = char;
      });
      setCode(newCode);
      if (chars.length > 0 && chars.length <= 6) {
        inputs.current[chars.length - 1]?.focus();
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text !== "" && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && code[index] === "" && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-4 pb-10">
          {/* Back Button */}
          <BackButton />

          {/* Header & Mascot */}
          <View className="items-center mt-2">
            <Text
              className="text-5xl font-poppins-semibold text-primary text-center mb-1"
              style={{ lineHeight: 55 }}
            >
              Verify Email
            </Text>
            
            <Text
              className="text-sm text-center text-text font-poppins-light mb-6 px-4"
            >
              Enter the verification code we sent to{"\n"}
              <Text className="font-poppins-semibold text-primary">{email}</Text>
            </Text>

            {/* Illustration */}
            <View className="mb-8">
              <Image
                source={require("@/assets/images/Register2nd.png")}
                style={{
                  width: 280,
                  height: 250,
                  resizeMode: "contain",
                }}
              />
            </View>
          </View>

          {/* Verification Code Inputs */}
          <View className="flex-row justify-between mb-10 w-full px-1">
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(el) => (inputs.current[index] = el)}
                className="w-12 h-14 bg-interactive/60 border border-interactive-dark rounded-2xl text-center text-xl font-poppins-semibold text-text"
                maxLength={1}
                keyboardType="number-pad"
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
              />
            ))}
          </View>

          {/* Verify Button */}
          <Button
            onPress={handleVerify}
            disabled={isLoading || code.some(c => c === "")}
            isLoading={isLoading}
            size="lg"
            className="w-full mb-6 py-4 rounded-xl shadow-sm"
          >
            Verify
          </Button>

          {/* Resend Link */}
          <View className="flex-row items-center justify-center">
            <Text className="text-text text-sm font-poppins-regular">
              Didn't receive the code?{" "}
            </Text>
            <TouchableOpacity onPress={() => Alert.alert("Success", "Code resent to your email")}>
              <Text className="text-primary font-poppins-semibold text-sm">
                Resend
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
