import { cn } from "@/utils";
import {
  computeTimeBreakdown,
  formatDuration,
  scaleQuantity,
} from "@/utils/recipe-steps";
import { useAuth } from "@/hooks/use-auth";
import { Feather, FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated_Reanimated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CookingLoader } from "@/components/ui/cooking-loader";
import { Recipe, recipeService } from "@/services/recipe.service";
import { aiService } from "@/services/ai.service";
import { supabase } from "@/services/supabase";
import { ResizeMode, Video } from "expo-av";
import * as Haptics from "expo-haptics";
import { WebView } from "react-native-webview";
import YoutubePlayer from "react-native-youtube-iframe";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = (SCREEN_HEIGHT * 0.45) - 20;
// Breathing room above the video so it clears the floating header / notch.
const VIDEO_TOP_PAD = 100;
// Autoplay the recipe video when its slide is active. false = user taps play.
const VIDEO_AUTOPLAY = false;

function CarouselImage({ uri }: { uri: string }) {
  const [imageUri, setImageUri] = useState(uri);
  const source = imageUri === "fallback" ? require("@/assets/images/LogIn_front_photo.webp") : { uri: imageUri };
  return (
    <View style={{ width: SCREEN_WIDTH, height: "100%", backgroundColor: "#1e1e1e" }}>
      {/* Ambient Blurred Background */}
      <Image
        source={source}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        contentFit="cover"
        blurRadius={60}
      />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }} />
      {/* Foreground image — cover so it fills the hero fully */}
      <Image
        source={source}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={300}
        onError={() => {
          if (imageUri !== "fallback") setImageUri("fallback");
        }}
      />
    </View>
  );
}

// Spice level asset images
const SPICE_IMAGES: Record<number, any> = {
  1: require("@/assets/icons/spice_1.png"),
  2: require("@/assets/icons/spice_2.png"),
  3: require("@/assets/icons/spice_3.png"),
  4: require("@/assets/icons/spice_4.png"),
  5: require("@/assets/icons/spice_5.png"),
};

// Block icon asset images
const INGREDIENTS_ICON = require("@/assets/icons/Ingredients.webp");
const COOKED_ICON = require("@/assets/icons/Chef_likes.webp");
const SERVINGS_ICON = require("@/assets/icons/servings.png");

const MASTER_KITCHEN_ESSENTIALS = [
  {
    name: "Oven",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2286/2286161.png",
  },
  {
    name: "Blender",
    icon_url: "https://cdn-icons-png.flaticon.com/128/831/831340.png",
  },
  {
    name: "Air Fryer",
    icon_url: "https://cdn-icons-png.flaticon.com/128/9902/9902146.png",
  },
  {
    name: "Microwave",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2160/2160533.png",
  },
  {
    name: "Toaster",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2544/2544131.png",
  },
  {
    name: "Pan",
    icon_url: "https://cdn-icons-png.flaticon.com/128/2286/2286152.png",
  },
  {
    name: "Pot",
    icon_url: "https://cdn-icons-png.flaticon.com/128/3028/3028308.png",
  },
  {
    name: "Whisk",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1672/1672322.png",
  },
  {
    name: "Knife",
    icon_url: "https://cdn-icons-png.flaticon.com/128/3028/3028352.png",
  },
  {
    name: "Kettle",
    icon_url: "https://cdn-icons-png.flaticon.com/128/956/956277.png",
  },
  {
    name: "Grater",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1691/1691176.png",
  },
  {
    name: "Juicer",
    icon_url: "https://cdn-icons-png.flaticon.com/128/1598/1598467.png",
  },
  {
    name: "Stove",
    icon_url: "https://cdn-icons-png.flaticon.com/128/305/305389.png",
  },
];

const TABS = ["Overview", "Ingredients", "Steps", "Reviews"] as const;
type TabType = (typeof TABS)[number];

