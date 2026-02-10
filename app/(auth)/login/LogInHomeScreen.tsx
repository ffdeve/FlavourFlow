import BackButton from "@/components/ui/back-button";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LogInHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="py-2">
          {/* Back Button */}
          <BackButton className=" pl-6 pt-4" />

          {/* Image Container with Title Overlay */}
          <View className="mb-5 items-center justify-center w-full h-full relative">
            <Image
              source={require("@/figma-desgin/LogIn_front_photo.png")}
              style={{
                resizeMode: "cover",
                width: "100%",
                height: "100%",
                alignSelf: "center",
              }}
            />
            {/* Title Overlay */}
            <Text className="absolute text-6xl font-poppins-semibold pt-2 text-primary top-2 text-center ">
              FlavourFlow
            </Text>
          </View>

          <View className="pt-8 mx-10">
            {/* Email Button */}
            <TouchableOpacity
              className="w-auto bg-primary rounded-lg py-3 px-6  items-center justify-center mb-3"
              onPress={() => router.push("/(auth)/login/login-email")}
            >
              <View className="flex-row items-center">
                <MaterialIcons name="mail-outline" size={32} color="white" />
                <Text className="text-white font-poppins-semibold text-xl ml-4">
                  Continue with Email
                </Text>
              </View>
            </TouchableOpacity>

            <View className="flex-wrap">
              {/* Social Buttons Row */}
              <View className="flex-row items-center justify-center gap-4 mb-6">
                <TouchableOpacity className="flex-1 bg-primary rounded-lg py-4 items-center justify-center">
                  <FontAwesome6 name="google" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 bg-primary rounded-lg py-4 items-center justify-center">
                  <FontAwesome6 name="facebook" size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Sign Up Link */}
          <View className="flex-row items-center justify-center">
            <Text className="text-text text-base">
              {"Don't have an account?"}{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/signup/SignupHomeScreen")}
            >
              <Text className="text-primary font-poppins-semibold text-base">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
