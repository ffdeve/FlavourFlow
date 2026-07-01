import { useAuth } from "@/hooks/use-auth";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

// Components
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";
import { CategoryPill } from "@/components/ui/category-pill";
import { PopularRecipeCard } from "@/components/ui/popular-recipe-card";
import { PromotionCarousel } from "@/components/ui/promotion-carousel";
import { RecommendationCard } from "@/components/ui/recommendation-card";
import { SectionRecipeCard } from "@/components/ui/section-recipe-card";
import { FullWidthRecipeCard } from "@/components/ui/full-width-recipe-card";
import { CookingLoader } from "@/components/ui/cooking-loader";
import { ErrorState } from "@/components/ui/error-state";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

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

// ─── Animated lists ─────────────────────────────────────────────────────────
// The home body is a virtualized FlatList (the infinite "More to Explore" feed
// is the data; the sections above are the ListHeaderComponent) so only on-screen
// cards stay mounted — this is what keeps memory flat and scrolling smooth.
const AnimatedFlatList: any = Animated.createAnimatedComponent(FlatList);

// ═══════════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const { profile, user } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const scrollRef = React.useRef<any>(null);
  const isRefreshingRef = React.useRef(false);
  const pullStartY = useSharedValue(0);

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
  const [refreshing, setRefreshing] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Infinite Feed State
  const [feedRecipes, setFeedRecipes] = useState<Recipe[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);

  // ─── Data Loading ───────────────────────────────────────────────────────
  const loadHomeData = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const featured = await recipeService.getFeaturedRecipes(5);
      setFeaturedRecipes(featured);
    } catch (err) {
      console.error("Failed to load homepage recipes from database:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

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

  // Handle toggling favorite on home screen (Optimistic Update)
  const handleToggleFavorite = async (recipeId: string) => {
    if (!user?.id) return;
    
    const wasLiked = likedIds.has(recipeId);

    // Optimistically update the UI immediately
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });

    try {
      // Perform the actual network request in the background
      const isNowLiked = await recipeService.toggleLikeRecipe(
        user.id,
        recipeId,
      );
      
      // If the backend state somehow differs from our optimistic state, reconcile it
      if (isNowLiked === wasLiked) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (isNowLiked) next.add(recipeId);
          else next.delete(recipeId);
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to toggle like on home screen:", err);
      // Revert the optimistic update on failure
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(recipeId);
        else next.delete(recipeId);
        return next;
      });
    }
  };

  // ─── Infinite Feed Logic ────────────────────────────────────────────────
  const isFeedLoadingRef = React.useRef(false);
  const hasMoreFeedRef = React.useRef(true);
  const feedPageRef = React.useRef(1);

  const loadMoreFeed = async () => {
    if (isFeedLoadingRef.current || !hasMoreFeedRef.current) return;
    try {
      console.log(`[Infinite Scroll] Fetching page ${feedPageRef.current}...`);
      isFeedLoadingRef.current = true;
      setIsFeedLoading(true);
      const newRecipes = await recipeService.getFeedRecipes(feedPageRef.current, 6, user?.id);
      console.log(`[Infinite Scroll] Fetched ${newRecipes.length} recipes.`);
      if (newRecipes.length > 0) {
        setFeedRecipes((prev) => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNew = newRecipes.filter(r => !existingIds.has(r.id));
          return [...prev, ...uniqueNew];
        });
        feedPageRef.current += 1;
        setFeedPage(feedPageRef.current);
      }
      if (newRecipes.length < 6) {
        hasMoreFeedRef.current = false;
        setHasMoreFeed(false);
      }
    } catch (err) {
      console.error("Failed to load more feed recipes:", err);
    } finally {
      isFeedLoadingRef.current = false;
      setIsFeedLoading(false);
    }
  };

  // Initial feed load
  useEffect(() => {
    loadMoreFeed();
  }, []);

  // ─── Pull-to-refresh (frypan loader at top of main body, community-style) ──
  const onRefresh = React.useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setRefreshing(true);
    try {
      // Min 1.2s so the frypan animation is actually seen, like community.
      const minWait = new Promise((resolve) => setTimeout(resolve, 1200));

      const tasks: Promise<any>[] = [
        recipeService.getFeaturedRecipes(5).then(setFeaturedRecipes).catch(() => {}),
      ];
      if (user?.id) {
        tasks.push(
          recommendationService
            .getNetflixStyleRecommendations(user.id)
            .then(setRecSections)
            .catch(() => {}),
        );
      }

      // Reset + reload the infinite feed from page 1
      feedPageRef.current = 1;
      hasMoreFeedRef.current = true;
      isFeedLoadingRef.current = false;
      setHasMoreFeed(true);
      const freshFeed = recipeService
        .getFeedRecipes(1, 6, user?.id)
        .then((recipes) => {
          setFeedRecipes(recipes);
          feedPageRef.current = 2;
          setFeedPage(2);
          if (recipes.length < 6) {
            hasMoreFeedRef.current = false;
            setHasMoreFeed(false);
          }
        })
        .catch(() => {});
      tasks.push(freshFeed);

      await Promise.all([...tasks, minWait]);
    } finally {
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [user?.id]);

  // Custom pull-to-refresh: a non-blocking Pan that runs simultaneously with the
  // scroll. Because the scroll has bounces=false, a downward pull AT THE TOP
  // doesn't move the sheet (content is clamped) — so the modal stays fixed and
  // we just trigger the refresh + frypan overlay. Mid-content drags scroll as
  // normal and never trigger (guarded on scrollY ≈ 0).
  const pullGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(15)
        .simultaneousWithExternalGesture(scrollRef)
        .onStart(() => {
          pullStartY.value = scrollY.value;
        })
        .onEnd((e) => {
          // Only a pull that BOTH started and ended at the very top counts as a
          // refresh (so scrolling up to the top from mid-content doesn't fire it).
          if (
            pullStartY.value <= 2 &&
            scrollY.value <= 2 &&
            e.translationY > 80 &&
            e.velocityY > 0
          ) {
            runOnJS(onRefresh)();
          }
        }),
    [onRefresh],
  );

  // ─── Scroll Handler ─────────────────────────────────────────────────────
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;

      // Trigger infinite scroll when within 400px of bottom
      const isCloseToBottom =
        event.layoutMeasurement.height + event.contentOffset.y >=
        event.contentSize.height - 800;

      if (isCloseToBottom) {
        runOnJS(loadMoreFeed)();
      }
    },
  }, []);

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

  // Welcome/location row — collapses as content scrolls inside the modal
  const welcomeCollapseStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP),
      height: interpolate(
        scrollY.value,
        [0, 70],
        [WELCOME_SECTION, 0],
        Extrapolation.CLAMP,
      ),
      overflow: "hidden" as const,
    };
  });

  // Promo carousel — collapses as content scrolls inside the modal
  const carouselCollapseStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, CAROUSEL_SECTION * 0.7],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      height: interpolate(
        scrollY.value,
        [0, CAROUSEL_SECTION],
        [CAROUSEL_SECTION, 0],
        Extrapolation.CLAMP,
      ),
      overflow: "hidden" as const,
    };
  });

  // First load → show a single frypan at the top of the modal (foodpanda-style),
  // instead of the shimmer skeletons, until the main content arrives.
  const initialLoading =
    !refreshing &&
    recommendedRecipes.length === 0 &&
    feedRecipes.length === 0 &&
    (sectionsLoading || recLoading || loading);

  const { isConnected } = useNetworkStatus();
  const handleRetry = React.useCallback(async () => {
    setRetrying(true);
    try {
      await loadHomeData();
    } finally {
      setRetrying(false);
    }
  }, [loadHomeData]);

  // ─── Render ─────────────────────────────────────────────────────────────
  if (
    loadError &&
    !initialLoading &&
    featuredRecipes.length === 0 &&
    recommendedRecipes.length === 0 &&
    feedRecipes.length === 0
  ) {
    return (
      <ErrorState
        variant={isConnected ? "error" : "offline"}
        onRetry={handleRetry}
        retrying={retrying}
      />
    );
  }

  return (
    <Animated.View style={[outerBgStyle, { flex: 1 }]}>
      <StatusBar barStyle="light-content" />

      {/* ═══ FIXED HEADER BAND ═══
          Welcome/location row + search + promo carousel. The row and carousel
          COLLAPSE as content scrolls inside the modal; the search bar stays. */}
      <Animated.View style={[headerBarBgStyle, { paddingTop: insets.top }]}>
        {/* Welcome row — collapses on scroll */}
        <Animated.View style={welcomeCollapseStyle}>
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
                <TouchableOpacity
                  className="items-center justify-center"
                  onPress={() => router.push("/ai-chat")}
                >
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

        {/* Search bar — always visible (docks to top as the rest collapses) */}
        <View style={{ paddingVertical: 4 }}>
          <AnimatedSearchBar onPress={() => router.push("/search")} />
        </View>

        {/* Promo carousel — collapses on scroll */}
        <Animated.View style={carouselCollapseStyle}>
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
        </Animated.View>
      </Animated.View>

      {/* ═══ FIXED MODAL (main body) ═══
          The sheet itself stays put; content scrolls INSIDE it. The frypan
          loader is pinned at the modal's top (full cover on first load, a
          small bar on pull-to-refresh). */}
      <View
        style={{
          flex: 1,
          marginTop: 8, // breathing room between the search header and the sheet
          backgroundColor: "#FFFDF5",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {/* First-load: single frypan covering the modal until content arrives */}
        {initialLoading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "100%",
              backgroundColor: "#FFFDF5",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              alignItems: "center",
              justifyContent: "flex-start",
              paddingTop: 56,
              overflow: "hidden",
              zIndex: 5,
            }}
            pointerEvents="none"
          >
            <CookingLoader scale={0.7} isAnimating />
          </View>
        )}

          <AnimatedFlatList
            ref={scrollRef}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            bounces={true}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            onScrollEndDrag={(e: any) => {
              if (e.nativeEvent.contentOffset.y < -60 && !isRefreshingRef.current) {
                onRefresh();
              }
            }}
            data={feedRecipes}
            keyExtractor={(item: any) => String(item.id)}
            onEndReached={() => loadMoreFeed()}
            onEndReachedThreshold={0.6}
            removeClippedSubviews
            initialNumToRender={4}
            maxToRenderPerBatch={5}
            windowSize={7}
            renderItem={({ item: recipe }: { item: any }) => (
              <View className="px-6">
                <FullWidthRecipeCard
                  title={recipe.title}
                  time={recipe.time}
                  spiceLevel={recipe.spiceLevel}
                  image={recipe.image}
                  ingredientsCount={recipe.ingredientsCount}
                  rating={recipe.rating}
                  onPress={() => router.push(`/recipe-detail?id=${recipe.id}`)}
                  isFavorite={likedIds.has(recipe.id)}
                  onToggleFavorite={() => handleToggleFavorite(recipe.id)}
                />
              </View>
            )}
            ListFooterComponent={
              <View>
                {isFeedLoading && (
                  <View className="py-6 items-center justify-center">
                    <CookingLoader scale={0.8} />
                  </View>
                )}
                <View className="pb-24" />
              </View>
            }
            ListHeaderComponent={
              <View>

          {/* Pull-to-refresh loader — sits ABOVE "Meals to Cook Today", inside the modal */}
          {refreshing && (
            <View
              style={{
                height: 84,
                alignItems: "center",
                justifyContent: "flex-end",
                overflow: "hidden",
                paddingBottom: 4,
              }}
            >
              <CookingLoader scale={0.5} isAnimating />
            </View>
          )}

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
                  className="mt-6"
                >
                  <View className="px-6 mb-4">
                    <Text className="font-inter-semibold text-primary-dark text-xl">
                      {section.title}
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24 }}
                  >
                    {section.recipes.map((recipe) => (
                      <SectionRecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        sectionType={section.id}
                        isLiked={likedIds.has(recipe.id)}
                        onToggleFavorite={() => handleToggleFavorite(recipe.id)}
                        onPress={() =>
                          router.push(`/recipe-detail?id=${recipe.id}`)
                        }
                      />
                    ))}
                  </ScrollView>
                </View>
              ))
          )}

          {/* ─── "More to Explore" heading — the feed itself is the FlatList data ─── */}
          <View className="px-6 mt-6">
            <Text className="font-jakarta-bold text-[18px] text-[#3B3328] mb-4">
              More to Explore
            </Text>
          </View>
              </View>
            }
          />
      </View>
    </Animated.View>
  );
}
