import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { profileService } from "@/services/profile.service";

type ValidationState = "idle" | "checking" | "available" | "taken" | "invalid";

export default function ManageProfileScreen() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<ValidationState>("idle");
  const debounceTimer = useRef<any>(null);

  // 14-day logic
  const lastChange = profile?.last_username_change ? new Date(profile.last_username_change) : null;
  const now = new Date();
  const daysSinceChange = lastChange ? (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24) : 999;
  const canChangeUsername = daysSinceChange >= 14;
  const daysRemaining = Math.ceil(14 - daysSinceChange);

  // Validate Username Regex
  const isValidFormat = (str: string) => /^[a-z0-9]+$/.test(str);

  // Debounced API Check
  useEffect(() => {
    // If it hasn't changed from original, it's fine
    if (username === profile?.username) {
      setUsernameStatus("idle");
      return;
    }

    if (username.length === 0) {
      setUsernameStatus("invalid");
      return;
    }

    if (!isValidFormat(username)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const isAvailable = await profileService.checkUsernameAvailability(username, user?.id);
        setUsernameStatus(isAvailable ? "available" : "taken");
      } catch (err) {
        console.error("Error checking username:", err);
        setUsernameStatus("idle");
      }
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [username, profile?.username, user?.id]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }

    const usernameChanged = username !== profile?.username;

    if (usernameChanged) {
      if (!canChangeUsername) {
        Alert.alert("Error", `You must wait ${daysRemaining} more days before changing your username again.`);
        return;
      }
      if (usernameStatus !== "available") {
        Alert.alert("Error", "Please choose a valid and available username.");
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        ...(usernameChanged && { last_username_change: new Date().toISOString() }),
      });
      Alert.alert("Success", "Your profile has been updated!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error("Failed to update profile:", err);
      Alert.alert("Error", "Could not save your changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]">
      {/* ── Header ── */}
      <View className="flex-row items-center px-4 py-3 border-b border-[#F5E3D8]/30">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Feather name="arrow-left" size={24} color="#3B3328" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-jakarta-bold text-[#3B3328] ml-2">
          Manage Profile
        </Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={isSaving || (username !== profile?.username && usernameStatus !== "available")} 
          className="p-2"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FBA82E" />
          ) : (
            <Text 
              className={`text-[15px] font-jakarta-semibold ${(username !== profile?.username && usernameStatus !== "available") ? "text-[#C4B8AC]" : "text-[#FBA82E]"}`}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Full Name */}
          <View className="mb-6">
            <Text className="text-[13px] font-jakarta-semibold text-[#8B7D6F] mb-2 ml-1 uppercase tracking-wider">
              Full Name
            </Text>
            <View className="bg-white rounded-[16px] border border-[#F5E3D8]/40 px-4 py-3 shadow-sm">
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#C4B8AC"
                className="text-[15px] font-inter-medium text-[#3B3328]"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Username */}
          <View className="mb-6">
            <Text className="text-[13px] font-jakarta-semibold text-[#8B7D6F] mb-2 ml-1 uppercase tracking-wider">
              Username
            </Text>
            <View className={`bg-white rounded-[16px] border px-4 py-3 shadow-sm flex-row items-center ${
              usernameStatus === "invalid" || usernameStatus === "taken" 
                ? "border-red-300" 
                : usernameStatus === "available" 
                  ? "border-green-300" 
                  : "border-[#F5E3D8]/40"
            }`}>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                placeholderTextColor="#C4B8AC"
                autoCapitalize="none"
                autoCorrect={false}
                editable={canChangeUsername}
                className={`flex-1 text-[15px] font-inter-medium ${!canChangeUsername ? "text-[#C4B8AC]" : "text-[#3B3328]"}`}
                returnKeyType="next"
              />
              {/* Status Icons */}
              {usernameStatus === "checking" && <ActivityIndicator size="small" color="#FBA82E" />}
              {usernameStatus === "taken" && <Feather name="x-circle" size={18} color="#EF4444" />}
              {usernameStatus === "available" && <Feather name="check-circle" size={18} color="#10B981" />}
            </View>

            {/* Status Messages */}
            {!canChangeUsername && (
              <Text className="text-[12px] font-inter-medium text-[#8B7D6F] mt-2 ml-1">
                You can change your username again in {daysRemaining} days.
              </Text>
            )}
            {canChangeUsername && usernameStatus === "invalid" && username.length > 0 && (
              <Text className="text-[12px] font-inter-medium text-red-500 mt-2 ml-1">
                Only lowercase letters and numbers are allowed.
              </Text>
            )}
            {canChangeUsername && usernameStatus === "taken" && (
              <Text className="text-[12px] font-inter-medium text-red-500 mt-2 ml-1">
                This username is already taken.
              </Text>
            )}
            {canChangeUsername && usernameStatus === "available" && (
              <Text className="text-[12px] font-inter-medium text-green-500 mt-2 ml-1">
                This username is available.
              </Text>
            )}
            {canChangeUsername && usernameStatus === "idle" && (
              <Text className="text-[12px] font-inter-medium text-[#C4B8AC] mt-2 ml-1">
                Letters and numbers only.
              </Text>
            )}
          </View>

          {/* Bio */}
          <View className="mb-6">
            <Text className="text-[13px] font-jakarta-semibold text-[#8B7D6F] mb-2 ml-1 uppercase tracking-wider">
              Bio
            </Text>
            <View className="bg-white rounded-[16px] border border-[#F5E3D8]/40 px-4 py-3 shadow-sm min-h-[100px]">
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us a little about yourself"
                placeholderTextColor="#C4B8AC"
                multiline
                textAlignVertical="top"
                className="flex-1 text-[15px] font-inter-medium text-[#3B3328]"
                maxLength={150}
              />
            </View>
            <Text className="text-right text-[11px] font-inter-medium text-[#C4B8AC] mt-1">
              {bio.length}/150
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
