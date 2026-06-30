import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { CookingLoader } from "@/components/ui/cooking-loader";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import YoutubePlayer from "react-native-youtube-iframe";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

import { recipeService, Recipe } from "@/services/recipe.service";
import { communityService } from "@/services/community.service";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/hooks/use-auth";
import {
  useTimersStore,
  remainingSec,
  type CookTimer,
} from "@/store/timers.store";
import {
  ensureNotificationSetup,
  presentTimerDoneNow,
} from "@/services/notifications";
import { scaleQuantity } from "@/utils/recipe-steps";
import { DEFAULT_ASSISTANT_SETTINGS } from "@/types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/** Short human description of a timer left over from a prior cooking session. */
function describeSessionTimer(t?: CookTimer): string | null {
  if (!t) return null;
  if (t.status === "done") return "A timer finished while you were away.";
  if (t.status === "paused") return "A timer was paused.";
  if (t.status === "running") {
    const rem = remainingSec(t);
    const mins = Math.ceil(rem / 60);
    return rem > 0 ? `A timer is still running (~${mins} min left).` : null;
  }
  return null;
}

// Confetti animation component matching HTML mockup intent
function ConfettiEffect() {
  const pieces = useRef(
    Array.from({ length: 45 }).map(() => ({
      left: Math.random() * 100 + "%",
      delay: Math.random() * 1500,
      duration: 2500 + Math.random() * 2000,
      size: 8 + Math.random() * 10,
      color: ["#FBA82E", "#FCC368", "#F2E3C0", "#FAF5EF", "#FFC107", "#FF9800"][
        Math.floor(Math.random() * 6)
      ],
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    pieces.forEach((piece) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(piece.delay),
          Animated.timing(piece.anim, {
            toValue: 1,
            duration: piece.duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} className="z-20">
      {pieces.map((piece, i) => {
        const translateY = piece.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, SCREEN_HEIGHT],
        });
        const rotate = piece.anim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "360deg"],
        });
        const opacity = piece.anim.interpolate({
          inputRange: [0, 0.8, 1],
          outputRange: [1, 1, 0],
        });

        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: piece.left as any,
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: piece.size / 2,
              transform: [{ translateY }, { rotate }] as any,
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}

// ChefBoo's face — used on the sous-chef FAB and the ask sheet header.
function ChefBooFace({ size = 36 }: { size?: number }) {
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

// A substitution / alternative ChefBoo offers (rendered as a chip with a DB icon).
type ChefSuggestion = {
  type: "ingredient" | "appliance" | "technique" | string;
  name: string;
  note?: string;
  icon?: string | null;
};
type ChefMsg = { role: "user" | "assistant"; text: string; suggestions?: ChefSuggestion[] };

export default function CookingModeScreen() {
  const { id, aiRecipeId, servings, baseServings } = useLocalSearchParams<{
    id: string;
    aiRecipeId: string;
    servings?: string;
    baseServings?: string;
  }>();
  const { user, preferences, profile } = useAuth();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Cooking state
  const [currentStep, setCurrentStep] = useState(0);
  const [startTime] = useState<number>(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);

  const playerRef = useRef<any>(null);
  const [playerState, setPlayerState] = useState<string>("unstarted");

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Coordinated playback sync & Loop interval
  useEffect(() => {
    let interval: any = null;
    
    if (recipe && recipe.steps && recipe.steps[currentStep]) {
      const step = recipe.steps[currentStep];
      const start = step.video_start_time_frame || step.video_start_time || 0;
      const end = step.video_end_time || 0;
      
      // Seek to step start time on mount / step change
      if (playerRef.current) {
        playerRef.current.seekTo(start, true);
      }

      if (end > start) {
        interval = setInterval(async () => {
          if (playerRef.current) {
            try {
              const currentTime = await playerRef.current.getCurrentTime();
              if (currentTime >= end) {
                playerRef.current.seekTo(start, true);
              }
            } catch (e) {
              // ignore if player not ready
            }
          }
        }, 500);
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentStep, recipe, playerState]);

  // Helper to resolve ingredient storage URL
  const getIngredientIconUrl = (name: string) => {
    if (!name) return "";
    const lowerName = name.toLowerCase().trim();
    if (lowerName.includes("chili") || lowerName.includes("chilli")) {
      if (lowerName.includes("green") || lowerName.includes("jalapeno")) {
        return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/jalapeno.webp`;
      }
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/redchili.webp`;
    }
    if (lowerName.includes("onion")) return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/pearlonion.webp`;
    if (lowerName.includes("cilantro") || lowerName.includes("coriander") || lowerName.includes("mint")) return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/cilantro.webp`;
    if (lowerName.includes("water")) return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/Glass%20Water%20Jug.webp`;
    if (lowerName.includes("pasta") || lowerName.includes("noodle") || lowerName.includes("macaroni")) return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/Farfalle%20Pasta.webp`;
    if (lowerName.includes("banana")) return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/banana.webp`;
    if (lowerName.includes("ice")) return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/Ice.webp`;
    if (lowerName.includes("soda")) return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/bakingsoda.webp`;

    const formattedName = name.trim().replace(/\s+/g, "%20");
    return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/${formattedName}.webp`;
  };

  const getIngredientDetail = (name: string) => {
    const recipeIngredients = recipe?.ingredients || [];
    const found = recipeIngredients.find(
      (ing: any) =>
        ing &&
        typeof ing === "object" &&
        ing.name &&
        ing.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (found) {
      return {
        name: found.name,
        quantity: found.quantity || "",
      };
    }
    return {
      name: name,
      quantity: "",
    };
  };

  // TTS states
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Multi-timer engine (background-safe; see timers.store.ts) ──────────────
  const timers = useTimersStore((s) => s.timers);
  const timerAdd = useTimersStore((s) => s.addTimer);
  const timerStart = useTimersStore((s) => s.start);
  const timerPause = useTimersStore((s) => s.pause);
  const timerReset = useTimersStore((s) => s.reset);
  const timerAddMinute = useTimersStore((s) => s.addMinute);
  const timerRemove = useTimersStore((s) => s.remove);
  const timerMarkDone = useTimersStore((s) => s.markDone);

  const [now, setNow] = useState(Date.now());
  const [doneBanner, setDoneBanner] = useState<{ label: string } | null>(null);
  const firedRef = useRef<Set<string>>(new Set());

  // ── In-cook ChefBoo (sous-chef) ───────────────────────────────────────────
  const [chefOpen, setChefOpen] = useState(false);
  const [chefInput, setChefInput] = useState("");
  const [chefBusy, setChefBusy] = useState(false);
  const [chefMsgs, setChefMsgs] = useState<ChefMsg[]>([]);

  // Voice: dictation (speech→text) + hands-free voice-to-voice loop.
  const [isListening, setIsListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const handsFreeRef = useRef(false);
  const chefOpenRef = useRef(false);
  useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);
  useEffect(() => {
    chefOpenRef.current = chefOpen;
    // Closing the sheet ends any voice session so the mic/TTS don't linger.
    if (!chefOpen) {
      setHandsFree(false);
      handsFreeRef.current = false;
      Speech.stop();
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
    }
  }, [chefOpen]);

  // ChefBoo's TTS voice settings (rate from user Settings; best available voice).
  const [voiceMapping, setVoiceMapping] = useState<Record<string, string>>({});
  const ttsRateRef = useRef(1.0);
  const ttsVoiceRef = useRef<string | undefined>(undefined);
  const ttsUrduVoiceRef = useRef<string | undefined>(undefined);
  const assistantSettings = {
    ...DEFAULT_ASSISTANT_SETTINGS,
    ...profile?.assistant_settings,
  };

  const [voiceLang, setVoiceLang] = useState<"en-US" | "ur-PK">(
    assistantSettings.language === "urdu" ? "ur-PK" : "en-US"
  );

  // Icon lookup for substitution chips: ingredient + kitchen-essential master lists.
  const iconMapRef = useRef<Map<string, string>>(new Map());

  // "Step complete?" prompt shown when the CURRENT step's timer finishes.
  const [stepDonePrompt, setStepDonePrompt] = useState<{ id: string; stepIndex: number } | null>(null);

  // Latest finalized voice transcript + the handler that acts on it (set in render
  // once the cooking handlers below exist, so hands-free events stay non-stale).
  const lastTranscriptRef = useRef("");
  const voiceHandlerRef = useRef<(t: string) => void>(() => {});

  // If we restored an in-progress cook, show a one-time "resumed" banner.
  const [resumedFromStep, setResumedFromStep] = useState<number | null>(null);
  // Interactive recovery prompt: a saved session was found on entry. Holds the
  // saved step + a human description of any timer left from that session.
  const [resumePrompt, setResumePrompt] = useState<{
    step: number;
    timerInfo: string | null;
  } | null>(null);

  // Rating state (for completion screen)
  const [rating, setRating] = useState(0);
  // Share-to-community flow (from the cooking-complete screen)
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareText, setShareText] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [shared, setShared] = useState(false);

  // Step card translation animation
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ML Tracking Signals
  const maxStepReached = useRef(0);
  const stepStartTime = useRef(Date.now());
  const stepTimes = useRef<number[]>([]);
  const skippedSteps = useRef(0);
  const revisitSteps = useRef(0);
  const prevStepRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    const duration = Math.floor((now - stepStartTime.current) / 1000);
    
    stepTimes.current[prevStepRef.current] = (stepTimes.current[prevStepRef.current] || 0) + duration;
    
    if (duration < 3 && prevStepRef.current !== currentStep) {
      skippedSteps.current += 1;
    }
    
    if (currentStep < prevStepRef.current) {
      revisitSteps.current += 1;
    }
    
    if (currentStep > maxStepReached.current) {
      maxStepReached.current = currentStep;
    }

    // STEP_COMPLETE analytics — only on a single forward advance (excludes the
    // resume jump and back-navigation). Logs time spent on the step just left.
    if (currentStep === prevStepRef.current + 1 && user?.id && id) {
      const completedIndex = prevStepRef.current;
      const completedAt = new Date(now).toISOString();
      const payload = { stepIndex: completedIndex, completedAt, timeSpent: duration };
      recipeService
        .logInteraction(user.id, id, "STEP_COMPLETE", payload)
        .catch((err) => console.error("Failed to log STEP_COMPLETE:", err));
      // Local log too (cheap, offline-safe).
      AsyncStorage.getItem(`cooking:steplog:${id}`)
        .then((raw) => {
          const arr = raw ? JSON.parse(raw) : [];
          arr.push(payload);
          return AsyncStorage.setItem(`cooking:steplog:${id}`, JSON.stringify(arr));
        })
        .catch(() => {});
    }

    prevStepRef.current = currentStep;
    stepStartTime.current = now;
  }, [currentStep]);

  // Load recipe data
  useEffect(() => {
    const loadRecipe = async () => {
      if (id) {
        try {
          const data = await recipeService.getRecipeDetails(id);
          setRecipe(data);
          // In-progress cook found → ask the user whether to resume or start over.
          try {
            const saved = await AsyncStorage.getItem(`cooking:resume:${id}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              const total = (data?.steps ?? []).length;
              if (typeof parsed?.step === "number" && parsed.step > 0 && parsed.step < total) {
                const prior = useTimersStore
                  .getState()
                  .timers.find((x) => x.recipeId === id);
                setResumePrompt({ step: parsed.step, timerInfo: describeSessionTimer(prior) });
              }
            }
          } catch {}
          if (user?.id) {
            recipeService.logInteraction(user.id, id, "COOK_START").catch((err) =>
              console.error("Failed to log cook start interaction:", err)
            );
          }
        } catch (err) {
          console.error("Error loading recipe for cooking mode:", err);
        } finally {
          setLoading(false);
        }
      } else if (aiRecipeId) {
        // AI-generated recipe: load from ai_generated_recipes, adapt to cooking-mode shape.
        try {
          const { data, error } = await supabase
            .from("ai_generated_recipes")
            .select("title, image_url, ingredients, steps")
            .eq("id", aiRecipeId)
            .maybeSingle();
          if (error) throw error;
          if (data) {
            const rawSteps: any[] = Array.isArray(data.steps) ? data.steps : [];
            setRecipe({
              title: data.title,
              image_url: data.image_url,
              ingredients: data.ingredients ?? [],
              // map plain string steps → the step object shape cooking-mode renders
              steps: rawSteps.map((s: any) =>
                typeof s === "string" ? { instruction: s } : s,
              ),
              videoUrl: null,
            });
            // In-progress AI-recipe cook found → prompt to resume or start over.
            try {
              const saved = await AsyncStorage.getItem(`cooking:resume:${aiRecipeId}`);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed?.step === "number" && parsed.step > 0 && parsed.step < rawSteps.length) {
                  const prior = useTimersStore
                    .getState()
                    .timers.find((x) => x.recipeId === aiRecipeId);
                  setResumePrompt({ step: parsed.step, timerInfo: describeSessionTimer(prior) });
                }
              }
            } catch {}
          }
        } catch (err) {
          console.error("Error loading AI recipe for cooking mode:", err);
        } finally {
          setLoading(false);
        }
      }
    };
    loadRecipe();
  }, [id, aiRecipeId, user?.id]);

  // Helper to parse duration
  const parseDuration = (step: any) => {
    const hrs = parseInt(step.timerHours || "0", 10);
    const mins = parseInt(step.timerMinutes || "0", 10);
    return (hrs * 3600) + (mins * 60) || 60; // fallback to 60 seconds if empty
  };

  // Stop any narration when the step changes
  useEffect(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, [currentStep, recipe]);

  // Notification setup + reconcile timers whenever we (re)enter the foreground.
  useEffect(() => {
    ensureNotificationSetup();
    useTimersStore.getState().reconcile();
    setNow(Date.now());
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        useTimersStore.getState().reconcile();
        setNow(Date.now());
      }
    });
    return () => sub.remove();
  }, []);

  // Live 1s clock — only ticks while at least one timer is running.
  useEffect(() => {
    if (!timers.some((t) => t.status === "running")) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timers]);

  // Foreground completion alarm: sound (immediate notification) + haptics + banner.
  // firedRef guards against double-firing before markDone commits.
  useEffect(() => {
    for (const t of timers) {
      if (t.status !== "running") continue;
      const rem = remainingSec(t, now);
      if (rem <= 0 && !firedRef.current.has(t.id)) {
        firedRef.current.add(t.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        presentTimerDoneNow(t.label);
        setDoneBanner({ label: t.label });
        timerMarkDone(t.id);
        // If this was the current step's timer, ask whether the step is done.
        if (t.stepIndex != null) {
          setStepDonePrompt({ id: t.id, stepIndex: t.stepIndex });
        }
      } else if (rem > 0) {
        firedRef.current.delete(t.id);
      }
    }
  }, [now, timers, timerMarkDone]);

  // Auto-dismiss the in-app completion banner.
  useEffect(() => {
    if (!doneBanner) return;
    const to = setTimeout(() => setDoneBanner(null), 5000);
    return () => clearTimeout(to);
  }, [doneBanner]);

  // Clean up TTS + mic when leaving page
  useEffect(() => {
    return () => {
      Speech.stop();
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
    };
  }, []);

  // Load the user's TTS speed, the best available voice, and the substitution
  // icon map (ingredient + kitchen-essential buckets) once.
  useEffect(() => {
    (async () => {
      try {
        ttsRateRef.current = assistantSettings.speechRate;
      } catch {}
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const enVoices = (voices ?? []).filter((v: any) =>
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

        // Fallbacks
        const best =
          enVoices.find((v: any) => String(v.quality).toLowerCase() === "enhanced") ||
          enVoices.find((v: any) => /enhanced|premium|siri/i.test(v.identifier || "")) ||
          enVoices[0];
        if (best?.identifier) ttsVoiceRef.current = best.identifier;

        const ur = (voices ?? []).filter((v: any) => (v.language || "").toLowerCase().startsWith("ur"));
        const bestUr = ur[0];
        if (bestUr?.identifier) ttsUrduVoiceRef.current = bestUr.identifier;
      } catch {}
      try {
        const [ings, essentials] = await Promise.all([
          recipeService.getIngredients(),
          recipeService.getAllKitchenEssentials(),
        ]);
        const map = new Map<string, string>();
        for (const it of (ings ?? []) as any[]) if (it?.name && it?.icon_url) map.set(String(it.name).toLowerCase(), it.icon_url);
        for (const it of (essentials ?? []) as any[]) if (it?.name && it?.icon_url) map.set(String(it.name).toLowerCase(), it.icon_url);
        iconMapRef.current = map;
      } catch (e) {
        console.warn("ChefBoo icon map load failed:", e);
      }
    })();
  }, []);

  // Speak text with the user's chosen rate + best voice. onDone fires after speech.
  const speakText = (text: string, onDone?: () => void) => {
    const clean = (text || "").trim();
    if (!clean) { onDone?.(); return; }
    Speech.stop();
    
    // Respect voiceResponses preference
    if (!assistantSettings.voiceResponses) {
      onDone?.();
      return;
    }

    setIsSpeaking(true);

    const hasUrdu = /[\u0600-\u06FF]/.test(clean);
    const voiceKey = assistantSettings.voice;
    const voiceId = voiceMapping[voiceKey];
    let selectedVoice = voiceId || ttsVoiceRef.current;

    if (hasUrdu) {
      Speech.getAvailableVoicesAsync().then((voices) => {
        const urVoice = voices.find(v => (v.language || "").toLowerCase().startsWith("ur"));
        const fallbackUrVoice = urVoice?.identifier || ttsUrduVoiceRef.current;
        Speech.speak(clean, {
          rate: assistantSettings.speechRate,
          voice: fallbackUrVoice,
          onDone: () => { setIsSpeaking(false); onDone?.(); },
          onStopped: () => setIsSpeaking(false),
          onError: () => { setIsSpeaking(false); onDone?.(); },
        });
      });
      return;
    }

    Speech.speak(clean, {
      rate: assistantSettings.speechRate,
      voice: selectedVoice,
      onDone: () => { setIsSpeaking(false); onDone?.(); },
      onStopped: () => setIsSpeaking(false),
      onError: () => { setIsSpeaking(false); onDone?.(); },
    });
  };

  // ── Voice dictation + hands-free loop events (shared mic) ──────────────────
  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    // Hands-free: a phrase just finished → act on what was heard.
    if (handsFreeRef.current && chefOpenRef.current) {
      const heard = lastTranscriptRef.current.trim();
      lastTranscriptRef.current = "";
      if (heard) voiceHandlerRef.current(heard);
    }
  });
  useSpeechRecognitionEvent("result", (event: any) => {
    const transcript = (event.results ?? [])
      .map((r: any) => r?.transcript ?? "")
      .join(" ")
      .trim();
    if (!transcript) return;
    lastTranscriptRef.current = transcript;
    // Plain dictation (not hands-free) feeds the input box live.
    if (!handsFreeRef.current) setChefInput(transcript);
  });
  useSpeechRecognitionEvent("error", (event: any) => {
    console.warn("Speech recognition error:", event?.error, event?.message);
    setIsListening(false);
  });

  // Start the mic. `single` = one phrase then auto-stop (used by the hands-free loop);
  // otherwise continuous dictation that fills the input box until the user stops it.
  const startListening = async (single: boolean) => {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setHandsFree(false);
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
      lastTranscriptRef.current = "";
      ExpoSpeechRecognitionModule.start({
        lang: voiceLang,
        interimResults: true,
        continuous: !single,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
      });
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
      setIsListening(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAF5EF] justify-center items-center">
        <CookingLoader scale={0.8} />
        <Text className="font-jakarta-semibold text-text-secondary text-sm mt-3">
          Preparing kitchen guide...
        </Text>
      </SafeAreaView>
    );
  }

  const steps = recipe?.steps || [];
  const totalSteps = steps.length;
  const currentStepData = steps[currentStep];

  // Serving scaling carried over from the detail screen (for ChefBoo context).
  const baseServingsNum =
    Number(baseServings) || recipe?.servings || 2;
  const scaledServingsNum = Number(servings) || baseServingsNum;
  const cookScaleFactor =
    baseServingsNum > 0 ? scaledServingsNum / baseServingsNum : 1;

  // ── Resume Later: persist the in-progress step locally; restored on re-entry. ─
  const sessionKey = (id || aiRecipeId) as string | undefined;
  const persistSession = (step: number) => {
    if (!sessionKey) return;
    AsyncStorage.setItem(
      `cooking:resume:${sessionKey}`,
      JSON.stringify({ step, total: totalSteps, ts: Date.now() }),
    ).catch(() => {});
  };
  const clearSession = () => {
    if (!sessionKey) return;
    AsyncStorage.removeItem(`cooking:resume:${sessionKey}`).catch(() => {});
  };

  const handleQuit = () => {
    Alert.alert(
      "Quit Cooking?",
      "Are you sure you want to exit cooking mode?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Quit", 
          style: "destructive", 
          onPress: () => {
            if (user?.id && id) {
              const finalDuration = Math.floor((Date.now() - stepStartTime.current) / 1000);
              stepTimes.current[currentStep] = (stepTimes.current[currentStep] || 0) + finalDuration;
              
              const ratio = totalSteps > 0 ? Number((maxStepReached.current / totalSteps).toFixed(2)) : 0;
              const metadata = {
                engagement: {
                  steps_completed: maxStepReached.current,
                  total_steps: totalSteps,
                  completion_ratio: ratio,
                  exit_reason: "manual_quit",
                  skipped_steps: skippedSteps.current,
                  revisit_steps: revisitSteps.current,
                  step_times_seconds: stepTimes.current
                }
              };
              recipeService.logInteraction(user.id, id, "COOK_ABANDONED", metadata).catch(err => 
                console.error("Failed to log early quit:", err)
              );
            }
            router.back();
          } 
        }
      ]
    );
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      // Animate slide out and in
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep((prev) => {
          const next = prev + 1;
          persistSession(next);
          return next;
        });
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Reached the end! Start completion screen
      const finalDuration = Math.floor((Date.now() - stepStartTime.current) / 1000);
      stepTimes.current[currentStep] = (stepTimes.current[currentStep] || 0) + finalDuration;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      clearSession();
      setIsCompleted(true);
      if (user?.id && id) {
        const metadata = {
          engagement: {
            steps_completed: totalSteps,
            total_steps: totalSteps,
            completion_ratio: 1.0,
            exit_reason: "completed",
            skipped_steps: skippedSteps.current,
            revisit_steps: revisitSteps.current,
            step_times_seconds: stepTimes.current
          }
        };
        recipeService.logInteraction(user.id, id, "COOK_COMPLETE", metadata).catch((err) =>
          console.error("Failed to log cook complete interaction:", err),
        );
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep((prev) => {
          const next = prev - 1;
          persistSession(next);
          return next;
        });
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const toggleSpeech = () => {
    if (!currentStepData) return;
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      speakText(currentStepData.instruction);
    }
  };

  // ── Timer controls (store-driven, background-safe) ────────────────────────
  const recipeKey = (id || aiRecipeId || recipe?.title || "recipe") as string;
  const stepTimer =
    timers.find((t) => t.recipeId === recipeKey && t.stepIndex === currentStep) ??
    null;
  const trayTimers = timers.filter((t) => t.id !== stepTimer?.id);

  const stepTimerRunning = stepTimer?.status === "running";
  const stepTimerDone = stepTimer?.status === "done";
  const stepRemaining = stepTimer
    ? remainingSec(stepTimer, now)
    : currentStepData?.hasTimer
      ? parseDuration(currentStepData)
      : 0;

  // Play/pause the current step's timer, lazily creating it (duration derived from
  // the step's structured hasTimer/timerHours/timerMinutes fields) on first start.
  const handleStepTimerToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (stepTimer) {
      if (stepTimer.status === "running") timerPause(stepTimer.id);
      else timerStart(stepTimer.id);
      return;
    }
    if (currentStepData?.hasTimer) {
      const newId = timerAdd({
        label: `Step ${currentStep + 1}`,
        durationSec: parseDuration(currentStepData),
        recipeId: recipeKey,
        stepIndex: currentStep,
      });
      timerStart(newId);
    }
  };

  const handleStepTimerReset = () => {
    if (!stepTimer) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    timerReset(stepTimer.id);
  };

  const handleStepAddMinute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (stepTimer) {
      timerAddMinute(stepTimer.id);
    } else if (currentStepData?.hasTimer) {
      timerAdd({
        label: `Step ${currentStep + 1}`,
        durationSec: parseDuration(currentStepData) + 60,
        recipeId: recipeKey,
        stepIndex: currentStep,
      });
    }
  };

  // Generic controls for the floating multi-timer tray
  const handleTrayToggle = (t: CookTimer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (t.status === "running") timerPause(t.id);
    else timerStart(t.id);
  };
  const handleTrayDismiss = (timerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    timerRemove(timerId);
  };

  // ── In-cook ChefBoo helpers ───────────────────────────────────────────────
  const openChefBoo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setChefOpen(true);
  };

  // Client-side manual-timer parser — instant, no network/LLM cost.
  const parseManualTimer = (
    text: string,
  ): { seconds: number; label: string } | null => {
    const m = text.toLowerCase();
    const hasTimerIntent =
      /\b(set|start|create|put on|add|begin)\b[\s\S]*\btimer\b/.test(m) ||
      /\btimer\b[\s\S]*\bfor\b/.test(m) ||
      /\bremind me\b[\s\S]*\bin\b/.test(m);
    if (!hasTimerIntent) return null;

    let seconds = 0;
    const hr = m.match(/(\d+)\s*(hours?|hrs?|h)\b/);
    const min = m.match(/(\d+)\s*(minutes?|mins?|m)\b/);
    const sec = m.match(/(\d+)\s*(seconds?|secs?|s)\b/);
    if (hr) seconds += parseInt(hr[1], 10) * 3600;
    if (min) seconds += parseInt(min[1], 10) * 60;
    if (sec) seconds += parseInt(sec[1], 10);
    if (seconds === 0) {
      const bare = m.match(/timer\s*(?:for\s*)?(\d+)\b/);
      if (bare) seconds = parseInt(bare[1], 10) * 60; // bare number → minutes
    }
    if (seconds <= 0) return null;
    const mins = Math.round(seconds / 60);
    const label =
      seconds % 60 === 0 ? `${mins} min timer` : `${seconds}s timer`;
    return { seconds, label };
  };

  // Re-open the mic for the next turn (only while hands-free + sheet open).
  const maybeLoopListen = () => {
    if (handsFreeRef.current && chefOpenRef.current) {
      setTimeout(() => startListening(true), 400);
    }
  };
  // Speak a reply when hands-free, then re-open the mic; otherwise just re-loop.
  const speakThenLoop = (text: string) => {
    if (handsFreeRef.current || assistantSettings.autoSpeak) {
      speakText(text, maybeLoopListen);
    } else {
      maybeLoopListen();
    }
  };

  // Resolve a DB icon (ingredient or kitchen-essential bucket) for a suggestion.
  const resolveSuggestionIcon = (s: ChefSuggestion): string | null => {
    if (s.type === "technique") return null;
    const map = iconMapRef.current;
    const key = (s.name || "").trim().toLowerCase();
    if (!key) return null;
    if (map.has(key)) return map.get(key)!;
    for (const [k, v] of map) {
      if (k.includes(key) || key.includes(k)) return v;
    }
    return null;
  };

  const handleChefSend = async (preset?: string) => {
    const text = (preset ?? chefInput).trim();
    if (!text || chefBusy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setChefMsgs((p) => [...p, { role: "user", text }]);
    setChefInput("");

    // Manual timer shortcut — handle locally, no round-trip.
    const manual = parseManualTimer(text);
    if (manual) {
      const newId = timerAdd({
        label: manual.label,
        durationSec: manual.seconds,
        recipeId: recipeKey,
        stepIndex: null,
      });
      timerStart(newId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const confirm = `Started a ${manual.label}. I'll alert you when it's done.`;
      setChefMsgs((p) => [...p, { role: "assistant", text: confirm }]);
      speakThenLoop(confirm);
      return;
    }

    setChefBusy(true);
    try {
      const history = chefMsgs.slice(-8).map((mm) => ({ role: mm.role, text: mm.text }));
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: text,
          userId: user?.id,
          history: assistantSettings.rememberCookingHistory ? history : [],
          mode: "cooking",
          assistantSettings,
          cookingContext: {
            recipe: {
              title: recipe?.title,
              servings: baseServingsNum,
              scaledServings: scaledServingsNum,
              ingredients: recipe?.ingredients ?? [],
            },
            // Full method so ChefBoo knows completed + upcoming steps, not just now.
            steps: steps
              .map((s: any) => (typeof s === "string" ? s : s?.instruction))
              .filter(Boolean),
            currentStep: currentStepData
              ? {
                  instruction: currentStepData.instruction,
                  action: currentStepData.action ?? null,
                  heatSetting: currentStepData.heatSetting ?? null,
                  temperature: currentStepData.temperature
                    ? `${currentStepData.temperature}°${currentStepData.temperatureUnit || "C"}`
                    : null,
                  note: currentStepData.note ?? null,
                  linkedIngredients: (currentStepData.linkedIngredients ?? []).map(
                    (name: string) => {
                      const match = (recipe?.ingredients ?? []).find(
                        (i: any) => i.name?.toLowerCase() === name.toLowerCase(),
                      );
                      const rawQty = match?.amount
                        ? `${match.amount} ${match.unit || ""}`.trim()
                        : match?.quantity || "";
                      return {
                        name,
                        quantity: scaleQuantity(String(rawQty), cookScaleFactor),
                      };
                    },
                  ),
                }
              : null,
            stepIndex: currentStep,
            totalSteps,
            remainingSteps: Math.max(0, totalSteps - currentStep - 1),
            // What's cooking right now, so ChefBoo can reason about timing.
            runningTimers: timers
              .filter((t) => t.status === "running")
              .map((t) => ({ label: t.label, remaining: formatTime(remainingSec(t, now)) })),
            preferences: preferences
              ? {
                  allergies: preferences.allergies ?? [],
                  spice_level: preferences.spice_level ?? null,
                  dietary:
                    (preferences as any).dietary_restrictions ??
                    (preferences as any).diet_type ??
                    [],
                }
              : {},
          },
        },
      });
      if (error) throw error;

      const reply = data?.reply ?? "Sorry, I didn't catch that — try again?";
      const suggestions: ChefSuggestion[] = Array.isArray(data?.suggestions)
        ? data.suggestions
            .filter((s: any) => s && s.name)
            .map((s: any) => ({
              type: s.type,
              name: s.name,
              note: s.note,
              icon: resolveSuggestionIcon(s),
            }))
        : [];
      setChefMsgs((p) => [...p, { role: "assistant", text: reply, suggestions }]);

      // Server may detect an odd-phrased timer request and return a structured action.
      const action = data?.action;
      if (action?.type === "start_timer" && action.seconds > 0) {
        const label =
          action.label || `${Math.round(action.seconds / 60)} min timer`;
        const newId = timerAdd({
          label,
          durationSec: action.seconds,
          recipeId: recipeKey,
          stepIndex: null,
        });
        timerStart(newId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      speakThenLoop(reply);
    } catch (err) {
      console.error("chefboo cooking error:", err);
      const errText = "I had trouble connecting. Check your connection and try again.";
      setChefMsgs((p) => [...p, { role: "assistant", text: errText }]);
      speakThenLoop(errText);
    } finally {
      setChefBusy(false);
    }
  };

  const CHEF_SUGGESTIONS = [
    "What does simmer mean?",
    "I don't have coriander",
    "How many tbsp in 1/4 cup?",
    "Set a timer for 10 minutes",
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ── Local voice commands — navigation & timer control without the network. ──
  // Returns true if it handled the utterance locally (so ChefBoo isn't called).
  const handleLocalVoiceCommand = (raw: string): boolean => {
    const m = raw.toLowerCase().trim();

    if (/\b(next|next step|move on|carry on|go forward|forward)\b/.test(m)) {
      if (currentStep < totalSteps - 1) {
        const ni = currentStep + 1;
        handleNextStep();
        // Speak after the step-change effect (which stops TTS) has run.
        setTimeout(() => speakThenLoop(steps[ni]?.instruction ?? "Next step."), 500);
      } else {
        handleNextStep(); // finishes the cook
      }
      return true;
    }
    if (/\b(go back|back|previous|prev|last step)\b/.test(m)) {
      if (currentStep > 0) {
        const pi = currentStep - 1;
        handlePrevStep();
        setTimeout(() => speakThenLoop(steps[pi]?.instruction ?? "Previous step."), 500);
      } else {
        speakThenLoop("You're on the first step.");
      }
      return true;
    }
    if (/\b(repeat|say again|read again|again|what was that|come again)\b/.test(m)) {
      speakThenLoop(currentStepData?.instruction ?? "");
      return true;
    }
    if (/\b(pause|stop)\b.*\btimer\b/.test(m)) {
      const running = timers.filter((t) => t.status === "running");
      running.forEach((t) => timerPause(t.id));
      speakThenLoop(running.length ? "Timer paused." : "There's no timer running.");
      return true;
    }
    if (/\b(start|resume)\b.*\btimer\b/.test(m)) {
      if (stepTimer) {
        timerStart(stepTimer.id);
        speakThenLoop("Timer started.");
      } else if (currentStepData?.hasTimer) {
        handleStepTimerToggle();
        speakThenLoop("Timer started.");
      } else {
        speakThenLoop("This step has no timer. Say 'set a timer for 5 minutes' to add one.");
      }
      return true;
    }
    if (/\b(stop listening|never mind|that's all|stop hands free|exit)\b/.test(m)) {
      stopHandsFree();
      return true;
    }
    return false;
  };

  // Acts on one finalized spoken phrase: local command → else ask ChefBoo.
  const handleVoiceUtterance = (raw: string) => {
    const text = (raw || "").trim();
    if (!text) { maybeLoopListen(); return; }
    // "Set timer for X" / "remind me in X" → create a timer immediately.
    if (parseManualTimer(text)) { handleChefSend(text); return; }
    if (handleLocalVoiceCommand(text)) return;
    handleChefSend(text); // advice / substitutions / "how much salt?" → ChefBoo
  };
  // Keep the hands-free event handler pointed at the latest closure.
  voiceHandlerRef.current = handleVoiceUtterance;

  // Mic button in the sheet: plain dictation that fills the input box.
  const toggleDictation = () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    startListening(false);
  };

  const stopHandsFree = () => {
    setHandsFree(false);
    handsFreeRef.current = false;
    Speech.stop();
    try { ExpoSpeechRecognitionModule.stop(); } catch {}
  };

  const toggleLanguage = () => {
    const nextLang = voiceLang === "en-US" ? "ur-PK" : "en-US";
    setVoiceLang(nextLang);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      setTimeout(() => {
        startListening(!handsFree);
      }, 300);
    }
  };

  // Hands-free voice-to-voice: talk → ChefBoo answers aloud → mic re-opens.
  const toggleHandsFree = () => {
    if (handsFree) {
      stopHandsFree();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setHandsFree(true);
    handsFreeRef.current = true;
    startListening(true);
  };

  // ── In-cook ChefBoo ask sheet ─────────────────────────────────────────────
  const renderChefBooSheet = () => (
    <Modal
      visible={chefOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setChefOpen(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setChefOpen(false)}
          className="flex-1 bg-black/40"
        />
        <View
          className="bg-[#FFFDF5] rounded-t-[28px] px-5 pt-4 pb-6"
          style={{ maxHeight: SCREEN_HEIGHT * 0.72 }}
        >
          <View className="items-center pb-2">
            <View className="w-10 h-1.5 rounded-full bg-[#E5D9CC]" />
          </View>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <ChefBooFace size={38} />
              <View>
                <Text className="text-[16px] font-jakarta-bold text-[#3B3328]">ChefBoo</Text>
                <Text className="text-[11px] font-inter-medium text-[#8B7D6F]" numberOfLines={1}>
                  {recipe?.title ? `Cooking ${recipe.title}` : "Your cooking sous-chef"}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={toggleLanguage}
                activeOpacity={0.8}
                className="px-2.5 py-1 rounded-full bg-[#FAF5EF] border border-primary/20 flex-row items-center gap-1"
              >
                <Text className="text-[10px] font-poppins-bold text-primary">
                  {voiceLang === "en-US" ? "EN" : "UR"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setChefOpen(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-[#FAF5EF]"
              >
                <Feather name="x" size={18} color="#3B3328" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            className="mb-3"
            style={{ maxHeight: SCREEN_HEIGHT * 0.38 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 6 }}
          >
            {chefMsgs.length === 0 ? (
              <View className="py-1">
                <Text className="font-jakarta-medium text-[13px] text-[#8B7D6F] mb-3">
                  Ask me anything about this dish — techniques, swaps, conversions,
                  or fixes. I can start timers too.
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {CHEF_SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => handleChefSend(s)}
                      className="bg-[#FAF5EF] border border-primary/15 px-3 py-2 rounded-full"
                    >
                      <Text className="font-jakarta-medium text-[12px] text-[#3B3328]">{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              chefMsgs.map((m, i) => (
                <View
                  key={i}
                  className={`mb-2 max-w-[88%] ${m.role === "user" ? "self-end" : "self-start"}`}
                >
                  <View
                    className={`px-3.5 py-2.5 rounded-2xl ${
                      m.role === "user"
                        ? "bg-primary rounded-br-md"
                        : "bg-[#FAF5EF] border border-primary/10 rounded-bl-md"
                    }`}
                  >
                    <Text
                      className={`font-jakarta-medium text-[14px] leading-[20px] ${
                        m.role === "user" ? "text-white" : "text-[#3B3328]"
                      }`}
                    >
                      {m.text}
                    </Text>
                  </View>

                  {/* Substitution / alternative chips with DB icons */}
                  {m.role === "assistant" && m.suggestions && m.suggestions.length > 0 && (
                    <View className="flex-row flex-wrap mt-2" style={{ gap: 8 }}>
                      {m.suggestions.map((s, si) => (
                        <TouchableOpacity
                          key={`${i}_${si}`}
                          activeOpacity={0.8}
                          onPress={() => handleChefSend(`How do I use ${s.name} in this recipe?`)}
                          className="flex-row items-center bg-white border border-[#F5E3D8] rounded-2xl pl-1.5 pr-3 py-1.5"
                          style={{ maxWidth: SCREEN_WIDTH * 0.8 }}
                        >
                          <View className="w-8 h-8 rounded-full bg-[#FAF5EF] items-center justify-center mr-2 overflow-hidden">
                            {s.icon ? (
                              <Image source={{ uri: s.icon }} style={{ width: 24, height: 24 }} contentFit="contain" />
                            ) : (
                              <MaterialIcons
                                name={s.type === "appliance" ? "blender" : s.type === "technique" ? "restaurant" : "eco"}
                                size={16}
                                color="#FBA82E"
                              />
                            )}
                          </View>
                          <View style={{ flexShrink: 1 }}>
                            <Text className="font-jakarta-bold text-[12.5px] text-[#3B3328]" numberOfLines={1}>
                              {s.name}
                            </Text>
                            {s.note ? (
                              <Text className="font-inter-medium text-[11px] text-[#8B7D6F]" numberOfLines={2}>
                                {s.note}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
            {chefBusy && (
              <View className="self-start bg-[#FAF5EF] border border-primary/10 px-4 py-3 rounded-2xl rounded-bl-md">
                <ActivityIndicator size="small" color="#FBA82E" />
              </View>
            )}
          </ScrollView>

          {/* Listening banner */}
          {isListening && (
            <View className="flex-row items-center justify-center mb-2.5 bg-[#E05252]/10 border border-[#E05252]/30 rounded-full py-2 px-4">
              <View className="w-2 h-2 rounded-full bg-[#E05252] mr-2" />
              <Text className="text-[12.5px] font-inter-medium text-[#E05252]" numberOfLines={1}>
                {handsFree
                  ? "Listening… say “next”, “repeat”, or ask me anything"
                  : "Listening… tap the mic to stop"}
              </Text>
            </View>
          )}

          {/* Hands-free voice-to-voice toggle */}
          <TouchableOpacity
            onPress={toggleHandsFree}
            activeOpacity={0.85}
            className={`flex-row items-center justify-center mb-2.5 rounded-full py-2.5 px-4 border ${
              handsFree ? "bg-[#3B3328] border-[#3B3328]" : "bg-[#FAF5EF] border-[#F5E3D8]"
            }`}
          >
            <Feather
              name={handsFree ? "x-circle" : "radio"}
              size={15}
              color={handsFree ? "#FBA82E" : "#8B7D6F"}
            />
            <Text
              className={`ml-2 text-[12.5px] font-jakarta-semibold ${
                handsFree ? "text-white" : "text-[#3B3328]"
              }`}
            >
              {handsFree ? "Stop hands-free" : "Hands-free voice chat"}
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-end gap-2">
            <TextInput
              value={chefInput}
              onChangeText={setChefInput}
              placeholder="Ask ChefBoo…"
              placeholderTextColor="#C4B8AC"
              multiline
              className="flex-1 bg-white border border-[#F5E3D8] rounded-2xl px-4 py-3 text-[14px] font-inter-medium text-[#3B3328] max-h-[100px]"
              style={{ textAlignVertical: "top" }}
            />
            {/* Mic — voice to text dictation */}
            <TouchableOpacity
              onPress={toggleDictation}
              disabled={chefBusy}
              className={`w-12 h-12 rounded-2xl items-center justify-center ${
                isListening && !handsFree ? "bg-[#E05252]" : "bg-[#FAF5EF]"
              }`}
            >
              <Feather
                name="mic"
                size={18}
                color={isListening && !handsFree ? "#fff" : "#8B7D6F"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleChefSend()}
              disabled={chefBusy || !chefInput.trim()}
              className={`w-12 h-12 rounded-2xl items-center justify-center ${
                chefBusy || !chefInput.trim() ? "bg-primary/40" : "bg-primary"
              }`}
            >
              <Feather name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ── Floating overlays shown over the active cooking views (not completion) ──
  const renderCookingOverlays = () => (
    <>
      {/* Completion banner */}
      {doneBanner && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: 10, left: 16, right: 16, zIndex: 60 }}
        >
          <View className="bg-[#FBA82E] rounded-2xl px-4 py-3 flex-row items-center gap-2 shadow-lg">
            <Ionicons name="alarm" size={18} color="#fff" />
            <Text className="font-poppins-bold text-sm text-white flex-1" numberOfLines={1}>
              {doneBanner.label} is done!
            </Text>
          </View>
        </View>
      )}

      {/* Multi-timer tray (timers other than the current step's, incl. ChefBoo timers) */}
      {trayTimers.length > 0 && (
        <View
          style={{
            position: "absolute",
            left: 16,
            bottom: 100,
            width: SCREEN_WIDTH * 0.6,
            zIndex: 50,
          }}
        >
          {trayTimers.slice(-3).map((t) => {
            const rem = remainingSec(t, now);
            const done = t.status === "done";
            return (
              <View
                key={t.id}
                className="bg-white/95 rounded-2xl px-3 py-2 mb-2 flex-row items-center gap-2.5 border border-primary/10 shadow-sm"
              >
                <View
                  className={`w-7 h-7 rounded-full items-center justify-center ${
                    done ? "bg-green-100" : "bg-primary/10"
                  }`}
                >
                  <Ionicons
                    name={done ? "checkmark" : "timer-outline"}
                    size={15}
                    color={done ? "#10B981" : "#FBA82E"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-jakarta-bold text-[11px] text-text" numberOfLines={1}>
                    {t.label}
                  </Text>
                  <Text
                    className={`font-poppins-bold text-sm ${done ? "text-green-600" : "text-text"}`}
                  >
                    {done ? "Done" : formatTime(rem)}
                  </Text>
                </View>
                {!done && (
                  <TouchableOpacity
                    onPress={() => handleTrayToggle(t)}
                    className="w-8 h-8 bg-primary rounded-full items-center justify-center"
                  >
                    <Ionicons
                      name={t.status === "running" ? "pause" : "play"}
                      size={15}
                      color="#fff"
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleTrayDismiss(t.id)}
                  className="w-7 h-7 bg-gray-100 rounded-full items-center justify-center border border-gray-200"
                >
                  <Feather name="x" size={13} color="#6B5D4F" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Interactive cooking recovery prompt */}
      <Modal visible={resumePrompt != null} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-8">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 items-center">
            <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-4">
              <MaterialIcons name="restart-alt" size={28} color="#FBA82E" />
            </View>
            <Text className="font-jakarta-bold text-[20px] text-[#3B3328] mb-1.5 text-center">
              Resume Cooking?
            </Text>
            <Text className="font-inter-medium text-[13px] text-[#8B7D6F] text-center mb-1">
              You left off at Step {(resumePrompt?.step ?? 0) + 1}
              {totalSteps > 0 ? ` of ${totalSteps}` : ""}.
            </Text>
            {resumePrompt?.timerInfo && (
              <Text className="font-inter-regular text-[12px] text-[#A89E92] text-center mb-1">
                {resumePrompt.timerInfo}
              </Text>
            )}
            <View className="flex-row gap-3 mt-5 w-full">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  // Start over from Step 1, clearing the saved session.
                  clearSession();
                  setCurrentStep(0);
                  stepStartTime.current = Date.now();
                  maxStepReached.current = 0;
                  setResumePrompt(null);
                }}
                className="flex-1 bg-[#FAF5EF] border border-[#F5E3D8] rounded-2xl py-3.5 items-center"
              >
                <Text className="font-jakarta-bold text-[14px] text-[#3B3328]">Start Over</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  const step = resumePrompt?.step ?? 0;
                  setCurrentStep(step);
                  setResumedFromStep(step + 1);
                  stepStartTime.current = Date.now();
                  maxStepReached.current = step;
                  setResumePrompt(null);
                }}
                className="flex-1 bg-primary rounded-2xl py-3.5 items-center"
              >
                <Text className="font-jakarta-bold text-[14px] text-white">Resume</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Resumed-from-step banner (one tap to dismiss) */}
      {resumedFromStep != null && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setResumedFromStep(null)}
          style={{ position: "absolute", top: 10, left: 16, right: 16, zIndex: 60 }}
        >
          <View className="bg-[#3B3328] rounded-2xl px-4 py-3 flex-row items-center gap-2 shadow-lg">
            <MaterialIcons name="bookmark" size={18} color="#FBA82E" />
            <Text className="font-jakarta-semibold text-[13px] text-white flex-1" numberOfLines={1}>
              Resumed from step {resumedFromStep}
            </Text>
            <Feather name="x" size={15} color="#C4B8AC" />
          </View>
        </TouchableOpacity>
      )}

      {/* Step-complete prompt — shown when the current step's timer finishes */}
      {stepDonePrompt && stepDonePrompt.stepIndex === currentStep && (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 170, zIndex: 65 }}>
          <View className="bg-white rounded-3xl px-4 py-4 border border-primary/15 shadow-lg">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                <Feather name="check" size={16} color="#10B981" />
              </View>
              <Text className="font-jakarta-bold text-[14px] text-[#3B3328] flex-1">
                Step {currentStep + 1} timer finished — is this step done?
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setStepDonePrompt(null);
                handleNextStep();
              }}
              className="bg-primary rounded-2xl py-3 items-center mb-2.5"
            >
              <Text className="font-jakarta-bold text-[13px] text-white">Next Step</Text>
            </TouchableOpacity>
            <View className="flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  // Need more time → run a fresh 5-minute timer for this step.
                  if (stepTimer) timerRemove(stepTimer.id);
                  const newId = timerAdd({
                    label: `Step ${currentStep + 1}`,
                    durationSec: 300,
                    recipeId: recipeKey,
                    stepIndex: currentStep,
                  });
                  timerStart(newId);
                  setStepDonePrompt(null);
                }}
                className="flex-1 bg-[#FAF5EF] border border-[#F5E3D8] rounded-2xl py-3 items-center"
              >
                <Text className="font-jakarta-bold text-[13px] text-[#3B3328]">+5 Minutes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  // Repeat → restart with the step's original duration.
                  if (stepTimer) timerRemove(stepTimer.id);
                  const original = currentStepData?.hasTimer
                    ? parseDuration(currentStepData)
                    : 300;
                  const newId = timerAdd({
                    label: `Step ${currentStep + 1}`,
                    durationSec: original,
                    recipeId: recipeKey,
                    stepIndex: currentStep,
                  });
                  timerStart(newId);
                  setStepDonePrompt(null);
                }}
                className="flex-1 bg-[#FAF5EF] border border-[#F5E3D8] rounded-2xl py-3 items-center"
              >
                <Text className="font-jakarta-bold text-[13px] text-[#3B3328]">Repeat Timer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ChefBoo sous-chef FAB */}
      <TouchableOpacity
        onPress={openChefBoo}
        activeOpacity={0.85}
        style={{ position: "absolute", right: 18, bottom: 100, zIndex: 55 }}
        className="w-14 h-14 rounded-full bg-[#3B3328] items-center justify-center shadow-lg overflow-hidden"
      >
        <ChefBooFace size={56} />
      </TouchableOpacity>

      {renderChefBooSheet()}
    </>
  );

  // ------------------ COMPLETION STATE VIEW ------------------
  const handleShareToCommunity = async () => {
    if (!user?.id || isSharing) return;
    setIsSharing(true);
    try {
      const caption = shareText.trim() || `Just cooked ${recipe?.title}!`;
      // Link the DB recipe when available (AI recipes have no recipes-table id)
      const recipeId = id || null;
      await communityService.createPost(user.id, caption, "general", [], recipeId);
      setShared(true);
      setShareModalVisible(false);
    } catch (err) {
      console.error("Share to community failed:", err);
      Alert.alert("Couldn't share", "Something went wrong sharing to the community. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  if (isCompleted) {
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));
    
    return (
      <SafeAreaView className="flex-1 bg-[#fff8f0] relative" edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <ConfettiEffect />

        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section with recipe picture */}
          <View className="relative w-full h-[320px] rounded-b-[36px] overflow-hidden shadow-lg bg-[#FAF5EF]">
            {recipe.image || recipe.image_url ? (
              <Image
                source={{ uri: recipe.image || recipe.image_url }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={250}
              />
            ) : (
              <View className="w-full h-full bg-primary/20 items-center justify-center">
                <Ionicons name="restaurant" size={80} color="#FBA82E" />
              </View>
            )}

            {/* Caption scrim — only the bottom third, so the dish stays visible */}
            <LinearGradient
              colors={["transparent", "rgba(255, 248, 240, 0.6)", "#fff8f0"]}
              locations={[0, 0.55, 1]}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 170, justifyContent: "flex-end", padding: 24 }}
            >
              <MaterialIcons name="workspace-premium" size={34} color="#FBA82E" />
              <Text className="font-poppins-bold text-3xl text-text leading-tight mt-1">
                Cooking Complete!
              </Text>
              <Text className="font-jakarta-semibold text-lg text-text-secondary mt-1">
                {recipe.title}
              </Text>
            </LinearGradient>
          </View>

          {/* Bento Grid Info Row */}
          <View className="px-5 mt-6 flex-row gap-4">
            {/* Time Spent Card */}
            <View 
              style={{
                shadowColor: "#3b3328",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
              className="flex-1 bg-white rounded-3xl p-5 border border-gray-200/40 items-center justify-center"
            >
              <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mb-2">
                <Feather name="clock" size={20} color="#FBA82E" />
              </View>
              <Text className="font-jakarta-medium text-xs text-text-tertiary uppercase tracking-wider mb-1">
                Time Spent
              </Text>
              <Text className="font-poppins-bold text-xl text-text">
                {elapsedMinutes} <Text className="font-jakarta-regular text-sm text-text-secondary">mins</Text>
              </Text>
            </View>

            {/* Steps Mastered Card */}
            <View 
              style={{
                shadowColor: "#3b3328",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
              className="flex-1 bg-white rounded-3xl p-5 border border-gray-200/40 items-center justify-center"
            >
              <View className="w-10 h-10 bg-green-50 rounded-full items-center justify-center mb-2">
                <Feather name="check-square" size={20} color="#4CAF50" />
              </View>
              <Text className="font-jakarta-medium text-xs text-text-tertiary uppercase tracking-wider mb-1">
                Steps Completed
              </Text>
              <Text className="font-poppins-bold text-xl text-text">
                {totalSteps}/{totalSteps}
              </Text>
            </View>
          </View>

          {/* Feedback/Rating Section */}
          <View className="px-5 mt-6">
            <View className="bg-white rounded-3xl p-6 border border-gray-200/40 items-center shadow-sm">
              <Text className="font-poppins-bold text-lg text-text text-center mb-1">
                Rate this recipe
              </Text>
              <Text className="font-jakarta-regular text-sm text-text-secondary text-center mb-4">
                How did your {recipe.title} turn out?
              </Text>

              {/* Star Rating buttons */}
              <View className="flex-row gap-3 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      setRating(star);
                    }}
                    className="p-1"
                  >
                    <Ionicons 
                      name={star <= rating ? "star" : "star-outline"} 
                      size={36} 
                      color={star <= rating ? "#FBA82E" : "#B5A99A"} 
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {shared ? (
                <View className="flex-row items-center gap-2 bg-green-50 border border-green-200 px-5 py-3 rounded-full">
                  <Feather name="check-circle" size={16} color="#10B981" />
                  <Text className="font-jakarta-bold text-sm text-green-700">
                    Shared with Community
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setShareText(`Just cooked ${recipe.title}!`);
                    setShareModalVisible(true);
                  }}
                  className="flex-row items-center gap-2 bg-[#fff8f0] border border-primary/20 px-5 py-3 rounded-full shadow-sm"
                >
                  <Feather name="share-2" size={16} color="#FBA82E" />
                  <Text className="font-jakarta-bold text-sm text-text">
                    Share with Community
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Done Sticky Button */}
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-background/90 backdrop-blur-md pb-8">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              router.back();
            }}
            className="w-full bg-[#FBA82E] py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-lg shadow-primary/20"
          >
            <Feather name="check" size={20} color="#FFFFFF" />
            <Text className="font-poppins-bold text-lg text-white">
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Share-to-Community modal */}
        <Modal visible={shareModalVisible} transparent animationType="fade" onRequestClose={() => setShareModalVisible(false)}>
          <View className="flex-1 bg-black/40 justify-end">
            <View className="bg-[#FFFDF5] rounded-t-[28px] px-5 pt-4 pb-8">
              <View className="items-center pb-2">
                <View className="w-10 h-1.5 rounded-full bg-[#E5D9CC]" />
              </View>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[18px] font-jakarta-bold text-[#3B3328]">Share with Community</Text>
                <TouchableOpacity onPress={() => setShareModalVisible(false)} className="w-8 h-8 items-center justify-center rounded-full bg-[#FAF5EF]">
                  <Feather name="x" size={18} color="#3B3328" />
                </TouchableOpacity>
              </View>
              <Text className="text-[13px] font-inter-medium text-[#8B7D6F] mb-3">
                Tell everyone how your {recipe.title} turned out.
              </Text>
              <TextInput
                value={shareText}
                onChangeText={setShareText}
                placeholder="Write something…"
                placeholderTextColor="#C4B8AC"
                multiline
                className="bg-white border border-[#F5E3D8] rounded-2xl px-4 py-3 text-[14px] font-inter-medium text-[#3B3328] min-h-[90px]"
                style={{ textAlignVertical: "top" }}
              />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleShareToCommunity}
                disabled={isSharing}
                className="mt-4 h-13 bg-[#FBA82E] rounded-[18px] items-center justify-center flex-row py-4"
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#FFFFFF" />
                    <Text className="ml-2 text-[15px] font-jakarta-semibold text-white">Post to Community</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ------------------ MAIN STEP-BY-STEP VIEW ------------------
  // Horizontal progress percent
  const progressPercent = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  // Slide animation translation
  const translateX = slideAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-SCREEN_WIDTH * 0.9, 0, SCREEN_WIDTH * 0.9],
  });

  const youtubeVideoId = recipe?.videoUrl ? getYoutubeId(recipe.videoUrl) : null;
  const hasVideo = !!(recipe?.videoUrl && youtubeVideoId);

  if (hasVideo && !isCompleted) {
    const videoStart = currentStepData?.video_start_time_frame || currentStepData?.video_start_time || 0;
    const videoEnd = currentStepData?.video_end_time || 0;

    return (
      <SafeAreaView className="flex-1 bg-[#FAF5EF]" edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" />

        {/* Custom Header: Close button, title, and Next text button */}
        <View className="px-5 py-3 flex-row items-center justify-between border-b border-primary/10">
          <TouchableOpacity onPress={handleQuit} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#3B3328" />
          </TouchableOpacity>
          <Text className="font-poppins-bold text-base text-[#3B3328] max-w-[220px]" numberOfLines={1}>
            {recipe.title}
          </Text>
          <TouchableOpacity onPress={handleNextStep} activeOpacity={0.7}>
            <Text className="font-jakarta-bold text-sm text-primary">
              {currentStep === totalSteps - 1 ? "Finish" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Fixed YouTube Player */}
        <View style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 9/16, backgroundColor: "black" }} className="relative">
          <YoutubePlayer
            ref={playerRef}
            height={SCREEN_WIDTH * 9/16}
            play={true}
            videoId={youtubeVideoId!}
            onChangeState={(state: string) => setPlayerState(state)}
            initialPlayerParams={{
              controls: true,
              loop: true,
              start: videoStart,
              end: videoEnd,
              showClosedCaptions: false
            }}
          />
          {/* Overlays */}
          <View className="absolute top-3 left-3 bg-[#FBA82E] border border-primary/20 px-3 py-1 rounded-full flex-row items-center gap-1 shadow z-10">
            <Ionicons name="checkmark-circle" size={12} color="white" />
            <Text className="font-jakarta-bold text-[10px] text-white uppercase">
              Active Technique
            </Text>
          </View>
          {videoEnd > videoStart && (
            <View className="absolute top-3 right-3 bg-black/55 border border-white/20 px-3 py-1 rounded-full flex-row items-center gap-1 shadow z-10">
              <Feather name="repeat" size={10} color="white" />
              <Text className="font-jakarta-bold text-[10px] text-white uppercase">
                Looping
              </Text>
            </View>
          )}
        </View>

        {/* Progress Bar directly under video */}
        <View className="h-1.5 bg-gray-200/50 w-full relative">
          <View 
            className="h-full bg-primary" 
            style={{ width: `${progressPercent}%` }} 
          />
        </View>

        {/* Bottom Swiper ScrollView */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ transform: [{ translateX }] }} className="mb-5">
            <View className="bg-white rounded-3xl p-5 border border-primary/10 shadow-sm min-h-[140px] justify-between relative overflow-hidden">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="font-jakarta-bold text-xs text-primary uppercase tracking-wider">
                  Step {currentStep + 1} of {totalSteps}
                </Text>
                {currentStepData?.parallel && (
                  <View className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex-row items-center">
                    <Text className="text-primary font-jakarta-semibold text-[8px] uppercase">
                      Parallel
                    </Text>
                  </View>
                )}
              </View>

              <Text className="font-poppins-bold text-text mb-4" style={{ fontSize: 23, lineHeight: 32 }}>
                {currentStepData?.instruction}
              </Text>

              {/* Action / Heat info */}
              {(currentStepData?.action || currentStepData?.heatSetting) && (
                <View className="flex-row items-center gap-2 flex-wrap pt-3 border-t border-gray-100">
                  {currentStepData?.action && (
                    <View className="bg-interactive/40 border border-interactive px-3 py-1 rounded-full">
                      <Text className="font-jakarta-bold text-[9px] text-text-secondary uppercase">
                        {currentStepData.action}
                      </Text>
                    </View>
                  )}
                  {currentStepData?.heatSetting && (
                    <View className="bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                      <Text className="font-jakarta-bold text-[9px] text-primary uppercase">
                        {currentStepData.heatSetting} Heat
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </Animated.View>

          {/* Checklist Ingredients */}
          {currentStepData?.linkedIngredients && currentStepData.linkedIngredients.length > 0 && (
            <View className="mb-5 bg-white rounded-3xl p-4 border border-primary/10 shadow-sm">
              <Text className="font-poppins-semibold text-xs text-text-secondary mb-2 uppercase tracking-wider">
                Ingredients Needed:
              </Text>
              <View className="flex-row flex-wrap justify-start">
                {currentStepData.linkedIngredients.map((ingName: string, index: number) => {
                  const detail = getIngredientDetail(ingName);
                  const iconUrl = getIngredientIconUrl(ingName);
                  return (
                    <View
                      key={index}
                      className="w-[23%] m-[1%] min-h-[72px] bg-[#F5E3D8] rounded-2xl items-center justify-center p-1 shadow-sm"
                    >
                      <Image
                        source={{ uri: iconUrl }}
                        style={{ width: 26, height: 26 }}
                        contentFit="contain"
                      />
                      {detail.quantity ? (
                        <Text className="text-primary font-poppins-bold text-[8px] text-center mt-1 leading-3">
                          {detail.quantity}
                        </Text>
                      ) : null}
                      <Text
                        className="text-text font-jakarta-medium text-[8px] text-center mt-0.5 leading-3"
                        numberOfLines={1}
                      >
                        {detail.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Active Timer Countdown */}
          {currentStepData?.hasTimer && (
            <View className="bg-white rounded-3xl p-5 border border-primary/10 shadow-sm items-center mb-5">
              <Text className="font-poppins-semibold text-[10px] text-text-secondary uppercase tracking-wider mb-2">
                {stepTimerDone ? "Timer Done" : "Step Timer"}
              </Text>
              <View className="flex-row items-center gap-4">
                <Text className="font-poppins-bold text-2xl text-text">
                  {formatTime(stepRemaining)}
                </Text>
                <TouchableOpacity
                  onPress={handleStepTimerToggle}
                  className="w-10 h-10 bg-primary rounded-full items-center justify-center shadow"
                >
                  <Ionicons name={stepTimerRunning ? "pause" : "play"} size={18} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleStepTimerReset}
                  className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center border border-gray-200"
                >
                  <Feather name="rotate-ccw" size={14} color="#6B5D4F" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Sticky Bottom Actions Container */}
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-background/90 backdrop-blur-md flex-row items-center gap-3 pb-8 border-t border-primary/5">
          <TouchableOpacity
            disabled={currentStep === 0}
            onPress={handlePrevStep}
            activeOpacity={0.7}
            className={`flex-[4] flex-row items-center justify-center h-12 border rounded-2xl gap-2 ${
              currentStep === 0 
                ? "opacity-30 border-gray-200 bg-gray-100" 
                : "border-primary/20 bg-white"
            }`}
          >
            <Feather name="arrow-left" size={16} color={currentStep === 0 ? "#B5A99A" : "#FBA82E"} />
            <Text className={`font-poppins-bold text-sm ${currentStep === 0 ? "text-[#B5A99A]" : "text-primary"}`}>
              Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleNextStep}
            className="flex-[6] bg-primary h-12 rounded-2xl items-center justify-center flex-row gap-2 shadow-lg shadow-primary/10"
          >
            <Text className="font-poppins-bold text-sm text-white">
              {currentStep === totalSteps - 1 ? "Finish" : "Next Step"}
            </Text>
            <Feather name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {renderCookingOverlays()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAF5EF]">
      <StatusBar barStyle="dark-content" />

      {/* Top Header Row */}
      <View className="px-5 py-3 flex-row items-center justify-between border-b border-primary/10">
        <TouchableOpacity
          onPress={handleQuit}
          activeOpacity={0.7}
          className="w-10 h-10 items-center justify-center bg-white rounded-full shadow-sm"
        >
          <Ionicons name="close" size={22} color="#3B3328" />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="font-jakarta-medium text-[11px] uppercase tracking-wider text-text-tertiary">
            Cooking
          </Text>
          <Text className="font-poppins-bold text-sm text-text max-w-[200px]" numberOfLines={1}>
            {recipe.title}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Top progress bar indicator */}
      <View className="h-1 bg-gray-200/50 w-full relative">
        <View
          className="h-full bg-primary"
          style={{ width: `${progressPercent}%` }}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress label: Step X of Y • Z% Complete */}
        <View className="flex-row items-center justify-between pb-3">
          <Text className="font-jakarta-bold text-[12px] text-text">
            Step {currentStep + 1} of {totalSteps}
          </Text>
          <Text className="font-inter-semibold text-[11px] text-text-tertiary">
            {Math.round(progressPercent)}% Complete
          </Text>
        </View>
        {/* Step instruction Container */}
        <Animated.View style={{ transform: [{ translateX }] }} className="mb-6">
          <View className="bg-white rounded-3xl p-6 border border-primary/10 shadow-sm min-h-[160px] justify-between relative overflow-hidden">
            
            {/* Background design circle */}
            <View className="absolute -right-16 -top-16 w-36 h-36 bg-primary/5 rounded-full" />

            {/* Instruction content and TTS Speaker */}
            <View className="flex-row items-start gap-4">
              <View className="flex-1">
                <Text className="font-poppins-bold text-text" style={{ fontSize: 27, lineHeight: 38 }}>
                  {currentStepData?.instruction}
                </Text>
              </View>
              
              <TouchableOpacity
                onPress={toggleSpeech}
                activeOpacity={0.7}
                className={`w-12 h-12 rounded-full items-center justify-center border shadow-sm ${
                  isSpeaking ? "bg-primary border-primary" : "bg-[#FAF5EF] border-primary/20"
                }`}
              >
                <Feather 
                  name={isSpeaking ? "volume-x" : "volume-2"} 
                  size={20} 
                  color={isSpeaking ? "#FFFFFF" : "#FBA82E"} 
                />
              </TouchableOpacity>
            </View>

            {/* Bottom Row inside card: Step Category / Action info */}
            {(currentStepData?.action || currentStepData?.heatSetting) && (
              <View className="flex-row items-center gap-2 flex-wrap mt-6 pt-4 border-t border-gray-100">
                {currentStepData?.action && (
                  <View className="bg-interactive/40 border border-interactive px-3 py-1 rounded-full flex-row items-center gap-1">
                    <MaterialIcons name="local-fire-department" size={12} color="#E39620" />
                    <Text className="font-jakarta-bold text-[10px] text-text-secondary uppercase">
                      {currentStepData.action}
                    </Text>
                  </View>
                )}
                {currentStepData?.heatSetting && (
                  <View className="bg-orange-50 border border-orange-200 px-3 py-1 rounded-full flex-row items-center gap-1">
                    <Feather name="thermometer" size={12} color="#FBA82E" />
                    <Text className="font-jakarta-bold text-[10px] text-primary uppercase">
                      {currentStepData.heatSetting} Heat
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Animated.View>

        {/* Step checklist ingredients */}
        {currentStepData?.linkedIngredients && currentStepData.linkedIngredients.length > 0 && (
          <View className="mb-6 bg-white rounded-3xl p-5 border border-primary/10 shadow-sm">
            <Text className="font-poppins-semibold text-sm text-text-secondary mb-3 uppercase tracking-wider">
              Ingredients Needed:
            </Text>
            <View className="flex-row flex-wrap justify-start">
              {currentStepData.linkedIngredients.map((ingName: string, index: number) => {
                const detail = getIngredientDetail(ingName);
                const iconUrl = getIngredientIconUrl(ingName);
                return (
                  <View
                    key={index}
                    className="w-[23%] m-[1%] min-h-[82px] bg-[#F5E3D8] rounded-2xl items-center justify-center p-1.5 shadow-sm"
                  >
                    <Image
                      source={{ uri: iconUrl }}
                      style={{ width: 30, height: 30 }}
                      contentFit="contain"
                    />
                    {detail.quantity ? (
                      <Text className="text-primary font-poppins-bold text-[8px] text-center mt-1 leading-3">
                        {detail.quantity}
                      </Text>
                    ) : null}
                    <Text
                      className="text-text font-jakarta-medium text-[8px] text-center mt-0.5 leading-3"
                      numberOfLines={2}
                    >
                      {detail.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Dynamic Timer circular countdown card */}
        {currentStepData?.hasTimer && (
          <View className="bg-white rounded-3xl p-6 border border-primary/10 shadow-sm items-center">
            <Text className="font-poppins-semibold text-xs text-text-secondary uppercase tracking-wider mb-4">
              Clock Timer
            </Text>

            {/* Circular display card */}
            <View
              style={{
                width: 170,
                height: 170,
                borderRadius: 85,
                borderWidth: 6,
                borderColor: stepTimerDone ? "#10B981" : stepTimerRunning ? "#FBA82E" : "#E8E4DD",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FAF5EF",
              }}
              className="mb-5 shadow-sm relative overflow-hidden"
            >
              <Text className="font-poppins-bold text-3xl text-text">
                {formatTime(stepRemaining)}
              </Text>
              <Text className="font-jakarta-medium text-[10px] text-text-tertiary mt-1">
                {stepTimerDone
                  ? "DONE"
                  : stepTimerRunning
                    ? "TIMER RUNNING"
                    : stepTimer
                      ? "PAUSED"
                      : "TAP TO START"}
              </Text>
            </View>

            {/* Timer Controls Row */}
            <View className="flex-row items-center gap-4">
              {/* Reset button */}
              <TouchableOpacity
                onPress={handleStepTimerReset}
                activeOpacity={0.7}
                className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center border border-gray-200"
              >
                <Feather name="rotate-ccw" size={18} color="#6B5D4F" />
              </TouchableOpacity>

              {/* Play / Pause button */}
              <TouchableOpacity
                onPress={handleStepTimerToggle}
                activeOpacity={0.8}
                className="w-16 h-16 bg-primary rounded-full items-center justify-center shadow-md shadow-primary/20"
              >
                <Ionicons
                  name={stepTimerRunning ? "pause" : "play"}
                  size={26}
                  color="#FFFFFF"
                  style={{ marginLeft: stepTimerRunning ? 0 : 3 }}
                />
              </TouchableOpacity>

              {/* +1 Minute button */}
              <TouchableOpacity
                onPress={handleStepAddMinute}
                activeOpacity={0.7}
                className="h-12 px-4 bg-interactive-light rounded-full items-center justify-center border border-interactive"
              >
                <Text className="font-jakarta-bold text-xs text-text-secondary">
                  +1 Min
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Actions Container */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-background/90 backdrop-blur-md flex-row items-center gap-3 pb-8 border-t border-primary/5">
        {/* Previous Step button */}
        <TouchableOpacity
          disabled={currentStep === 0}
          onPress={handlePrevStep}
          activeOpacity={0.7}
          className={`flex-[4] flex-row items-center justify-center h-14 border rounded-2xl gap-2 ${
            currentStep === 0 
              ? "opacity-30 border-gray-200 bg-gray-100" 
              : "border-primary/20 bg-white"
          }`}
        >
          <Feather name="arrow-left" size={16} color={currentStep === 0 ? "#B5A99A" : "#FBA82E"} />
          <Text className={`font-poppins-bold text-base ${currentStep === 0 ? "text-[#B5A99A]" : "text-primary"}`}>
            Back
          </Text>
        </TouchableOpacity>

        {/* Next Step / Finish button */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleNextStep}
          className="flex-[6] bg-primary h-14 rounded-2xl items-center justify-center flex-row gap-2 shadow-lg shadow-primary/10"
        >
          <Text className="font-poppins-bold text-base text-white">
            {currentStep === totalSteps - 1 ? "Finish" : "Next Step"}
          </Text>
          <Feather name="arrow-right" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {renderCookingOverlays()}
    </SafeAreaView>
  );
}
