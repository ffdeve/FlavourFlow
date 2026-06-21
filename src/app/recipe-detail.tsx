import { HeartButton } from "@/components/ui/heart-button";
import { cn } from "@/utils";
import { useAuth } from "@/hooks/use-auth";
import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StatusBar,
  Text,
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
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CookingLoader } from "@/components/ui/cooking-loader";
import { Recipe, recipeService } from "@/services/recipe.service";
import { supabase } from "@/services/supabase";
import { ResizeMode, Video } from "expo-av";
import * as Haptics from "expo-haptics";
import { WebView } from "react-native-webview";
import YoutubePlayer from "react-native-youtube-iframe";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.42;

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
const KCAL_ICON = require("@/assets/icons/kcal.png");
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

const TABS = ["Overview", "Ingredients", "Steps"] as const;
type TabType = (typeof TABS)[number];

export default function RecipeDetailScreen() {
  const { preferences, user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbKitchenEssentials, setDbKitchenEssentials] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      const fetchRecipe = async () => {
        try {
          setDbLoading(true);
          const data = await recipeService.getRecipeDetails(id);
          setRecipe(data);
        } catch (err) {
          console.error("Error fetching recipe details:", err);
        } finally {
          setDbLoading(false);
        }
      };
      fetchRecipe();
    }
  }, [id, user?.id]);

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
            scroll_depth: Number(scroll_depth.toFixed(2))
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

  const handleScroll = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / SCREEN_WIDTH);
    setActiveImageIndex(index);
  };
  const [activeVideo, setActiveVideo] = useState(false);
  const handleDeleteRecipe = () => {
    Alert.alert(
      "Delete Recipe 🍳",
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
                <Feather name="trash-2" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
          <HeartButton
            isLiked={isSaved}
            onToggle={async () => {
              const newState = !isSaved;
              setIsSaved(newState);
              if (user?.id && id) {
                try {
                  await recipeService.toggleLikeRecipe(user.id, String(id));
                } catch (err) {
                  console.error("Failed to toggle like:", err);
                  setIsSaved(!newState); // revert
                }
              }
            }}
            size={18}
            className="w-11 h-11 bg-black/30 rounded-full items-center justify-center mr-2"
          />
          <TouchableOpacity 
            className="w-11 h-11 bg-black/30 rounded-full items-center justify-center"
            onPress={() => {
              import("react-native").then(({ Share }) => {
                Share.share({
                  message: `Check out this amazing recipe for ${recipe.title} on FlavourFlow!`,
                  title: recipe.title,
                });
                if (user?.id && id) {
                  recipeService.logInteraction(user.id, String(id), "SHARE").catch(err => 
                    console.error("Failed to log share:", err)
                  );
                }
              });
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
        <View style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}>
          {recipe.videoUrl &&
          youtubeVideoId &&
          recipe.previewVideoStartTime !== undefined &&
          recipe.previewVideoEndTime !== undefined ? (
            <View style={{ width: "100%", height: "100%", overflow: "hidden" }}>
              <YoutubePlayer
                height={HERO_HEIGHT}
                play={true}
                mute={true}
                videoId={youtubeVideoId}
                initialPlayerParams={{
                  controls: false,
                  loop: true,
                  start: recipe.previewVideoStartTime,
                  end: recipe.previewVideoEndTime,
                  showClosedCaptions: false,
                }}
              />
              <View className="absolute top-16 right-5 bg-black/45 px-3 py-1 rounded-full border border-white/20 z-30">
                <Text className="text-white text-[9px] font-jakarta-bold uppercase flex-row items-center">
                  <Feather
                    name="film"
                    size={10}
                    color="#FFFFFF"
                    style={{ marginRight: 4 }}
                  />{" "}
                  Preview Trailer
                </Text>
              </View>
            </View>
          ) : activeVideo && recipe.videoUrl ? (
            <View style={{ width: "100%", height: "100%", overflow: "hidden" }}>
              {youtubeVideoId ? (
                <WebView
                  style={{ width: "100%", height: "100%" }}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  source={{
                    uri: `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&playsinline=1&controls=1`,
                  }}
                />
              ) : (
                <Video
                  source={{ uri: recipe.videoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  onPlaybackStatusUpdate={(status) => {
                    if (
                      status.isLoaded &&
                      !status.isPlaying &&
                      status.didJustFinish
                    ) {
                      setActiveVideo(false);
                    }
                  }}
                />
              )}
              {/* Floating close button for video */}
              <TouchableOpacity
                onPress={() => setActiveVideo(false)}
                className="absolute top-16 right-5 w-8 h-8 bg-black/50 rounded-full items-center justify-center z-30"
              >
                <Feather name="x" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: "100%", height: "100%" }}>
              {/* Carousel swiping list of pictures */}
              <FlatList
                data={
                  recipe.images && recipe.images.length > 0
                    ? recipe.images
                    : [recipe.image]
                }
                keyExtractor={(item, index) => `${item}_${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={{ width: "100%", height: "100%" }}
                renderItem={({ item }) => (
                  <View style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}>
                    <Image
                      source={{ uri: item }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  </View>
                )}
              />

              {/* Swiper dots indicator for multiple pictures */}
              {recipe.images && recipe.images.length > 1 && (
                <View className="absolute bottom-16 left-0 right-0 flex-row justify-center items-center gap-1.5 z-10">
                  {recipe.images.map((_: any, index: number) => (
                    <View
                      key={index}
                      className={cn(
                        "h-1.5 rounded-full",
                        activeImageIndex === index
                          ? "w-4 bg-primary"
                          : "w-1.5 bg-white/60",
                      )}
                    />
                  ))}
                </View>
              )}

              {recipe.videoUrl && (
                <TouchableOpacity
                  onPress={() => setActiveVideo(true)}
                  className="absolute inset-0 items-center justify-center bg-black/10 z-10"
                  activeOpacity={0.8}
                >
                  <View className="w-16 h-16 rounded-full bg-black/45 items-center justify-center border border-white/20 shadow-md">
                    <FontAwesome
                      name="play"
                      size={22}
                      color="#FFFFFF"
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bottom fade gradient */}
          <LinearGradient
            colors={["transparent", "rgba(255,253,245,0.5)", "#FAF5EF"]}
            locations={[0.3, 0.7, 1]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 120,
            }}
          />

          {/* Time Overlay - Right Side Bottom */}
          <View className="absolute bottom-6 right-5 bg-black/40 rounded-full py-1.5 px-3.5 flex-row items-center border border-white/20">
            <Feather
              name="clock"
              size={14}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text className="font-jakarta-semibold text-white text-xs">
              {recipe.time}
            </Text>
          </View>

          {/* Spice Overlay - Left Side Bottom */}
          {recipe.spiceLevel > 0 && (
            <View className="absolute bottom-6 left-5 bg-black/40 rounded-full p-1.5 flex-row items-center border border-white/20">
              <Image
                source={SPICE_IMAGES[Math.min(recipe.spiceLevel, 5)]}
                style={{ width: 20, height: 20 }}
                contentFit="contain"
              />
            </View>
          )}
        </View>

        {/* White Content Sheet */}
        <View
          className="bg-[#FAF5EF] -mt-4 rounded-t-[32px] px-6 pt-10 pb-32"
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
          <View className="flex-row items-center mb-6">
            <Image
              source={{
                uri: recipe.authorAvatar || "https://i.pravatar.cc/150?img=5",
              }}
              className="w-8 h-8 rounded-full bg-gray-100 mr-2"
            />
            <Text className="font-inter-medium text-text-lighter text-sm">
              By {recipe.authorName || "You"}
            </Text>
            <Feather
              name="chevron-right"
              size={14}
              color="#8B7D6F"
              style={{ marginLeft: 2 }}
            />
          </View>

          {/* 3 Blocks Row (Ingredients, Kcl, Serving) */}
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

            {/* Block 2: Kcl */}
            <View className="flex-1 bg-[#FFEAD2] rounded-2xl p-3 mr-2.5 items-center justify-center min-h-[110px]">
              <Image
                source={KCAL_ICON}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
              <Text className="font-jakarta-medium text-text-DEFAULT text-xs text-center mt-2.5">
                {recipe.nutrition?.calories || 320} Kcal
              </Text>
            </View>

            {/* Block 3: Serving */}
            <View className="flex-1 bg-[#FDF0EB] rounded-2xl p-3 items-center justify-center min-h-[110px]">
              <Image
                source={SERVINGS_ICON}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
              <Text className="font-jakarta-medium text-text-DEFAULT text-xs text-center mt-2.5">
                {recipe.servings || 2} Servings
              </Text>
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
                      {ing.amount
                        ? `${ing.amount} ${ing.unit || ""}`
                        : ing.quantity}{" "}
                      {ing.name}
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

                    {/* Action, Heat, Timer Metadata Row */}
                    {(step.action || step.heatSetting || step.hasTimer) && (
                      <View className="flex-row items-center gap-1.5 flex-wrap mt-1">
                        {step.action && (
                          <View className="bg-[#F5E3D8]/50 px-2 py-0.5 rounded-full border border-[#F5E3D8]/80 flex-row items-center">
                            <Text className="text-[#3B3328] font-jakarta-bold text-[8px] uppercase">
                              {step.action}
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
                            <Feather
                              name="clock"
                              size={10}
                              color="#FBA82E"
                              style={{ marginRight: 3 }}
                            />
                            <Text className="text-primary font-jakarta-bold text-[8px] uppercase">
                              {step.timerType === "countdown"
                                ? `${step.timerHours ? `${step.timerHours}h ` : ""}${step.timerMinutes || 0}m`
                                : `${step.targetTime || ""}${step.leaveOvernight ? " (Overnight)" : ""}`}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Linked Ingredients Row */}
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
                                  {ingName}
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
              params: { id: id },
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
