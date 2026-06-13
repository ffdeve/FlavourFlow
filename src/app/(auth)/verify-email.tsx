import { Button } from "@/components/ui/button";
import CircleBackButton from "@/components/ui/circle-back-button";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/use-auth";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { verifyOtp, resendOtp } = useAuth();
  const params = useLocalSearchParams();
  const email = (params?.email as string) || "your email";
  const type = (params?.type as "signup" | "recovery") || "signup";
  const fullName = params?.fullName as string;
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);
  const [countdown, setCountdown] = useState(49);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async (overrideCode?: string[]) => {
    const fullCode = (overrideCode || code).join("");
    if (fullCode.length !== 6) {
      if (!overrideCode) {
        Alert.alert("Error", "Please enter the complete 6-digit code.");
      }
      return;
    }

    try {
      setIsLoading(true);
      await verifyOtp(email, fullCode, type, fullName);

      if (type === "signup") {
        router.replace("/(auth)/userpreference");
      } else {
        router.push({
          pathname: "/(auth)/set-new-password" as any,
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

      // Auto-verify if all 6 characters are pasted
      if (newCode.every((c) => c !== "")) {
        handleVerify(newCode);
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text !== "") {
      if (index < 5) {
        inputs.current[index + 1]?.focus();
      } else if (index === 5 && newCode.every((c) => c !== "")) {
        // Auto-verify when the 6th digit is typed and all are filled
        handleVerify(newCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && code[index] === "" && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown === 0) {
      try {
        setIsLoading(true);
        await resendOtp(email, type);
        Alert.alert("Success", "Code resent to your email");
        setCountdown(49);
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to resend code");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-4 pb-10">
          {/* Back Button */}
          <CircleBackButton />

          {/* Header */}
          <View className="mt-6 mb-4">
            <Text className="text-4xl font-poppins-bold text-[#FBA82E] mb-2">
              Verify Email
            </Text>
            <Text className="text-sm font-poppins-regular text-text-secondary">
              Enter The Code
            </Text>
          </View>

          {/* Mascot Illustration */}
          <View className="items-center mb-6">
            <Image
              source={require("@/assets/images/Verify-OTP.webp")}
              style={{
                width: wp("75%"),
                height: hp("32%"),
                resizeMode: "contain",
              }}
            />
          </View>

          {/* Text Message */}
          <View className="items-center mb-8">
            <Text className="text-center font-poppins-regular text-text-secondary text-sm">
              We've sent a verification code to{"\n"}
              {email}
            </Text>
          </View>

          {/* Code Input Area */}
          <View className="bg-[#EEDDAA]/30 rounded-3xl py-4 px-6 flex-row justify-between items-center mb-8 h-20">
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(el) => {
                  inputs.current[index] = el;
                }}
                className="w-10 h-12 text-center text-2xl font-poppins-medium text-text bg-transparent"
                maxLength={1}
                keyboardType="number-pad"
                value={digit}
                placeholder="-"
                placeholderTextColor="#8B7D6F"
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
              />
            ))}
          </View>

          {/* Resend Link */}
          <View className="items-center mb-8">
            <Text className="text-text-secondary text-sm font-poppins-regular mb-1">
              Didn't receive the mail?
            </Text>
            {countdown > 0 ? (
              <Text className="text-text-secondary text-sm font-poppins-regular">
                You can resend it in{" "}
                <Text className="font-poppins-bold">{countdown}</Text> sec
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text className="text-primary font-poppins-semibold text-sm">
                  Resend Email
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Verify Button */}
          <Button
            onPress={() => handleVerify()}
            disabled={isLoading || code.some((c) => c === "")}
            isLoading={isLoading}
            size="lg"
            className="w-full py-4 rounded-2xl"
          >
            Verify & Continue
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