export default function RecipeDetailScreen() {
  const { preferences, user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [originalRecipe, setOriginalRecipe] = useState<Recipe | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [dbKitchenEssentials, setDbKitchenEssentials] = useState<any[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentLang, setCurrentLang] = useState<'en' | 'ur' | 'roman_ur'>('en');

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [isFetchingReviews, setIsFetchingReviews] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userReviewText, setUserReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasCooked, setHasCooked] = useState(false);

  // Dynamic serving scaling — defaults to the recipe's base servings on load.
  const [scaledServings, setScaledServings] = useState<number | null>(null);

  const fetchRecipe = useCallback(async () => {
    if (!id) return;
    try {
      setDbLoading(true);
      setDbError(false);
      const data = await recipeService.getRecipeDetails(id);
      setRecipe(data);
      setOriginalRecipe(data);
      setScaledServings(data?.servings || 2);
      
      if (user?.id) {
        const cooked = await recipeService.hasCookedRecipe(user.id, id);
        setHasCooked(cooked);
      }
    } catch (err) {
      console.error("Error fetching recipe details:", err);
      setDbError(true);
    } finally {
      setDbLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  useEffect(() => {
    const fetchKitchenEssentials = async () => {
      try {
        const { data, error } = await supabase
          .from("kitchen_essentials")
          .select("*")
          .order("name", { ascending: true });
        if (data) {
          setDbKitchenEssentials(data);
        }
      } catch (err) {
        console.error("Failed to fetch kitchen essentials in detail page:", err);
      }
    };
    fetchKitchenEssentials();
  }, []);

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (user?.id && id) {
      recipeService.getLikedRecipeIds(user.id).then((likedIds) => {
        setIsSaved(likedIds.has(String(id)));
      }).catch(err => console.error("Failed to fetch saved status:", err));
    }
  }, [user?.id, id]);

  const mountTime = useRef(Date.now());
  const maxScrollY = useRef(0);
  const contentHeight = useRef(1);

  useEffect(() => {
    mountTime.current = Date.now();
    return () => {
      if (user?.id && id) {
        const duration_seconds = Math.floor((Date.now() - mountTime.current) / 1000);
        let scroll_depth = 0;
        if (contentHeight.current > 0) {
          scroll_depth = Math.min(1, maxScrollY.current / contentHeight.current);
        }
        
        const metadata = {
          engagement: {
            duration_seconds,
            scroll_depth: Number(scroll_depth.toFixed(2)),
            is_quick_exit: duration_seconds < 10
          }
        };

        recipeService.logInteraction(user.id, String(id), "VIEW", metadata).catch(err => 
          console.error("Failed to log VIEW interaction:", err)
        );
      }
    };
  }, [user?.id, id]);

  const handleScrollDepth = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    if (y + layoutHeight > maxScrollY.current) {
      maxScrollY.current = y + layoutHeight;
    }
  };

  const handleContentSizeChange = (w: number, h: number) => {
    contentHeight.current = h;
  };

  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const fetchReviews = useCallback(async () => {
    if (!id) return;
    try {
      setIsFetchingReviews(true);
      const data = await recipeService.getRecipeReviews(id as string);
      setReviews(data);
      const myReview = data.find((r) => r.user_id === user?.id);
      if (myReview) {
        setUserRating(myReview.rating);
        setUserReviewText(myReview.review_text || "");
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setIsFetchingReviews(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (activeTab === "Reviews" && id && reviews.length === 0) {
      fetchReviews();
    }
  }, [activeTab, id, reviews.length, fetchReviews]);

  const submitReview = async () => {
    if (!id || !user?.id) return;
    if (userRating < 1 || userRating > 5) {
      Alert.alert("Invalid Rating", "Please select a star rating between 1 and 5.");
      return;
    }
    try {
      setIsSubmittingReview(true);
      await recipeService.submitRecipeReview(id as string, user.id, userRating, userReviewText.trim());
      await fetchReviews();
      await fetchRecipe(); // Update overall recipe average_rating
      Alert.alert("Success", "Your review has been submitted!");
    } catch (err) {
      console.error("Failed to submit review:", err);
      Alert.alert("Error", "Could not submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleScroll = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / SCREEN_WIDTH);
    setActiveImageIndex(index);
  };
  const [activeVideo, setActiveVideo] = useState(false);
  // Controlled play state for the inline YouTube preview.
  const [videoPlaying, setVideoPlaying] = useState(VIDEO_AUTOPLAY);

  // Keep the video paused unless its slide is active (autoplay gated by flag).
  useEffect(() => {
    if (recipe?.videoUrl && activeImageIndex === 0) setVideoPlaying(VIDEO_AUTOPLAY);
    else setVideoPlaying(false);
  }, [activeImageIndex, recipe?.videoUrl]);

  // Dynamic Hero Height calculation
  const animatedHeroHeight = useSharedValue((SCREEN_HEIGHT * 0.45) - 20);
  const heroInitialized = useRef(false);

  useEffect(() => {
    // If we're on the video slide (slide 0 with a video) or playing video
    const isVideoSlide = recipe?.videoUrl && activeImageIndex === 0;

    let targetHeight = (SCREEN_HEIGHT * 0.45) - 20;

    if (activeVideo || isVideoSlide) {
      // 16:9 + 32px sheet overlap + top padding above the video
      targetHeight = (SCREEN_WIDTH * 9) / 16 + 32 + VIDEO_TOP_PAD;
    } else {
      // Image: 1:1 + 32px overlap
      targetHeight = SCREEN_WIDTH + 32;
    }

    if (!heroInitialized.current) {
      // First layout — set instantly so the hero doesn't "float"/spring open.
      animatedHeroHeight.value = targetHeight;
      heroInitialized.current = true;
    } else {
      // Switching between image ↔ video slides — animate smoothly (timing, no
      // spring bounce) so the height change isn't a hard jump.
      animatedHeroHeight.value = withTiming(targetHeight, { duration: 280 });
    }
  }, [activeImageIndex, activeVideo, recipe?.videoUrl]);

  const heroAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: animatedHeroHeight.value,
    };
  });
  const handleDeleteRecipe = () => {
    Alert.alert(
      "Delete Recipe",
      "Are you sure you want to permanently delete this recipe? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (recipe) {
                setDbLoading(true);
                await recipeService.deleteRecipe(recipe.id);
                Alert.alert("Success", "Recipe deleted successfully.", [
                  {
                    text: "OK",
                    onPress: () => {
                      router.replace("/(tabs)");
                    },
                  },
                ]);
              }
            } catch (err: any) {
              console.error("Failed to delete recipe:", err);
              Alert.alert("Error", err.message || "Failed to delete recipe.");
              setDbLoading(false);
            }
          },
        },
      ],
    );
  };

  const { isConnected } = useNetworkStatus();
  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await fetchRecipe();
    } finally {
      setRetrying(false);
    }
  }, [fetchRecipe]);

  if (dbError && !dbLoading && !recipe) {
    return (
      <ErrorState
        variant={isConnected ? "error" : "offline"}
        onRetry={handleRetry}
        retrying={retrying}
      />
    );
  }

  if (dbLoading || !recipe) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAF5EF] justify-center items-center">
        <CookingLoader scale={0.8} />
        <Text className="font-jakarta-semibold text-text-secondary text-sm mt-3">
          Loading recipe details...
        </Text>
      </SafeAreaView>
    );
  }

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const youtubeVideoId = recipe.videoUrl ? getYoutubeId(recipe.videoUrl) : null;

  const getIngredientStorageUrl = (name: string) => {
    if (!name) return "";
    const lowerName = name.toLowerCase().trim();

    // Exact matching for files currently in bucket
    if (lowerName.includes("chili") || lowerName.includes("chilli")) {
      if (lowerName.includes("green") || lowerName.includes("jalapeno")) {
        return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/jalapeno.webp`;
      }
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/redchili.webp`;
    }
    if (lowerName.includes("onion")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/pearlonion.webp`;
    }
    if (
      lowerName.includes("cilantro") ||
      lowerName.includes("coriander") ||
      lowerName.includes("mint")
    ) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/cilantro.webp`;
    }
    if (lowerName.includes("water")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/Glass%20Water%20Jug.webp`;
    }
    if (
      lowerName.includes("pasta") ||
      lowerName.includes("noodle") ||
      lowerName.includes("macaroni")
    ) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/Farfalle%20Pasta.webp`;
    }
    if (lowerName.includes("banana")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/banana.webp`;
    }
    if (lowerName.includes("ice")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/Ice.webp`;
    }
    if (lowerName.includes("soda")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/bakingsoda.webp`;
    }

    // Generic dynamic URL construction for future uploaded ingredients
    const formattedName = name.trim().replace(/\s+/g, "%20");
    return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/${formattedName}.webp`;
  };

  const displayIngredients = showAllIngredients
    ? recipe.ingredients || []
    : (recipe.ingredients || []).slice(0, 6);

  // ─── Serving scaling ──────────────────────────────────────────────────────
  const baseServings = recipe.servings || 2;
  const activeServings = scaledServings ?? baseServings;
  const scaleFactor = baseServings > 0 ? activeServings / baseServings : 1;

  /** Scale an ingredient's display amount (handles {amount,unit} or quantity). */
  const scaledIngredientAmount = (ing: any): string => {
    if (ing.amount) {
      return `${scaleQuantity(String(ing.amount), scaleFactor)} ${ing.unit || ""}`.trim();
    }
    return scaleQuantity(String(ing.quantity || ""), scaleFactor);
  };

  /** Look up the scaled quantity for a linked-ingredient name (for step "Uses:"). */
  const linkedIngredientLabel = (ingName: string): string => {
    const match = (recipe.ingredients || []).find(
      (i: any) => i.name?.toLowerCase() === ingName.toLowerCase(),
    );
    if (!match) return ingName;
    const qty = scaledIngredientAmount(match);
    return qty ? `${qty} ${ingName}` : ingName;
  };

  // ─── Time breakdown (Prep manual + Cook/Wait from step timers) ─────────────
  const timeBreakdown = computeTimeBreakdown(
    (recipe.steps as any) || [],
    recipe.prepTime || 0,
  );

  const allergies = preferences?.allergies || [];
  const dislikes = preferences?.dislikes || [];

  const matchedAllergy = recipe?.ingredients?.find((ing: any) =>
    allergies.some((allergyName) =>
      ing.name.toLowerCase().includes(allergyName.toLowerCase())
    )
  );
  const hasAllergy = !!matchedAllergy;
  const allergyName = matchedAllergy?.name || "";

  const matchedDislikedIngredient = recipe?.ingredients?.find((ing: any) =>
    dislikes.some((dislikeName) =>
      ing.name.toLowerCase().includes(dislikeName.toLowerCase())
    )
  );
  const isDislikedCuisine = dislikes.some((dislikeName) =>
    recipe?.cuisine_type?.toLowerCase() === dislikeName.toLowerCase()
  );

  const hasDislike = !!matchedDislikedIngredient || isDislikedCuisine;
  const dislikeName = matchedDislikedIngredient
    ? matchedDislikedIngredient.name
    : isDislikedCuisine
    ? recipe?.cuisine_type || ""
    : "";

  // Dietary preference conflict (distinct from allergy/dislike), e.g. user is
  // Vegetarian/Halal/Vegan but the recipe isn't tagged for it.
  const dietType: string | null = preferences?.diet_type || null;
  const recipeDietTags = (recipe?.diet_tags || []).map((t: string) => t.toLowerCase());
  const hasDietConflict =
    !!dietType &&
    dietType.toLowerCase() !== "none" &&
    recipeDietTags.length > 0 &&
    !recipeDietTags.includes(dietType.toLowerCase());



  return (
    <View className="flex-1 bg-[#FAF5EF]">
      <StatusBar barStyle="light-content" />

      {/* Floating Header Icons (over image) */}
      <View
        className="absolute top-0 left-0 right-0 z-20 flex-row justify-between items-center px-5"
        style={{ paddingTop: 54 }}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-11 h-11 bg-black/30 rounded-full items-center justify-center"
        >
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Right icons */}
        <View className="flex-row items-center">
          {recipe.created_by === user?.id && (
            <>
              {/* Edit Recipe */}
              <TouchableOpacity
                onPress={() => router.push(`/create-recipe?editId=${recipe.id}`)}
                className="w-11 h-11 bg-black/30 rounded-full items-center justify-center mr-2"
              >
                <Feather name="edit-3" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Delete Recipe */}
              <TouchableOpacity
                onPress={handleDeleteRecipe}
                className="w-11 h-11 bg-red-600/40 border border-red-500/20 rounded-full items-center justify-center mr-2"
              >
                <Image source={require("@/assets/icons/trash.webp")} style={{ width: 24, height: 24, tintColor: "#FFFFFF" }} contentFit="contain" />
              </TouchableOpacity>
            </>
          )}
          {/* Favorite — same 44px button as Share for visual parity */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="w-11 h-11 bg-black/30 rounded-full items-center justify-center mr-2"
            onPress={async () => {
              const newState = !isSaved;
              setIsSaved(newState);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              if (user?.id && id) {
                try {
                  await recipeService.toggleLikeRecipe(user.id, String(id));
                } catch (err) {
                  console.error("Failed to toggle like:", err);
                  setIsSaved(!newState); // revert
                }
              }
            }}
          >
            <Image
              source={
                isSaved
                  ? require("@/assets/icons/heart_filled.webp")
                  : require("@/assets/icons/heart_empty.webp")
              }
              style={{ width: 18, height: 18 }}
              contentFit="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            className="w-11 h-11 bg-black/30 rounded-full items-center justify-center"
            onPress={async () => {
              try {
                await Share.share({
                  message: `Check out this amazing recipe for ${recipe.title} on FlavourFlow!`,
                  title: recipe.title,
                });
                if (user?.id && id) {
                  recipeService.logInteraction(user.id, String(id), "SHARE").catch((err) =>
                    console.error("Failed to log share:", err),
                  );
                }
              } catch (err) {
                console.warn("Share cancelled/failed:", err);
              }
            }}
          >
            <Feather name="share" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={handleScrollDepth}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
      >
        {/* Hero Area */}
        <Animated_Reanimated.View style={[{ width: SCREEN_WIDTH }, heroAnimatedStyle]}>
          {activeVideo && recipe.videoUrl ? (
            /* ── Full Video Player overlay (user tapped the video slide) ── */
            <View style={{ width: "100%", height: "100%", overflow: "hidden" }}>
              {youtubeVideoId ? (
                <View style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                  {/* Ambient blurred background visible above/below the WebView */}
                  <Image
                    source={
                      recipe.image && recipe.image !== "fallback"
                        ? { uri: recipe.image }
                        : require("@/assets/images/LogIn_front_photo.webp")
                    }
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                    contentFit="cover"
                    blurRadius={90}
                  />
                  <LinearGradient
                    colors={[
                      "rgba(42, 37, 32, 0.82)",
                      "rgba(42, 37, 32, 0.3)",
                      "rgba(42, 37, 32, 0.3)",
                      "rgba(42, 37, 32, 0.82)",
                    ]}
                    locations={[0, 0.25, 0.75, 1]}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                  <View style={{ position: "absolute", top: VIDEO_TOP_PAD, left: 0, right: 0, height: SCREEN_WIDTH * (9 / 16) }}>
                    <YoutubePlayer
                      height={SCREEN_WIDTH * (9 / 16)}
                      width={SCREEN_WIDTH}
                      play={activeVideo}
                      videoId={youtubeVideoId}
                      initialPlayerParams={{
                        controls: true,
                        modestbranding: true,
                        rel: false,
                      }}
                      webViewProps={{
                        allowsInlineMediaPlayback: true,
                        mediaPlaybackRequiresUserAction: false,
                      }}
                      onError={(e: string) => console.log("YouTube player error:", e)}
                    />
                  </View>
                </View>
              ) : (
                <Video
                  source={{ uri: recipe.videoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  onPlaybackStatusUpdate={(status) => {
                    if (status.isLoaded && !status.isPlaying && status.didJustFinish) {
                      setActiveVideo(false);
                    }
                  }}
                />
              )}
              {/* Floating close button — returns to the swipeable photo carousel */}
              <TouchableOpacity
                onPress={() => setActiveVideo(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="absolute top-14 right-5 w-10 h-10 bg-black/60 rounded-full items-center justify-center z-30"
              >
                <Feather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (() => {
            /* ── Unified Carousel: [Video Thumbnail] + [Cover Image] + [Other Images] ── */

            // Build carousel slides:
            // Slide 0 (if video exists): YouTube thumbnail
            // Slide 1+: cover image + any additional images
            const imageSlides: string[] =
              recipe.images && recipe.images.length > 0
                ? recipe.images
                : recipe.image ? [recipe.image] : [];

            // Prepend a special video marker as slide 0 when a video URL exists
            const VIDEO_SLIDE_MARKER = "__VIDEO_SLIDE__";
            const carouselData: string[] = recipe.videoUrl
              ? [VIDEO_SLIDE_MARKER, ...imageSlides]
              : imageSlides;

            // YouTube thumbnail URL — try maxresdefault, fallback to hqdefault
            const ytThumbnail = youtubeVideoId
              ? `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`
              : null;

            return (
              <View style={{ width: "100%", height: "100%" }}>
                <FlatList
                  data={carouselData}
                  keyExtractor={(item, index) => `${item}_${index}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  style={{ width: "100%", height: "100%" }}
                  renderItem={({ item, index }) => {
                    if (item === VIDEO_SLIDE_MARKER) {
                      // ── Video Slide: inline player. Plays while this slide is
                      //    active; swipe from the padded areas above/below it. ──
                      return (
                        <View style={{ width: SCREEN_WIDTH, height: "100%" }}>
                          {/* Ambient blurred backdrop above/below the 16:9 player */}
                          <Image
                            source={
                              ytThumbnail
                                ? { uri: ytThumbnail }
                                : require("@/assets/images/LogIn_front_photo.webp")
                            }
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                            contentFit="cover"
                            blurRadius={60}
                          />
                          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" }} />
                          {/* Player (16:9) with breathing room at the top */}
                          <View style={{ position: "absolute", top: VIDEO_TOP_PAD, left: 0, right: 0, height: SCREEN_WIDTH * (9 / 16) }}>
                            {youtubeVideoId ? (
                              <YoutubePlayer
                                height={SCREEN_WIDTH * (9 / 16)}
                                width={SCREEN_WIDTH}
                                play={videoPlaying}
                                videoId={youtubeVideoId}
                                initialPlayerParams={{ controls: true, modestbranding: true, rel: false }}
                                webViewProps={{ allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: !VIDEO_AUTOPLAY }}
                                onChangeState={(state: string) => {
                                  if (state === "playing") setVideoPlaying(true);
                                  else if (state === "paused" || state === "ended" || state === "unstarted")
                                    setVideoPlaying(false);
                                }}
                                onError={(e: string) => console.log("YouTube player error:", e)}
                              />
                            ) : (
                              <Video
                                source={{ uri: recipe.videoUrl! }}
                                style={{ width: "100%", height: "100%" }}
                                useNativeControls
                                resizeMode={ResizeMode.COVER}
                                shouldPlay={videoPlaying}
                              />
                            )}
                          </View>
                        </View>
                      );
                    }
                    // ── Image Slide ──
                    return <CarouselImage uri={item} />;
                  }}
                />

                {/* Dot indicator — counts all slides including the video slide */}
                {carouselData.length > 1 && (
                  <View className="absolute bottom-16 left-0 right-0 flex-row justify-center items-center gap-1.5 z-10">
                    {carouselData.map((_, index) => (
                      <View
                        key={index}
                        style={{
                          height: 6,
                          width: activeImageIndex === index ? 16 : 6,
                          borderRadius: 3,
                          backgroundColor:
                            index === 0 && recipe.videoUrl
                              ? activeImageIndex === 0 ? "#FF0000" : "rgba(255,255,255,0.5)"
                              : activeImageIndex === index ? "#FBA82E" : "rgba(255,255,255,0.5)",
                        }}
                      />
                    ))}
                  </View>
                )}

                {/* Spice & Time — only show on non-video slides */}
                {activeImageIndex !== 0 || !recipe.videoUrl ? (
                  <>
                    <View className="absolute bottom-10 right-5 bg-black/40 rounded-full py-1.5 px-3.5 flex-row items-center border border-white/20">
                      <Image source={require("@/assets/icons/recipe_card_time.webp")} style={{ width: 18, height: 18, marginRight: 6 }} contentFit="contain" />
                      <Text className="font-jakarta-semibold text-white text-sm">{formatDuration(timeBreakdown.total)}</Text>
                    </View>
                    {recipe.spiceLevel > 0 && (
                      <View className="absolute bottom-10 left-5 bg-black/40 rounded-full p-1.5 flex-row items-center border border-white/20">
                        <Image
                          source={SPICE_IMAGES[Math.min(recipe.spiceLevel, 5)]}
                          style={{ width: 26, height: 26 }}
                          contentFit="contain"
                        />
                      </View>
                    )}
                  </>
                ) : null}
              </View>
            );
          })()}
        </Animated_Reanimated.View>

        {/* White Content Sheet */}
        <View
          className="bg-[#FAF5EF] -mt-8 rounded-t-[32px] px-6 pt-6 pb-32"
          style={{ minHeight: SCREEN_HEIGHT * 0.6 }}
        >
          {/* Warning Banner */}
          {hasAllergy && (
            <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-5 flex-row items-center">
              <Ionicons name="alert-circle" size={20} color="#EF4444" style={{ marginRight: 10 }} />
              <View className="flex-1">
                <Text className="text-red-800 font-jakarta-bold text-xs">
                  Allergy Warning
                </Text>
                <Text className="text-red-700 font-inter-regular text-[10px] mt-0.5">
                  This recipe contains <Text className="font-jakarta-bold">{allergyName}</Text> which is in your allergy list.
                </Text>
              </View>
            </View>
          )}

          {!hasAllergy && hasDislike && (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-5 flex-row items-center">
              <Ionicons name="warning" size={20} color="#F59E0B" style={{ marginRight: 10 }} />
              <View className="flex-1">
                <Text className="text-amber-800 font-jakarta-bold text-xs">
                  Dislike Alert
                </Text>
                <Text className="text-amber-700 font-inter-regular text-[10px] mt-0.5">
                  Contains <Text className="font-jakarta-bold">{dislikeName}</Text> which is in your dislike preferences.
                </Text>
              </View>
            </View>
          )}

          {/* Dietary preference notice (distinct from allergy/dislike) */}
          {!hasAllergy && hasDietConflict && (
            <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-5 flex-row items-center">
              <Ionicons name="leaf" size={20} color="#10B981" style={{ marginRight: 10 }} />
              <View className="flex-1">
                <Text className="text-emerald-800 font-jakarta-bold text-xs">
                  Dietary Note
                </Text>
                <Text className="text-emerald-700 font-inter-regular text-[10px] mt-0.5">
                  This recipe may not match your <Text className="font-jakarta-bold">{dietType}</Text> preference.
                </Text>
              </View>
            </View>
          )}

          {/* Recipe Title & Rating Row */}
          <View className="flex-row justify-between items-start mb-3">
            <Text className="font-jakarta-bold text-primary-dark text-2xl leading-8 flex-1 mr-4">
              {recipe.title}
            </Text>
            <View className="bg-primary/10 px-3 py-1.5 rounded-full flex-row items-center border border-primary/20">
              <FontAwesome name="star" size={14} color="#FBA82E" />
              <Text className="text-white text-[10px] font-jakarta-semibold ml-1">
                {recipe.rating || "4.5"}
              </Text>
            </View>
          </View>

          {/* Author Row */}
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => router.push(`/user-profile?userId=${recipe.created_by}`)}
            className="flex-row items-center mb-4"
          >
            <Image
              source={
                typeof recipe.authorAvatar === 'string' 
                  ? { uri: recipe.authorAvatar } 
                  : (recipe.authorAvatar || { uri: "https://i.pravatar.cc/150?img=5" })
              }
              className="w-8 h-8 rounded-full bg-gray-100 mr-2"
            />
            <Text className="font-inter-medium text-text-lighter text-sm">
              By {recipe.authorName || "You"}
            </Text>
            {recipe.isVerified && (
              <MaterialIcons name="verified" size={14} color="#1DA1F2" style={{ marginLeft: 4 }} />
            )}
            <Feather
              name="chevron-right"
              size={14}
              color="#8B7D6F"
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>

          {/* Translation Button */}
          <View className="flex-row mb-6">
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => {
                if (currentLang !== 'en') {
                  setRecipe(originalRecipe);
                  setCurrentLang('en');
                  return;
                }
                Alert.alert("Translate Recipe", "Choose a language", [
                  { text: "اردو (Urdu)", onPress: async () => {
                    try {
                      setIsTranslating(true);
                      const translated = await aiService.translateRecipe(originalRecipe, 'ur');
                      setRecipe({ ...originalRecipe!, ...translated });
                      setCurrentLang('ur');
                    } catch (err) {
                      Alert.alert("Error", "Failed to translate recipe.");
                    } finally {
                      setIsTranslating(false);
                    }
                  }},
                  { text: "Roman Urdu", onPress: async () => {
                    try {
                      setIsTranslating(true);
                      const translated = await aiService.translateRecipe(originalRecipe, 'roman_ur');
                      setRecipe({ ...originalRecipe!, ...translated });
                      setCurrentLang('roman_ur');
                    } catch (err) {
                      Alert.alert("Error", "Failed to translate recipe.");
                    } finally {
                      setIsTranslating(false);
                    }
                  }},
                  { text: "Cancel", style: "cancel" }
                ]);
              }}
              className="flex-row items-center bg-[#F5E3D8]/40 px-4 py-2 rounded-full border border-[#F5E3D8]"
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color="#FBA82E" style={{ marginRight: 6 }} />
              ) : (
                <Ionicons name="language" size={16} color="#FBA82E" style={{ marginRight: 6 }} />
              )}
              <Text className="font-jakarta-semibold text-[13px] text-[#3B3328]">
                {isTranslating ? "Translating..." : currentLang === 'en' ? "Translate Recipe" : "Revert to English"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3 Blocks Row (Ingredients, Serving, Cooked) */}
          <View className="flex-row justify-between mb-6">
            {/* Block 1: Ingredients */}
            <View className="flex-1 bg-[#FFF2D9] rounded-2xl p-3 mr-2.5 items-center justify-center min-h-[110px]">
              <Image
                source={INGREDIENTS_ICON}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
              <Text className="font-jakarta-medium text-text-DEFAULT text-xs text-center mt-2.5">
                {recipe.ingredientsCount || (recipe.ingredients || []).length}{" "}
                Ingredients
              </Text>
            </View>

            {/* Block 2: Serving — interactive scaler */}
            <View className="flex-1 bg-[#FFEAD2] rounded-2xl p-3 mr-2.5 items-center justify-center min-h-[110px]">
              <Image
                source={SERVINGS_ICON}
                style={{ width: 40, height: 40 }}
                contentFit="contain"
              />
              <View className="flex-row items-center mt-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setScaledServings((prev) =>
                      Math.max(1, (prev ?? baseServings) - 1),
                    );
                  }}
                  className="w-6 h-6 rounded-full bg-white items-center justify-center border border-[#F0D9CE] shadow-sm"
                >
                  <Feather name="minus" size={13} color="#FBA82E" />
                </TouchableOpacity>
                <Text className="font-jakarta-bold text-text-DEFAULT text-sm mx-2.5 min-w-[18px] text-center">
                  {activeServings}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setScaledServings((prev) => (prev ?? baseServings) + 1);
                  }}
                  className="w-6 h-6 rounded-full bg-white items-center justify-center border border-[#F0D9CE] shadow-sm"
                >
                  <Feather name="plus" size={13} color="#FBA82E" />
                </TouchableOpacity>
              </View>
              <Text className="font-inter-medium text-text-lighter text-[10px] text-center mt-1">
                Servings
              </Text>
            </View>

            {/* Block 3: Cooked */}
            <View className="flex-1 bg-[#FDF0EB] rounded-2xl p-3 items-center justify-center min-h-[110px]">
              <Image
                source={COOKED_ICON}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
              <Text className="font-jakarta-semibold text-[13px] text-text">
                {recipe.cooked_count !== undefined
                  ? recipe.cooked_count >= 1000
                    ? (recipe.cooked_count / 1000).toFixed(1) + "k"
                    : recipe.cooked_count
                  : 0}{" "}
                Cooked
              </Text>
            </View>
          </View>

          {/* Time breakdown — Prep / Cook / Wait / Total */}
          <View className="bg-white border border-[#F5E3D8]/60 rounded-2xl px-4 py-3 mb-6 flex-row items-center justify-between shadow-sm">
            <View className="items-center flex-1">
              <Text className="font-inter-semibold text-[10px] text-text-lighter mb-0.5">PREP</Text>
              <Text className="font-jakarta-bold text-text-DEFAULT text-xs">{formatDuration(timeBreakdown.prep)}</Text>
            </View>
            <View className="w-px h-7 bg-[#F5E3D8]" />
            <View className="items-center flex-1">
              <Text className="font-inter-semibold text-[10px] text-text-lighter mb-0.5">COOK</Text>
              <Text className="font-jakarta-bold text-text-DEFAULT text-xs">{formatDuration(timeBreakdown.cook)}</Text>
            </View>
            {timeBreakdown.wait > 0 && (
              <>
                <View className="w-px h-7 bg-[#F5E3D8]" />
                <View className="items-center flex-1">
                  <Text className="font-inter-semibold text-[10px] text-text-lighter mb-0.5">WAIT</Text>
                  <Text className="font-jakarta-bold text-text-DEFAULT text-xs">{formatDuration(timeBreakdown.wait)}</Text>
                </View>
              </>
            )}
            <View className="w-px h-7 bg-[#F5E3D8]" />
            <View className="items-center flex-1">
              <Text className="font-inter-semibold text-[10px] text-primary mb-0.5">TOTAL</Text>
              <Text className="font-jakarta-bold text-primary text-xs">{formatDuration(timeBreakdown.total)}</Text>
            </View>
          </View>

          {/* Tab Pills */}
          <View className="flex-row mb-5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                  className={`px-5 py-2.5 rounded-full mr-2.5 ${
                    isActive
                      ? "bg-primary"
                      : "bg-[#F4F4F4] border border-gray-200"
                  }`}
                >
                  <Text
                    className={`font-jakarta-semibold text-sm ${
                      isActive ? "text-white" : "text-text-lighter"
                    }`}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab Content */}
          {activeTab === "Overview" && (
            <View>
              <Text className="font-inter-semibold text-primary-dark text-base mb-2">
                Description
              </Text>
              <Text className="font-inter-regular text-text-lighter text-sm leading-6">
                {recipe.description}
              </Text>
            </View>
          )}

          {activeTab === "Ingredients" && (
            <View>
              <Text className="font-inter-semibold text-primary-dark text-base mb-4">
                Ingredients
              </Text>
              <View className="flex-row flex-wrap justify-start">
                {displayIngredients.map((ing: any, index: number) => (
                  <View
                    key={index}
                    className="w-[31.3%] m-[1%] min-h-[110px] bg-[#F5E3D8] rounded-3xl items-center justify-center p-2 shadow-sm"
                  >
                    <Image
                      source={{ uri: getIngredientStorageUrl(ing.name) }}
                      style={{ width: 44, height: 44 }}
                      contentFit="contain"
                    />
                    <Text
                      className="text-text-DEFAULT font-jakarta-medium text-[9px] text-center mt-2 leading-3"
                      numberOfLines={2}
                    >
                      {scaledIngredientAmount(ing)} {ing.name}
                    </Text>
                  </View>
                ))}
              </View>

              {(recipe.ingredients || []).length > 6 && (
                <TouchableOpacity
                  onPress={() => setShowAllIngredients(!showAllIngredients)}
                  className="items-center justify-center mt-4 py-2"
                  activeOpacity={0.7}
                >
                  <Text className="font-jakarta-semibold text-primary text-sm">
                    {showAllIngredients ? "Show less" : "Show more"}
                  </Text>
                  <Feather
                    name={showAllIngredients ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#FBA82E"
                    style={{ marginTop: 2 }}
                  />
                </TouchableOpacity>
              )}

              {/* Kitchen Essentials Section */}
              {recipe.kitchen_essentials && recipe.kitchen_essentials.length > 0 && (
                <View className="mb-10 border-t border-[#F5E3D8]/40 pt-8">
                  <Text className="font-jakarta-bold text-[#3B3328] text-xl mb-4 px-2">
                    Kitchen Essentials
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
                  >
                    {recipe.kitchen_essentials.map((app: string, index: number) => {
                      const appInfo = dbKitchenEssentials.find((a) => a.name === app);
                      const fallbackInfo = MASTER_KITCHEN_ESSENTIALS.find(
                        (a) => a.name === app,
                      );
                      const iconUrl = appInfo
                        ? appInfo.icon_url
                        : fallbackInfo?.icon_url ||
                          "https://img.icons8.com/color/96/kitchen.png";

                      return (
                        <View
                          key={index}
                          className="mr-3 w-28 bg-[#F5E3D8]/30 rounded-2xl items-center p-4 border border-[#F5E3D8]/40"
                        >
                          <Image
                            source={{ uri: iconUrl }}
                            style={{ width: 44, height: 44, marginBottom: 12 }}
                            contentFit="contain"
                          />
                          <Text
                            className="font-jakarta-semibold text-[#3B3328] text-[11px] text-center"
                            numberOfLines={2}
                          >
                            {app}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {activeTab === "Steps" && (
            <View>
              <Text className="font-inter-semibold text-primary-dark text-base mb-3">
                Directions
              </Text>
              {(recipe.steps || []).map((step: any, index: number) => (
                <View key={index} className="flex-row mb-6 items-start">
                  {/* Step number circle */}
                  <View className="w-8 h-8 bg-[#FBA82E] rounded-full items-center justify-center mr-4 mt-0.5 shadow-sm">
                    <Text className="font-jakarta-bold text-white text-xs">
                      {step.step}
                    </Text>
                  </View>
                  {/* Step content block */}
                  <View className="flex-1">
                    <View className="flex-row items-center flex-wrap mb-1.5">
                      <Text className="font-inter-regular text-[#3B3328] text-sm leading-6 flex-1 mr-2">
                        {step.instruction}
                      </Text>
                      {step.parallel && (
                        <View className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex-row items-center">
                          <Ionicons
                            name="git-compare"
                            size={10}
                            color="#FBA82E"
                            style={{ marginRight: 4 }}
                          />
                          <Text className="text-primary font-jakarta-semibold text-[8px] uppercase">
                            Parallel
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Action, Temp, Heat, Timer Metadata Row */}
                    {(step.action ||
                      step.temperature ||
                      step.heatSetting ||
                      step.hasTimer) && (
                      <View className="flex-row items-center gap-1.5 flex-wrap mt-1">
                        {step.action && (
                          <View className="bg-[#F5E3D8]/50 px-2 py-0.5 rounded-full border border-[#F5E3D8]/80 flex-row items-center">
                            <Text className="text-[#3B3328] font-jakarta-bold text-[8px] uppercase">
                              {step.action}
                            </Text>
                          </View>
                        )}

                        {step.temperature != null &&
                          String(step.temperature).trim() !== "" && (
                            <View className="bg-red-50 px-2 py-0.5 rounded-full border border-red-100 flex-row items-center">
                              <Feather
                                name="thermometer"
                                size={10}
                                color="#E05252"
                                style={{ marginRight: 3 }}
                              />
                              <Text className="text-[#E05252] font-jakarta-bold text-[8px] uppercase">
                                {step.temperature}°{step.temperatureUnit || "C"}
                              </Text>
                            </View>
                          )}

                        {step.heatSetting && (
                          <View className="bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 flex-row items-center">
                            <Feather
                              name="thermometer"
                              size={10}
                              color="#FBA82E"
                              style={{ marginRight: 3 }}
                            />
                            <Text className="text-[#FBA82E] font-jakarta-bold text-[8px] uppercase">
                              {step.heatSetting} Heat
                            </Text>
                          </View>
                        )}

                        {step.hasTimer && (
                          <View className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 flex-row items-center">
                            <Image source={require("@/assets/icons/recipe_card_time.webp")} style={{ width: 14, height: 14, marginRight: 3 }} contentFit="contain" />
                            <Text className="text-primary font-jakarta-bold text-[8px] uppercase">
                              {step.timerType === "countdown"
                                ? `${step.timerHours ? `${step.timerHours}h ` : ""}${step.timerMinutes || 0}m`
                                : `${step.targetTime || ""}${step.leaveOvernight ? " (Overnight)" : ""}`}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Chef Tip / Note */}
                    {step.note && String(step.note).trim() !== "" && (
                      <View className="flex-row items-start mt-2 bg-[#FFF7E8] border border-[#FBE2B0] rounded-xl px-2.5 py-1.5">
                        <Feather
                          name="info"
                          size={11}
                          color="#D99A2B"
                          style={{ marginRight: 5, marginTop: 1 }}
                        />
                        <Text className="text-[#8A6A22] font-inter-medium text-[10px] leading-4 flex-1">
                          {step.note}
                        </Text>
                      </View>
                    )}

                    {/* Linked Ingredients Row — with scaled quantities */}
                    {step.linkedIngredients &&
                      step.linkedIngredients.length > 0 && (
                        <View className="flex-row flex-wrap items-center mt-2 gap-1">
                          <Text className="text-[#8B7D6F] font-jakarta-medium text-[8px] mr-1 uppercase">
                            Uses:
                          </Text>
                          {step.linkedIngredients.map(
                            (ingName: string, idx: number) => (
                              <View
                                key={idx}
                                className="bg-[#F5E3D8]/20 border border-[#F5E3D8]/40 px-2 py-0.5 rounded-full"
                              >
                                <Text className="text-[#5C544A] font-inter-medium text-[8px]">
                                  {linkedIngredientLabel(ingName)}
                                </Text>
                              </View>
                            ),
                          )}
                        </View>
                      )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === "Reviews" && (
            <View>
              {hasCooked && (
                <>
                  <Text className="font-inter-semibold text-primary-dark text-base mb-4">
                    Leave a Review
                  </Text>
              
              <View className="bg-white border border-[#F5E3D8]/60 rounded-2xl p-4 shadow-sm mb-8">
                <Text className="font-jakarta-semibold text-sm text-[#3B3328] mb-3 text-center">
                  How was the recipe?
                </Text>
                
                {/* Star Selector */}
                <View className="flex-row justify-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      activeOpacity={0.7}
                      onPress={() => {
                        setUserRating(star);
                        Haptics.selectionAsync();
                      }}
                      style={{ paddingHorizontal: 4 }}
                    >
                      <FontAwesome
                        name={userRating >= star ? "star" : "star-o"}
                        size={28}
                        color={userRating >= star ? "#FBA82E" : "#D4CBC0"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Text Input */}
                <TextInput
                  value={userReviewText}
                  onChangeText={setUserReviewText}
                  placeholder="Share your thoughts (optional)..."
                  placeholderTextColor="#A09990"
                  multiline
                  className="bg-[#FAF5EF] rounded-xl px-4 py-3 min-h-[80px] text-[#3B3328] font-inter-regular text-sm border border-[#E8DCCB] mb-4 text-left"
                  textAlignVertical="top"
                />

                {/* Submit Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={submitReview}
                  disabled={isSubmittingReview}
                  className={`py-3.5 rounded-full items-center justify-center ${isSubmittingReview ? "bg-[#FBA82E]/60" : "bg-primary"}`}
                >
                  {isSubmittingReview ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="font-jakarta-bold text-white text-sm">
                      Submit Review
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              </>
              )}

              <Text className="font-inter-semibold text-primary-dark text-base mb-4">
                Community Reviews ({reviews.length})
              </Text>

              {isFetchingReviews ? (
                <View className="py-8 items-center justify-center">
                  <ActivityIndicator size="small" color="#FBA82E" />
                </View>
              ) : reviews.length === 0 ? (
                <View className="py-8 items-center justify-center">
                  <Feather name="message-square" size={32} color="#D4CBC0" style={{ marginBottom: 12 }} />
                  <Text className="font-inter-regular text-[#8B7D6F] text-sm">
                    No reviews yet. Be the first!
                  </Text>
                </View>
              ) : (
                reviews.map((review, idx) => (
                  <View key={review.id || idx} className="mb-5 pb-5 border-b border-[#F5E3D8]/50">
                    <View className="flex-row items-center mb-2">
                      <Image
                        source={{ uri: review.profiles?.avatar_url || "https://i.pravatar.cc/150?img=5" }}
                        className="w-10 h-10 rounded-full bg-gray-100 mr-3"
                      />
                      <View className="flex-1">
                        <Text className="font-jakarta-semibold text-sm text-[#3B3328] mb-0.5">
                          {review.profiles?.full_name || "Anonymous Chef"}
                        </Text>
                        <View className="flex-row items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FontAwesome
                              key={star}
                              name={review.rating >= star ? "star" : "star-o"}
                              size={10}
                              color={review.rating >= star ? "#FBA82E" : "#D4CBC0"}
                              style={{ marginRight: 2 }}
                            />
                          ))}
                          <Text className="font-inter-medium text-[9px] text-[#A09990] ml-2">
                            {new Date(review.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {review.review_text && String(review.review_text).trim() !== "" && (
                      <Text className="font-inter-regular text-sm text-[#5C544A] leading-5 mt-2">
                        {review.review_text}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-4"
        style={{ backgroundColor: "transparent" }}
      >
        <SwipeToStartButton
          onSwipeSuccess={() => {
            router.push({
              pathname: "/cooking-mode",
              params: {
                id: id,
                servings: String(activeServings),
                baseServings: String(baseServings),
              },
            });
          }}
        />
      </View>
    </View>
  );
}

// ── Custom Swipe-to-Start-Cooking Button ────────────────────────────────
// Built with react-native-gesture-handler + react-native-reanimated
// No third-party swipe-button packages needed.

const SWIPE_BUTTON_HEIGHT = 64;
const KNOB_SIZE = 54;
const KNOB_MARGIN = (SWIPE_BUTTON_HEIGHT - KNOB_SIZE) / 2;
const TRACK_WIDTH = SCREEN_WIDTH - 48; // px-6 = 24px each side
const MAX_TRANSLATE = TRACK_WIDTH - KNOB_SIZE - KNOB_MARGIN * 2;
const COMPLETE_THRESHOLD = 0.85;

function SwipeToStartButton({
  onSwipeSuccess,
}: {
  onSwipeSuccess: () => void;
}) {
  const translateX = useSharedValue(0);
  const hasTriggered = useSharedValue(false);
  const [completed, setCompleted] = useState(false);

  // Track button width dynamically (defaults to design width)
  const buttonWidth = useSharedValue(SCREEN_WIDTH - 48);
  const maxTranslate = useSharedValue(
    SCREEN_WIDTH - 48 - KNOB_SIZE - KNOB_MARGIN * 2,
  );

  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // Reset the swipe button state when screen comes into focus
      translateX.value = 0;
      hasTriggered.value = false;
      setCompleted(false);
    });
    return unsubscribe;
  }, [navigation]);

  const triggerSuccess = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    setCompleted(true);
    onSwipeSuccess();
  }, [onSwipeSuccess]);

  const triggerLightHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const panGesture = Gesture.Pan()
    .activeOffsetX(10)
    .failOffsetY([-20, 20])
    .onStart(() => {
      runOnJS(triggerLightHaptic)();
    })
    .onUpdate((event) => {
      if (hasTriggered.value) return;
      const clampedX = Math.min(
        Math.max(event.translationX, 0),
        maxTranslate.value,
      );
      translateX.value = clampedX;
    })
    .onEnd(() => {
      if (hasTriggered.value) return;
      if (translateX.value >= maxTranslate.value * COMPLETE_THRESHOLD) {
        // Snap to the end
        translateX.value = withSpring(maxTranslate.value, {
          damping: 15,
          stiffness: 120,
          overshootClamping: true,
        });
        hasTriggered.value = true;
        runOnJS(triggerSuccess)();
      } else {
        // Snap back
        translateX.value = withSpring(0, {
          damping: 15,
          stiffness: 120,
          overshootClamping: true,
        });
      }
    });

  const knobStyle = useAnimatedStyle(() => {
    const clampedX = Math.max(
      0,
      Math.min(translateX.value, maxTranslate.value),
    );
    return {
      transform: [{ translateX: clampedX }],
    };
  });

  const fillStyle = useAnimatedStyle(() => {
    const clampedX = Math.max(
      0,
      Math.min(translateX.value, maxTranslate.value),
    );
    return {
      width: clampedX + KNOB_SIZE + KNOB_MARGIN,
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const clampedX = Math.max(
      0,
      Math.min(translateX.value, maxTranslate.value),
    );
    return {
      opacity: interpolate(
        clampedX,
        [0, maxTranslate.value * 0.5],
        [1, 0],
        "clamp",
      ),
    };
  });

  return (
    <View
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        if (width > 0) {
          buttonWidth.value = width;
          maxTranslate.value = width - KNOB_SIZE - KNOB_MARGIN * 2;
        }
      }}
      style={{
        height: SWIPE_BUTTON_HEIGHT,
        borderRadius: SWIPE_BUTTON_HEIGHT / 2,
        backgroundColor: "#FBA82E",
        justifyContent: "center",
        overflow: "hidden",
        shadowColor: "#3B3328",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
      }}
    >
      {/* Orange fill that follows the knob */}
      <Animated_Reanimated.View
        style={[
          {
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            borderRadius: SWIPE_BUTTON_HEIGHT / 2,
            backgroundColor: "#E39620",
          },
          fillStyle,
        ]}
      />

      {/* Title text */}
      <Animated_Reanimated.Text
        style={[
          {
            position: "absolute",
            alignSelf: "center",
            color: "#FFFFFF",
            fontWeight: "bold" as const,
            fontSize: 11,
            letterSpacing: 1.5,
          },
          textStyle,
        ]}
      >
        SWIPE TO START COOKING
      </Animated_Reanimated.Text>

      {/* Draggable knob */}
      <GestureDetector gesture={panGesture}>
        <Animated_Reanimated.View
          style={[
            {
              position: "absolute",
              left: KNOB_MARGIN,
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              borderRadius: KNOB_SIZE / 2,
              backgroundColor: "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            },
            knobStyle,
          ]}
        >
          <Feather name="chevrons-right" size={24} color="#FBA82E" />
        </Animated_Reanimated.View>
      </GestureDetector>
    </View>
  );
}
