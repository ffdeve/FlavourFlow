import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Image } from "expo-image";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import Avatar from "@/components/ui/avatar";
import { supabase } from "@/services/supabase";
import { recipeService } from "@/services/recipe.service";
import { chefbooAnalytics } from "@/services/chefboo-analytics";
import { IngredientSelectorModal, type SelectedIngredient } from "@/components/ui/ingredient-selector-modal";
import { detectIngredients, preloadIngredients } from "@/services/ingredient-engine";
import { AIRecipeCarousel, type AIRecipe } from "@/components/ui/ai-recipe-carousel";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { DEFAULT_ASSISTANT_SETTINGS } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Types ───────────────────────────────────────────────────────────────────
type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  kind?: "text" | "availability";
  ingredients?: string[];
}

// ─── Suggestion Chips ────────────────────────────────────────────────────────
const SUGGESTIONS: { id: string; label: string; icon: string; action?: "fridge" }[] = [
  { id: "1", label: "What's in my fridge?", icon: "package", action: "fridge" },
  { id: "2", label: "What can I cook tonight?", icon: "moon" },
  { id: "3", label: "A quick 15-minute meal", icon: "clock" },
  { id: "4", label: "Surprise me with a recipe", icon: "gift" },
];

// ─── ChefBoo Avatar ──────────────────────────────────────────────────────────
function ChefBooAvatar({ size = 36 }: { size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-[#FAF5EF] items-center justify-center overflow-hidden"
    >
      <Image
        source={require("@/assets/images/chef-boo-home.webp")}
        style={{ width: size, height: size }}
        contentFit="cover"
      />
    </View>
  );
}

// ─── Lightweight markdown (bold + bullets) ──────────────────────────────────
// Gemini replies in markdown; render **bold** and bullet lines natively so the
// chat never shows raw "**" asterisks.
function renderInline(text: string, baseClass: string, keyPrefix: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((s) => s.length > 0)
    .map((part, i) => {
      const bold = /^\*\*[^*]+\*\*$/.test(part);
      return (
        <Text key={`${keyPrefix}_${i}`} className={`${baseClass} ${bold ? "font-jakarta-bold" : ""}`}>
          {bold ? part.slice(2, -2) : part}
        </Text>
      );
    });
}

function RichMessageText({ text, isUser }: { text: string; isUser: boolean }) {
  const base = `text-[14.5px] leading-[22px] font-inter-medium ${isUser ? "text-white" : "text-[#3B3328]"}`;
  const lines = text.split(/\n/);
  return (
    <View>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={`sp_${idx}`} style={{ height: 6 }} />;
        const bullet = /^([*\-•])\s+(.*)$/.exec(trimmed);
        if (bullet) {
          return (
            <View key={`b_${idx}`} className="flex-row" style={{ marginTop: 3 }}>
              <Text className={base} style={{ marginRight: 6 }}>•</Text>
              <Text className={base} style={{ flex: 1 }}>{renderInline(bullet[2], base, `b${idx}`)}</Text>
            </View>
          );
        }
        return (
          <Text key={`t_${idx}`} className={base} style={{ marginTop: idx === 0 ? 0 : 3 }}>
            {renderInline(trimmed, base, `t${idx}`)}
          </Text>
        );
      })}
    </View>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({
  message,
  avatarUrl,
  voiceResponses,
  onSpeak,
  isSpeaking,
}: {
  message: Message;
  avatarUrl?: string | null;
  voiceResponses?: boolean;
  onSpeak?: () => void;
  isSpeaking?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <View
      className={`flex-row items-end mb-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <View className="mr-2 mb-0.5">
          <ChefBooAvatar size={34} />
        </View>
      )}

      <View className="flex-row items-center" style={{ gap: 8 }}>
        <View
          className={`rounded-[20px] px-4 py-3 ${
            isUser
              ? "bg-[#FBA82E] rounded-br-[6px]"
              : "bg-white rounded-bl-[6px] border border-[#F5E3D8]/60"
          }`}
          style={{
            maxWidth: SCREEN_WIDTH * 0.72,
            shadowColor: "#3B3328",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isUser ? 0 : 0.05,
            shadowRadius: 6,
            elevation: isUser ? 0 : 2,
          }}
        >
          <RichMessageText text={message.text} isUser={isUser} />
        </View>

        {!isUser && voiceResponses && (
          <TouchableOpacity
            onPress={onSpeak}
            activeOpacity={0.7}
            className={`w-8 h-8 rounded-full items-center justify-center border shadow-sm ${
              isSpeaking ? "bg-primary border-primary" : "bg-[#FAF5EF] border-primary/20"
            }`}
          >
            <Feather
              name={isSpeaking ? "volume-x" : "volume-2"}
              size={13}
              color={isSpeaking ? "#FFFFFF" : "#FBA82E"}
            />
          </TouchableOpacity>
        )}
      </View>

      {isUser && (
        <View className="ml-2 mb-0.5">
          <Avatar url={avatarUrl} size={34} />
        </View>
      )}
    </View>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <View className="flex-row items-end mb-4 justify-start">
      <View className="mr-2 mb-0.5">
        <ChefBooAvatar size={34} />
      </View>
      <View
        className="bg-white rounded-[20px] rounded-bl-[6px] px-4 py-3 border border-[#F5E3D8]/60"
        style={{
          shadowColor: "#3B3328",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center gap-1.5" style={{ gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className="w-2 h-2 rounded-full bg-[#FBA82E]/60"
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Availability Prompt (after fridge ingredient selection) ──────────────────
function AvailabilityPrompt({
  message,
  answered,
  onAnswer,
}: {
  message: Message;
  answered: boolean;
  onAnswer: (msg: Message, includeBasics: boolean) => void;
}) {
  return (
    <View className="flex-row items-end mb-4 justify-start">
      <View className="mr-2 mb-0.5">
        <ChefBooAvatar size={34} />
      </View>
      <View
        style={{ maxWidth: SCREEN_WIDTH * 0.8 }}
        className="bg-white rounded-[20px] rounded-bl-[6px] px-4 py-3 border border-[#F5E3D8]/60"
      >
        <Text className="text-[14.5px] leading-[22px] font-inter-medium text-[#3B3328]">
          {message.text}
        </Text>

        {!answered && (
          <View className="mt-3" style={{ gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onAnswer(message, false)}
              className="bg-[#FBA82E] rounded-[14px] py-2.5 px-3 items-center"
            >
              <Text className="text-[13px] font-jakarta-semibold text-white">Only These Ingredients</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onAnswer(message, true)}
              className="bg-[#FAF5EF] border border-[#F5E3D8] rounded-[14px] py-2.5 px-3 items-center"
            >
              <Text className="text-[13px] font-jakarta-semibold text-[#3B3328]">
                I Also Have Basic Kitchen Ingredients
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Welcome State ───────────────────────────────────────────────────────────
function WelcomeState({
  displayName,
  onSuggestion,
  onFridge,
}: {
  displayName: string;
  onSuggestion: (text: string) => void;
  onFridge: () => void;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ChefBoo welcome image */}
      <View className="items-center mb-5">
        <Image
          source={require("@/assets/images/chat-welcome.webp")}
          style={{ width: 168, height: 168 }}
          contentFit="contain"
        />
      </View>

      {/* Greeting */}
      <Text className="text-[22px] font-jakarta-bold text-[#3B3328] text-center mb-2">
        Hey {displayName}!
      </Text>
      <Text className="text-[14px] font-inter-medium text-[#8B7D6F] text-center leading-5 mb-8 max-w-[260px]">
        I'm ChefBoo, your AI cooking companion. Ask me anything about recipes, ingredients, or what to cook today!
      </Text>

      {/* Suggestion chips */}
      <View className="w-full gap-2.5" style={{ gap: 10 }}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s.id}
            activeOpacity={0.75}
            onPress={() => (s.action === "fridge" ? onFridge() : onSuggestion(s.label))}
            className="flex-row items-center bg-white border border-[#F5E3D8] rounded-[16px] px-4 py-3.5"
            style={{
              shadowColor: "#3B3328",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View className="w-8 h-8 rounded-full bg-[#FBA82E]/10 items-center justify-center mr-3">
              <Feather name={s.icon as any} size={15} color="#FBA82E" />
            </View>
            <Text className="flex-1 text-[14px] font-inter-medium text-[#3B3328]">
              {s.label}
            </Text>
            <Feather name="chevron-right" size={16} color="#C4B8AC" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
export default function AiChatScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  
  const ttsRateRef = useRef(1.0);
  const ttsVoiceRef = useRef<string | undefined>(undefined);
  const [voiceMapping, setVoiceMapping] = useState<Record<string, string>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const assistantSettings = {
    ...DEFAULT_ASSISTANT_SETTINGS,
    ...profile?.assistant_settings,
  };

  useEffect(() => {
    ttsRateRef.current = assistantSettings.speechRate;
  }, [assistantSettings.speechRate]);

  useEffect(() => {
    async function loadVoices() {
      try {
        const available = await Speech.getAvailableVoicesAsync();
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
        const remaining = enVoices.filter((v) => !females.includes(v) && !males.includes(v));
        remaining.forEach((v, idx) => {
          if (idx % 2 === 0) females.push(v);
          else males.push(v);
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

  const speakText = (msgId: string, text: string) => {
    Speech.stop();
    if (speakingMsgId === msgId && isSpeaking) {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      return;
    }

    if (!assistantSettings.voiceResponses) {
      Alert.alert("Voice Responses Disabled", "Please enable Voice Responses in ChefBoo Preferences to hear responses.");
      return;
    }

    const clean = (text || "").trim();
    if (!clean) return;

    setIsSpeaking(true);
    setSpeakingMsgId(msgId);

    const hasUrdu = /[\u0600-\u06FF]/.test(clean);
    
    const voiceKey = assistantSettings.voice;
    const voiceId = voiceMapping[voiceKey];
    
    let selectedVoice = voiceId;
    if (hasUrdu) {
      Speech.getAvailableVoicesAsync().then((voices) => {
        const urVoice = voices.find(v => (v.language || "").toLowerCase().startsWith("ur"));
        const fallbackUrVoice = urVoice?.identifier;
        Speech.speak(clean, {
          rate: ttsRateRef.current,
          voice: fallbackUrVoice,
          onDone: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
          onStopped: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
          onError: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
        });
      });
      return;
    }

    if (!selectedVoice) {
      Speech.speak(clean, {
        rate: ttsRateRef.current,
        onDone: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
        onStopped: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
        onError: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
      });
      return;
    }

    Speech.speak(clean, {
      voice: selectedVoice,
      rate: ttsRateRef.current,
      onDone: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
      onStopped: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
      onError: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
    });
  };

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const { isConnected } = useNetworkStatus();
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showFridge, setShowFridge] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [carouselRecipes, setCarouselRecipes] = useState<AIRecipe[]>([]);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const listRef = useRef<FlatList>(null);
  // Ingredients the user explicitly removed this turn — don't auto-re-add them
  const dismissedRef = useRef<Set<string>>(new Set());
  // Every recipe already shown this session — so "different/more" excludes them
  const shownRecipeIdsRef = useRef<Set<string>>(new Set());

  const displayName =
    profile?.full_name?.split(" ")[0] || "there";
  const hasMessages = messages.length > 0;

  // Warm the local ingredient list once (for live detection)
  useEffect(() => {
    preloadIngredients();
  }, []);

  // ── Live, debounced ingredient detection from typed/spoken text (no Gemini) ──
  // Longer debounce → waits until you've stopped typing, so detection is
  // accurate (only high-confidence ~90%+ matches) instead of jumpy per-keystroke.
  useEffect(() => {
    const text = inputText.trim();
    if (text.length < 3) return;
    const handle = setTimeout(async () => {
      const detected = await detectIngredients(text);
      if (detected.length === 0) return;
      setSelectedIngredients((prev) => {
        const byName = new Map(prev.map((i) => [i.name, i]));
        let changed = false;
        for (const d of detected) {
          if (!byName.has(d.name) && !dismissedRef.current.has(d.name)) {
            byName.set(d.name, d);
            changed = true;
          }
        }
        return changed ? Array.from(byName.values()) : prev;
      });
    }, 1400);
    return () => clearTimeout(handle);
  }, [inputText]);

  // ── Voice-to-text dictation ──────────────────────────────────────────────
  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event) => {
    // join all result segments → live partial transcript into the input
    const transcript = (event.results ?? [])
      .map((r: any) => r?.transcript ?? "")
      .join(" ")
      .trim();
    if (transcript) setInputText(transcript);
  });
  useSpeechRecognitionEvent("error", (event: any) => {
    console.warn("Speech recognition error:", event?.error, event?.message);
    setIsListening(false);
  });

  const toggleListening = useCallback(async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Microphone access needed",
          "To talk to ChefBoo, enable Microphone & Speech Recognition for FlavourFlow in Settings.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      // en-US is the most reliable dictation model; device locales like en-PK
      // often lack an on-device model. Network recognition allowed for accuracy.
      ExpoSpeechRecognitionModule.start({
        lang: assistantSettings.language === "urdu" ? "ur-PK" : "en-US",
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
      });
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
      setIsListening(false);
    }
  }, [isListening]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const userMsg: Message = {
        id: `u_${Date.now()}`,
        role: "user",
        text: trimmed,
        timestamp: new Date(),
      };

      // Guard: edge function requires userId
      if (!user?.id) {
        setMessages((prev) => [
          ...prev,
          userMsg,
          {
            id: `a_auth_${Date.now()}`,
            role: "assistant",
            text: "I need you to be signed in before I can cook up answers. Please log in and try again!",
            timestamp: new Date(),
          },
        ]);
        setInputText("");
        return;
      }

      // Structured ingredients from chips (typed/voice/fridge) → sent alongside the prompt
      const ingredients = selectedIngredients.map((i) => i.name);

      setMessages((prev) => [...prev, userMsg]);
      setInputText("");
      setIsTyping(true);
      // ingredients consumed by this message — reset chips + dismissals
      setSelectedIngredients([]);
      dismissedRef.current = new Set();

      try {
        // Build conversation history (last 10 turns) for context
        const history = messages.slice(-10).map((m) => ({
          role: m.role,
          text: m.text,
        }));

        // Call Supabase Edge Function — Gemini API key never leaves the server
        const { data, error } = await supabase.functions.invoke("ai-chat", {
          body: {
            message: trimmed,
            userId: user?.id,
            history: assistantSettings.rememberAssistantChats ? history : [],
            ingredients,
            excludeIds: Array.from(shownRecipeIdsRef.current),
            assistantSettings,
          },
        });

        if (error) throw error;

        const replyText = data?.reply ?? "Sorry, something went wrong. Please try again.";
        const reply: Message = {
          id: `a_${Date.now()}`,
          role: "assistant",
          text: replyText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, reply]);

        if (assistantSettings.autoSpeak && assistantSettings.voiceResponses) {
          setTimeout(() => {
            speakText(reply.id, replyText);
          }, 100);
        }

        // Surface recipes in the carousel: DB matches, or the AI-generated ones
        if (Array.isArray(data?.recipes) && data.recipes.length > 0) {
          setCarouselRecipes(
            data.recipes.map((r: any) => ({
              id: r.id,
              title: r.title,
              image: r.image,
              time: r.time,
              ingredientsCount: r.ingredientsCount,
              spiceLevel: r.spiceLevel,
              cuisine: r.cuisine,
            })) as AIRecipe[],
          );
        } else if (Array.isArray(data?.generatedRecipes) && data.generatedRecipes.length > 0) {
          setCarouselRecipes(
            data.generatedRecipes.map((g: any) => ({
              id: g.id,
              title: g.title,
              image: g.image,
              isAI: true,
              time: (g.prep_time ?? 0) + (g.cook_time ?? 0) || undefined,
              ingredientsCount: g.ingredientsCount,
              spiceLevel: g.spice_level,
              cuisine: g.cuisine_type,
            })) as AIRecipe[],
          );
        } else {
          setCarouselRecipes([]);
        }

        // Remember everything shown so a later "different/more" excludes them
        [
          ...(Array.isArray(data?.recipes) ? data.recipes : []),
          ...(Array.isArray(data?.generatedRecipes) ? data.generatedRecipes : []),
        ].forEach((r: any) => r?.id && shownRecipeIdsRef.current.add(String(r.id)));
      } catch (err) {
        console.error("ai-chat error:", err);
        const errMsg: Message = {
          id: `a_err_${Date.now()}`,
          role: "assistant",
          text: "Oops! I had trouble connecting. Please check your connection and try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, messages, user?.id, selectedIngredients],
  );

  // ── Fridge ingredient selection (shown as editable chips above input) ──────
  const handleIngredientsConfirmed = useCallback((items: SelectedIngredient[]) => {
    if (items.length === 0) return;
    setSelectedIngredients((prev) => {
      const byName = new Map(prev.map((i) => [i.name, i]));
      for (const it of items) byName.set(it.name, it);
      return Array.from(byName.values());
    });
    chefbooAnalytics.log(user?.id, "FRIDGE_SEARCH", { ingredients: items.map((i) => i.name) });
  }, [user?.id]);

  const removeIngredient = useCallback((name: string) => {
    dismissedRef.current.add(name); // don't let live-detection re-add it
    setSelectedIngredients((prev) => prev.filter((i) => i.name !== name));
  }, []);

  // Commit the chip selection → ChefBoo asks the availability question
  const commitIngredients = useCallback(() => {
    if (selectedIngredients.length === 0) return;
    const names = selectedIngredients.map((i) => i.name);
    const availMsg: Message = {
      id: `avail_${Date.now()}`,
      role: "assistant",
      text: `Got it — you have: ${names.join(", ")}.\nAre these the only ingredients you have?`,
      timestamp: new Date(),
      kind: "availability",
      ingredients: names,
    };
    setMessages((prev) => [...prev, availMsg]);
    setSelectedIngredients([]);
  }, [selectedIngredients]);

  const handleAvailabilityAnswer = useCallback(
    (msg: Message, includeBasics: boolean) => {
      setAnsweredIds((prev) => new Set(prev).add(msg.id));
      const list = (msg.ingredients ?? []).join(", ");
      const note = includeBasics
        ? "I also have basic kitchen staples (oil, salt, pepper, common spices)."
        : "Only these ingredients, nothing else.";
      sendMessage(`I have: ${list}. ${note}`);
    },
    [sendMessage],
  );

  // ── Recipe carousel actions (branch on AI vs DB recipe) ───────────────────
  const handleOpenRecipe = useCallback(
    (r: AIRecipe) => {
      chefbooAnalytics.log(user?.id, r.isAI ? "AI_RECO_CLICKED" : "RECIPE_OPENED", { id: r.id });
      router.push((r.isAI ? `/ai-recipe-detail?id=${r.id}` : `/recipe-detail?id=${r.id}`) as any);
    },
    [router, user?.id],
  );
  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      if (item.kind === "availability") {
        return (
          <AvailabilityPrompt
            message={item}
            answered={answeredIds.has(item.id)}
            onAnswer={handleAvailabilityAnswer}
          />
        );
      }
      return (
        <MessageBubble
          message={item}
          avatarUrl={profile?.avatar_url}
          voiceResponses={assistantSettings.voiceResponses}
          onSpeak={() => speakText(item.id, item.text)}
          isSpeaking={speakingMsgId === item.id && isSpeaking}
        />
      );
    },
    [profile?.avatar_url, answeredIds, handleAvailabilityAnswer, assistantSettings.voiceResponses, speakingMsgId, isSpeaking, voiceMapping],
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]">
      {/* ── Header ── */}
      <View
        className="flex-row items-center px-4 py-3 bg-[#FFFDF5] border-b border-[#F5E3D8]/40"
        style={{
          shadowColor: "#3B3328",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center rounded-full bg-[#FAF5EF] mr-3"
        >
          <Feather name="arrow-left" size={19} color="#3B3328" />
        </TouchableOpacity>

        {/* ChefBoo identity */}
        <View className="flex-row items-center flex-1">
          <ChefBooAvatar size={38} />
          <Text className="ml-2.5 text-[16px] font-jakarta-bold text-[#3B3328]">
            ChefBoo
          </Text>
        </View>

        {/* Clear chat */}
        {hasMessages && (
          <TouchableOpacity
            onPress={() => {
              setMessages([]);
              setCarouselRecipes([]);
              setSelectedIngredients([]);
              shownRecipeIdsRef.current = new Set();
            }}
            className="w-9 h-9 items-center justify-center rounded-full bg-[#FAF5EF]"
          >
            <Image source={require("@/assets/icons/trash.webp")} style={{ width: 22, height: 22 }} contentFit="contain" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* ── Chat area or Welcome ── */}
        {!hasMessages ? (
          <WelcomeState
            displayName={displayName}
            onSuggestion={sendMessage}
            onFridge={() => setShowFridge(true)}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 8,
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          />
        )}

        {/* ── Recipe carousel (only while in a conversation) ── */}
        {hasMessages && carouselRecipes.length > 0 && (
          <AIRecipeCarousel recipes={carouselRecipes} onOpen={handleOpenRecipe} />
        )}

        {/* ── Input Bar ── */}
        <View
          className="px-4 py-3 bg-[#FFFDF5] border-t border-[#F5E3D8]/40"
          style={{
            shadowColor: "#3B3328",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {/* Selected ingredient chips (from the fridge) — icon + name */}
          {selectedIngredients.length > 0 && (
            <View className="flex-row flex-wrap mb-2.5" style={{ gap: 8 }}>
              {selectedIngredients.map((ing) => (
                <Animated.View
                  key={ing.name}
                  entering={FadeIn.duration(220)}
                  exiting={FadeOut.duration(150)}
                  className="flex-row items-center bg-[#FBA82E]/15 border border-[#FBA82E]/40 rounded-full pl-2 pr-2 py-1.5"
                >
                  {ing.icon_url ? (
                    <Image source={{ uri: ing.icon_url }} style={{ width: 18, height: 18 }} contentFit="contain" />
                  ) : null}
                  <Text className="text-[13px] font-inter-medium text-[#3B3328] mx-1.5">{ing.name}</Text>
                  <TouchableOpacity onPress={() => removeIngredient(ing.name)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Feather name="x" size={13} color="#8B7D6F" />
                  </TouchableOpacity>
                </Animated.View>
              ))}
              <TouchableOpacity
                onPress={() => setShowFridge(true)}
                className="flex-row items-center bg-[#FAF5EF] border border-[#F5E3D8] rounded-full px-3 py-1.5"
              >
                <Feather name="plus" size={13} color="#8B7D6F" />
                <Text className="text-[13px] font-inter-medium text-[#8B7D6F] ml-1">Add ingredients</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Listening banner (voice dictation active) */}
          {isListening && (
            <View className="flex-row items-center justify-center mb-2.5 bg-[#E05252]/10 border border-[#E05252]/30 rounded-full py-2 px-4">
              <View className="w-2 h-2 rounded-full bg-[#E05252] mr-2" />
              <Text className="text-[13px] font-inter-medium text-[#E05252]">
                Listening… tap the mic to stop
              </Text>
            </View>
          )}

          <View className="flex-row items-end bg-white border border-[#F5E3D8] rounded-[20px] px-3 py-2 min-h-[50px]">
            {/* Fridge — open ingredient selector */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowFridge(true)}
              className="w-9 h-9 rounded-full items-center justify-center bg-[#FAF5EF] mr-1"
            >
              <Image
                source={require("@/assets/icons/fridge.webp")}
                style={{ width: 20, height: 20 }}
                contentFit="contain"
              />
            </TouchableOpacity>

            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                isListening
                  ? "Listening…"
                  : selectedIngredients.length > 0
                  ? "Tap send to find recipes…"
                  : "Ask ChefBoo anything..."
              }
              placeholderTextColor="#C4B8AC"
              multiline
              maxLength={500}
              className="flex-1 text-[14.5px] font-inter-medium text-[#3B3328] pt-1.5 pb-1.5"
              style={{ maxHeight: 100 }}
              onSubmitEditing={() => sendMessage(inputText)}
              returnKeyType="send"
            />

            {/* Mic — voice to text */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleListening}
              disabled={isTyping}
              className={`w-9 h-9 rounded-full items-center justify-center ml-2 ${
                isListening ? "bg-[#E05252]" : "bg-[#FAF5EF]"
              }`}
            >
              <Feather name="mic" size={16} color={isListening ? "#FFFFFF" : "#8B7D6F"} />
            </TouchableOpacity>

            {/* Send / Generate */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (isListening) ExpoSpeechRecognitionModule.stop();
                if (inputText.trim()) {
                  // Typed prompt → send it (chips ride along as structured ingredients)
                  sendMessage(inputText);
                } else if (selectedIngredients.length > 0) {
                  // Fridge-only selection, no prompt → ask the availability question
                  commitIngredients();
                }
              }}
              disabled={(!inputText.trim() && selectedIngredients.length === 0) || isTyping || !isConnected}
              className={`w-9 h-9 rounded-full items-center justify-center ml-2 ${
                (inputText.trim() || selectedIngredients.length > 0) && !isTyping && isConnected
                  ? "bg-[#FBA82E]"
                  : "bg-[#F5E3D8]"
              }`}
            >
              {isTyping ? (
                <ActivityIndicator size="small" color="#FBA82E" />
              ) : (
                <Feather
                  name="send"
                  size={16}
                  color={inputText.trim() || selectedIngredients.length > 0 ? "#FFFFFF" : "#C4B8AC"}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Ingredient Selector Modal ── */}
      <IngredientSelectorModal
        visible={showFridge}
        onClose={() => setShowFridge(false)}
        onConfirm={handleIngredientsConfirmed}
      />
    </SafeAreaView>
  );
}

