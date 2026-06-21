import { useAuth } from "@/hooks/use-auth";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Components
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";
import { CategoryPill } from "@/components/ui/category-pill";
import { PopularRecipeCard } from "@/components/ui/popular-recipe-card";
import { PromotionCarousel } from "@/components/ui/promotion-carousel";
import { RecommendationCard } from "@/components/ui/recommendation-card";

// Service & Types
import { Recipe, recipeService } from "@/services/recipe.service";
import { recommendationService } from "@/services/recommendation.service";
import type { RecommendationSection } from "@/types";

// Dummy Data
import { categories } from "@/lib/dummy-data";
import { router } from "expo-router";

// ─── Layout Constants ───────────────────────────────────────────────────────
const CAROUSEL_COLORS = ["#FBA82E", "#F28C28", "#E05252", "#3BB17A", "#4F5CD8"];

// Section heights (tune these to match actual rendered sizes)
const WELCOME_SECTION = 68; // welcome row height + bottom padding
const SEARCH_SECTION = 52; // search bar height + vertical padding
const CAROUSEL_SECTION = 150; // carousel + top/bottom margins (increased to ensure gap)

// Derived constants
const HEADER_BAR_MAX = WELCOME_SECTION + SEARCH_SECTION; // 120px content above carousel
const HEADER_BAR_MIN = SEARCH_SECTION; // 52px just the search bar
const HEADER_CONTENT = HEADER_BAR_MAX + CAROUSEL_SECTION; // 226px total header content

// ─── Animation Phases ───────────────────────────────────────────────────────
// Phase 1 (scroll 0 → CAROUSEL_SECTION): Sheet rises, covers the carousel.
//         Header bar stays at max height. Welcome + search fully visible.
// Phase 2 (scroll CAROUSEL_SECTION → CAROUSEL_SECTION + WELCOME_SECTION):
//         Sheet has fully covered carousel. Now the header bar compresses —
//         welcome text fades out and collapses, search bar docks to top.
// Phase 3 (scroll > CAROUSEL_SECTION + WELCOME_SECTION):
//         Header fully compressed to search-only bar. Sheet content
//         scrolls freely underneath the docked search bar.

const PHASE1_END = CAROUSEL_SECTION; // 106
const PHASE2_END = CAROUSEL_SECTION + WELCOME_SECTION; // 174

// ─── Helpers ────────────────────────────────────────────────────────────────
const getDefaultCategory = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Breakfast";
  if (hour >= 12 && hour < 16) return "Lunch";
  if (hour >= 16 && hour < 23) return "Dinner";
  return "Midnight Snack";
};

// ─── Skeleton Loaders ───────────────────────────────────────────────────────
function RecommendationSkeleton() {
  return (
    <View
      className="bg-white rounded-[24px] overflow-hidden w-[240px] mr-4 border border-gray-100/50 p-3"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View className="w-full h-36 bg-gray-100 rounded-t-[20px] mb-3 animate-pulse opacity-60" />
      <View className="px-1 space-y-2">
        <View className="w-5/6 h-4 bg-gray-200 rounded animate-pulse opacity-70" />
        <View className="flex-row justify-between items-center mt-2">
          <View className="w-1/3 h-3 bg-gray-100 rounded animate-pulse" />
          <View className="w-1/4 h-3 bg-gray-100 rounded animate-pulse" />
        </View>
      </View>
    </View>
  );
}

function PopularSkeleton() {
  return (
    <View
      className="bg-white rounded-2xl overflow-hidden mr-4 p-2 w-48 border border-gray-100/50"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View className="w-full h-28 bg-gray-100 rounded-xl mb-2.5 animate-pulse opacity-60" />
      <View className="px-1 space-y-1.5">
        <View className="w-11/12 h-3.5 bg-gray-200 rounded animate-pulse opacity-70" />
        <View className="w-1/2 h-3 bg-gray-100 rounded animate-pulse" />
      </View>
    </View>
  );
}

