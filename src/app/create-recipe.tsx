import { recipeService } from "@/services/recipe.service";
import { useAuthStore } from "@/store/auth.store";
import { RecipeStep } from "@/types";
import { cn } from "@/utils";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { router, useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CookingLoader } from "@/components/ui/cooking-loader";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubePlayer, { YoutubeIframeRef } from "react-native-youtube-iframe";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CapCutTimelineSliderProps {
  videoDuration: number;
  previewDuration: number;
  startTime: number;
  onStartTimeChange: (time: number) => void;
  onSliding?: (time: number) => void;
}

const CapCutTimelineSlider = React.memo(
  ({
    videoDuration,
    previewDuration,
    startTime,
    onStartTimeChange,
    onSliding,
  }: CapCutTimelineSliderProps) => {
    const [localStartTime, setLocalStartTime] = useState(startTime);

    // Sync with parent when startTime changes externally
    useEffect(() => {
      setLocalStartTime(startTime);
    }, [startTime]);

    const dragStartLeft = useRef(0);
    const localStateRef = useRef({
      videoDuration,
      previewDuration,
      localStartTime,
    });

    useEffect(() => {
      localStateRef.current = {
        videoDuration,
        previewDuration,
        localStartTime,
      };
    }, [videoDuration, previewDuration, localStartTime]);

    const timelineWidth = SCREEN_WIDTH - 88;
    const lastNotifyTime = useRef(0);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStartLeft.current = localStateRef.current.localStartTime;
        },
        onPanResponderMove: (evt, gestureState) => {
          const { videoDuration: duration, previewDuration: predur } =
            localStateRef.current;
          if (!duration) return;
          const deltaX = gestureState.dx;
          const deltaTime = (deltaX / timelineWidth) * duration;
          let newStartTime = dragStartLeft.current + deltaTime;
          const maxStart = duration - predur;
          newStartTime = Math.max(0, Math.min(maxStart, newStartTime));

          const roundedTime = Math.round(newStartTime);
          setLocalStartTime(roundedTime);

          // Trigger live preview seeking
          if (onSliding) {
            onSliding(roundedTime);
          }

          // Throttle updates to parent state to avoid bridge bottlenecks during drag
          const now = Date.now();
          if (now - lastNotifyTime.current > 100) {
            onStartTimeChange(roundedTime);
            lastNotifyTime.current = now;
          }
        },
        onPanResponderRelease: () => {
          onStartTimeChange(localStateRef.current.localStartTime);
        },
      }),
    ).current;

    const scaleDuration = videoDuration || 100;
    const windowWidth = Math.max(
      40,
      (previewDuration / scaleDuration) * timelineWidth,
    );
    const windowLeft = (localStartTime / scaleDuration) * timelineWidth;

    return (
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="font-jakarta-semibold text-[11px] text-[#8B7D6F]">
            Start Time: {Math.floor(localStartTime / 60)}m{" "}
            {Math.floor(localStartTime % 60)}s
          </Text>
          <Text className="font-jakarta-semibold text-[11px] text-[#8B7D6F]">
            End Time: {Math.floor((localStartTime + previewDuration) / 60)}m{" "}
            {Math.floor((localStartTime + previewDuration) % 60)}s
          </Text>
        </View>

        <View
          style={{
            width: "100%",
            height: 72,
            backgroundColor: "#FAF5EF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#EDD8A9",
            overflow: "hidden",
            position: "relative",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "40%",
              backgroundColor: "rgba(239, 68, 68, 0.05)",
            }}
          />

          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: "100%",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 10,
            }}
            pointerEvents="none"
          >
            {[...Array(8)].map((_, i) => (
              <View
                key={i}
                style={{
                  width: 2,
                  height: i % 2 === 0 ? 16 : 8,
                  backgroundColor: i === 5 ? "#EF4444" : "#D3C6B6",
                  opacity: 0.6,
                }}
              />
            ))}
          </View>

          <View
            {...panResponder.panHandlers}
            style={{
              position: "absolute",
              left: windowLeft,
              width: windowWidth,
              height: 64,
              borderWidth: 3,
              borderColor: "#FBA82E",
              backgroundColor: "rgba(251, 168, 46, 0.18)",
              borderRadius: 10,
              shadowColor: "#3B3328",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          />
        </View>
      </View>
    );
  },
);

