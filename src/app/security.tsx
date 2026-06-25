import React, { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, Switch, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/services/supabase";
import { SettingsRow } from "./settings";

export default function SecurityScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isPrivate, setIsPrivate] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const email = user?.email;
      if (!email) {
        throw new Error("User email not found. Please log in again.");
      }

      // Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Incorrect current password. Please try again.");
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      Alert.alert("Success", "Your password has been updated successfully.", [
        { text: "OK", onPress: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }}
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.prompt(
      "Delete Account",
      "Are you sure? This action cannot be undone. Type 'DELETE' to confirm.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async (text?: string) => {
            if (text !== "DELETE") {
              Alert.alert("Error", "You did not type DELETE correctly.");
              return;
            }
            // In a real app, you would call a secure edge function here.
            // For now, we sign out as a mock representation.
            Alert.alert("Account Deleted", "Your account has been deleted.", [
              {
                text: "OK",
                onPress: async () => {
                  await signOut();
                  router.replace("/(auth)/entry" as any);
                }
              }
            ]);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-[#F5E3D8]/30">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Feather name="arrow-left" size={24} color="#3B3328" />
          </TouchableOpacity>
          <Text className="flex-1 text-xl font-jakarta-bold text-[#3B3328] ml-2">
            Password & Security
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          
          {/* Change Password Section */}
          <View className="px-5 pt-6 pb-2">
            <Text className="text-xs font-jakarta-semibold text-[#FBA82E] uppercase tracking-wider">
              Change Password
            </Text>
          </View>
          <View
            className="mx-5 bg-white p-5 rounded-[20px] border border-[#F5E3D8]/40"
            style={{
              shadowColor: "#3B3328",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="mb-4">
              <Text className="text-sm font-inter-medium text-[#8B7D6F] mb-1.5 ml-1">Current Password</Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor="#C4B8AC"
                className="bg-[#FAF5EF] rounded-xl px-4 py-3.5 text-[#3B3328] font-inter-medium text-[15px]"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-inter-medium text-[#8B7D6F] mb-1.5 ml-1">New Password</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
                placeholderTextColor="#C4B8AC"
                className="bg-[#FAF5EF] rounded-xl px-4 py-3.5 text-[#3B3328] font-inter-medium text-[15px]"
              />
            </View>

            <View className="mb-5">
              <Text className="text-sm font-inter-medium text-[#8B7D6F] mb-1.5 ml-1">Confirm New Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm new password"
                placeholderTextColor="#C4B8AC"
                className="bg-[#FAF5EF] rounded-xl px-4 py-3.5 text-[#3B3328] font-inter-medium text-[15px]"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
              className={`py-3.5 rounded-xl items-center ${isChangingPassword ? "bg-[#FBA82E]/70" : "bg-[#FBA82E]"}`}
            >
              <Text className="text-white font-jakarta-bold text-[15px]">
                {isChangingPassword ? "Updating..." : "Update Password"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => router.push("/(auth)/forgot-password")}
              className="mt-4 py-2 items-center justify-center"
            >
              <Text className="text-[#FBA82E] font-jakarta-semibold text-[14px]">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Account Privacy */}
          <View className="px-5 pt-8 pb-2">
            <Text className="text-xs font-jakarta-semibold text-[#FBA82E] uppercase tracking-wider">
              Privacy & Social
            </Text>
          </View>
          <View
            className="mx-5 bg-white rounded-[20px] border border-[#F5E3D8]/40 overflow-hidden"
            style={{
              shadowColor: "#3B3328",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center py-4 px-5">
              <View className="w-10 h-10 rounded-full bg-[#FAF5EF] items-center justify-center mr-4">
                <Ionicons name="lock-closed-outline" size={19} color="#3B3328" />
              </View>
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-inter-medium text-[#3B3328] mb-0.5">
                  Private Profile
                </Text>
                <Text className="text-[11px] font-inter-regular text-[#8B7D6F]">
                  Only approved followers can see your recipes.
                </Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: "#EAE2D8", true: "#FBA82E" }}
                thumbColor="#FFFFFF"
              />
              <View className="absolute bottom-0 left-[72px] right-5 h-px bg-[#F5E3D8]/40" />
            </View>

            <SettingsRow
              icon="slash"
              label="Blocked Users"
              showDivider={false}
              onPress={() => Alert.alert("Blocked Users", "You haven't blocked anyone yet.")}
            />
          </View>

          {/* Danger Zone */}
          <View className="px-5 pt-8 pb-2">
            <Text className="text-xs font-jakarta-semibold text-[#E74C3C] uppercase tracking-wider">
              Danger Zone
            </Text>
          </View>
          <View
            className="mx-5 bg-white rounded-[20px] border border-red-100 overflow-hidden"
            style={{
              shadowColor: "#E74C3C",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <SettingsRow
              icon="trash-2"
              label="Delete Account"
              showDivider={false}
              destructive
              onPress={handleDeleteAccount}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
