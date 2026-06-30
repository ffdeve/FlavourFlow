import React, { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";
import { AssistantSettings, DEFAULT_ASSISTANT_SETTINGS } from "@/types";

// Option Selector Grid Component (2x2 layout)
function GridSelector<T extends string>({
  options,
  selectedValue,
  onSelect,
}: {
  options: { label: string; value: T; desc?: string; icon: string; iconPack?: "feather" | "mci" | "ionicons" }[];
  selectedValue: T;
  onSelect: (val: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap justify-between" style={{ gap: 8 }}>
      {options.map((opt) => {
        const selected = opt.value === selectedValue;
        const Icon =
          opt.iconPack === "mci"
            ? MaterialCommunityIcons
            : opt.iconPack === "ionicons"
            ? Ionicons
            : Feather;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.85}
            className={`w-[48.5%] p-3.5 rounded-2xl border ${
              selected
                ? "bg-[#FBA82E]/5 border-[#FBA82E]"
                : "bg-white border-[#F5E3D8]/50"
            }`}
          >
            <View
              className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${
                selected ? "bg-[#FBA82E]/10" : "bg-[#FAF5EF]"
              }`}
            >
              <Icon name={opt.icon as any} size={15} color={selected ? "#FBA82E" : "#8B7D6F"} />
            </View>
            <Text
              className={`text-[13px] font-jakarta-bold ${
                selected ? "text-[#FBA82E]" : "text-[#3B3328]"
              }`}
            >
              {opt.label}
            </Text>
            {opt.desc && (
              <Text className="text-[10px] font-inter-regular text-[#8B7D6F] mt-0.5 leading-3.5">
                {opt.desc}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Segmented Control Component
function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onSelect,
}: {
  options: { label: string; value: T }[];
  selectedValue: T;
  onSelect: (val: T) => void;
}) {
  return (
    <View className="flex-row bg-[#FAF5EF] p-1 rounded-2xl border border-[#F5E3D8]/30">
      {options.map((opt) => {
        const selected = opt.value === selectedValue;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.8}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
              selected ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-[12.5px] font-jakarta-semibold ${
                selected ? "text-[#FBA82E] font-jakarta-bold" : "text-[#8B7D6F]"
              }`}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Toggle Row Component
function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-[14px] font-jakarta-medium text-[#3B3328]">{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#EAE2D8", true: "#FBA82E" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

// Section Container Component
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-xs font-jakarta-semibold text-[#FBA82E] uppercase tracking-wider mb-2.5 px-1">
        {title}
      </Text>
      <View
        className="bg-white rounded-3xl p-5 border border-[#F5E3D8]/40"
        style={{
          shadowColor: "#3B3328",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.02,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function ChefBooPreferencesScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  
  // Use stored settings or default settings
  const settings: AssistantSettings = {
    ...DEFAULT_ASSISTANT_SETTINGS,
    ...(profile?.assistant_settings as any),
  };

  const [voiceMapping, setVoiceMapping] = useState<Record<string, string>>({});
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  // Load device TTS voices on mount and map to Female 1, Female 2, Male 1, Male 2
  useEffect(() => {
    async function loadVoices() {
      try {
        const available = await Speech.getAvailableVoicesAsync();
        
        // Filter for English voices on device
        const enVoices = (available ?? []).filter((v: any) =>
          (v.language || "").toLowerCase().startsWith("en")
        );

        const females = enVoices.filter((v) =>
          /female|samantha|siri_female|karen|moira|tessa|susan|hazel|veena|zoe/i.test(
            v.identifier || v.name || ""
          )
        );
        const males = enVoices.filter((v) =>
          /male|daniel|siri_male|tom|oliver|peter|rishi|ravi/i.test(
            v.identifier || v.name || ""
          )
        );

        // fallback partition if empty
        const remaining = enVoices.filter((v) => !females.includes(v) && !males.includes(v));
        remaining.forEach((v, idx) => {
          if (idx % 2 === 0) {
            females.push(v);
          } else {
            males.push(v);
          }
        });

        const mapping = {
          female_1: females[0]?.identifier || enVoices[0]?.identifier,
          female_2: females[1]?.identifier || females[0]?.identifier || enVoices[0]?.identifier,
          male_1: males[0]?.identifier || enVoices[1]?.identifier || enVoices[0]?.identifier,
          male_2: males[1]?.identifier || males[0]?.identifier || enVoices[0]?.identifier,
        };

        setVoiceMapping(mapping);
      } catch (err) {
        console.warn("Failed to load device voices:", err);
      }
    }
    loadVoices();
  }, []);

  // Update helper
  const handleUpdate = async (key: keyof AssistantSettings, val: any) => {
    const updated = {
      ...settings,
      [key]: val,
    };
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await updateProfile?.({ assistant_settings: updated });
    } catch (e) {
      console.error("Failed to save ChefBoo preferences:", e);
    }
  };

  // Preview TTS voice
  const handlePreviewVoice = (voiceKey: string) => {
    Speech.stop();
    const voiceId = voiceMapping[voiceKey];
    const phrase = "Hello! I am ChefBoo and I will help you cook today.";
    
    if (!voiceId) {
      Alert.alert(
        "Voice Unavailable",
        "Selected voice unavailable on this device. Using nearest available voice."
      );
      setPreviewingVoice(voiceKey);
      Speech.speak(phrase, {
        rate: settings.speechRate,
        onDone: () => setPreviewingVoice(null),
        onStopped: () => setPreviewingVoice(null),
        onError: () => setPreviewingVoice(null),
      });
      return;
    }

    setPreviewingVoice(voiceKey);
    Speech.speak(phrase, {
      voice: voiceId,
      rate: settings.speechRate,
      onDone: () => setPreviewingVoice(null),
      onStopped: () => setPreviewingVoice(null),
      onError: () => setPreviewingVoice(null),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-[#F5E3D8]/30 bg-[#FFFDF5]">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Feather name="arrow-left" size={24} color="#3B3328" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-jakarta-bold text-[#3B3328] ml-2">
          ChefBoo Preferences
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 }}
      >
        {/* Language Section */}
        <SectionCard title="Language Preference">
          <GridSelector
            selectedValue={settings.language}
            onSelect={(val) => handleUpdate("language", val)}
            options={[
              {
                label: "English",
                value: "english",
                desc: "Responses entirely in English",
                icon: "text",
              },
              {
                label: "Urdu",
                value: "urdu",
                desc: "Responses in Urdu script",
                icon: "globe",
              },
              {
                label: "Roman Urdu",
                value: "roman_urdu",
                desc: "Urdu using Latin script",
                icon: "message-square",
              },
              {
                label: "Auto Detect",
                value: "auto_detect",
                desc: "Matches your input language",
                icon: "cpu",
              },
            ]}
          />
        </SectionCard>

        {/* Personality Section */}
        <SectionCard title="Chef Personality">
          <GridSelector
            selectedValue={settings.personality}
            onSelect={(val) => handleUpdate("personality", val)}
            options={[
              {
                label: "Professional Chef",
                value: "professional_chef",
                desc: "Precise, technique-focused guidance",
                icon: "chef-hat",
                iconPack: "mci",
              },
              {
                label: "Friendly Chef",
                value: "friendly_chef",
                desc: "Cute, warm, encouraging conversations",
                icon: "smile",
              },
              {
                label: "Cooking Teacher",
                value: "cooking_teacher",
                desc: "Explains cooking science and methods",
                icon: "book-open",
              },
              {
                label: "Grandma Style",
                value: "grandma_style",
                desc: "Comforting, supportive advice",
                icon: "heart",
              },
            ]}
          />
        </SectionCard>

        {/* Response Style & Skill Level */}
        <SectionCard title="Response Style">
          <SegmentedControl
            selectedValue={settings.responseStyle}
            onSelect={(val) => handleUpdate("responseStyle", val)}
            options={[
              { label: "Short", value: "short" },
              { label: "Balanced", value: "balanced" },
              { label: "Detailed", value: "detailed" },
            ]}
          />
        </SectionCard>

        <SectionCard title="Cooking Skill Level">
          <SegmentedControl
            selectedValue={settings.skillLevel}
            onSelect={(val) => handleUpdate("skillLevel", val)}
            options={[
              { label: "Beginner", value: "beginner" },
              { label: "Intermediate", value: "intermediate" },
              { label: "Expert", value: "expert" },
            ]}
          />
        </SectionCard>

        {/* Voice Selection Section */}
        <SectionCard title="Voice Selection">
          <View style={{ gap: 10 }}>
            {([
              { key: "female_1", label: "Female 1" },
              { key: "female_2", label: "Female 2" },
              { key: "male_1", label: "Male 1" },
              { key: "male_2", label: "Male 2" },
            ] as const).map((item) => {
              const selected = settings.voice === item.key;
              const hasVoice = !!voiceMapping[item.key];
              return (
                <View
                  key={item.key}
                  className={`flex-row items-center justify-between p-3.5 rounded-2xl border ${
                    selected ? "bg-[#FBA82E]/5 border-[#FBA82E]" : "bg-[#FAF5EF]/30 border-[#F5E3D8]/40"
                  }`}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleUpdate("voice", item.key)}
                    className="flex-1 flex-row items-center"
                  >
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={selected ? "#FBA82E" : "#8B7D6F"}
                    />
                    <Text className="ml-3 font-jakarta-semibold text-[14px] text-[#3B3328]">
                      {item.label} {!hasVoice && "(Default system fallback)"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handlePreviewVoice(item.key)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#F5E3D8]/50 flex-row items-center"
                  >
                    <Feather
                      name={previewingVoice === item.key ? "square" : "volume-2"}
                      size={14}
                      color="#FBA82E"
                    />
                    <Text className="ml-1 text-[11px] font-poppins-bold text-[#FBA82E]">
                      {previewingVoice === item.key ? "Stop" : "Preview Voice"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </SectionCard>

        {/* Speech Speed Rate */}
        <SectionCard title="Speech Speed">
          <View className="items-center py-1">
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0.5}
              maximumValue={1.5}
              step={0.25}
              value={settings.speechRate}
              onSlidingComplete={(val) => handleUpdate("speechRate", val)}
              minimumTrackTintColor="#FBA82E"
              maximumTrackTintColor="#FAF5EF"
              thumbTintColor="#FBA82E"
            />
            <View className="w-full flex-row justify-between px-1.5 mt-1">
              {["0.5x", "0.75x", "1.0x", "1.25x", "1.5x"].map((label, idx) => {
                const stepVal = 0.5 + idx * 0.25;
                const isSelected = settings.speechRate === stepVal;
                return (
                  <Text
                    key={label}
                    className={`text-[10px] ${
                      isSelected ? "font-poppins-bold text-[#FBA82E]" : "font-inter-regular text-[#8B7D6F]"
                    }`}
                  >
                    {label}
                  </Text>
                );
              })}
            </View>
          </View>
        </SectionCard>

        {/* Measurement Preferences */}
        <SectionCard title="Measurement Preferences">
          <View style={{ gap: 12 }}>
            <View>
              <Text className="text-[11.5px] font-jakarta-medium text-[#8B7D6F] mb-1.5 uppercase tracking-wider">
                Temperature
              </Text>
              <SegmentedControl
                selectedValue={settings.temperatureUnit}
                onSelect={(val) => handleUpdate("temperatureUnit", val)}
                options={[
                  { label: "Celsius (°C)", value: "C" },
                  { label: "Fahrenheit (°F)", value: "F" },
                ]}
              />
            </View>
            <View>
              <Text className="text-[11.5px] font-jakarta-medium text-[#8B7D6F] mb-1.5 uppercase tracking-wider">
                Measurement System
              </Text>
              <SegmentedControl
                selectedValue={settings.measurementSystem}
                onSelect={(val) => handleUpdate("measurementSystem", val)}
                options={[
                  { label: "Metric", value: "metric" },
                  { label: "Imperial", value: "imperial" },
                ]}
              />
            </View>
          </View>
        </SectionCard>

        {/* Toggle Toggles Section */}
        <SectionCard title="Toggles Settings">
          <View style={{ gap: 4 }}>
            <ToggleRow
              label="Auto Speak Responses"
              value={settings.autoSpeak}
              onToggle={(val) => handleUpdate("autoSpeak", val)}
            />
            <View className="h-px bg-[#F5E3D8]/30 w-full my-1.5" />
            <ToggleRow
              label="Voice Responses"
              value={settings.voiceResponses}
              onToggle={(val) => handleUpdate("voiceResponses", val)}
            />
            <View className="h-px bg-[#F5E3D8]/30 w-full my-1.5" />
            <ToggleRow
              label="Remember Cooking History"
              value={settings.rememberCookingHistory}
              onToggle={(val) => handleUpdate("rememberCookingHistory", val)}
            />
            <View className="h-px bg-[#F5E3D8]/30 w-full my-1.5" />
            <ToggleRow
              label="Remember Assistant Chats"
              value={settings.rememberAssistantChats}
              onToggle={(val) => handleUpdate("rememberAssistantChats", val)}
            />
          </View>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