const fuzzySearchIngredients = (query: string, items: any[]) => {
  if (!query) return items;
  const q = query.toLowerCase().trim();

  const scored = items.map((item) => {
    const name = item.name.toLowerCase();
    const urdu = (item.name_urdu || item.nameUrdu || "").toLowerCase();

    let score = 0;
    if (name === q || urdu === q) {
      score = 100;
    } else if (name.startsWith(q) || urdu.startsWith(q)) {
      score = 80;
    } else if (name.includes(q) || urdu.includes(q)) {
      score = 50;
    } else {
      let qIdx = 0;
      for (let i = 0; i < name.length && qIdx < q.length; i++) {
        if (name[i] === q[qIdx]) qIdx++;
      }
      if (qIdx === q.length) score = 10;
      else {
        qIdx = 0;
        for (let i = 0; i < urdu.length && qIdx < q.length; i++) {
          if (urdu[i] === q[qIdx]) qIdx++;
        }
        if (qIdx === q.length) score = 10;
      }
    }
    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
};

const parseQuantityAndUnit = (
  qtyStr: string,
  ingredientName: string,
  dbIngs: any[],
) => {
  const cleanStr = (qtyStr || "").trim();
  if (!cleanStr) {
    return { quantity: "", unit: "g", category: "solid" };
  }

  const cleanName = ingredientName.trim().toLowerCase();
  const foundIng =
    dbIngs.find((i) => i.name.toLowerCase() === cleanName) ||
    MASTER_INGREDIENTS.find((i) => i.name.toLowerCase() === cleanName);
  const category = foundIng?.category || "solid";
  const allowed =
    ALLOWED_UNITS[category as keyof typeof ALLOWED_UNITS] || [];
  const defaultUnit = allowed[0] || "g";

  const sortedUnits = [...allowed].sort((a, b) => b.length - a.length);
  for (const unit of sortedUnits) {
    if (cleanStr.toLowerCase().endsWith(" " + unit.toLowerCase())) {
      const quantity = cleanStr
        .slice(0, cleanStr.length - unit.length - 1)
        .trim();
      return { quantity, unit, category };
    }
    if (cleanStr.toLowerCase().endsWith(unit.toLowerCase())) {
      const quantity = cleanStr.slice(0, cleanStr.length - unit.length).trim();
      return { quantity, unit, category };
    }
  }

  const parts = cleanStr.split(/\s+/);
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (isNaN(Number(lastPart))) {
      const quantity = parts.slice(0, -1).join(" ");
      return { quantity, unit: lastPart, category };
    }
  }

  return { quantity: cleanStr, unit: defaultUnit, category };
};

// Actions that involve a flame/heat source — only these show the heat selector.
const HEAT_ACTIONS = ["Bake", "Cook", "Fry", "Boil"];

export default function CreateRecipeWizardScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs state
  const [imageUris, setImageUris] = useState<string[]>([]);
  // URIs currently being compressed/converted — multiple can process at once so
  // the user can keep adding images and move to the next section meanwhile.
  const [processingUris, setProcessingUris] = useState<string[]>([]);
  const isProcessingImage = processingUris.length > 0;
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState(10);
  const [cookTime, setCookTime] = useState(10);
  const [servings, setServings] = useState(2);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(
    "Easy",
  );
  const [cuisineTag, setCuisineTag] = useState("");
  const [dishCategory, setDishCategory] = useState("");
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>([]);
  const [spiceLevel, setSpiceLevel] = useState<number>(3);
  const [selectedDietTags, setSelectedDietTags] = useState<string[]>([]);

  // YouTube and Trimming states
  const [isVerifyingVideo, setIsVerifyingVideo] = useState(false);
  const [isVideoVerified, setIsVideoVerified] = useState(false);
  const [videoValidationError, setVideoValidationError] = useState<
    string | null
  >(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(15);
  const [previewStartTime, setPreviewStartTime] = useState(0);
  const previewEndTime = previewStartTime + previewDuration;
  const playerRef = useRef<YoutubeIframeRef>(null);
  const durationIntervalRef = useRef<any>(null);
  const [reviewActiveImageIndex, setReviewActiveImageIndex] = useState(0);
  const [reviewCarouselWidth, setReviewCarouselWidth] = useState(Dimensions.get("window").width - 50);

  // Fading submit overlay states
  const [submitMessageIndex, setSubmitMessageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const SUBMIT_MESSAGES = editId
    ? ["Saving Changes...", "Cooking...", "Setting up...", "Updating databases..."]
    : ["Uploading images...", "Cooking...", "Setting up...", "Publishing recipe..."];

  useEffect(() => {
    if (!isSubmitting) {
      setSubmitMessageIndex(0);
      fadeAnim.setValue(1);
      return;
    }

    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setSubmitMessageIndex((prev) => (prev + 1) % SUBMIT_MESSAGES.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isSubmitting, editId]);

  // Live Preview Modal States & Refs
  const [isLivePreviewModalVisible, setIsLivePreviewModalVisible] =
    useState(false);
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false);
  const [tempStartTime, setTempStartTime] = useState(0);
  const [tempDuration, setTempDuration] = useState(15);
  const playerPreviewRef = useRef<YoutubeIframeRef>(null);
  const previewTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!isLivePreviewModalVisible) {
      setIsPlayerPlaying(false);
    } else {
      setIsPlayerPlaying(true);
    }
  }, [isLivePreviewModalVisible]);

  useEffect(() => {
    if (isLivePreviewModalVisible && isPlayerPlaying) {
      previewTimerRef.current = setInterval(async () => {
        if (playerPreviewRef.current) {
          try {
            const currentTime = await playerPreviewRef.current.getCurrentTime();
            const endTime = tempStartTime + tempDuration;
            if (currentTime >= endTime) {
              playerPreviewRef.current.seekTo(tempStartTime, true);
            } else if (currentTime > 0 && currentTime < tempStartTime - 1) {
              // If video starts playing from 0s instead of start frame, force jump to start frame
              playerPreviewRef.current.seekTo(tempStartTime, true);
            }
          } catch (e) {
            // ignore
          }
        }
      }, 250);
    } else {
      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    }

    return () => {
      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current);
      }
    };
  }, [isLivePreviewModalVisible, isPlayerPlaying, tempStartTime, tempDuration]);

  const [trimmingStepIndex, setTrimmingStepIndex] = useState<number | null>(
    null,
  );
  const [stepStartTime, setStepStartTime] = useState(0);
  const [stepEndTime, setStepEndTime] = useState(10);

  const openLivePreviewModal = () => {
    setTempStartTime(previewStartTime);
    setTempDuration(previewDuration);
    setIsLivePreviewModalVisible(true);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // When hidden player is ready
  const handlePlayerReady = async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    let attempts = 0;
    durationIntervalRef.current = setInterval(async () => {
      if (playerRef.current) {
        try {
          const duration = await playerRef.current.getDuration();
          if (duration > 0) {
            setVideoDuration(duration);
            if (durationIntervalRef.current) {
              clearInterval(durationIntervalRef.current);
              durationIntervalRef.current = null;
            }
          }
        } catch (err) {
          console.error("Failed to get duration:", err);
        }
      }
      attempts++;
      if (attempts >= 20) {
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      }
    }, 250);
  };

  // Helper to extract YouTube video ID
  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Real-time URL validation with debounce
  useEffect(() => {
    if (isPrefilling) return;

    // Reset video states immediately when the url changes to avoid carrying over old details
    setIsVideoVerified(false);
    setVideoDuration(0);
    setPreviewStartTime(0);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    const timer = setTimeout(async () => {
      const trimmedUrl = videoUrl.trim();
      if (!trimmedUrl) {
        setIsVerifyingVideo(false);
        setVideoValidationError(null);
        return;
      }

      const videoId = getYoutubeId(trimmedUrl);
      if (!videoId) {
        setIsVerifyingVideo(false);
        setVideoValidationError("Invalid YouTube link format.");
        return;
      }

      setIsVerifyingVideo(true);
      setVideoValidationError(null);

      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        );
        if (response.status === 200) {
          setIsVideoVerified(true);
          setVideoValidationError(null);
        } else {
          setIsVideoVerified(false);
          setVideoValidationError("YouTube video is private or invalid.");
        }
      } catch (err) {
        setIsVideoVerified(false);
        setVideoValidationError(
          "Failed to verify YouTube link due to network issue.",
        );
      } finally {
        setIsVerifyingVideo(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [videoUrl]);

  const openTrimmerForStep = (index: number) => {
    const step = steps[index];
    setStepStartTime(step.video_start_time || 0);
    setStepEndTime(step.video_end_time || 10);
    setTrimmingStepIndex(index);
  };

  // Custom picker modal visibility states
  const [isCuisinePickerVisible, setIsCuisinePickerVisible] = useState(false);
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);

  const [ingredients, setIngredients] = useState<
    {
      name: string;
      quantity: string;
      unit: string;
      category: string;
      icon_url?: string;
    }[]
  >([{ name: "", quantity: "", unit: "g", category: "solid" }]);

  const qtyInputRefs = useRef<(TextInput | null)[]>([]);
  const ingredientRowRefs = useRef<(View | null)[]>([]);
  const ingredientRowYs = useRef<number[]>([]);
  const shakeAnims = useRef<Animated.Value[]>([]).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const getShakeAnim = (index: number): Animated.Value => {
    if (!shakeAnims[index]) {
      shakeAnims[index] = new Animated.Value(0);
    }
    return shakeAnims[index];
  };

  const triggerShake = (index: number) => {
    const anim = getShakeAnim(index);
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 4,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Active row indices for autocomplete suggestions and unit picker
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [activeUnitPickerIndex, setActiveUnitPickerIndex] = useState<
    number | null
  >(null);

  // Steps/Directions list state
  const [steps, setSteps] = useState<RecipeStep[]>([
    {
      step: 1,
      instruction: "",
      action: "Mix",
      parallel: false,
      linkedIngredients: [],
      heatSetting: null,
      hasTimer: false,
      timerType: "countdown",
      timerHours: "",
      timerMinutes: "",
      targetTime: "",
      leaveOvernight: false,
    },
  ]);

  const [activeStepActionPickerIndex, setActiveStepActionPickerIndex] =
    useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [publishedRecipeId, setPublishedRecipeId] = useState<string | null>(
    null,
  );

  // Master ingredients and kitchen essentials loaded from database
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [dbKitchenEssentials, setDbKitchenEssentials] = useState<any[]>([]);

  // Selected kitchen essentials state for the recipe
  const [kitchenEssentials, setKitchenEssentials] = useState<string[]>([]);
  const [kitchenEssentialSearch, setKitchenEssentialSearch] = useState("");
  const [showKitchenEssentialSuggestions, setShowKitchenEssentialSuggestions] =
    useState(false);

  useEffect(() => {
    const fetchDbData = async () => {
      setIsLoadingRecipe(true);
      try {
        const [ingData, appData] = await Promise.all([
          recipeService.getAllIngredients(),
          recipeService.getAllKitchenEssentials(),
        ]);
        const dbIngs = ingData || [];
        setDbIngredients(dbIngs);
        setDbKitchenEssentials(appData || []);

        if (editId) {
          setIsPrefilling(true);
          const recipe = await recipeService.getRecipeDetails(editId);
          if (recipe) {
            setTitle(recipe.title || "");
            setDescription(recipe.description || "");
            setImageUris(
              recipe.images && recipe.images.length > 0
                ? recipe.images
                : recipe.image
                ? [recipe.image]
                : [],
            );
            setVideoUrl(recipe.videoUrl || "");

            // Set video states if video is present
            if (recipe.videoUrl) {
              setIsVideoVerified(true);
              setPreviewStartTime(recipe.previewVideoStartTime || 0);
              const duration =
                (recipe.previewVideoEndTime || 0) -
                (recipe.previewVideoStartTime || 0);
              setPreviewDuration(duration > 0 ? duration : 15);
            }

            setPrepTime(recipe.prepTime || 10);
            setCookTime(recipe.cookingMinutes || 10);
            setServings(recipe.servings || 2);

            // Difficulty level mapping
            if (recipe.difficulty) {
              const diffLower = recipe.difficulty.toLowerCase();
              if (diffLower.includes("medium")) setDifficulty("Medium");
              else if (diffLower.includes("hard")) setDifficulty("Hard");
              else setDifficulty("Easy");
            }

            setCuisineTag(recipe.cuisine_type || "");
            setDishCategory(recipe.dish_category || "");

            // Diet tags & Meal Types
            const tags = recipe.diet_tags || [];
            const mealTypes = [
              "Breakfast",
              "Lunch",
              "Dinner",
              "Midnight",
              "Snack",
              "Desserts",
              "Appetizer",
            ];
            const dietNames = [
              "Vegan",
              "Gluten-Free",
              "Dairy-Free",
              "Low-Carb",
              "Nut-Free",
              "Healthy",
              "Non-Halal",
            ];

            setSelectedMealTypes(tags.filter((t: string) => mealTypes.includes(t)));
            setSelectedDietTags(tags.filter((t: string) => dietNames.includes(t)));
            setSpiceLevel(recipe.spiceLevel || 3);
            setKitchenEssentials(recipe.kitchen_essentials || []);

            // Ingredients parsing
            if (recipe.ingredients && recipe.ingredients.length > 0) {
              const parsedIngredients = recipe.ingredients.map((item: any) => {
                const parsed = parseQuantityAndUnit(
                  item.quantity || "",
                  item.name || "",
                  dbIngs,
                );
                return {
                  name: item.name || "",
                  quantity: parsed.quantity,
                  unit: parsed.unit,
                  category: parsed.category,
                };
              });
              setIngredients(parsedIngredients);
            }

            // Steps mapping
            if (recipe.steps && recipe.steps.length > 0) {
              setSteps(
                recipe.steps.map((s: any) => ({
                  step: s.step,
                  instruction: s.instruction || "",
                  action: s.action || "Mix",
                  parallel: s.parallel || false,
                  linkedIngredients: s.linkedIngredients || [],
                  heatSetting: s.heatSetting || null,
                  hasTimer: s.hasTimer || false,
                  timerType: s.timerType || "countdown",
                  timerHours: s.timerHours || "",
                  timerMinutes: s.timerMinutes || "",
                  targetTime: s.targetTime || "",
                  leaveOvernight: s.leaveOvernight || false,
                })),
              );
            }
          }
          setIsPrefilling(false);
        }
      } catch (err) {
        console.error("Failed to fetch wizard master data from DB:", err);
      } finally {
        setIsLoadingRecipe(false);
      }
    };
    fetchDbData();
  }, [editId]);

  // Picker cover image method
  const handlePickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Denied",
          "We need access to your photos to upload images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        allowsMultipleSelection: false,
        aspect: [16, 9],
        quality: 1, // Request full quality from picker, we'll compress ourselves
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;

        // Respect the 6-image cap, accounting for any already queued.
        if (imageUris.length >= 6) return;

        // Add immediately so the preview renders, and queue it for processing.
        setImageUris((prev) => [...prev, pickedUri].slice(0, 6));
        setProcessingUris((prev) => [...prev, pickedUri]);

        // Compress + convert in the BACKGROUND — don't block the UI, so the user
        // can add more images or move to the next section while this runs.
        (async () => {
          try {
            const manipResult = await ImageManipulator.manipulateAsync(
              pickedUri,
              [{ resize: { width: 1200 } }],
              { compress: 0.75, format: ImageManipulator.SaveFormat.WEBP },
            );
            setImageUris((prev) =>
              prev.map((uri) => (uri === pickedUri ? manipResult.uri : uri)),
            );
          } catch (manipErr) {
            console.error("Image processing error:", manipErr);
            Alert.alert("Error", "Failed to process and compress that image.");
            setImageUris((prev) => prev.filter((uri) => uri !== pickedUri));
          } finally {
            setProcessingUris((prev) => prev.filter((uri) => uri !== pickedUri));
          }
        })();
      }
    } catch (err: any) {
      console.error("Image picker error:", err);
    }
  };

  // Ingredient dynamic list actions
  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { name: "", quantity: "", unit: "g", category: "solid" },
    ]);
  };

  const handleUpdateIngredientFull = (
    index: number,
    updates: Partial<{
      name: string;
      quantity: string;
      unit: string;
      category: string;
      icon_url: string;
    }>,
  ) => {
    setIngredients((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)),
    );
  };

  const handleUpdateIngredient = (
    index: number,
    key: "name" | "quantity" | "unit" | "category",
    value: string,
  ) => {
    setIngredients((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length === 1) {
      setIngredients([
        { name: "", quantity: "", unit: "g", category: "solid" },
      ]);
      return;
    }
    setIngredients(ingredients.filter((_, i) => i !== index));
    if (activeRowIndex === index) {
      setActiveRowIndex(null);
    }
  };

  // Steps dynamic list actions
  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        step: steps.length + 1,
        instruction: "",
        action: "Mix",
        parallel: false,
        linkedIngredients: [],
        heatSetting: null,
        hasTimer: false,
        timerType: "countdown",
        timerHours: "",
        timerMinutes: "",
        targetTime: "",
        leaveOvernight: false,
      },
    ]);
  };

  const handleUpdateStep = (
    index: number,
    key: keyof RecipeStep,
    value: any,
  ) => {
    setSteps(
      steps.map((item, idx) =>
        idx === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length === 1) {
      setSteps([
        {
          step: 1,
          instruction: "",
          action: "Mix",
          parallel: false,
          linkedIngredients: [],
          heatSetting: null,
          hasTimer: false,
          timerType: "countdown",
          timerHours: "",
          timerMinutes: "",
          targetTime: "",
          leaveOvernight: false,
        },
      ]);
      return;
    }
    const filtered = steps.filter((_, i) => i !== index);
    // Re-index step numbers
    const reindexed = filtered.map((step, idx) => ({
      ...step,
      step: idx + 1,
    }));
    setSteps(reindexed);
  };

  // Next / Back navigation & Validation rules
  const handleNext = () => {
    if (currentStep === 1) {
      const titleLetterCount = title.replace(/\s/g, "").length;
      if (titleLetterCount <= 3) {
        Alert.alert("Validation Error", "Recipe title must be more than 3 letters.");
        return;
      }

      const descLetterCount = description.replace(/\s/g, "").length;
      if (descLetterCount <= 5) {
        Alert.alert("Validation Error", "Description must be more than 5 letters.");
        return;
      }
      if (imageUris.length === 0) {
        Alert.alert(
          "Validation Error",
          "Please select at least one image for your recipe.",
        );
        return;
      }
      if (videoUrl.trim() && !isVideoVerified) {
        Alert.alert(
          "Validation Error",
          videoValidationError ||
            "Please enter a valid, verified YouTube link before proceeding.",
        );
        return;
      }
      if (isVerifyingVideo) {
        Alert.alert(
          "Validation Error",
          "Please wait for video verification to complete.",
        );
        return;
      }
      if (!cuisineTag || !dishCategory || selectedMealTypes.length === 0) {
        Alert.alert(
          "Validation Error",
          "Please complete all categorization options (Cuisine, Dish Category, and Meal Types).",
        );
        return;
      }
    } else if (currentStep === 2) {
      // Step 2: Information Section (Prep Time, Cook Time, Servings, Spice, Diet Tags) - always valid
    } else if (currentStep === 3) {
      // Find the first ingredient row that is missing a name, quantity, is 0, or hasn't been selected from the dropdown (missing icon_url)
      const firstBadIndex = ingredients.findIndex(
        (i) =>
          !i.name.trim() ||
          !i.quantity.trim() ||
          parseFloat(i.quantity.trim()) === 0 ||
          !i.icon_url,
      );
      if (firstBadIndex !== -1) {
        // 1. Haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        // 2. Alert explanation
        const badIng = ingredients[firstBadIndex];
        let errorMsg = "Please complete all ingredient fields.";
        if (!badIng.name.trim()) {
          errorMsg = "Please enter an ingredient name.";
        } else if (!badIng.quantity.trim()) {
          errorMsg = `Please enter a quantity for "${badIng.name}".`;
        } else if (parseFloat(badIng.quantity.trim()) === 0) {
          errorMsg = `Quantity cannot be 0 for "${badIng.name}".`;
        } else if (!badIng.icon_url) {
          errorMsg = `Please select "${badIng.name}" from the suggestions dropdown to link its icon.`;
        }
        Alert.alert("Validation Error", errorMsg);

        // 3. Shake the bad row
        triggerShake(firstBadIndex);
        // 4. Scroll to the bad row using stored onLayout Y offset
        const rowY = ingredientRowYs.current[firstBadIndex] ?? 0;
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, rowY - 100),
          animated: true,
        });
        return;
      }
    } else if (currentStep === 4) {
      const MIN_INSTRUCTION = 15;
      const nonEmpty = steps.filter((s) => s.instruction.trim());
      if (nonEmpty.length === 0) {
        Alert.alert(
          "Validation Error",
          "Please add at least one instruction step.",
        );
        return;
      }
      // Reject too-short instructions (e.g. a couple of letters).
      const tooShortIndex = steps.findIndex(
        (s) =>
          s.instruction.trim().length > 0 &&
          s.instruction.trim().length < MIN_INSTRUCTION,
      );
      if (tooShortIndex !== -1) {
        Alert.alert(
          "Add more detail",
          `Step ${tooShortIndex + 1}'s instruction is too short. Describe what to do in a short sentence (at least ${MIN_INSTRUCTION} characters).`,
        );
        return;
      }
    }

    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Submission handler
  const handlePublish = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to publish a recipe.");
      return;
    }

    if (processingUris.length > 0) {
      Alert.alert(
        "Images still processing",
        "Hang on a moment while your images finish compressing, then try again.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload All Selected Images to Storage
      const finalImageUrls: string[] = [];
      for (const localUri of imageUris) {
        if (localUri.startsWith("http")) {
          finalImageUrls.push(localUri);
        } else {
          const publicUrl = await recipeService.uploadRecipeImage(
            localUri,
            user.id,
          );
          finalImageUrls.push(publicUrl);
        }
      }
      const finalImageUrl = finalImageUrls.length > 0 ? finalImageUrls[0] : "";

      // Filter empty inputs and map structured units to database string formats
      const finalIngredients = ingredients
        .filter((i) => i.name.trim() && i.quantity.trim() && parseFloat(i.quantity.trim()) !== 0)
        .map((i) => ({
          name: i.name.trim(),
          quantity: `${i.quantity.trim()} ${i.unit}`,
        }));
      const finalSteps = steps.filter((s) => s.instruction.trim());

      // Ingredients and kitchen essentials are mutually exclusive — a measured
      // ingredient must not also be saved as a pantry essential.
      const ingredientNames = new Set(
        finalIngredients.map((i) => i.name.trim().toLowerCase()),
      );
      const finalEssentials = kitchenEssentials
        .map((a) => a.trim())
        .filter((a) => a.length > 0 && !ingredientNames.has(a.toLowerCase()));

      // 2. Insert or Update recipe row
      let publishedRecipe;
      if (editId) {
        publishedRecipe = await recipeService.updateRecipe(editId, {
          title,
          description,
          ingredients: finalIngredients,
          steps: finalSteps,
          image_url: finalImageUrl,
          images: finalImageUrls,
          video_url: videoUrl.trim() || undefined,
          preview_video_start_time: isVideoVerified
            ? previewStartTime
            : undefined,
          preview_video_end_time: isVideoVerified ? previewEndTime : undefined,
          cook_time: cookTime,
          prep_time: prepTime,
          servings: servings,
          difficulty,
          cuisine_type: cuisineTag,
          dish_category: dishCategory,
          diet_tags: [...selectedDietTags, ...selectedMealTypes],
          spice_level: spiceLevel,
          kitchen_essentials: finalEssentials,
        });
      } else {
        publishedRecipe = await recipeService.createRecipe({
          title,
          description,
          ingredients: finalIngredients,
          steps: finalSteps,
          image_url: finalImageUrl,
          images: finalImageUrls,
          video_url: videoUrl.trim() || undefined,
          preview_video_start_time: isVideoVerified
            ? previewStartTime
            : undefined,
          preview_video_end_time: isVideoVerified ? previewEndTime : undefined,
          cook_time: cookTime,
          prep_time: prepTime,
          servings: servings,
          difficulty,
          cuisine_type: cuisineTag,
          dish_category: dishCategory,
          diet_tags: [...selectedDietTags, ...selectedMealTypes],
          spice_level: spiceLevel,
          created_by: user.id,
          kitchen_essentials: finalEssentials,
        });
      }

      if (publishedRecipe && publishedRecipe.id) {
        setPublishedRecipeId(publishedRecipe.id);
      }
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Failed to publish recipe:", err);
      Alert.alert(
        "Error",
        err.message || "Failed to publish recipe. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FFFDF5]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View
          className="px-6 pb-2 flex-row justify-between items-center bg-[#FFFDF5]"
          style={{ paddingTop: Math.max(insets.top, 12) }}
        >
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Discard Changes",
                "Are you sure you want to exit? Your progress will be lost.",
                [
                  { text: "Keep Editing", style: "cancel" },
                  {
                    text: "Discard",
                    style: "destructive",
                    onPress: () => router.back(),
                  },
                ],
              );
            }}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 items-center justify-center shadow-sm"
          >
            <Feather name="x" size={20} color="#3B3328" />
          </TouchableOpacity>

          <Text className="font-jakarta-bold text-[#3B3328] text-base">
            {editId ? "Edit Recipe" : "Create Recipe"}
          </Text>

          {/* Spacer to keep title centered */}
          <View className="w-10 h-10" />
        </View>

        {/* Form Body ScrollView */}
        {isLoadingRecipe ? (
          <View className="flex-1 items-center justify-center bg-[#FFFDF5]">
            <CookingLoader scale={0.8} />
            <Text className="mt-4 font-jakarta-medium text-[#8B7D6F] text-sm">
              Loading recipe details...
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollViewRef}
              className="flex-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={() => Keyboard.dismiss()}
              style={{ overflow: "visible" }}
            >
          {/* STEP 1: Basic Info & Details */}
          {currentStep === 1 && (
            <View className="pb-24 relative">
              {/* Padded Step 1 Contents */}
              <View className="px-6 pt-3">
                {/* Step Header Row */}
                <View className="flex-row items-center justify-between mb-6 mt-2">
                  {/* Text Column (65% width) */}
                  <View style={{ width: "65%" }}>
                    <Text className="font-jakarta-bold text-[#3B3328] text-[32px] tracking-tight mb-2">
                      Title
                    </Text>
                    <Text className="font-inter-medium text-[#5C544A] text-xs leading-4">
                      Give your recipe a catchy name and a beautiful cover photo
                      to inspire other chefs.
                    </Text>
                  </View>

                  {/* Image Column (30% width) with Egg Shape Background */}
                  <View
                    style={{ width: "30%" }}
                    className="items-center justify-center relative aspect-square"
                  >
                    {/* Egg shaped background shape */}
                    <View
                      pointerEvents="none"
                      className="absolute bg-[#F5E3D8]/45 rounded-full"
                      style={{
                        width: "150%",
                        height: "150%",
                        borderTopLeftRadius: 120,
                        borderTopRightRadius: 75,
                        borderBottomLeftRadius: 85,
                        borderBottomRightRadius: 65,
                        transform: [{ scaleX: 1.1 }],
                        zIndex: -1,
                      }}
                    />
                    {/* Step Image */}
                    <Image
                      source={require("@/assets/icons/Step1_Title.webp")}
                      style={{ width: "85%", height: "85%" }}
                      contentFit="contain"
                    />
                  </View>
                </View>

                {/* Title Input with Floating badge label */}
                <View className="relative mb-6">
                  <View className="absolute -top-3 left-4 bg-[#FFF5EE] px-2 py-0.5 rounded-lg border border-[#FBA82E]/30 z-10">
                    <Text className="font-jakarta-bold text-primary text-[10px] uppercase tracking-wider">
                      Recipe Name
                    </Text>
                  </View>
                  <TextInput
                    value={title}
                    onChangeText={(t) =>
                      setTitle(t.replace(/[^a-zA-Z0-9\s]/g, ""))
                    }
                    placeholder="e.g., Summer Basil Pesto Pasta"
                    placeholderTextColor="#A89E92"
                    className="bg-white rounded-2xl p-4 border border-[#F5E3D8]/50 font-jakarta-medium text-[#3B3328] text-sm shadow-sm"
                  />
                </View>

                {/* Media Upload: Multiple Image selector */}
                <Text className="font-jakarta-semibold text-[#3B3328] text-sm mb-3">
                  Upload Photos
                </Text>
                {imageUris.length === 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePickImage}
                    className="w-full aspect-[16/9] rounded-[24px] items-center justify-center border-2 border-dashed border-[#F5E3D8] bg-[#FAF5EF]/50 mb-6 overflow-hidden"
                  >
                    <View className="items-center justify-center px-4">
                      <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mb-2">
                        <Image
                          source={require("@/assets/icons/add_post.webp")}
                          style={{ width: 32, height: 32 }}
                          contentFit="contain"
                        />
                      </View>
                      <Text className="font-jakarta-semibold text-[#3B3328] text-sm mb-1">
                        Choose Recipe Photos
                      </Text>
                      <Text className="font-inter-regular text-[#8B7D6F] text-[10px] text-center leading-3">
                        The 1st uploaded photo automatically becomes the main
                        featured cover.
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={{ height: 124, marginBottom: 24 }}>
                    <DraggableFlatList
                      data={imageUris}
                      onDragEnd={({ data }) => setImageUris(data)}
                      keyExtractor={(item, index) => item + index}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      renderItem={({ item, drag, isActive }) => {
                        const idx = imageUris.indexOf(item);
                        const isFeatured = idx === 0;
                        return (
                          <ScaleDecorator>
                            <TouchableOpacity
                              activeOpacity={1}
                              onLongPress={drag}
                              delayLongPress={50}
                              disabled={isActive}
                              style={{
                                width: 112,
                                height: 112,
                                borderRadius: 24,
                                overflow: "hidden",
                                marginRight: 12,
                                marginBottom: 4,
                                position: "relative",
                                borderWidth: 2,
                                borderColor: isActive
                                  ? "rgba(251, 168, 46, 0.5)"
                                  : isFeatured
                                    ? "#FBA82E"
                                    : "rgba(245, 227, 216, 0.5)",
                                backgroundColor: isActive
                                  ? "transparent"
                                  : "#F3F4F6",
                                transform: isActive
                                  ? [{ scale: 1.05 }]
                                  : [{ scale: 1 }],
                                shadowColor: "#3B3328",
                                shadowOffset: isActive
                                  ? { width: 0, height: 4 }
                                  : { width: 0, height: 0 },
                                shadowOpacity: isActive ? 0.1 : 0,
                                shadowRadius: isActive ? 6 : 0,
                                elevation: isActive ? 4 : 0,
                              }}
                            >
                              <Image
                                source={{ uri: item }}
                                style={{
                                  width: 112,
                                  height: 112,
                                  position: "absolute",
                                  borderRadius: 24,
                                }}
                                contentFit="cover"
                                blurRadius={processingUris.includes(item) ? 15 : 0}
                              />
                              {processingUris.includes(item) && (
                                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(250, 245, 239, 0.6)", justifyContent: "center", alignItems: "center", borderRadius: 24, overflow: "hidden" }}>
                                  <CookingLoader scale={0.4} />
                                </View>
                              )}
                              {isFeatured && (
                                <View
                                  style={{
                                    position: "absolute",
                                    top: 6,
                                    left: 6,
                                    backgroundColor: "#FBA82E",
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 9999,
                                    shadowColor: "#3B3328",
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 2,
                                    elevation: 1,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: "#FFFFFF",
                                      fontSize: 8,
                                      fontFamily: "PlusJakartaSans_700Bold",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Cover
                                  </Text>
                                </View>
                              )}
                              {/* Delete button */}
                              <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() =>
                                  setImageUris(
                                    imageUris.filter((u) => u !== item),
                                  )
                                }
                                style={{
                                  position: "absolute",
                                  top: 6,
                                  right: 6,
                                  width: 24,
                                  height: 24,
                                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                                  borderRadius: 12,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  shadowColor: "#000",
                                  shadowOffset: { width: 0, height: 1 },
                                  shadowOpacity: 0.2,
                                  shadowRadius: 1.41,
                                  elevation: 2,
                                }}
                              >
                                <Feather name="x" size={12} color="#FFFFFF" />
                              </TouchableOpacity>
                            </TouchableOpacity>
                          </ScaleDecorator>
                        );
                      }}
                      ListFooterComponent={
                        imageUris.length < 6 ? (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handlePickImage}
                            style={{
                              width: 112,
                              height: 112,
                              borderRadius: 24,
                              borderWidth: 2,
                              borderStyle: "dashed",
                              borderColor: "#F5E3D8",
                              backgroundColor: "rgba(250, 245, 239, 0.5)",
                              alignItems: "center",
                              justifyContent: "center",
                              marginBottom: 4,
                            }}
                          >
                            <Image
                              source={require("@/assets/icons/add_post.webp")}
                              style={{ width: 28, height: 28 }}
                              contentFit="contain"
                            />
                            <Text
                              style={{
                                fontFamily: "PlusJakartaSans_600SemiBold",
                                color: "#8B7D6F",
                                fontSize: 10,
                                marginTop: 4,
                              }}
                            >
                              Add Photo
                            </Text>
                          </TouchableOpacity>
                        ) : null
                      }
                    />
                  </View>
                )}

                {/* Video Link Input */}
                <Text className="font-jakarta-semibold text-[#3B3328] text-sm mb-2">
                  Add Video Link
                </Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 border border-[#F5E3D8]/50 mb-4 shadow-sm">
                  <Feather
                    name="video"
                    size={18}
                    color="#A89E92"
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    value={videoUrl}
                    onChangeText={setVideoUrl}
                    placeholder="Paste YouTube URL"
                    placeholderTextColor="#A89E92"
                    autoCapitalize="none"
                    keyboardType="url"
                    className="flex-1 py-4 font-jakarta-medium text-[#3B3328] text-sm"
                  />
                  {isVerifyingVideo && (
                    <ActivityIndicator
                      size="small"
                      color="#FBA82E"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                  {!isVerifyingVideo && isVideoVerified && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#4CAF50"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                  {!isVerifyingVideo && videoValidationError && (
                    <Ionicons
                      name="alert-circle"
                      size={22}
                      color="#EF4444"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </View>
                {videoValidationError && (
                  <Text className="text-red-500 font-inter-medium text-xs mb-4 ml-1">
                    {videoValidationError}
                  </Text>
                )}

                {/* Highlight Preview Selector */}
                {isVideoVerified && (
                  <View className="bg-white rounded-3xl p-5 border border-[#F5E3D8]/40 mb-5 shadow-sm">
                    {/* Hidden YouTube Player to fetch duration */}
                    <View style={{ width: 0, height: 0, opacity: 0 }}>
                      <YoutubePlayer
                        ref={playerRef}
                        height={0}
                        width={0}
                        videoId={getYoutubeId(videoUrl) || ""}
                        play={false}
                        onReady={handlePlayerReady}
                      />
                    </View>

                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-row items-center gap-2">
                        <Feather name="video" size={18} color="#FBA82E" />
                        <Text className="font-jakarta-bold text-[#3B3328] text-sm">
                          Video Trailer Preview
                        </Text>
                      </View>
                    </View>

                    <View className="bg-[#FAF5EF] rounded-2xl p-4 border border-[#EDD8A9]/30 mb-4">
                      <Text className="font-inter-medium text-xs text-[#8B7D6F] leading-5">
                        <Text className="font-jakarta-bold text-[#3B3328]">
                          Configured Clip:{" "}
                        </Text>
                        {previewDuration}s preview starting at{" "}
                        <Text className="font-jakarta-bold text-primary">
                          {Math.floor(previewStartTime / 60)}m{" "}
                          {previewStartTime % 60}s
                        </Text>
                      </Text>
                      <Text className="font-inter-regular text-[11px] text-[#8B7D6F] mt-1">
                        Looped playback is configured. You can edit this trailer
                        segment anytime.
                      </Text>
                    </View>

                    {/* Open Edit Modal Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={openLivePreviewModal}
                      className="w-full bg-[#FBA82E] rounded-2xl py-3.5 items-center justify-center flex-row gap-2 shadow-sm"
                    >
                      <Feather name="edit-3" size={16} color="#FFFFFF" />
                      <Text className="font-jakarta-bold text-white text-sm">
                        Trim & Preview Clip
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Description Input */}
                <Text className="font-jakarta-semibold text-[#3B3328] text-sm mb-2">
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Briefly describe what makes this recipe special, its history, or serving suggestions."
                  placeholderTextColor="#A89E92"
                  multiline
                  numberOfLines={4}
                  style={{ textAlignVertical: "top" }}
                  className="bg-white rounded-2xl p-4 border border-[#F5E3D8]/50 font-jakarta-medium text-[#3B3328] mb-5 text-sm h-28 shadow-sm"
                />

                {/* Categorization Section */}
                <View className="bg-white rounded-[24px] p-5 border border-[#F5E3D8]/40 mb-6 shadow-sm">
                  <Text className="font-jakarta-bold text-[#3B3328] text-base mb-1">
                    Categorization
                  </Text>
                  <View className="h-[1px] bg-[#F5E3D8]/30 my-3" />

                  {/* Cuisine Tag */}
                  <Text className="font-jakarta-semibold text-[#8B7D6F] text-xs mb-2">
                    Cuisine Tag
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsCuisinePickerVisible(true)}
                    className="flex-row justify-between items-center bg-[#FAF5EF]/50 rounded-2xl p-4 border border-[#F5E3D8]/40 mb-4"
                  >
                    <Text
                      className={cn(
                        "font-jakarta-medium text-sm",
                        cuisineTag ? "text-[#3B3328]" : "text-[#A89E92]",
                      )}
                    >
                      {cuisineTag || "Select Cuisine"}
                    </Text>
                    <Feather name="chevron-down" size={18} color="#8B7D6F" />
                  </TouchableOpacity>

                  {/* Dish Category */}
                  <Text className="font-jakarta-semibold text-[#8B7D6F] text-xs mb-2">
                    Dish Category
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsCategoryPickerVisible(true)}
                    className="flex-row justify-between items-center bg-[#FAF5EF]/50 rounded-2xl p-4 border border-[#F5E3D8]/40"
                  >
                    <Text
                      className={cn(
                        "font-jakarta-medium text-sm",
                        dishCategory ? "text-[#3B3328]" : "text-[#A89E92]",
                      )}
                    >
                      {dishCategory || "Select Category"}
                    </Text>
                    <Feather name="chevron-down" size={18} color="#8B7D6F" />
                  </TouchableOpacity>

                  {/* Meal Types */}
                  <Text className="font-jakarta-semibold text-[#8B7D6F] text-xs mb-2 mt-4">
                    Meal Types (Select multiple)
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[
                      "Breakfast",
                      "Lunch",
                      "Dinner",
                      "Midnight",
                      "Snack",
                      "Desserts",
                      "Appetizer",
                    ].map((type) => {
                      const isSelected = selectedMealTypes.includes(type);
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedMealTypes(
                                selectedMealTypes.filter((t) => t !== type),
                              );
                            } else {
                              setSelectedMealTypes([
                                ...selectedMealTypes,
                                type,
                              ]);
                            }
                          }}
                          className={cn(
                            "px-4 py-2 rounded-full border",
                            isSelected
                              ? "bg-primary border-transparent"
                              : "bg-[#FAF5EF]/50 border-[#F5E3D8]/40",
                          )}
                        >
                          <Text
                            className={cn(
                              "font-jakarta-medium text-xs",
                              isSelected ? "text-white" : "text-[#8B7D6F]",
                            )}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* STEP 2: Information Section */}
          {currentStep === 2 && (
            <View className="pb-24 px-6 pt-3">
              {/* Step Header Row */}
              <View className="flex-row items-center justify-between mb-8 mt-2">
                {/* Text Column (65% width) */}
                <View style={{ width: "65%" }}>
                  <Text className="font-jakarta-bold text-[#3B3328] text-[32px] tracking-tight mb-2">
                    Information
                  </Text>
                  <Text className="font-inter-medium text-[#5C544A] text-xs leading-4">
                    Fill in the core details to help others understand the pace
                    of your recipe.
                  </Text>
                </View>

                {/* Image Column (30% width) with Egg Shape Background */}
                <View
                  style={{ width: "30%" }}
                  className="items-center justify-center relative aspect-square"
                >
                  {/* Egg shaped background shape */}
                  <View
                    pointerEvents="none"
                    className="absolute bg-[#F5E3D8]/45 rounded-full"
                    style={{
                      width: "150%",
                      height: "150%",
                      borderTopLeftRadius: 120,
                      borderTopRightRadius: 75,
                      borderBottomLeftRadius: 85,
                      borderBottomRightRadius: 65,
                      transform: [{ scaleX: 1.1 }],
                      zIndex: -1,
                    }}
                  />
                  {/* Step Image */}
                  <Image
                    source={require("@/assets/icons/Step2_Info.webp")}
                    style={{ width: "85%", height: "85%" }}
                    contentFit="contain"
                  />
                </View>
              </View>

              {/* Prep Time Card */}
              <View className="bg-[#F5E3D8]/25 rounded-[24px] p-5 border border-[#F5E3D8]/45 mb-4 flex-row justify-between items-center shadow-sm">
                <View className="flex-1 mr-4">
                  <Text className="font-jakarta-bold text-[#3B3328] text-base mb-1">
                    Preparation Time
                  </Text>
                  <Text className="font-inter-regular text-[#8B7D6F] text-xs leading-4">
                    Active prep before cooking
                  </Text>
                </View>
                <View className="flex-row items-center bg-white px-3 py-2 rounded-full border border-[#F5E3D8]/30 gap-4">
                  <TouchableOpacity
                    onPress={() => setPrepTime((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-full items-center justify-center bg-[#FAF5EF] active:bg-[#F5E3D8]/40"
                  >
                    <Feather name="minus" size={14} color="#3B3328" />
                  </TouchableOpacity>
                  <View className="flex-row items-center justify-center min-w-[64px]">
                    <TextInput
                      value={String(prepTime)}
                      onChangeText={(val) => {
                        const numericVal =
                          parseInt(val.replace(/[^0-9]/g, "")) || 0;
                        setPrepTime(numericVal);
                      }}
                      keyboardType="number-pad"
                      className="font-jakarta-bold text-[#3B3328] text-base text-center pb-2 m-0"
                      style={
                        {
                          padding: 0,
                          height: 24,
                          minWidth: 20,
                          includeFontPadding: false,
                          textAlign: "center",
                        } as any
                      }
                    />
                    <Text className="font-inter-regular text-xs text-[#8B7D6F] ml-1">
                      min
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setPrepTime((prev) => prev + 1)}
                    className="w-8 h-8 rounded-full items-center justify-center bg-[#FAF5EF] active:bg-[#F5E3D8]/40"
                  >
                    <Feather name="plus" size={14} color="#3B3328" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cook Time Card */}
              <View className="bg-[#F5E3D8]/25 rounded-[24px] p-5 border border-[#F5E3D8]/45 mb-6 flex-row justify-between items-center shadow-sm">
                <View className="flex-1 mr-4">
                  <Text className="font-jakarta-bold text-[#3B3328] text-base mb-1">
                    Cooking Time
                  </Text>
                  <Text className="font-inter-regular text-[#8B7D6F] text-xs leading-4">
                    Time on heat or in oven
                  </Text>
                </View>
                <View className="flex-row items-center bg-white px-3 py-2 rounded-full border border-[#F5E3D8]/30 gap-4">
                  <TouchableOpacity
                    onPress={() => setCookTime((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-full items-center justify-center bg-[#FAF5EF] active:bg-[#F5E3D8]/40"
                  >
                    <Feather name="minus" size={14} color="#3B3328" />
                  </TouchableOpacity>
                  <View className="flex-row items-center justify-center min-w-[64px]">
                    <TextInput
                      value={String(cookTime)}
                      onChangeText={(val) => {
                        const numericVal =
                          parseInt(val.replace(/[^0-9]/g, "")) || 0;
                        setCookTime(numericVal);
                      }}
                      keyboardType="number-pad"
                      className="font-jakarta-bold text-[#3B3328] text-base text-center pb-2 m-0"
                      style={
                        {
                          padding: 0,
                          height: 24,
                          minWidth: 20,
                          includeFontPadding: false,
                          textAlign: "center",
                        } as any
                      }
                    />
                    <Text className="font-inter-regular text-xs text-[#8B7D6F] ml-1">
                      min
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setCookTime((prev) => prev + 1)}
                    className="w-8 h-8 rounded-full items-center justify-center bg-[#FAF5EF] active:bg-[#F5E3D8]/40"
                  >
                    <Feather name="plus" size={14} color="#3B3328" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Servings Card */}
              <View className="bg-[#F5E3D8]/25 rounded-[24px] p-5 border border-[#F5E3D8]/45 mb-6 flex-row justify-between items-center shadow-sm">
                <View className="flex-1 mr-4">
                  <Text className="font-jakarta-bold text-[#3B3328] text-base mb-1">
                    Servings
                  </Text>
                  <Text className="font-inter-regular text-[#8B7D6F] text-xs leading-4">
                    Serving per person
                  </Text>
                </View>
                <View className="flex-row items-center bg-white px-3 py-2 rounded-full border border-[#F5E3D8]/30 gap-4">
                  <TouchableOpacity
                    onPress={() => setServings((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-full items-center justify-center bg-[#FAF5EF] active:bg-[#F5E3D8]/40"
                  >
                    <Feather name="minus" size={14} color="#3B3328" />
                  </TouchableOpacity>
                  <View className="flex-row items-center justify-center min-w-[64px]">
                    <Text
                      className="font-jakarta-bold text-[#3B3328] text-base text-center"
                      style={{ textAlign: "center" }}
                    >
                      {servings}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setServings((prev) => prev + 1)}
                    className="w-8 h-8 rounded-full items-center justify-center bg-[#FAF5EF] active:bg-[#F5E3D8]/40"
                  >
                    <Feather name="plus" size={14} color="#3B3328" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Spice Level Card */}
              <View className="bg-white rounded-[24px] p-5 border border-[#F5E3D8]/40 mb-6 shadow-sm">
                <Text className="font-jakarta-bold text-[#3B3328] text-base mb-4">
                  Spice Level
                </Text>
                <View className="flex-row items-center justify-between px-2 mb-3">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isSelected = spiceLevel === level;
                    return (
                      <TouchableOpacity
                        key={level}
                        activeOpacity={0.8}
                        onPress={() => setSpiceLevel(level)}
                        className="items-center justify-center w-14 h-14"
                      >
                        <Image
                          source={
                            SPICE_IMAGES[level as keyof typeof SPICE_IMAGES]
                          }
                          style={{
                            width: isSelected ? 46 : 30,
                            height: isSelected ? 46 : 30,
                            opacity: isSelected ? 1 : 0.45,
                            transform: isSelected ? [{ scale: 1.1 }] : [],
                          }}
                          contentFit="contain"
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Dietary Tags Card */}
              <View className="bg-white rounded-[24px] p-5 border border-[#F5E3D8]/40 mb-6 shadow-sm">
                <Text className="font-jakarta-bold text-[#3B3328] text-base mb-3">
                  Dietary Tags{" "}
                  <Text className="font-inter-regular text-xs text-[#8B7D6F]">
                    (Optional)
                  </Text>
                </Text>
                <View className="flex-row flex-wrap mt-1">
                  {DIETARY_TAGS.map((tag) => {
                    const isSelected = selectedDietTags.includes(tag.name);
                    return (
                      <TouchableOpacity
                        key={tag.name}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedDietTags((prev) =>
                            prev.includes(tag.name)
                              ? prev.filter((t) => t !== tag.name)
                              : [...prev, tag.name],
                          );
                        }}
                        className={cn(
                          "flex-row items-center px-4 py-2.5 rounded-full mr-2.5 mb-2.5 border",
                          isSelected
                            ? "bg-[#FBA82E] border-transparent"
                            : "bg-[#F5E3D8]/10 border-[#F5E3D8]/40",
                        )}
                      >
                        {typeof tag.icon === "string" ? (
                          tag.family === "Ionicons" ? (
                            <Ionicons
                              name={tag.icon as any}
                              size={14}
                              color={isSelected ? "#FFFFFF" : "#8B7D6F"}
                              style={{ marginRight: 6 }}
                            />
                          ) : (
                            <Feather
                              name={tag.icon as any}
                              size={14}
                              color={isSelected ? "#FFFFFF" : "#8B7D6F"}
                              style={{ marginRight: 6 }}
                            />
                          )
                        ) : (
                          <Image
                            source={tag.icon}
                            style={{ width: 20, height: 20, marginRight: 6 }}
                            contentFit="contain"
                          />
                        )}
                        <Text
                          className={cn(
                            "font-jakarta-semibold text-xs",
                            isSelected
                              ? "text-white font-jakarta-bold"
                              : "text-[#3B3328]",
                          )}
                        >
                          {tag.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Cook's Secret Card */}
              <View className="bg-[#F5E3D8]/25 rounded-[24px] p-5 border border-[#F5E3D8]/45 mb-6 flex-row items-center shadow-sm">
                <Image
                  source={require("@/assets/icons/Idea.webp")}
                  style={{ width: 36, height: 36, marginRight: 12 }}
                  contentFit="contain"
                />
                <View className="flex-1">
                  <Text className="font-jakarta-bold text-[#3B3328] text-base mb-0.5">
                    Cook's Secret
                  </Text>
                  <Text className="font-inter-regular text-[#5C544A] text-xs leading-4">
                    Be generous with your estimates. Including cleanup and prep
                    time makes your recipe more approachable for beginners.
                    Please set an accurate spice level so other chefs know what
                    to expect.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: Ingredients list */}
          {currentStep === 3 && (
            <View className="pb-24 px-6 pt-3">
              {/* Step Header Row */}
              <View className="flex-row items-center justify-between mb-8 mt-2">
                {/* Text Column (65% width) */}
                <View style={{ width: "65%" }}>
                  <Text className="font-jakarta-bold text-[#3B3328] text-[32px] tracking-tight mb-2">
                    Ingredients
                  </Text>
                  <Text className="font-inter-medium text-[#5C544A] text-xs leading-4">
                    List the ingredients needed along with their quantities
                    (e.g. 500g, 2 tbsp).
                  </Text>
                </View>

                {/* Image Column (30% width) with Egg Shape Background */}
                <View
                  style={{ width: "30%" }}
                  className="items-center justify-center relative aspect-square"
                >
                  {/* Egg shaped background shape */}
                  <View
                    pointerEvents="none"
                    className="absolute bg-[#F5E3D8]/45 rounded-full"
                    style={{
                      width: "150%",
                      height: "150%",
                      borderTopLeftRadius: 120,
                      borderTopRightRadius: 75,
                      borderBottomLeftRadius: 85,
                      borderBottomRightRadius: 65,
                      transform: [{ scaleX: 1.1 }],
                      zIndex: -1,
                    }}
                  />
                  {/* Step Image */}
                  <Image
                    source={require("@/assets/icons/Step3_Ingredients.webp")}
                    style={{ width: "85%", height: "85%" }}
                    contentFit="contain"
                  />
                </View>
              </View>

              {ingredients.map((item, index) => {
                const showSuggestions =
                  activeRowIndex === index && item.name.trim().length > 0;
                const sourceList =
                  dbIngredients.length > 0 ? dbIngredients : MASTER_INGREDIENTS;
                const typedQuery = item.name.toLowerCase().trim();
                const filteredSuggestions = fuzzySearchIngredients(
                  typedQuery,
                  sourceList,
                );

                return (
                  <Animated.View
                    key={index}
                    ref={(el) => {
                      ingredientRowRefs.current[index] = el as any;
                    }}
                    onLayout={(e) => {
                      ingredientRowYs.current[index] = e.nativeEvent.layout.y;
                    }}
                    className="mb-4"
                    style={{ transform: [{ translateX: getShakeAnim(index) }] }}
                  >
                    {/* Row Container */}
                    <View className="flex-row gap-2.5 items-center">
                      {/* Ingredient Name Input */}
                      <View
                        className={`flex-[3.2] bg-[#F5E3D8]/20 border border-[#F5E3D8]/30 rounded-full flex-row items-center h-[48px] ${item.icon_url ? "pl-2 pr-2" : "px-4"}`}
                      >
                        {item.icon_url ? (
                          <View className="flex-1 flex-row items-center justify-between">
                            <View className="bg-white border border-[#F5E3D8]/45 rounded-full pl-3 pr-2 py-1.5 flex-row items-center shadow-sm flex-1 mr-2">
                              <Text
                                className="font-jakarta-semibold text-[#3B3328] text-xs"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={{ flex: 1, marginRight: 8 }}
                              >
                                {item.name}
                              </Text>
                              <TouchableOpacity
                                onPress={() => {
                                  handleUpdateIngredientFull(index, {
                                    name: "",
                                    icon_url: "",
                                  });
                                  setActiveRowIndex(index);
                                }}
                                hitSlop={{
                                  top: 10,
                                  bottom: 10,
                                  left: 10,
                                  right: 10,
                                }}
                                className="bg-[#F5E3D8]/50 rounded-full p-1"
                              >
                                <Feather name="x" size={12} color="#8B7D6F" />
                              </TouchableOpacity>
                            </View>
                            <Image
                              source={{ uri: item.icon_url }}
                              style={{ width: 32, height: 32 }}
                            />
                          </View>
                        ) : (
                          <TextInput
                            value={item.name}
                            onChangeText={(val) => {
                              // Only allow alphabetical characters (English & Urdu) and spaces
                              const cleaned = val.replace(
                                /[^a-zA-Z\s\u0600-\u06FF]/g,
                                "",
                              );
                              handleUpdateIngredient(index, "name", cleaned);

                              // Re-open suggestions list if closed when typing
                              setActiveRowIndex(index);

                              const sourceList =
                                dbIngredients.length > 0
                                  ? dbIngredients
                                  : MASTER_INGREDIENTS;
                              const match = sourceList.find(
                                (m) =>
                                  m.name.toLowerCase() ===
                                  cleaned.toLowerCase().trim(),
                              );
                              if (match) {
                                handleUpdateIngredient(
                                  index,
                                  "category",
                                  match.category,
                                );
                                const units =
                                  ALLOWED_UNITS[
                                    match.category as keyof typeof ALLOWED_UNITS
                                  ] || [];
                                handleUpdateIngredient(
                                  index,
                                  "unit",
                                  units[0] || "g",
                                );
                              }
                            }}
                            onFocus={() => setActiveRowIndex(index)}
                            placeholder="Ingredient name"
                            placeholderTextColor="#A89E92"
                            className="flex-1 font-jakarta-medium text-[#3B3328] text-sm py-2.5"
                          />
                        )}
                      </View>

                      {/* Quantity Input */}
                      <View className="flex-[1.5] bg-[#F5E3D8]/20 border border-[#F5E3D8]/30 rounded-full px-1">
                        <TextInput
                          ref={(el) => {
                            qtyInputRefs.current[index] = el;
                          }}
                          value={item.quantity}
                          onChangeText={(val) => {
                            // Only allow positive numbers and decimals
                            let cleaned = val.replace(/[^0-9.]/g, "");
                            const parts = cleaned.split(".");
                            if (parts.length > 2) {
                              cleaned =
                                parts[0] + "." + parts.slice(1).join("");
                            }
                            handleUpdateIngredient(index, "quantity", cleaned);
                          }}
                          keyboardType="decimal-pad"
                          placeholder="Qty"
                          placeholderTextColor="#A89E92"
                          className="font-jakarta-medium text-[#3B3328] text-sm py-2.5 text-center"
                        />
                      </View>

                      {/* Unit Selector Dropdown */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          setActiveUnitPickerIndex(index);
                          setActiveRowIndex(null); // Dismiss autocomplete if opening unit picker
                        }}
                        className="flex-[1.2] bg-[#F5E3D8]/20 border border-[#F5E3D8]/30 rounded-full px-3 py-2.5 flex-row items-center justify-between"
                      >
                        <Text className="font-jakarta-medium text-[#3B3328] text-xs">
                          {item.unit}
                        </Text>
                        <Feather
                          name="chevron-down"
                          size={13}
                          color="#8B7D6F"
                        />
                      </TouchableOpacity>

                      {/* Delete Button */}
                      <TouchableOpacity
                        onPress={() => handleRemoveIngredient(index)}
                        className="w-9 h-9 rounded-full bg-rose-50 border border-rose-100 items-center justify-center"
                      >
                        <Feather name="trash-2" size={14} color="#E05252" />
                      </TouchableOpacity>
                    </View>

                    {/* Autocomplete Suggestions Block */}
                    {showSuggestions && (
                      <View className="bg-white border border-[#F5E3D8]/45 rounded-3xl p-4 mt-2 shadow-sm">
                        <View className="flex-row justify-between items-center mb-3">
                          <Text className="font-jakarta-semibold text-xs text-[#8B7D6F]">
                            Choose your ingredients
                          </Text>
                          <TouchableOpacity
                            onPress={() => setActiveRowIndex(null)}
                          >
                            <Feather
                              name="chevron-up"
                              size={16}
                              color="#8B7D6F"
                            />
                          </TouchableOpacity>
                        </View>

                        {filteredSuggestions.length > 0 ? (
                          <View className="flex-row flex-wrap gap-x-2.5 gap-y-3.5 justify-center">
                            {filteredSuggestions.map((sug) => (
                              <Pressable
                                key={sug.name}
                                onPress={() => {
                                  Keyboard.dismiss();
                                  console.log(
                                    "[Ingredient Selected]",
                                    sug.name,
                                    sug.icon_url,
                                  );
                                  const units =
                                    ALLOWED_UNITS[
                                      sug.category as keyof typeof ALLOWED_UNITS
                                    ] || [];
                                  handleUpdateIngredientFull(index, {
                                    name: sug.name,
                                    category: sug.category || "solid",
                                    unit: units[0] || "g",
                                    icon_url: sug.icon_url,
                                  });
                                  setActiveRowIndex(null);
                                  setTimeout(() => {
                                    qtyInputRefs.current[index]?.focus();
                                  }, 150);
                                }}
                                style={({ pressed }) => ({
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 64,
                                  opacity: pressed ? 0.6 : 1,
                                })}
                              >
                                <View className="w-14 h-14 rounded-full bg-[#F5E3D8]/45 border border-[#F5E3D8]/30 items-center justify-center mb-1 shadow-sm">
                                  <Image
                                    source={{ uri: sug.icon_url }}
                                    style={{ width: 32, height: 32 }}
                                    contentFit="contain"
                                  />
                                </View>
                                <Text
                                  className="font-inter-medium text-[9px] text-[#5C544A] text-center"
                                  numberOfLines={1}
                                >
                                  {sug.name}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : (
                          <Text className="font-inter-regular text-xs text-[#A89E92] py-2 text-center">
                            No match found. Keep typing to use your custom
                            ingredient.
                          </Text>
                        )}
                      </View>
                    )}
                  </Animated.View>
                );
              })}

              <TouchableOpacity
                onPress={handleAddIngredient}
                className="w-full py-4 bg-[#F5E3D8]/30 rounded-2xl items-center justify-center border border-dashed border-[#FBA82E]/35 mt-2"
              >
                <View className="flex-row items-center">
                  <Feather name="plus" size={16} color="#FBA82E" />
                  <Text className="font-jakarta-bold text-primary text-sm ml-2">
                    Add Ingredient
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Kitchen Essentials Section */}
              <View className="mt-8 border-t border-[#F5E3D8]/30 pt-6 mb-10">
                <View className="mb-4">
                  <Text className="font-jakarta-bold text-[#3B3328] text-xl mb-1">
                    Kitchen Essentials
                  </Text>
                  <Text className="font-jakarta text-[#8B7D6F] text-sm leading-5">
                    Select the kitchen appliances, crockery, and cutlery needed for this
                    recipe.
                  </Text>
                </View>

                {/* Grid of added essentials */}
                {kitchenEssentials.length > 0 && (
                  <View className="flex-row flex-wrap gap-3 mb-6">
                    {kitchenEssentials.map((item, idx) => {
                      const appInfo = dbKitchenEssentials.find((a) => a.name === item);
                      const fallbackInfo = MASTER_KITCHEN_ESSENTIALS.find(
                        (a) => a.name === item,
                      );
                      const iconUrl = appInfo
                        ? appInfo.icon_url
                        : fallbackInfo
                          ? fallbackInfo.icon_url
                          : "https://cdn-icons-png.flaticon.com/128/3028/3028308.png";
                      return (
                        <View
                          key={idx + "_" + item}
                          className="w-[31.3%] min-h-[110px] bg-[#F5E3D8]/55 rounded-[24px] items-center justify-center p-3 relative border border-[#F5E3D8]/45 shadow-sm"
                        >
                          <Image
                            source={{ uri: iconUrl }}
                            style={{ width: 44, height: 44 }}
                            contentFit="contain"
                          />
                          <Text
                            className="text-[#3B3328] font-jakarta-semibold text-[10px] text-center mt-2.5 px-1 leading-3"
                            numberOfLines={2}
                          >
                            {item}
                          </Text>
                          {/* Absolute X Delete Button */}
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              setKitchenEssentials(
                                kitchenEssentials.filter((a) => a !== item),
                              );
                            }}
                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white border border-[#F5E3D8]/30 items-center justify-center shadow-sm"
                          >
                            <Feather name="x" size={10} color="#E05252" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Search Bar Input to Add/Search Kitchen Essentials */}
                <View className="relative z-20">
                  <View className="flex-row items-center bg-white border border-[#F5E3D8] rounded-2xl p-2 pl-4 shadow-sm">
                    <Feather name="search" size={18} color="#8B7D6F" />
                    <TextInput
                      className="flex-1 ml-2 font-jakarta text-[#3B3328] text-sm h-10"
                      value={kitchenEssentialSearch}
                      onChangeText={(val) => {
                        // Only allow alphabetical characters (English & Urdu) and spaces
                        const cleaned = val.replace(
                          /[^a-zA-Z\s\u0600-\u06FF]/g,
                          "",
                        );
                        setKitchenEssentialSearch(cleaned);
                        setShowKitchenEssentialSuggestions(true);
                      }}
                      onFocus={() => setShowKitchenEssentialSuggestions(true)}
                      placeholder="Search kitchen essential..."
                      placeholderTextColor="#8B7D6F"
                    />
                  </View>

                  {/* Autocomplete Suggestions Block for Kitchen Essentials */}
                  {showKitchenEssentialSuggestions &&
                    kitchenEssentialSearch.trim().length > 0 && (
                      <View className="bg-white border border-[#F5E3D8]/45 rounded-3xl mt-2 shadow-sm z-50 overflow-hidden">
                        <View className="flex-row items-center justify-between p-4 border-b border-[#F5E3D8]/50 bg-[#FAF7F5]">
                          <Text className="font-jakarta-semibold text-[#8B7D6F] text-xs uppercase tracking-wider">
                            Select Essential
                          </Text>
                          <TouchableOpacity
                            onPress={() => setShowKitchenEssentialSuggestions(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Feather
                              name="chevron-up"
                              size={16}
                              color="#8B7D6F"
                            />
                          </TouchableOpacity>
                        </View>

                        <ScrollView
                          className="max-h-56"
                          showsVerticalScrollIndicator={false}
                          keyboardShouldPersistTaps="always"
                        >
                          {(() => {
                            const sourceList =
                              dbKitchenEssentials.length > 0
                                ? dbKitchenEssentials
                                : MASTER_KITCHEN_ESSENTIALS;
                            const query = kitchenEssentialSearch.toLowerCase().trim();
                            // Don't suggest an essential that's already a measured
                            // ingredient — the two lists must stay distinct.
                            const ingredientNamesLower = new Set(
                              ingredients
                                .map((i) => i.name.trim().toLowerCase())
                                .filter(Boolean),
                            );
                            const suggestions = fuzzySearchIngredients(
                              query,
                              sourceList,
                            )
                              .filter(
                                (s: any) => !ingredientNamesLower.has(s.name.toLowerCase()),
                              )
                              .slice(0, 6);

                            return suggestions.length > 0 ? (
                              <View className="flex-row flex-wrap gap-x-2.5 gap-y-3.5 justify-center mt-2 p-2">
                                {suggestions.map((sug) => (
                                  <Pressable
                                    key={sug.name}
                                    onPress={() => {
                                      Keyboard.dismiss();
                                      if (!kitchenEssentials.includes(sug.name)) {
                                        setKitchenEssentials([...kitchenEssentials, sug.name]);
                                      }
                                      setKitchenEssentialSearch("");
                                      setShowKitchenEssentialSuggestions(false);
                                    }}
                                    style={({ pressed }) => ({
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: 68,
                                      opacity: pressed ? 0.6 : 1,
                                    })}
                                  >
                                    <View className="w-16 h-16 rounded-full bg-[#F5E3D8]/45 border border-[#F5E3D8]/30 items-center justify-center mb-1.5 shadow-sm">
                                      <Image
                                        source={{ uri: sug.icon_url }}
                                        style={{ width: 44, height: 44 }}
                                        contentFit="contain"
                                      />
                                    </View>
                                    <Text
                                      className="font-inter-medium text-[9px] text-[#5C544A] text-center"
                                      numberOfLines={1}
                                    >
                                      {sug.name}
                                    </Text>
                                  </Pressable>
                                ))}
                              </View>
                            ) : (
                              <Text className="font-jakarta text-[#8B7D6F] text-sm text-center py-4">
                                No matching essential found.
                              </Text>
                            );
                          })()}
                        </ScrollView>
                      </View>
                    )}
                </View>
              </View>
            </View>
          )}

          {/* STEP 4: Directions list */}
          {currentStep === 4 && (
            <View className="pb-24 px-6 pt-3">
              {/* Step Header Row */}
              <View className="flex-row items-center justify-between mb-8 mt-2">
                {/* Text Column (65% width) */}
                <View style={{ width: "65%" }}>
                  <Text className="font-jakarta-bold text-[#3B3328] text-[32px] tracking-tight mb-2">
                    Directions
                  </Text>
                  <Text className="font-inter-medium text-[#5C544A] text-xs leading-4">
                    Step-by-step instructions guiding users on how to prepare
                    this dish.
                  </Text>
                </View>

                {/* Image Column (30% width) with Egg Shape Background */}
                <View
                  style={{ width: "30%" }}
                  className="items-center justify-center relative aspect-square"
                >
                  {/* Egg shaped background shape */}
                  <View
                    pointerEvents="none"
                    className="absolute bg-[#F5E3D8]/45 rounded-full"
                    style={{
                      width: "150%",
                      height: "150%",
                      borderTopLeftRadius: 120,
                      borderTopRightRadius: 75,
                      borderBottomLeftRadius: 85,
                      borderBottomRightRadius: 65,
                      transform: [{ scaleX: 1.1 }],
                      zIndex: -1,
                    }}
                  />
                  {/* Step Image */}
                  <Image
                    source={require("@/assets/icons/Step4_Directions.webp")}
                    style={{ width: "85%", height: "85%" }}
                    contentFit="contain"
                  />
                </View>
              </View>

              {(() => {
                // Dedupe by name — linking is by name, so duplicate ingredient
                // names (e.g. two "Chicken" rows) must not produce duplicate keys.
                const validIngredients = Array.from(
                  new Set(
                    ingredients
                      .map((ing) => ing.name.trim())
                      .filter((name) => name.length > 0),
                  ),
                );

                return steps.map((item, index) => (
                  <View
                    key={index}
                    className="bg-[#F5E3D8]/10 border border-[#F5E3D8]/30 rounded-3xl p-5 mb-5 shadow-sm"
                  >
                    {/* Step Card Header Row */}
                    <View className="flex-row items-center justify-between mb-4">
                      <View className="flex-row items-center">
                        {/* Step Number Badge */}
                        <View className="w-8 h-8 rounded-full bg-[#FBA82E] items-center justify-center mr-3 shadow-sm">
                          <Text className="font-jakarta-bold text-white text-xs">
                            {item.step}
                          </Text>
                        </View>

                        {/* Run in parallel checkbox (for steps > 1) */}
                        {index > 0 && (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() =>
                              handleUpdateStep(
                                index,
                                "parallel",
                                !item.parallel,
                              )
                            }
                            className="flex-row items-center"
                          >
                            <Ionicons
                              name={
                                item.parallel ? "checkbox" : "square-outline"
                              }
                              size={16}
                              color={item.parallel ? "#FBA82E" : "#8B7D6F"}
                              style={{ marginRight: 6 }}
                            />
                            <Text className="font-inter-medium text-xs text-[#5C544A]">
                              Run in parallel with previous step
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Delete Button */}
                      <TouchableOpacity
                        onPress={() => handleRemoveStep(index)}
                        className="w-8 h-8 rounded-full bg-[#E05252]/10 border border-[#E05252]/20 items-center justify-center"
                      >
                        <Feather name="trash-2" size={14} color="#E05252" />
                      </TouchableOpacity>
                    </View>

                    {/* Action Dropdown Selector */}
                    <View className="mb-4">
                      <Text className="font-jakarta-semibold text-xs text-[#8B7D6F] mb-1.5">
                        Action Type
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setActiveStepActionPickerIndex(index)}
                        className="bg-white border border-[#F5E3D8]/45 rounded-full px-4 py-2.5 flex-row justify-between items-center shadow-sm"
                      >
                        <Text className="font-jakarta-medium text-[#3B3328] text-sm">
                          {item.action || "Mix"}
                        </Text>
                        <Feather
                          name="chevron-down"
                          size={16}
                          color="#8B7D6F"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Instruction text area */}
                    <View className="mb-4">
                      <Text className="font-jakarta-semibold text-xs text-[#8B7D6F] mb-1.5">
                        Instructions
                      </Text>
                      <TextInput
                        value={item.instruction}
                        onChangeText={(val) =>
                          handleUpdateStep(index, "instruction", val)
                        }
                        placeholder={`e.g. Mix the ingredients together...`}
                        placeholderTextColor="#A89E92"
                        multiline
                        numberOfLines={3}
                        className="bg-white rounded-2xl p-4 border border-[#F5E3D8]/45 font-jakarta-medium text-[#3B3328] text-sm shadow-sm"
                        textAlignVertical="top"
                        style={{ minHeight: 80 }}
                      />
                    </View>

                    {/* Set Video Clip Button (Only if link is verified) */}
                    {isVideoVerified && (
                      <View className="mb-4">
                        <Text className="font-jakarta-semibold text-xs text-[#8B7D6F] mb-1.5">
                          Video Clip Setup
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => openTrimmerForStep(index)}
                          className={cn(
                            "flex-row items-center border rounded-full py-2.5 px-4 self-start",
                            item.video_start_time !== undefined
                              ? "bg-primary/10 border-primary"
                              : "border-[#FBA82E]/35 bg-[#F5E3D8]/10",
                          )}
                        >
                          <Feather
                            name="video"
                            size={14}
                            color="#FBA82E"
                            style={{ marginRight: 6 }}
                          />
                          <Text className="font-jakarta-bold text-primary text-xs">
                            {item.video_start_time !== undefined
                              ? `Clip Set: ${Math.floor(item.video_start_time / 60)}m ${item.video_start_time % 60}s - ${Math.floor(item.video_end_time! / 60)}m ${item.video_end_time! % 60}s`
                              : "Set Video Clip"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Link Ingredients Selector */}
                    <View className="mb-4">
                      <Text className="font-jakarta-semibold text-xs text-[#8B7D6F] mb-2">
                        Link Ingredients
                      </Text>
                      {validIngredients.length > 0 ? (
                        <View className="flex-row flex-wrap mt-1">
                          {validIngredients.map((ingName) => {
                            const isLinked =
                              item.linkedIngredients?.includes(ingName);
                            return (
                              <TouchableOpacity
                                key={ingName}
                                activeOpacity={0.8}
                                onPress={() => {
                                  const currentLinked =
                                    item.linkedIngredients || [];
                                  const nextLinked = currentLinked.includes(
                                    ingName,
                                  )
                                    ? currentLinked.filter(
                                        (name) => name !== ingName,
                                      )
                                    : [...currentLinked, ingName];
                                  handleUpdateStep(
                                    index,
                                    "linkedIngredients",
                                    nextLinked,
                                  );
                                }}
                                className={cn(
                                  "flex-row items-center px-4 py-2 rounded-full mr-2.5 mb-2.5 border",
                                  isLinked
                                    ? "bg-[#FBA82E] border-transparent"
                                    : "bg-[#F5E3D8]/10 border-[#F5E3D8]/45",
                                )}
                              >
                                <Feather
                                  name={isLinked ? "check" : "plus"}
                                  size={12}
                                  color={isLinked ? "#FFFFFF" : "#8B7D6F"}
                                  style={{ marginRight: 6 }}
                                />
                                <Text
                                  className={cn(
                                    "font-inter-semibold text-xs",
                                    isLinked ? "text-white" : "text-[#8B7D6F]",
                                  )}
                                >
                                  {ingName}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        <Text className="font-inter-regular text-xs text-[#A89E92] italic">
                          Add ingredients in Step 3 to link them here.
                        </Text>
                      )}
                    </View>

                    {/* Heat Setting — only for heat-based actions (Bake/Cook/Fry/Boil) */}
                    {HEAT_ACTIONS.includes(item.action ?? "") && (
                    <View className="mb-4">
                      <Text className="font-jakarta-semibold text-xs text-[#8B7D6F] mb-2">
                        Heat Setting
                      </Text>
                      <View className="flex-row gap-2.5">
                        {(["Low", "Medium", "High"] as const).map((level) => {
                          const isActive = item.heatSetting === level;
                          return (
                            <TouchableOpacity
                              key={level}
                              activeOpacity={0.8}
                              onPress={() => {
                                handleUpdateStep(
                                  index,
                                  "heatSetting",
                                  isActive ? null : level,
                                );
                              }}
                              className={cn(
                                "flex-1 py-2.5 rounded-full items-center justify-center border",
                                isActive
                                  ? "bg-[#FBA82E] border-transparent"
                                  : "bg-[#F5E3D8]/10 border-[#F5E3D8]/30",
                              )}
                            >
                              <Text
                                className={cn(
                                  "font-jakarta-semibold text-xs",
                                  isActive ? "text-white" : "text-[#8B7D6F]",
                                )}
                              >
                                {level}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                    )}

                    {/* Timer attaching/details */}
                    <View>
                      {!item.hasTimer ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() =>
                            handleUpdateStep(index, "hasTimer", true)
                          }
                          className="flex-row items-center border border-[#FBA82E]/35 bg-[#F5E3D8]/10 rounded-full py-2.5 px-4 self-start mt-2"
                        >
                          <Feather
                            name="clock"
                            size={14}
                            color="#FBA82E"
                            style={{ marginRight: 6 }}
                          />
                          <Text className="font-jakarta-bold text-primary text-xs">
                            Attach Active Timer
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View className="bg-white border border-[#F5E3D8]/30 rounded-2xl p-4 mt-2 relative shadow-sm">
                          <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center">
                              <Feather
                                name="clock"
                                size={14}
                                color="#FBA82E"
                                style={{ marginRight: 6 }}
                              />
                              <Text className="font-jakarta-semibold text-xs text-[#3B3328]">
                                Timer Configuration
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                handleUpdateStep(index, "hasTimer", false);
                                handleUpdateStep(
                                  index,
                                  "timerType",
                                  "countdown",
                                );
                                handleUpdateStep(index, "timerHours", "");
                                handleUpdateStep(index, "timerMinutes", "");
                                handleUpdateStep(index, "targetTime", "");
                                handleUpdateStep(
                                  index,
                                  "leaveOvernight",
                                  false,
                                );
                              }}
                              className="w-5 h-5 rounded-full bg-white border border-[#F5E3D8]/30 items-center justify-center shadow-sm"
                            >
                              <Feather name="x" size={12} color="#E05252" />
                            </TouchableOpacity>
                          </View>

                          {/* Timer Type Segments */}
                          <View className="bg-[#F5E3D8]/20 p-1 rounded-full flex-row mb-4">
                            {(["countdown", "target"] as const).map((type) => {
                              const isActive = item.timerType === type;
                              return (
                                <TouchableOpacity
                                  key={type}
                                  activeOpacity={0.8}
                                  onPress={() =>
                                    handleUpdateStep(index, "timerType", type)
                                  }
                                  className={cn(
                                    "flex-1 py-2 items-center justify-center rounded-full",
                                    isActive ? "bg-[#FBA82E]" : "",
                                  )}
                                >
                                  <Text
                                    className={cn(
                                      "font-jakarta-bold text-[10px] capitalize",
                                      isActive
                                        ? "text-white"
                                        : "text-[#8B7D6F]",
                                    )}
                                  >
                                    {type === "countdown"
                                      ? "Countdown"
                                      : "Target / Overnight"}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          {/* Timer Settings Input depending on type */}
                          {item.timerType === "countdown" ? (
                            <View className="flex-row gap-3 items-center">
                              <View className="flex-1 bg-white border border-[#F5E3D8]/40 rounded-full px-3 py-1 flex-row items-center justify-between">
                                <TextInput
                                  keyboardType="number-pad"
                                  value={item.timerHours || ""}
                                  onChangeText={(val) => {
                                    const cleaned = val.replace(/[^0-9]/g, "");
                                    handleUpdateStep(
                                      index,
                                      "timerHours",
                                      cleaned,
                                    );
                                  }}
                                  placeholder="0"
                                  placeholderTextColor="#A89E92"
                                  className="flex-1 font-jakarta-medium text-[#3B3328] text-center text-xs py-1.5"
                                />
                                <Text className="font-inter-semibold text-[10px] text-[#8B7D6F] ml-2">
                                  hours
                                </Text>
                              </View>
                              <View className="flex-1 bg-white border border-[#F5E3D8]/40 rounded-full px-3 py-1 flex-row items-center justify-between">
                                <TextInput
                                  keyboardType="number-pad"
                                  value={item.timerMinutes || ""}
                                  onChangeText={(val) => {
                                    const cleaned = val.replace(/[^0-9]/g, "");
                                    handleUpdateStep(
                                      index,
                                      "timerMinutes",
                                      cleaned,
                                    );
                                  }}
                                  placeholder="0"
                                  placeholderTextColor="#A89E92"
                                  className="flex-1 font-jakarta-medium text-[#3B3328] text-center text-xs py-1.5"
                                />
                                <Text className="font-inter-semibold text-[10px] text-[#8B7D6F] ml-2">
                                  minutes
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View className="flex-row items-center justify-between">
                              <View className="flex-[1.5] bg-white border border-[#F5E3D8]/40 rounded-full px-4 py-1.5 flex-row items-center">
                                <TextInput
                                  value={item.targetTime || ""}
                                  onChangeText={(val) =>
                                    handleUpdateStep(index, "targetTime", val)
                                  }
                                  placeholder="e.g. 6:00 PM"
                                  placeholderTextColor="#A89E92"
                                  className="flex-1 font-jakarta-medium text-[#3B3328] text-xs py-1"
                                />
                              </View>
                              {/* Overnight — only meaningful for Marinate steps */}
                              {item.action === "Marinate" && (
                                <TouchableOpacity
                                  activeOpacity={0.8}
                                  onPress={() =>
                                    handleUpdateStep(
                                      index,
                                      "leaveOvernight",
                                      !item.leaveOvernight,
                                    )
                                  }
                                  className="flex-1 flex-row items-center justify-end pl-2"
                                >
                                  <Ionicons
                                    name={
                                      item.leaveOvernight
                                        ? "checkbox"
                                        : "square-outline"
                                    }
                                    size={18}
                                    color={
                                      item.leaveOvernight ? "#FBA82E" : "#8B7D6F"
                                    }
                                    style={{ marginRight: 6 }}
                                  />
                                  <Text className="font-inter-medium text-[10px] text-[#5C544A]">
                                    Leave Overnight
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                ));
              })()}

              <TouchableOpacity
                onPress={handleAddStep}
                className="w-full py-4 bg-[#F5E3D8]/30 rounded-2xl items-center justify-center border border-dashed border-[#FBA82E]/35 mt-2"
              >
                <View className="flex-row items-center">
                  <Feather name="plus" size={16} color="#FBA82E" />
                  <Text className="font-jakarta-bold text-primary text-sm ml-2">
                    Add Step
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 5: Review & Publish summary */}
          {currentStep === 5 && (
            <View className="pb-28 px-6 pt-3">
              {/* Step Header Row */}
              <View className="flex-row items-center justify-between mb-8 mt-2">
                {/* Text Column (65% width) */}
                <View style={{ width: "65%" }}>
                  <Text className="font-jakarta-bold text-[#3B3328] text-[32px] tracking-tight mb-2">
                    Review
                  </Text>
                  <Text className="font-inter-medium text-[#5C544A] text-xs leading-4">
                    Make sure everything looks right before publishing your
                    recipe.
                  </Text>
                </View>

                {/* Image Column (30% width) with Egg Shape Background */}
                <View
                  style={{ width: "30%" }}
                  className="items-center justify-center relative aspect-square"
                >
                  {/* Egg shaped background shape */}
                  <View
                    pointerEvents="none"
                    className="absolute bg-[#F5E3D8]/45 rounded-full"
                    style={{
                      width: "150%",
                      height: "150%",
                      borderTopLeftRadius: 120,
                      borderTopRightRadius: 75,
                      borderBottomLeftRadius: 85,
                      borderBottomRightRadius: 65,
                      transform: [{ scaleX: 1.1 }],
                      zIndex: -1,
                    }}
                  />
                  {/* Step Image */}
                  <Image
                    source={require("@/assets/icons/Review.webp")}
                    style={{ width: "85%", height: "85%" }}
                    contentFit="contain"
                  />
                </View>
              </View>

              {/* Recipe Cover Preview */}
              {(isVideoVerified || imageUris.length > 0) && (
                <View 
                  className="w-full aspect-[16/9] rounded-3xl overflow-hidden mb-6 shadow-sm border border-[#F5E3D8]/30 bg-gray-50 relative"
                  onLayout={(e) => setReviewCarouselWidth(e.nativeEvent.layout.width)}
                >
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    className="w-full h-full"
                    onScroll={(event) => {
                      const slideSize = event.nativeEvent.layoutMeasurement.width;
                      const index = event.nativeEvent.contentOffset.x / slideSize;
                      const roundIndex = Math.round(index);
                      if (reviewActiveImageIndex !== roundIndex) {
                        setReviewActiveImageIndex(roundIndex);
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {/* Slide 0: Video (if exists) */}
                    {isVideoVerified && videoUrl && (
                      <View style={{ width: reviewCarouselWidth }} className="h-full bg-black">
                        <YoutubePlayer
                          width={reviewCarouselWidth}
                          height={(reviewCarouselWidth * 9) / 16}
                          play={reviewActiveImageIndex === 0}
                          videoId={getYoutubeId(videoUrl) || ""}
                          mute
                          initialPlayerParams={{
                            controls: false,
                            loop: true,
                            mute: true, // required for reliable autoplay in the webview
                            start: previewStartTime,
                            end: previewStartTime + previewDuration,
                          }}
                        />
                      </View>
                    )}

                    {/* Image Slides */}
                    {imageUris.map((uri, index) => (
                      <View key={index} style={{ width: reviewCarouselWidth }} className="h-full relative bg-gray-50 items-center justify-center">
                        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                      </View>
                    ))}
                  </ScrollView>



                  {/* Pagination Dots */}
                  {((isVideoVerified ? 1 : 0) + imageUris.length) > 1 && (
                    <View className="absolute bottom-4 left-0 right-0 flex-row justify-center items-center gap-1.5 z-10 pointer-events-none">
                      {Array.from({ length: (isVideoVerified ? 1 : 0) + imageUris.length }).map((_, index) => (
                        <View
                          key={index}
                          className="h-1.5 rounded-full"
                          style={{
                            width: reviewActiveImageIndex === index ? 16 : 6,
                            backgroundColor: reviewActiveImageIndex === index ? "#FBA82E" : "rgba(255,255,255,0.5)",
                          }}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* General Summary Card */}
              <View className="bg-white rounded-3xl p-5 border border-[#F5E3D8]/30 mb-6 shadow-sm">
                <Text className="font-jakarta-bold text-[#3B3328] text-xl mb-2">
                  {title}
                </Text>
                {description ? (
                  <Text className="font-inter-regular text-text-secondary text-sm mb-4 leading-5">
                    {description}
                  </Text>
                ) : null}

                <View className="flex-row border-t border-gray-100 pt-4 justify-between">
                  <View className="items-center flex-1">
                    <Feather name="clock" size={15} color="#FBA82E" />
                    <Text
                      className="font-jakarta-bold text-[#3B3328] text-xs mt-1"
                      numberOfLines={1}
                    >
                      {prepTime} Min
                    </Text>
                    <Text className="font-inter-medium text-[9px] text-[#8B7D6F]">
                      Prep Time
                    </Text>
                  </View>
                  <View className="items-center flex-1 border-l border-gray-100">
                    <Feather name="play" size={15} color="#FBA82E" />
                    <Text
                      className="font-jakarta-bold text-[#3B3328] text-xs mt-1"
                      numberOfLines={1}
                    >
                      {cookTime} Min
                    </Text>
                    <Text className="font-inter-medium text-[9px] text-[#8B7D6F]">
                      Cook Time
                    </Text>
                  </View>
                  <View className="items-center flex-1 border-l border-gray-100">
                    <Ionicons name="people-outline" size={15} color="#FBA82E" />
                    <Text
                      className="font-jakarta-bold text-[#3B3328] text-xs mt-1"
                      numberOfLines={1}
                    >
                      {servings} Pcs
                    </Text>
                    <Text className="font-inter-medium text-[9px] text-[#8B7D6F]">
                      Servings
                    </Text>
                  </View>
                  <View className="items-center flex-1 border-l border-gray-100">
                    <Ionicons
                      name="restaurant-outline"
                      size={15}
                      color="#FBA82E"
                    />
                    <Text
                      className="font-jakarta-bold text-[#3B3328] text-xs mt-1"
                      numberOfLines={1}
                    >
                      {cuisineTag || "General"}
                    </Text>
                    <Text className="font-inter-medium text-[9px] text-[#8B7D6F]">
                      Cuisine
                    </Text>
                  </View>
                </View>
              </View>

              {/* Items Count Summary Row */}
              <View className="flex-row gap-3 mb-6">
                <View className="flex-1 bg-[#F5E3D8]/30 rounded-2xl p-4 border border-[#F5E3D8]/40 items-center">
                  <Text className="font-jakarta-extrabold text-[#3B3328] text-base">
                    {ingredients.filter((i) => i.name.trim()).length}
                  </Text>
                  <Text className="font-inter-medium text-[10px] text-[#8B7D6F] mt-0.5">
                    Ingredients
                  </Text>
                </View>
                <View className="flex-1 bg-[#F5E3D8]/30 rounded-2xl p-4 border border-[#F5E3D8]/40 items-center">
                  <Text className="font-jakarta-extrabold text-[#3B3328] text-base">
                    {kitchenEssentials.filter((a) => a.trim()).length}
                  </Text>
                  <Text className="font-inter-medium text-[10px] text-[#8B7D6F] mt-0.5">
                    Essentials
                  </Text>
                </View>
                <View className="flex-1 bg-[#F5E3D8]/30 rounded-2xl p-4 border border-[#F5E3D8]/40 items-center">
                  <Text className="font-jakarta-extrabold text-[#3B3328] text-base">
                    {steps.filter((s) => s.instruction.trim()).length}
                  </Text>
                  <Text className="font-inter-medium text-[10px] text-[#8B7D6F] mt-0.5">
                    Steps
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Pinned Bottom Navigation */}
        <View
          className="absolute bottom-0 left-0 right-0 bg-[#FFFDF5] border-t border-gray-100 pt-3 px-6"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          {/* Intermediate Connected Progress Line */}
          <View className="mb-4">
            <View className="h-1 bg-[#F5E3D8]/40 rounded-full overflow-hidden">
              <View
                className="h-full bg-[#FBA82E] rounded-full"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </View>
          </View>

          <View className="flex-row gap-4 items-center">
            {currentStep > 1 ? (
              <TouchableOpacity
                onPress={handleBack}
                disabled={isSubmitting}
                activeOpacity={0.8}
                className="w-14 h-14 bg-[#F5E3D8]/30 rounded-full items-center justify-center"
              >
                <Feather name="chevron-left" size={20} color="#8B7D6F" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={currentStep < 5 ? handleNext : handlePublish}
              disabled={isSubmitting}
              activeOpacity={0.8}
              className="flex-1 h-14 bg-[#FBA82E] rounded-full items-center justify-center shadow flex-row gap-2"
            >
              <Text className="font-jakarta-bold text-white text-base">
                {currentStep < 5 ? "Next" : editId ? "Save Changes" : "Publish Recipe"}
              </Text>
              {currentStep < 5 && (
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </>
    )}
  </KeyboardAvoidingView>

      {/* Full-screen Loading Overlay for publication */}
      {isSubmitting && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center z-50 backdrop-blur-sm">
          <View className="bg-white/95 p-8 rounded-[32px] items-center shadow-2xl w-[260px] border border-white/50">
            <CookingLoader scale={0.9} />
            <Animated.View style={{ opacity: fadeAnim }} className="items-center mt-4">
              <Text className="font-jakarta-bold text-[#3B3328] text-base text-center">
                {SUBMIT_MESSAGES[submitMessageIndex]}
              </Text>
              <Text className="font-inter-regular text-text-secondary text-xs mt-1 text-center">
                {editId ? "Please wait while we update your recipe." : "Please wait while we publish your recipe."}
              </Text>
            </Animated.View>
          </View>
        </View>
      )}

      {/* Cuisine Tag Dropdown Modal */}
      <DropdownPickerModal
        visible={isCuisinePickerVisible}
        onClose={() => setIsCuisinePickerVisible(false)}
        options={CUISINE_TAGS}
        selectedValue={cuisineTag}
        onSelect={setCuisineTag}
        title="Select Cuisine Tag"
      />

      {/* Dish Category Dropdown Modal */}
      <DropdownPickerModal
        visible={isCategoryPickerVisible}
        onClose={() => setIsCategoryPickerVisible(false)}
        options={DISH_CATEGORIES}
        selectedValue={dishCategory}
        onSelect={setDishCategory}
        title="Select Dish Category"
      />

      {/* Step Trimming Modal */}
      {trimmingStepIndex !== null && (
        <Modal
          visible={trimmingStepIndex !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setTrimmingStepIndex(null)}
        >
          <View className="flex-1 bg-black/60 justify-end">
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setTrimmingStepIndex(null)}
              className="flex-1"
            />
            <View
              className="bg-[#FFFDF5] rounded-t-[32px] p-6 border-t border-[#F5E3D8]/50 shadow-lg"
              style={{ paddingBottom: Math.max(insets.bottom, 24) }}
            >
              {/* Modal Header */}
              <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <View>
                  <Text className="font-jakarta-bold text-lg text-[#3B3328]">
                    Map Technique Clip
                  </Text>
                  <Text className="font-inter-regular text-xs text-[#8B7D6F] mt-0.5">
                    Trim the exact moment for "Step {trimmingStepIndex + 1}"
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setTrimmingStepIndex(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Feather name="x" size={16} color="#3B3328" />
                </TouchableOpacity>
              </View>

              {/* YouTube Player */}
              <View className="w-full aspect-[16/9] rounded-2xl overflow-hidden bg-black mb-4 relative">
                <YoutubePlayer
                  height={(SCREEN_WIDTH * 9) / 16}
                  play={true}
                  videoId={getYoutubeId(videoUrl)!}
                  initialPlayerParams={{
                    controls: true,
                    loop: true,
                    start: stepStartTime,
                    end: stepEndTime,
                  }}
                />
                <View className="absolute top-3 left-3 bg-[#4CAF50] px-3 py-1 rounded-full shadow-sm">
                  <Text className="text-white text-[9px] font-jakarta-bold uppercase">
                    Verified Technique
                  </Text>
                </View>
              </View>

              {/* Time display */}
              <View className="flex-row justify-between items-center mb-4 px-2">
                <Text className="font-inter-medium text-xs text-[#8B7D6F]">
                  Start: {Math.floor(stepStartTime / 60)}m {stepStartTime % 60}s
                </Text>
                <Text className="font-jakarta-bold text-primary text-sm">
                  Duration: {stepEndTime - stepStartTime}s
                </Text>
                <Text className="font-inter-medium text-xs text-[#8B7D6F]">
                  End: {Math.floor(stepEndTime / 60)}m {stepEndTime % 60}s
                </Text>
              </View>

              {/* Range sliders / controls */}
              <View className="bg-[#FAF5EF] rounded-2xl p-4 border border-[#F5E3D8]/30 mb-6">
                {/* Start Time control */}
                <View className="mb-4">
                  <Text className="font-jakarta-semibold text-xs text-[#3B3328] mb-2">
                    Adjust Start Time
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() =>
                        setStepStartTime((s) => Math.max(0, s - 10))
                      }
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-md active:bg-gray-100"
                    >
                      <Text className="font-jakarta-bold text-xs text-text">
                        -10s
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setStepStartTime((s) => Math.max(0, s - 1))
                      }
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-md active:bg-gray-100"
                    >
                      <Text className="font-jakarta-bold text-xs text-text">
                        -1s
                      </Text>
                    </TouchableOpacity>
                    <View className="flex-1 bg-white border border-gray-200 rounded-md py-1 items-center justify-center">
                      <Text className="font-jakarta-bold text-sm text-[#3B3328]">
                        {Math.floor(stepStartTime / 60)}m {stepStartTime % 60}s
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        setStepStartTime((s) =>
                          Math.min(stepEndTime - 1, s + 1),
                        )
                      }
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-md active:bg-gray-100"
                    >
                      <Text className="font-jakarta-bold text-xs text-text">
                        +1s
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setStepStartTime((s) =>
                          Math.min(stepEndTime - 5, s + 10),
                        )
                      }
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-md active:bg-gray-100"
                    >
                      <Text className="font-jakarta-bold text-xs text-text">
                        +10s
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* End Time control */}
                <View>
                  <Text className="font-jakarta-semibold text-xs text-[#3B3328] mb-2">
                    Adjust End Time
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() =>
                        setStepEndTime((e) =>
                          Math.max(stepStartTime + 1, e - 10),
                        )
                      }
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-md active:bg-gray-100"
                    >
                      <Text className="font-jakarta-bold text-xs text-text">
                        -10s
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setStepEndTime((e) =>
                          Math.max(stepStartTime + 1, e - 1),
                        )
                      }
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-md active:bg-gray-100"
                    >
                      <Text className="font-jakarta-bold text-xs text-text">
                        -1s
                      </Text>
                    </TouchableOpacity>
                    <View className="flex-1 bg-white border border-gray-200 rounded-md py-1 items-center justify-center">
                      <Text className="font-jakarta-bold text-sm text-[#3B3328]">
                        {Math.floor(stepEndTime / 60)}m {stepEndTime % 60}s
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setStepEndTime((e) => e + 1)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-md active:bg-gray-100"
                    >
                      <Text className="font-jakarta-bold text-xs text-text">
                        +1s
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setStepEndTime((e) => e + 10)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-md active:bg-gray-100"
                    >
                      <Text className="font-jakarta-bold text-xs text-text">
                        +10s
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-4">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setTrimmingStepIndex(null)}
                  className="flex-1 py-4 border border-gray-200 rounded-2xl bg-white items-center justify-center"
                >
                  <Text className="font-jakarta-bold text-text text-sm">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    handleUpdateStep(
                      trimmingStepIndex,
                      "video_start_time",
                      stepStartTime,
                    );
                    handleUpdateStep(
                      trimmingStepIndex,
                      "video_end_time",
                      stepEndTime,
                    );
                    setTrimmingStepIndex(null);
                  }}
                  className="flex-1 py-4 bg-[#FBA82E] rounded-2xl items-center justify-center"
                >
                  <Text className="font-jakarta-bold text-white text-sm">
                    Confirm Selection
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Live Preview Modal */}
      <Modal
        visible={isLivePreviewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLivePreviewModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsLivePreviewModalVisible(false)}
            className="flex-1"
          />
          <View
            className="bg-[#FFFDF5] rounded-t-[32px] p-6 border-t border-[#F5E3D8]/50 shadow-lg"
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <View>
                <Text className="font-jakarta-bold text-lg text-[#3B3328]">
                  Recipe Trailer Preview
                </Text>
                <Text className="font-inter-regular text-xs text-[#8B7D6F] mt-0.5">
                  Looping {tempDuration}s preview clip
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsLivePreviewModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={16} color="#3B3328" />
              </TouchableOpacity>
            </View>

            {/* YouTube Player */}
            <View className="w-full aspect-[16/9] rounded-2xl overflow-hidden bg-black mb-2 relative">
              {isLivePreviewModalVisible && (
                <YoutubePlayer
                  height={(SCREEN_WIDTH * 9) / 16}
                  play={isPlayerPlaying}
                  mute={true}
                  videoId={getYoutubeId(videoUrl)!}
                  initialPlayerParams={{
                    controls: 0,
                    rel: 0,
                    modestbranding: 1,
                    autoplay: 1,
                    start: tempStartTime,
                  }}
                  ref={playerPreviewRef}
                />
              )}
            </View>

            {/* Time display */}
            <View className="flex-row justify-between items-center mb-4 px-2">
              <Text className="font-inter-medium text-xs text-[#8B7D6F]">
                Start: {Math.floor(tempStartTime / 60)}m {tempStartTime % 60}s
              </Text>
              <Text className="font-jakarta-bold text-primary text-sm">
                Duration: {tempDuration}s
              </Text>
              <Text className="font-inter-medium text-xs text-[#8B7D6F]">
                End: {Math.floor((tempStartTime + tempDuration) / 60)}m{" "}
                {(tempStartTime + tempDuration) % 60}s
              </Text>
            </View>

            {/* Duration Selection Chips */}
            <View className="mb-5 px-1">
              <Text className="font-jakarta-bold text-[#3B3328] text-xs mb-2">
                Clip Duration
              </Text>
              <View className="flex-row items-center gap-2">
                {[10, 15, 20, 25, 30].map((d) => {
                  const isSelected = tempDuration === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => {
                        setTempDuration(d);
                        // Auto-adjust tempStartTime if it violates limits
                        const maxStart = videoDuration - d;
                        if (tempStartTime > maxStart) {
                          setTempStartTime(Math.max(0, Math.round(maxStart)));
                        }
                      }}
                      className={cn(
                        "w-9 h-9 rounded-full items-center justify-center border",
                        isSelected
                          ? "bg-primary border-transparent"
                          : "bg-white border-gray-200",
                      )}
                    >
                      <Text
                        className={cn(
                          "font-jakarta-bold text-[11px]",
                          isSelected ? "text-white" : "text-text",
                        )}
                      >
                        {d}s
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* CapCut Timeline Slider inside the modal for real-time preview seeking */}
            <CapCutTimelineSlider
              videoDuration={videoDuration}
              previewDuration={tempDuration}
              startTime={tempStartTime}
              onStartTimeChange={setTempStartTime}
              onSliding={(time) => {
                playerPreviewRef.current?.seekTo(time, true);
              }}
            />

            {/* Footer Actions */}
            <View className="flex-row gap-4 mt-2">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsLivePreviewModalVisible(false)}
                className="flex-1 py-4 border border-gray-200 rounded-2xl bg-white items-center justify-center"
              >
                <Text className="font-jakarta-bold text-text text-sm">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setPreviewStartTime(tempStartTime);
                  setPreviewDuration(tempDuration);
                  setIsLivePreviewModalVisible(false);
                }}
                className="flex-1 py-4 bg-[#FBA82E] rounded-2xl items-center justify-center shadow-sm"
              >
                <Text className="font-jakarta-bold text-white text-sm">
                  Save & Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unit Dropdown Modal */}
      {activeUnitPickerIndex !== null && (
        <DropdownPickerModal
          visible={activeUnitPickerIndex !== null}
          onClose={() => setActiveUnitPickerIndex(null)}
          options={
            ALLOWED_UNITS[
              (ingredients[activeUnitPickerIndex]
                ?.category as keyof typeof ALLOWED_UNITS) || "solid"
            ]
          }
          selectedValue={ingredients[activeUnitPickerIndex]?.unit}
          onSelect={(val) => {
            handleUpdateIngredient(activeUnitPickerIndex, "unit", val);
          }}
          title="Select Unit"
        />
      )}

      {/* Action Type Dropdown Modal */}
      {activeStepActionPickerIndex !== null && (
        <DropdownPickerModal
          visible={activeStepActionPickerIndex !== null}
          onClose={() => setActiveStepActionPickerIndex(null)}
          options={[
            "Mix",
            "Marinate",
            "Bake",
            "Cook",
            "Chop",
            "Fry",
            "Boil",
            "Garnish",
            "Serve",
            "Other",
          ]}
          selectedValue={steps[activeStepActionPickerIndex]?.action || "Mix"}
          onSelect={(val) => {
            const idx = activeStepActionPickerIndex;
            handleUpdateStep(idx, "action", val);
            // Clear settings that no longer apply to the chosen action.
            if (!HEAT_ACTIONS.includes(val)) handleUpdateStep(idx, "heatSetting", null);
            if (val !== "Marinate") handleUpdateStep(idx, "leaveOvernight", false);
          }}
          title="Select Action Type"
        />
      )}

      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View className="flex-1 bg-black/40 justify-center items-center px-6 backdrop-blur-sm">
            <View className="bg-white/95 w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative overflow-hidden items-center border border-white/50">
              {/* Confetti Animation (Lottie) instead of thumb icon and green tick */}
              <View className="w-full h-32 mb-6 items-center justify-center relative overflow-hidden">
                <LottieView
                  source={require("@/assets/lottie_animations/b9469846-1189-11ee-812a-a3c1a34e59c4.lottie")}
                  autoPlay
                  loop
                  style={{
                    width: 140,
                    height: 140,
                  }}
                />
              </View>

              <Text className="font-jakarta-bold text-[#3B3328] text-2xl mb-2 text-center">
                {editId ? "Recipe Updated!" : "Recipe Published!"}
              </Text>

              <Text className="font-inter-regular text-[#8B7D6F] text-sm mb-8 text-center leading-5 px-2">
                {editId ? "Your edits have been saved successfully." : `Your "${title}" is now live. The community is going to love this!`}
              </Text>

              {/* Actions */}
              <View className="w-full gap-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowSuccessModal(false);
                    const targetId = publishedRecipeId || editId;
                    if (targetId) {
                      router.replace({
                        pathname: "/recipe-detail",
                        params: { id: targetId },
                      });
                    } else {
                      router.replace("/(tabs)");
                    }
                  }}
                  className="w-full py-3.5 bg-[#FBA82E] rounded-full items-center justify-center shadow-md active:scale-95"
                >
                  <Text className="text-white font-jakarta-bold text-sm">
                    View Recipe
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.replace("/(tabs)");
                  }}
                  className="w-full py-3.5 bg-[#F5E3D8]/30 border border-[#FBA82E]/30 rounded-full items-center justify-center active:scale-95"
                >
                  <Text className="text-primary font-jakarta-bold text-sm">
                    Back to Home
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

// Dropdown lists constants
const CUISINE_TAGS = [
  "Pakistani",
  "Continental",
  "Indian",
  "Italian",
  "Chinese",
  "Mexican",
  "American",
  "Middle Eastern",
  "Turkish",
  "Japanese",
  "Thai",
];

const DISH_CATEGORIES = [
  "Street Food",
  "Gravy",
  "Fast Food",
  "Dessert",
  "Healthy",
  "Beverage",
  "Appetizers",
  "Rice Dishes",
  "Soups & Salads",
];

// Reusable Custom Dropdown Bottom Picker Modal Component
interface DropdownPickerProps {
  visible: boolean;
  onClose: () => void;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  title: string;
}

function DropdownPickerModal({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
  title,
}: DropdownPickerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1"
        />
        <View className="bg-[#FFFDF5] rounded-t-[32px] p-6 max-h-[60%] border-t border-[#F5E3D8]/50 shadow-lg">
          <View className="flex-row justify-between items-center mb-5 pb-3 border-b border-gray-100">
            <Text className="font-jakarta-bold text-lg text-[#3B3328]">
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <Feather name="x" size={16} color="#3B3328" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
            {options.map((option) => {
              const isSelected = selectedValue === option;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => {
                    onSelect(option);
                    onClose();
                  }}
                  className={cn(
                    "flex-row justify-between items-center py-4 px-5 rounded-2xl mb-2 border",
                    isSelected
                      ? "bg-primary/10 border-primary/20"
                      : "bg-white border-gray-100",
                  )}
                >
                  <Text
                    className={cn(
                      "font-jakarta-semibold text-sm",
                      isSelected
                        ? "text-primary font-jakarta-bold"
                        : "text-[#3B3328]",
                    )}
                  >
                    {option}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#FBA82E"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Spice images mapping
const SPICE_IMAGES = {
  1: require("@/assets/icons/spice_1.png"),
  2: require("@/assets/icons/spice_2.png"),
  3: require("@/assets/icons/spice_3.png"),
  4: require("@/assets/icons/spice_4.png"),
  5: require("@/assets/icons/spice_5.png"),
};

// Dietary tags configurations matching Instruments style
const DIETARY_TAGS: { name: string; icon: any; family?: string }[] = [
  { name: "Vegan", icon: require("@/assets/icons/vegan.webp") },
  { name: "Gluten-Free", icon: require("@/assets/icons/gluten_free.webp") },
  { name: "Dairy-Free", icon: require("@/assets/icons/Dairy_free.webp") },
  { name: "Low-Carb", icon: require("@/assets/icons/Low_carb.webp") },
  { name: "Nut-Free", icon: require("@/assets/icons/Nut_free.webp") },
  { name: "Healthy", icon: require("@/assets/icons/Healthy.webp") },
  { name: "Non-Halal", icon: require("@/assets/icons/Non_Halal.webp") },
];

const ALLOWED_UNITS = {
  spice: ["pinch", "tsp", "tbsp", "g"],
  liquid: ["ml", "l", "cup", "tbsp", "tsp"],
  solid: ["g", "kg", "cup", "tbsp", "oz", "lb"],
  countable: ["pcs", "slice", "can", "bag", "whole", "head", "leaf", "clove"],
  meat: ["g", "kg", "pcs", "oz", "lb", "slice"],
  fruit: ["pcs", "g", "kg", "cup", "slice", "whole"],
  vegetable: ["pcs", "g", "kg", "cup", "bunch", "whole"],
};

const MASTER_INGREDIENTS = [
  {
    name: "Carrot",
    nameUrdu: "گاجر",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2347/2347038.png",
  },
  {
    name: "Tomato",
    nameUrdu: "ٹماٹر",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1202/1202125.png",
  },
  {
    name: "Spinach",
    nameUrdu: "پالک",
    category: "solid",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1892/1892627.png",
  },
  {
    name: "Eggplant",
    nameUrdu: "بینگن",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/723/723635.png",
  },
  {
    name: "Cabbage",
    nameUrdu: "بند گوبھی",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2153/2153788.png",
  },
  {
    name: "Onion",
    nameUrdu: "پیاز",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2153/2153786.png",
  },
  {
    name: "Garlic",
    nameUrdu: "لہسن",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2153/2153775.png",
  },
  {
    name: "Broccoli",
    nameUrdu: "شاخ گوبھی",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2224/2224115.png",
  },
  {
    name: "Bell Pepper",
    nameUrdu: "شملہ مرچ",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/723/723661.png",
  },
  {
    name: "Cucumber",
    nameUrdu: "کھیرا",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1202/1202131.png",
  },
  {
    name: "Potato",
    nameUrdu: "آلو",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1202/1202122.png",
  },
  {
    name: "Chicken",
    nameUrdu: "چکن",
    category: "solid",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1041/1041339.png",
  },
  {
    name: "Beef",
    nameUrdu: "گائے کا گوشت",
    category: "solid",
    icon_url: "https://cdn-icons-png.flaticon.com/128/3143/3143640.png",
  },
  {
    name: "Milk",
    nameUrdu: "دودھ",
    category: "liquid",
    icon_url: "https://cdn-icons-png.flaticon.com/128/372/372973.png",
  },
  {
    name: "Water",
    nameUrdu: "پانی",
    category: "liquid",
    icon_url: "https://cdn-icons-png.flaticon.com/128/3105/3105807.png",
  },
  {
    name: "Olive Oil",
    nameUrdu: "زیتون کا تیل",
    category: "liquid",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2926/2926830.png",
  },
  {
    name: "Salt",
    nameUrdu: "نمک",
    category: "spice",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1892/1892748.png",
  },
  {
    name: "Black Pepper",
    nameUrdu: "کالی مرچ",
    category: "spice",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2122/2122775.png",
  },
  {
    name: "Sugar",
    nameUrdu: "چینی",
    category: "solid",
    icon_url: "https://cdn-icons-png.flaticon.com/128/5029/5029272.png",
  },
  {
    name: "Flour",
    nameUrdu: "آٹا",
    category: "solid",
    icon_url: "https://cdn-icons-png.flaticon.com/128/992/992754.png",
  },
  {
    name: "Butter",
    nameUrdu: "مکھن",
    category: "solid",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2926/2926856.png",
  },
  {
    name: "Egg",
    nameUrdu: "انڈا",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/837/837560.png",
  },
  {
    name: "Cheese",
    nameUrdu: "پنیر",
    category: "solid",
    icon_url: "https://cdn-icons-png.flaticon.com/128/305/305284.png",
  },
  {
    name: "Rice",
    nameUrdu: "چاول",
    category: "solid",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1471/1471262.png",
  },
  {
    name: "Lemon",
    nameUrdu: "لیمو",
    category: "countable",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1202/1202127.png",
  },
  {
    name: "Ginger",
    nameUrdu: "ادرک",
    category: "spice",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2926/2926824.png",
  },
];

const MASTER_KITCHEN_ESSENTIALS = [
  {
    name: "Oven",
    name_urdu: "اوون",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2286/2286161.png",
  },
  {
    name: "Blender",
    name_urdu: "بلینڈر",
    icon_url: "https://cdn-icons-png.flaticon.com/128/831/831340.png",
  },
  {
    name: "Air Fryer",
    name_urdu: "ایئر فرائیر",
    icon_url: "https://cdn-icons-png.flaticon.com/128/9902/9902146.png",
  },
  {
    name: "Microwave",
    name_urdu: "مائیکرو ویو",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2160/2160533.png",
  },
  {
    name: "Toaster",
    name_urdu: "ٹوسٹر",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2544/2544131.png",
  },
  {
    name: "Pan",
    name_urdu: "فرائینگ پین",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2286/2286152.png",
  },
  {
    name: "Pot",
    name_urdu: "دیگچی",
    icon_url: "https://cdn-icons-png.flaticon.com/128/3028/3028308.png",
  },
  {
    name: "Whisk",
    name_urdu: "ہینڈ بیٹر",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1672/1672322.png",
  },
  {
    name: "Knife",
    name_urdu: "چھری",
    icon_url: "https://cdn-icons-png.flaticon.com/128/3028/3028352.png",
  },
  {
    name: "Kettle",
    name_urdu: "کیٹلی",
    icon_url: "https://cdn-icons-png.flaticon.com/128/956/956277.png",
  },
];