// ─── Animated ScrollView ────────────────────────────────────────────────────
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// ═══════════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const { profile, user } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  // Derived layout (depends on insets)
  const SPACER_HEIGHT = insets.top + HEADER_CONTENT;
  const CAROUSEL_TOP = insets.top + HEADER_BAR_MAX;

  // State
  const [selectedCategory, setSelectedCategory] =
    useState(getDefaultCategory());
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [featuredRecipes, setFeaturedRecipes] = useState<Recipe[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [recSections, setRecSections] = useState<RecommendationSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // ─── Data Loading ───────────────────────────────────────────────────────
  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const featured = await recipeService.getFeaturedRecipes(5);
        setFeaturedRecipes(featured);
      } catch (err) {
        console.error("Failed to load homepage recipes from database:", err);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  // Load Netflix-style recommendation sections
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const loadSections = async () => {
      try {
        setSectionsLoading(true);
        const sections = await recommendationService.getNetflixStyleRecommendations(user.id);
        if (active) setRecSections(sections);
      } catch (err) {
        console.error("Failed to load recommendation sections:", err);
      } finally {
        if (active) setSectionsLoading(false);
      }
    };
    loadSections();
    return () => { active = false; };
  }, [user?.id]);

  // Derive "Today's Recommendation" from recSections (meals_to_cook_today), filtered by category
  useEffect(() => {
    const mainSection = recSections.find(s => s.id === "meals_to_cook_today");
    if (mainSection) {
      const filtered = selectedCategory.toLowerCase() === "all"
        ? mainSection.recipes
        : mainSection.recipes.filter(r =>
            r.categoryTag?.toLowerCase().includes(selectedCategory.toLowerCase())
          );
      setRecommendedRecipes(filtered.length > 0 ? filtered : mainSection.recipes);
      setRecLoading(false);
    } else if (!sectionsLoading && user?.id) {
      // Fallback: load from recipe service if no sections
      setRecLoading(true);
      recipeService.getRecommendedRecipes(selectedCategory, 10)
        .then(setRecommendedRecipes)
        .catch(err => console.error("Fallback recommendations failed:", err))
        .finally(() => setRecLoading(false));
    } else if (!user?.id) {
      // Not logged in — use generic recommendations
      setRecLoading(true);
      recipeService.getRecommendedRecipes(selectedCategory, 10)
        .then(setRecommendedRecipes)
        .catch(err => console.error("Guest recommendations failed:", err))
        .finally(() => setRecLoading(false));
    }
  }, [selectedCategory, recSections, sectionsLoading, user?.id]);

  // Load liked recipe IDs
  useEffect(() => {
    if (user?.id) {
      recipeService
        .getLikedRecipeIds(user.id)
        .then(setLikedIds)
        .catch((err) =>
          console.error("Failed to load liked recipes on home screen:", err),
        );
    }
  }, [user?.id]);

  // Handle toggling favorite on home screen
  const handleToggleFavorite = async (recipeId: string) => {
    if (!user?.id) return;
    try {
      const isNowLiked = await recipeService.toggleLikeRecipe(
        user.id,
        recipeId,
      );
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isNowLiked) {
          next.add(recipeId);
        } else {
          next.delete(recipeId);
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to toggle like on home screen:", err);
    }
  };

  // ─── Scroll Handler ─────────────────────────────────────────────────────
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // ─── Animated Styles ────────────────────────────────────────────────────

  // Background color — driven by active carousel slide
  const outerBgStyle = useAnimatedStyle(() => {
    const c =
      CAROUSEL_COLORS[activePromoIndex % CAROUSEL_COLORS.length] || "#FBA82E";
    return { backgroundColor: withTiming(c, { duration: 300 }) };
  });

  // Header bar background (separate instance for the sticky bar)
  const headerBarBgStyle = useAnimatedStyle(() => {
    const c =
      CAROUSEL_COLORS[activePromoIndex % CAROUSEL_COLORS.length] || "#FBA82E";
    return { backgroundColor: withTiming(c, { duration: 300 }) };
  });

  // Header bar border color (for corner masks)
  const headerBarBorderColorStyle = useAnimatedStyle(() => {
    const c =
      CAROUSEL_COLORS[activePromoIndex % CAROUSEL_COLORS.length] || "#FBA82E";
    return { borderColor: withTiming(c, { duration: 300 }) };
  });

  // Header bar height — stays full during Phase 1, compresses during Phase 2
  const headerBarHeightStyle = useAnimatedStyle(() => {
    const contentHeight = interpolate(
      scrollY.value,
      [0, PHASE1_END, PHASE2_END],
      [HEADER_BAR_MAX, HEADER_BAR_MAX, HEADER_BAR_MIN],
      Extrapolation.CLAMP,
    );
    return { height: insets.top + contentHeight };
  });

  // Welcome row — fades out and collapses during Phase 2
  const welcomeAnimStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [PHASE1_END, PHASE2_END - 8],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const height = interpolate(
      scrollY.value,
      [PHASE1_END, PHASE2_END],
      [WELCOME_SECTION, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      height,
      overflow: "hidden" as const,
    };
  });

  // Sticky Bottom Sheet Rounded Corners Mask Style
  const maskStyle = useAnimatedStyle(() => {
    const contentHeight = interpolate(
      scrollY.value,
      [0, PHASE1_END, PHASE2_END],
      [HEADER_BAR_MAX, HEADER_BAR_MAX, HEADER_BAR_MIN],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [PHASE1_END, PHASE2_END],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      top: insets.top + contentHeight,
      opacity,
    };
  });

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[outerBgStyle, { flex: 1 }]}>
      <StatusBar barStyle="light-content" />

      {/* ═══ LAYER 0 (Z:0) — BACKGROUND CAROUSEL ═══
          Fixed in place, does NOT scroll. The white sheet (Layer 1)
          slides over it, occluding it from the bottom up. */}
      <View
        style={{
          position: "absolute",
          top: CAROUSEL_TOP,
          left: 0,
          right: 0,
          zIndex: 0,
        }}
      >
        <View style={{ marginTop: 4, paddingBottom: 4 }}>
          {loading ? (
            <View
              style={{
                height: 110,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : (
            <PromotionCarousel
              recipes={featuredRecipes}
              onIndexChange={setActivePromoIndex}
            />
          )}
        </View>
      </View>

      {/* ═══ LAYER 1 (Z:1) — SCROLLABLE FOREGROUND ═══
          Contains a transparent spacer (reveals carousel behind)
          followed by the white bottom sheet. The sheet slides OVER
          the carousel as the user scrolls up. */}
      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={{ flex: 1, zIndex: 1 }}
      >
        {/* Transparent spacer — matches total header height.
            pointerEvents="box-none" allows taps to pass through
            to the carousel behind while still enabling scroll gestures. */}
        <View style={{ height: SPACER_HEIGHT }} pointerEvents="box-none" />

        {/* White Bottom Sheet */}
        <View
          style={{
            backgroundColor: "#FFFDF5",
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingBottom: 10,
            minHeight: 700,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {/* ── Core AI Section (Meals to Cook Today) ── */}
          <View>
            <View className="px-6 pt-6 flex-row justify-between items-end mb-4">
              <Text className="font-inter-semibold text-primary-dark text-xl">
                {recSections.find(s => s.id === "meals_to_cook_today")?.title || "Meals to Cook Today"}
              </Text>
            </View>

            {/* Category Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24 }}
            >
              {categories.map((category) => (
                <CategoryPill
                  key={category.id}
                  label={category.name}
                  isSelected={selectedCategory === category.name}
                  onPress={() => setSelectedCategory(category.name)}
                />
              ))}
            </ScrollView>

            {/* Recommended Recipes Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingVertical: 16,
                alignItems: "center",
              }}
              className="mt-2"
            >
              {recLoading
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <RecommendationSkeleton key={`rec-shimmer-${idx}`} />
                  ))
                : recommendedRecipes.map((recipe) => (
                    <RecommendationCard
                      key={recipe.id}
                      recipe={recipe}
                      isLiked={likedIds.has(recipe.id)}
                      onToggleFavorite={() => handleToggleFavorite(recipe.id)}
                      onPress={() =>
                        router.push(`/recipe-detail?id=${recipe.id}`)
                      }
                    />
                  ))}

              {!recLoading && (
                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      `/category-details?category=${selectedCategory}`,
                    )
                  }
                  activeOpacity={0.8}
                  className="w-28 h-[200px] ml-2 mr-6 bg-transparent items-center justify-center"
                >
                  <View className="w-14 h-14 rounded-full bg-primary/20 items-center justify-center mb-3">
                    <Feather name="arrow-right" size={26} color="#FBA82E" />
                  </View>
                  <Text className="font-jakarta-semibold text-primary text-sm">
                    See All
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* ── Dynamic Recommendation Sections ── */}
          {sectionsLoading ? (
            // Show skeleton loaders while sections load
            Array.from({ length: 2 }).map((_, sIdx) => (
              <View key={`sec-skeleton-${sIdx}`} className="mt-6">
                <View className="px-6 mb-4">
                  <View className="w-40 h-5 bg-gray-200 rounded animate-pulse opacity-70" />
                  <View className="w-56 h-3 bg-gray-100 rounded mt-2 animate-pulse opacity-50" />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                >
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <PopularSkeleton key={`sec-shimmer-${sIdx}-${idx}`} />
                  ))}
                </ScrollView>
              </View>
            ))
          ) : (
            recSections
              .filter(section => section.id !== "meals_to_cook_today") // main section already shown above
              .map((section, sIdx, arr) => (
                <View
                  key={section.id}
                  className={sIdx === arr.length - 1 ? "mt-6 pb-32" : "mt-6"}
                >
                  <View className="px-6 mb-4">
                    <Text className="font-inter-semibold text-primary-dark text-xl">
                      {section.title}
                    </Text>
                    {section.subtitle && (
                      <Text className="font-inter-regular text-text-secondary/60 text-xs mt-1">
                        {section.subtitle}
                      </Text>
                    )}
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24 }}
                  >
                    {section.recipes.map((recipe) => (
                      <PopularRecipeCard
                        key={recipe.id}
                        title={recipe.title}
                        time={recipe.time}
                        spiceLevel={recipe.spiceLevel}
                        image={recipe.image}
                        ingredientsCount={recipe.ingredientsCount}
                        onPress={() =>
                          router.push(`/recipe-detail?id=${recipe.id}`)
                        }
                      />
                    ))}
                  </ScrollView>
                </View>
              ))
          )}

          {/* Fallback when no sections and not loading */}
          {!sectionsLoading && recSections.filter(s => s.id !== "meals_to_cook_today").length === 0 && (
            <View className="mt-6 pb-32 px-6 items-center">
              <Text className="font-inter-regular text-text-secondary/50 text-sm">
                Interact with recipes to unlock personalized sections!
              </Text>
            </View>
          )}
        </View>
      </AnimatedScrollView>

      {/* ═══ LAYER 2 (Z:2) — STICKY HEADER BAR ═══
          Highest z-index. Contains the welcome row (fades + collapses
          during Phase 2) and the search bar (docks to top).
          pointerEvents="box-none" lets touches pass through empty
          areas to the scroll view below for scrolling. */}
      <Animated.View
        style={[
          headerBarBgStyle,
          headerBarHeightStyle,
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            overflow: "hidden",
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={{ flex: 1, paddingTop: insets.top }}>
          {/* Welcome Row — fades out and collapses during Phase 2 */}
          <Animated.View style={welcomeAnimStyle}>
            <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text className="font-inter-regular text-white/80 text-sm">
                    Welcome Back!
                  </Text>
                  <Text className="font-jakarta-bold text-white text-xl">
                    {profile?.full_name?.split(" ")[0] || "User"}
                  </Text>
                </View>

                {/* Right Icons */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    className="items-center justify-center"
                    onPress={() => router.push("/category-details?type=liked")}
                  >
                    <Image
                      source={require("@/assets/icons/heart_filled.webp")}
                      style={{ width: 48, height: 48 }}
                      contentFit="contain"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity className="items-center justify-center">
                    <Image
                      source={require("@/assets/icons/fridge.webp")}
                      style={{ width: 44, height: 42 }}
                      contentFit="contain"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Search Bar — always visible, docks to top as welcome collapses */}
          <View style={{ paddingVertical: 4 }}>
            <AnimatedSearchBar onPress={() => router.push("/search")} />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
