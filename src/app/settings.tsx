import React, { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Where "Send Feedback" mail is delivered. ⚠️ Confirm spelling: memory has
// ffdevassets@gmail.com (double-s); message said ffdevasset@gmail.com.
const SUPPORT_EMAIL = "ffdevassets@gmail.com";
// TODO: replace with the real App Store / Play Store listing URL once published.
const APP_STORE_URL = "https://apps.apple.com/app/flavourflow";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I create my own recipe?",
    a: "Open the Create tab and tap “Create Your Own Recipe” to launch the 5-step wizard — add photos, info, ingredients, directions, then review and publish.",
  },
  {
    q: "What is ChefBoo and how does it work?",
    a: "ChefBoo is your AI cooking assistant. Tell it what ingredients you have or what you feel like eating, and it suggests recipes and answers cooking questions in chat.",
  },
  {
    q: "How do I save a recipe to my favorites?",
    a: "Tap the heart icon on any recipe card or on the recipe detail screen. Find everything you’ve saved under your favorites.",
  },
  {
    q: "How do I set my dietary preferences and allergies?",
    a: "Go to Settings → Dietary Preferences to choose cuisines, diet type, spice level, and allergens. These personalize your recommendations.",
  },
  {
    q: "What does the Strict Allergy Filter do?",
    a: "When it’s on, recipes that contain any of your listed allergens are hidden completely instead of just flagged.",
  },
  {
    q: "Can I edit or delete a recipe I created?",
    a: "Yes. Open your recipe and use the edit (pencil) or delete icon in the header. Edits update everywhere the recipe appears.",
  },
  {
    q: "How do I change the app language?",
    a: "Settings → Language. FlavourFlow currently supports English and Urdu.",
  },
  {
    q: "How do I reset my password?",
    a: "Settings → Password & Security lets you update your password. If you’re signed out, use “Forgot password” on the login screen.",
  },
];

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

