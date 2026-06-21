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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import YoutubePlayer from "react-native-youtube-iframe";

import { recipeService, Recipe } from "@/services/recipe.service";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/hooks/use-auth";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

export default function CookingModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
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

  // Timer states
  const [timeLeft, setTimeLeft] = useState(0);
  const [defaultTime, setDefaultTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Rating state (for completion screen)
  const [rating, setRating] = useState(0);

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
      }
    };
    loadRecipe();
  }, [id, user?.id]);

  // Helper to parse duration
  const parseDuration = (step: any) => {
    const hrs = parseInt(step.timerHours || "0", 10);
    const mins = parseInt(step.timerMinutes || "0", 10);
    return (hrs * 3600) + (mins * 60) || 60; // fallback to 60 seconds if empty
  };

  // Configure timer and TTS for current step
  useEffect(() => {
    // Stop speech on step change
    Speech.stop();
    setIsSpeaking(false);

    if (recipe && recipe.steps && recipe.steps[currentStep]) {
      const step = recipe.steps[currentStep];
      if (step.hasTimer) {
        const duration = parseDuration(step);
        setTimeLeft(duration);
        setDefaultTime(duration);
        setIsRunning(false);
      } else {
        setTimeLeft(0);
        setDefaultTime(0);
        setIsRunning(false);
      }
    }
  }, [currentStep, recipe]);

  // Handle countdown ticks
  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      // Haptics notification
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      
      // Alert user
      Alert.alert(
        "Timer Finished! ⏰",
        `Step ${currentStep + 1} countdown has completed. Ready to proceed!`,
        [{ text: "OK" }]
      );
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, currentStep]);

  // Clean up TTS when leaving page
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAF5EF] justify-center items-center">
        <ActivityIndicator size="large" color="#FBA82E" />
        <Text className="font-jakarta-semibold text-text-secondary text-sm mt-3">
          Preparing kitchen guide...
        </Text>
      </SafeAreaView>
    );
  }

  const steps = recipe?.steps || [];
  const totalSteps = steps.length;
  const currentStepData = steps[currentStep];

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
              recipeService.logInteraction(user.id, id, "COOK_COMPLETE", metadata).catch(err => 
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
        setCurrentStep((prev) => prev + 1);
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
        setCurrentStep((prev) => prev - 1);
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
      setIsSpeaking(true);
      Speech.speak(currentStepData.instruction, {
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  // Timer controls
  const toggleTimer = () => {
    setIsRunning(!isRunning);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(defaultTime);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const addOneMinute = () => {
    setTimeLeft((prev) => prev + 60);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };



  // ------------------ COMPLETION STATE VIEW ------------------
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
                className="w-full h-full object-cover" 
              />
            ) : (
              <View className="w-full h-full bg-primary/20 items-center justify-center">
                <Ionicons name="restaurant" size={80} color="#FBA82E" />
              </View>
            )}
            
            <LinearGradient
              colors={["transparent", "rgba(255, 248, 240, 0.95)"]}
              className="absolute inset-0 justify-end p-6"
            >
              <MaterialIcons name="workspace-premium" size={38} color="#FBA82E" className="mb-2" />
              <Text className="font-poppins-bold text-3xl text-text leading-tight">
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

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  Alert.alert(
                    "Shared! 🚀", 
                    "You shared your cook history with the community feed.", 
                    [{ text: "Awesome!" }]
                  );
                }}
                className="flex-row items-center gap-2 bg-[#fff8f0] border border-primary/20 px-5 py-3 rounded-full shadow-sm"
              >
                <Feather name="share-2" size={16} color="#FBA82E" />
                <Text className="font-jakarta-bold text-sm text-text">
                  Share with Community
                </Text>
              </TouchableOpacity>
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

              <Text className="font-poppins-bold text-xl text-text leading-7 mb-4">
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
                Step Timer
              </Text>
              <View className="flex-row items-center gap-4">
                <Text className="font-poppins-bold text-2xl text-text">
                  {formatTime(timeLeft)}
                </Text>
                <TouchableOpacity
                  onPress={toggleTimer}
                  className="w-10 h-10 bg-primary rounded-full items-center justify-center shadow"
                >
                  <Ionicons name={isRunning ? "pause" : "play"} size={18} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={resetTimer}
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
              {currentStep === totalSteps - 1 ? "Finish 🍳" : "Next Step"}
            </Text>
            <Feather name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
        {/* Step instruction Container */}
        <Animated.View style={{ transform: [{ translateX }] }} className="mb-6">
          <View className="bg-white rounded-3xl p-6 border border-primary/10 shadow-sm min-h-[160px] justify-between relative overflow-hidden">
            
            {/* Background design circle */}
            <View className="absolute -right-16 -top-16 w-36 h-36 bg-primary/5 rounded-full" />

            {/* Instruction content and TTS Speaker */}
            <View className="flex-row items-start gap-4">
              <View className="flex-1">
                <Text className="font-poppins-bold text-2xl text-text leading-9" style={{ fontSize: 24 }}>
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
                borderColor: isRunning ? "#FBA82E" : "#E8E4DD",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FAF5EF",
              }}
              className="mb-5 shadow-sm relative overflow-hidden"
            >
              <Text className="font-poppins-bold text-3xl text-text">
                {formatTime(timeLeft)}
              </Text>
              <Text className="font-jakarta-medium text-[10px] text-text-tertiary mt-1">
                {isRunning ? "TIMER RUNNING" : "PAUSED"}
              </Text>
            </View>

            {/* Timer Controls Row */}
            <View className="flex-row items-center gap-4">
              {/* Reset button */}
              <TouchableOpacity
                onPress={resetTimer}
                activeOpacity={0.7}
                className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center border border-gray-200"
              >
                <Feather name="rotate-ccw" size={18} color="#6B5D4F" />
              </TouchableOpacity>

              {/* Play / Pause button */}
              <TouchableOpacity
                onPress={toggleTimer}
                activeOpacity={0.8}
                className="w-16 h-16 bg-primary rounded-full items-center justify-center shadow-md shadow-primary/20"
              >
                <Ionicons 
                  name={isRunning ? "pause" : "play"} 
                  size={26} 
                  color="#FFFFFF" 
                  style={{ marginLeft: isRunning ? 0 : 3 }} 
                />
              </TouchableOpacity>

              {/* +1 Minute button */}
              <TouchableOpacity
                onPress={addOneMinute}
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
            {currentStep === totalSteps - 1 ? "Finish 🍳" : "Next Step"}
          </Text>
          <Feather name="arrow-right" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
