import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, Text, View } from "react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 pt-16 pb-6">
        <Text className="text-2xl font-bold text-text mb-6">Profile</Text>

        {/* Profile Info */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <View className="items-center mb-4">
            <View className="w-24 h-24 bg-primary rounded-full items-center justify-center mb-3">
              <Text className="text-4xl">👤</Text>
            </View>
            <Text className="text-xl font-semibold text-text">
              {profile?.full_name || "User"}
            </Text>
            <Text className="text-text-secondary mt-1">{user?.email}</Text>
          </View>
        </View>

        {/* Settings Placeholder */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <Text className="text-lg font-semibold text-text mb-3">Settings</Text>
          <Text className="text-text-secondary">
            • Language: {profile?.language === "ur" ? "Urdu" : "English"}
          </Text>
          <Text className="text-text-secondary mt-2">
            • Preferences & notifications coming soon
          </Text>
        </View>

        {/* Sign Out Button */}
        <Button onPress={handleSignOut} variant="outline" className="w-full">
          Sign Out
        </Button>
      </View>
    </ScrollView>
  );
}