// ─── Settings Toggle Row ─────────────────────────────────────
export function SettingsToggleRow({
  icon,
  iconPack = "feather",
  label,
  value,
  onToggle,
  showDivider = true,
}: {
  icon: string;
  iconPack?: "feather" | "ionicons" | "mci";
  label: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  showDivider?: boolean;
}) {
  const IconComponent =
    iconPack === "ionicons"
      ? Ionicons
      : iconPack === "mci"
      ? MaterialCommunityIcons
      : Feather;

  return (
    <View className="flex-row items-center py-4 px-5">
      <View className="w-10 h-10 rounded-full bg-[#FAF5EF] items-center justify-center mr-4">
        <IconComponent name={icon as any} size={19} color="#3B3328" />
      </View>
      <Text className="flex-1 text-[15px] font-inter-medium text-[#3B3328]">
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#EAE2D8", true: "#FBA82E" }}
        thumbColor="#FFFFFF"
      />
      {showDivider && (
        <View className="absolute bottom-0 left-[72px] right-5 h-px bg-[#F5E3D8]/40" />
      )}
    </View>
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
  const { user, profile, signOut, updateProfile } = useAuth();
  const displayLanguage = profile?.language === "ur" ? "Urdu" : "English";

  // Notification toggles state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  // Filter toggles state
  const [strictAllergy, setStrictAllergy] = useState(false);
  const [strictDietary, setStrictDietary] = useState(false);

  // ChefBoo voice (Text-to-Speech) reading speed — applied in Cooking Mode.
  const [ttsRate, setTtsRate] = useState(1.0);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const [allergyVal, dietVal, pushVal, emailVal, rateVal] = await Promise.all([
          AsyncStorage.getItem("strictAllergyFilter"),
          AsyncStorage.getItem("strictDietaryFilter"),
          AsyncStorage.getItem("pushNotificationsEnabled"),
          AsyncStorage.getItem("emailNewsletterEnabled"),
          AsyncStorage.getItem("chefbooTtsRate"),
        ]);
        if (allergyVal !== null) setStrictAllergy(allergyVal === "true");
        if (dietVal !== null) setStrictDietary(dietVal === "true");
        if (pushVal !== null) setPushEnabled(pushVal === "true");
        if (emailVal !== null) setEmailEnabled(emailVal === "true");
        if (rateVal !== null) setTtsRate(parseFloat(rateVal) || 1.0);
      } catch (e) {
        console.error(e);
      }
    };
    loadPrefs();
  }, []);

  // Map the stored rate to a friendly label for the settings row.
  const voiceSpeedLabel = ttsRate <= 0.9 ? "Slow" : ttsRate >= 1.1 ? "Fast" : "Normal";

  const handleVoiceSpeed = () => {
    const setRate = async (rate: number) => {
      setTtsRate(rate);
      await AsyncStorage.setItem("chefbooTtsRate", String(rate));
    };
    Alert.alert("ChefBoo Voice Speed", "How fast should ChefBoo read steps aloud?", [
      { text: "Slow", onPress: () => setRate(0.85) },
      { text: "Normal", onPress: () => setRate(1.0) },
      { text: "Fast", onPress: () => setRate(1.15) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const toggleAllergyFilter = async (val: boolean) => {
    setStrictAllergy(val);
    await AsyncStorage.setItem("strictAllergyFilter", val.toString());
  };

  const toggleDietaryFilter = async (val: boolean) => {
    setStrictDietary(val);
    await AsyncStorage.setItem("strictDietaryFilter", val.toString());
  };

  const togglePushEnabled = async (val: boolean) => {
    setPushEnabled(val);
    await AsyncStorage.setItem("pushNotificationsEnabled", val.toString());
  };

  const toggleEmailEnabled = async (val: boolean) => {
    setEmailEnabled(val);
    await AsyncStorage.setItem("emailNewsletterEnabled", val.toString());
  };

  // ── Support / preference modals ───────────────────────────────
  const [aboutVisible, setAboutVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [rateVisible, setRateVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleLanguage = () => {
    Alert.alert("Language", "Choose your preferred language.", [
      { text: "English", onPress: () => updateProfile?.({ language: "en" }) },
      { text: "اردو (Urdu)", onPress: () => updateProfile?.({ language: "ur" }) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSendFeedback = async () => {
    const msg = feedbackText.trim();
    if (msg.length < 5) {
      Alert.alert("Send Feedback", "Please write a little more so we can help.");
      return;
    }
    setSendingFeedback(true);
    const name = profile?.full_name || profile?.username || "FlavourFlow user";
    const email = user?.email || "unknown";
    const subject = "FlavourFlow Feedback";
    const body =
      `${msg}\n\n———————————————\n` +
      `Name: ${name}\nEmail: ${email}\nUser ID: ${user?.id || "n/a"}\n` +
      `App: FlavourFlow v1.0.0 (${Platform.OS})`;
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      await Linking.openURL(url);
      setFeedbackVisible(false);
      setFeedbackText("");
    } catch {
      Alert.alert("No mail app found", `Please email us directly at ${SUPPORT_EMAIL}.`);
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleSubmitRating = () => {
    if (rating === 0) {
      Alert.alert("Rate the App", "Tap a star to set your rating.");
      return;
    }
    const stars = rating;
    setRateVisible(false);
    setRating(0);
    if (stars >= 4) {
      Alert.alert(
        "Thank you! ⭐️",
        "So glad you're enjoying FlavourFlow! Would you rate us on the store?",
        [
          { text: "Not now", style: "cancel" },
          { text: "Rate on store", onPress: () => Linking.openURL(APP_STORE_URL).catch(() => {}) },
        ],
      );
    } else {
      Alert.alert(
        "Thanks for the feedback",
        "We'd love to do better — tap “Send Feedback” to tell us what we can improve.",
      );
    }
  };

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
            onPress={() => router.push("/security")}
          />
          <SettingsRow
            icon="globe"
            label="Language"
            value={displayLanguage}
            showDivider={false}
            onPress={handleLanguage}
          />
        </View>

        {/* ────── NOTIFICATIONS SECTION ────── */}
        <SectionHeader title="Notifications" />
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
          <SettingsToggleRow
            icon="bell"
            label="Push Notifications"
            value={pushEnabled}
            onToggle={togglePushEnabled}
          />
          <SettingsToggleRow
            icon="mail"
            label="Email Newsletter"
            value={emailEnabled}
            onToggle={toggleEmailEnabled}
            showDivider={false}
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
          <SettingsToggleRow
            icon="alert-circle"
            label="Strict Allergy Filter"
            value={strictAllergy}
            onToggle={toggleAllergyFilter}
          />
          <SettingsToggleRow
            icon="leaf"
            label="Strict Dietary Filter"
            value={strictDietary}
            onToggle={toggleDietaryFilter}
          />
          <SettingsRow
            icon="volume-2"
            label="ChefBoo Voice Speed"
            value={voiceSpeedLabel}
            onPress={handleVoiceSpeed}
          />
          <SettingsRow
            icon="information-circle-outline"
            iconPack="ionicons"
            label="About FlavourFlow"
            showDivider={false}
            onPress={() => setAboutVisible(true)}
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
            onPress={() => setHelpVisible(true)}
          />
          <SettingsRow
            icon="message-circle"
            label="Send Feedback"
            onPress={() => setFeedbackVisible(true)}
          />
          <SettingsRow
            icon="star"
            label="Rate the App"
            showDivider={false}
            onPress={() => setRateVisible(true)}
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

      {/* ── About modal ── */}
      <Modal visible={aboutVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setAboutVisible(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-7">
          <View className="w-full bg-[#FFFDF5] rounded-3xl p-6">
            <View className="items-center mb-3">
              <View className="w-14 h-14 rounded-2xl bg-[#FBA82E]/15 items-center justify-center mb-3">
                <MaterialCommunityIcons name="chef-hat" size={28} color="#FBA82E" />
              </View>
              <Text className="text-lg font-jakarta-bold text-[#3B3328]">About FlavourFlow</Text>
            </View>
            <Text className="text-[14px] leading-[21px] font-inter-regular text-[#5C544A] text-center mb-4">
              FlavourFlow is your AI culinary companion. Discover, create and cook recipes tailored to your
              taste, diet and the ingredients you already have. Chat with ChefBoo for instant ideas, follow
              guided cooking mode, and share your own recipes with the community.
            </Text>
            <View className="bg-white rounded-2xl border border-[#F5E3D8]/50 p-3 mb-4">
              <Text className="text-[12px] font-inter-medium text-[#8B7D6F] text-center">Version 1.0.0</Text>
              <Text className="text-[12px] font-inter-medium text-[#8B7D6F] text-center mt-1">Contact {SUPPORT_EMAIL}</Text>
              <Text className="text-[11px] font-inter-regular text-[#C4B8AC] text-center mt-1">© 2026 FlavourFlow</Text>
            </View>
            <TouchableOpacity onPress={() => setAboutVisible(false)} className="bg-[#FBA82E] rounded-full py-3 items-center">
              <Text className="text-white font-jakarta-semibold text-[15px]">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Help Center modal (FAQ accordion) ── */}
      <Modal visible={helpVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setHelpVisible(false)}>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-[#FFFDF5] rounded-t-[28px] pt-5 pb-8" style={{ maxHeight: "82%" }}>
            <View className="flex-row items-center justify-between px-5 mb-1">
              <Text className="text-lg font-jakarta-bold text-[#3B3328]">Help Center</Text>
              <TouchableOpacity onPress={() => setHelpVisible(false)} className="w-8 h-8 rounded-full bg-[#FAF5EF] items-center justify-center">
                <Feather name="x" size={18} color="#3B3328" />
              </TouchableOpacity>
            </View>
            <Text className="px-5 text-[13px] font-inter-regular text-[#8B7D6F] mb-3">Tap a question to see the answer.</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              {FAQS.map((faq, i) => {
                const open = openFaq === i;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    onPress={() => setOpenFaq(open ? null : i)}
                    className="bg-white rounded-2xl border border-[#F5E3D8]/50 px-4 py-3.5 mb-2.5"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="flex-1 text-[14px] font-jakarta-semibold text-[#3B3328] mr-3">{faq.q}</Text>
                      <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color="#8B7D6F" />
                    </View>
                    {open && (
                      <Text className="text-[13px] leading-[20px] font-inter-regular text-[#5C544A] mt-2.5">{faq.a}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => {
                  setHelpVisible(false);
                  setTimeout(() => setFeedbackVisible(true), 250);
                }}
                className="mt-2 items-center py-3"
              >
                <Text className="text-[13px] font-inter-medium text-[#FBA82E]">Still need help? Send us feedback</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Send Feedback modal ── */}
      <Modal visible={feedbackVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setFeedbackVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-black/40 items-center justify-center px-6">
            <View className="w-full bg-[#FFFDF5] rounded-3xl p-6">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-lg font-jakarta-bold text-[#3B3328]">Send Feedback</Text>
                <TouchableOpacity onPress={() => setFeedbackVisible(false)} className="w-8 h-8 rounded-full bg-[#FAF5EF] items-center justify-center">
                  <Feather name="x" size={18} color="#3B3328" />
                </TouchableOpacity>
              </View>
              <Text className="text-[13px] font-inter-regular text-[#8B7D6F] mb-3">Tell us what you love or what we can improve.</Text>
              <TextInput
                value={feedbackText}
                onChangeText={setFeedbackText}
                placeholder="Write your message…"
                placeholderTextColor="#A89E92"
                multiline
                textAlignVertical="top"
                className="bg-white rounded-2xl border border-[#F5E3D8]/60 p-4 text-[14px] font-inter-regular text-[#3B3328]"
                style={{ minHeight: 110 }}
              />
              <Text className="text-[11px] font-inter-regular text-[#C4B8AC] mt-2">
                Sent with your name & email ({user?.email || "your account"}) so we can reply.
              </Text>
              <View className="flex-row mt-4" style={{ gap: 10 }}>
                <TouchableOpacity onPress={() => setFeedbackVisible(false)} className="flex-1 py-3 rounded-full border border-[#F5E3D8] items-center">
                  <Text className="font-jakarta-semibold text-[15px] text-[#8B7D6F]">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSendFeedback}
                  disabled={sendingFeedback}
                  className="flex-1 py-3 rounded-full bg-[#FBA82E] items-center flex-row justify-center"
                >
                  {sendingFeedback && <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />}
                  <Text className="font-jakarta-semibold text-[15px] text-white">Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Rate the App modal ── */}
      <Modal visible={rateVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setRateVisible(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-7">
          <View className="w-full bg-[#FFFDF5] rounded-3xl p-6 items-center">
            <Text className="text-lg font-jakarta-bold text-[#3B3328] mb-1">Enjoying FlavourFlow?</Text>
            <Text className="text-[13px] font-inter-regular text-[#8B7D6F] mb-4 text-center">Tap a star to rate your experience.</Text>
            <View className="flex-row mb-5" style={{ gap: 8 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.7}>
                  <Ionicons name={s <= rating ? "star" : "star-outline"} size={36} color={s <= rating ? "#FBA82E" : "#D9CFC4"} />
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row w-full" style={{ gap: 10 }}>
              <TouchableOpacity onPress={() => { setRateVisible(false); setRating(0); }} className="flex-1 py-3 rounded-full border border-[#F5E3D8] items-center">
                <Text className="font-jakarta-semibold text-[15px] text-[#8B7D6F]">Maybe later</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitRating} className="flex-1 py-3 rounded-full bg-[#FBA82E] items-center">
                <Text className="font-jakarta-semibold text-[15px] text-white">Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
