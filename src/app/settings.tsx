import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

// ─── Settings Row ────────────────────────────────────────────
export function SettingsRow({
  icon,
  iconPack = "feather",
  label,
  value,
  onPress,
  showDivider = true,
  destructive = false,
}: {
  icon: string;
  iconPack?: "feather" | "ionicons" | "mci";
  label: string;
  value?: string;
  onPress?: () => void;
  showDivider?: boolean;
  destructive?: boolean;
}) {
  const iconColor = destructive ? "#E74C3C" : "#3B3328";
  const IconComponent =
    iconPack === "ionicons"
      ? Ionicons
      : iconPack === "mci"
      ? MaterialCommunityIcons
      : Feather;

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      className="flex-row items-center py-4 px-5"
    >
      <View className="w-10 h-10 rounded-full bg-[#FAF5EF] items-center justify-center mr-4">
        <IconComponent name={icon as any} size={19} color={iconColor} />
      </View>
      <Text
        className={`flex-1 text-[15px] font-inter-medium ${
          destructive ? "text-red-500" : "text-[#3B3328]"
        }`}
      >
        {label}
      </Text>
      {value && (
        <Text className="text-[13px] font-inter-medium text-[#8B7D6F] mr-2">
          {value}
        </Text>
      )}
      <Feather name="chevron-right" size={18} color="#C4B8AC" />
      {showDivider && (
        <View className="absolute bottom-0 left-[72px] right-5 h-px bg-[#F5E3D8]/40" />
      )}
    </TouchableOpacity>
  );
}

// ─── Section Header ──────────────────────────────────────────
export function SectionHeader({ title }: { title: string }) {
  return (
    <View className="px-5 pt-6 pb-2">
      <Text className="text-xs font-jakarta-semibold text-[#FBA82E] uppercase tracking-wider">
        {title}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const displayLanguage = profile?.language === "ur" ? "Urdu" : "English";

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/entry" as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]">
      {/* ── Header ── */}
      <View className="flex-row items-center px-4 py-3 border-b border-[#F5E3D8]/30">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Feather name="arrow-left" size={24} color="#3B3328" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-jakarta-bold text-[#3B3328] ml-2">
          Settings
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* ────── ACCOUNT SECTION ────── */}
        <SectionHeader title="Account" />
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
          <SettingsRow
            icon="user"
            label="Manage Profile"
            onPress={() => router.push("/manage-profile")}
          />
          <SettingsRow
            icon="lock"
            label="Password & Security"
            onPress={() => Alert.alert("Password & Security", "Change your password settings.")}
          />
          <SettingsRow
            icon="bell"
            label="Notifications"
            onPress={() => Alert.alert("Notifications", "Notification preferences.")}
          />
          <SettingsRow
            icon="globe"
            label="Language"
            value={displayLanguage}
            showDivider={false}
            onPress={() => Alert.alert("Language", "Switch between English and Urdu.")}
          />
        </View>

        {/* ────── PREFERENCES SECTION ────── */}
        <SectionHeader title="Preferences" />
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
          <SettingsRow
            icon="silverware-fork-knife"
            iconPack="mci"
            label="Dietary Preferences"
            onPress={() => router.push("/(auth)/userpreference")}
          />
          <SettingsRow
            icon="sun"
            label="Theme"
            value="Light"
            onPress={() => Alert.alert("Theme", "Dark mode coming soon!")}
          />
          <SettingsRow
            icon="information-circle-outline"
            iconPack="ionicons"
            label="About FlavourFlow"
            showDivider={false}
            onPress={() => Alert.alert("About", "FlavourFlow v1.0 – Your AI culinary companion.")}
          />
        </View>

        {/* ────── SUPPORT SECTION ────── */}
        <SectionHeader title="Support" />
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
          <SettingsRow
            icon="help-circle"
            label="Help Center"
            onPress={() => Alert.alert("Help", "Contact support@flavourflow.app.")}
          />
          <SettingsRow
            icon="message-circle"
            label="Send Feedback"
            onPress={() => Alert.alert("Feedback", "We'd love to hear from you!")}
          />
          <SettingsRow
            icon="star"
            label="Rate the App"
            showDivider={false}
            onPress={() => Alert.alert("Rate", "Link to app store rating.")}
          />
        </View>

        {/* ────── SIGN OUT ────── */}
        <View className="mx-5 mt-6">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSignOut}
            className="flex-row items-center justify-center py-4 bg-red-50 rounded-[20px] border border-red-100"
          >
            <Feather name="log-out" size={18} color="#E74C3C" />
            <Text className="ml-2 text-[15px] font-jakarta-semibold text-red-500">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* App version */}
        <Text className="text-center text-[11px] font-inter-medium text-[#C4B8AC] mt-6">
          FlavourFlow v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
