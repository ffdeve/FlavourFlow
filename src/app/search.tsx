import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Keyboard,
  Animated,
  ViewToken,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { recipeService, Recipe } from "@/services/recipe.service";
import { cn } from "@/utils";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/use-auth";

// Spice level asset images
const SPICE_IMAGES: Record<number, any> = {
  1: require("@/assets/icons/spice_1.png"),
  2: require("@/assets/icons/spice_2.png"),
  3: require("@/assets/icons/spice_3.png"),
  4: require("@/assets/icons/spice_4.png"),
  5: require("@/assets/icons/spice_5.png"),
};

// Unified recipe structure mapped from service type
interface UnifiedRecipe {
  id: string;
  title: string;
  description: string;
  time: string;
  totalMinutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  spiceLevel: number;
  image: string;
  rating: string;
  authorName: string;
  authorAvatar: string;
  categoryTag: string;
  ingredientsCount: number;
  ingredients: { name: string; quantity: string }[];
  cuisineType?: string | null;
}

export default function SearchScreen() {
  const { preferences, user } = useAuth();
  const allergies = preferences?.allergies || [];
  const dislikes = preferences?.dislikes || [];
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    recipeService.getCategories().then(setCategories).catch(console.error);
  }, []);

  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [selectedTimeLimit, setSelectedTimeLimit] = useState<number | null>(null); // max minutes
  const [selectedSpice, setSelectedSpice] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Collapsible animation ref
  const filterAnim = useRef(new Animated.Value(0)).current;

  // Impression tracking
  const impressedIds = useRef(new Set<string>());
  
  const handleViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!user?.id) return;
    const newImpressions: string[] = [];
    viewableItems.forEach(({ item }) => {
      const recipe = item as Recipe;
      if (!impressedIds.current.has(recipe.id)) {
        impressedIds.current.add(recipe.id);
        newImpressions.push(recipe.id);
      }
    });
    if (newImpressions.length > 0) {
      recipeService.logImpressions(user.id, newImpressions).catch(err => 
        console.error("Failed to log impressions:", err)
      );
    }
  }, [user?.id]);

  // Fetch recipes from DB on mount
  useEffect(() => {
    const fetchAllRecipes = async () => {
      setLoading(true);
      try {
        const data = await recipeService.searchRecipes("");
        setRecipes(data);
      } catch (err) {
        console.error("Failed to load search recipes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllRecipes();
  }, []);

  // Map service Recipes to UnifiedRecipes
  const allRecipes = useMemo((): UnifiedRecipe[] => {
    return recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description || "",
      time: recipe.time,
      totalMinutes: (recipe.prepTime || 0) + (recipe.cookingMinutes || 15),
      difficulty: recipe.difficulty,
      spiceLevel: recipe.spiceLevel || 0,
      image: recipe.image,
      rating: recipe.rating.toString(),
      authorName: recipe.authorName,
      authorAvatar: recipe.authorAvatar,
      categoryTag: recipe.categoryTag,
      ingredientsCount: recipe.ingredientsCount || 0,
      ingredients: recipe.ingredients || [],
      cuisineType: recipe.cuisine_type || "",
    }));
  }, [recipes]);

  // Compute filtered search list
  const filteredRecipes = useMemo(() => {
    return allRecipes.filter((recipe) => {
      // 1. Text Search matching title or description
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = recipe.title.toLowerCase().includes(query);
        const matchesDesc = recipe.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 2. Max Cook Time Filter
      if (selectedTimeLimit) {
        if (recipe.totalMinutes > selectedTimeLimit) {
          return false;
        }
      }

      // 3. Spice Level Filter
      if (selectedSpice !== null) {
        if (recipe.spiceLevel !== selectedSpice) {
          return false;
        }
      }

      return true;
    });
  }, [allRecipes, searchQuery, selectedTimeLimit, selectedSpice]);

  // Animate Expand/Collapse filters panel
  const toggleFilterPanel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const toValue = showFilters ? 0 : 1;
    setShowFilters(!showFilters);
    Animated.timing(filterAnim, {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const clearAllFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedTimeLimit(null);
    setSelectedSpice(null);
  };

  const activeFiltersCount =
    (selectedTimeLimit ? 1 : 0) +
    (selectedSpice !== null ? 1 : 0);

  // Height animation style
  const filterPanelHeight = filterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 175], // Adjusted height for Cook Time + Spice Level
  });

  return (
    <View className="flex-1 bg-[#FAF5EF]" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      {/* Header Search Box */}
      <View className="px-5 py-3 flex-row items-center border-b border-primary/10 bg-[#FAF5EF]">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-10 h-10 items-center justify-center bg-white rounded-full border border-gray-200/50 shadow-sm mr-3"
        >
          <Feather name="arrow-left" size={20} color="#3B3328" />
        </TouchableOpacity>

        {/* Text Input Container */}
        <View className="flex-1 flex-row items-center bg-white border border-gray-200/60 rounded-full px-3 h-11 relative">
          <Feather name="search" size={16} color="#8B7D6F" className="mr-2" />
          <TextInput
            placeholder="Search recipes, ingredients..."
            placeholderTextColor="#B5A99A"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 font-jakarta-medium text-text text-sm h-full pt-0.5"
            autoFocus
            clearButtonMode="while-editing"
            returnKeyType="search"
            onSubmitEditing={() => {
              Keyboard.dismiss();
              if (user?.id && searchQuery) {
                recipeService.logSearchQuery(user.id, searchQuery).catch(err => 
                  console.error("Failed to log search query:", err)
                );
              }
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1">
              <Ionicons name="close-circle" size={16} color="#B5A99A" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Toggle Button */}
        <TouchableOpacity
          onPress={toggleFilterPanel}
          activeOpacity={0.7}
          className={cn(
            "w-11 h-11 items-center justify-center rounded-full ml-3 border shadow-sm relative",
            showFilters || activeFiltersCount > 0
              ? "bg-primary border-primary"
              : "bg-white border-gray-200/50"
          )}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={showFilters || activeFiltersCount > 0 ? "#FFFFFF" : "#3B3328"}
          />
          {activeFiltersCount > 0 && !showFilters && (
            <View className="absolute -top-1.5 -right-1.5 bg-red-500 w-5 h-5 rounded-full items-center justify-center border-2 border-[#FAF5EF]">
              <Text className="text-white text-[9px] font-poppins-bold">
                {activeFiltersCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Advanced Filter Collapsible Section */}
      <Animated.View style={{ height: filterPanelHeight, overflow: "hidden" }} className="bg-white border-b border-primary/5">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}
        >
          {/* Header Row */}
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-poppins-semibold text-xs text-text-secondary uppercase tracking-wider">
              Advanced Filters
            </Text>
            {activeFiltersCount > 0 && (
              <TouchableOpacity onPress={clearAllFilters} activeOpacity={0.7}>
                <Text className="font-jakarta-semibold text-xs text-primary">
                  Clear All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 1. Cook Time filters */}
          <Text className="font-jakarta-medium text-xs text-text-tertiary mb-2">Cooking Time</Text>
          <View className="flex-row gap-2 mb-4">
            {[
              { label: "< 15 Mins", value: 15 },
              { label: "< 30 Mins", value: 30 },
              { label: "< 45 Mins", value: 45 },
            ].map((time) => {
              const isSelected = selectedTimeLimit === time.value;
              return (
                <TouchableOpacity
                  key={time.value}
                  onPress={() => setSelectedTimeLimit(isSelected ? null : time.value)}
                  activeOpacity={0.8}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl border items-center shadow-sm",
                    isSelected ? "bg-primary border-primary" : "bg-[#F5E3D8]/30 border-[#F5E3D8]/40"
                  )}
                >
                  <Text className={cn("font-jakarta-semibold text-xs", isSelected ? "text-white" : "text-[#8B7D6F]")}>
                    {time.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. Spice Level filter */}
          <Text className="font-jakarta-medium text-xs text-text-tertiary mb-2">Spice Level</Text>
          <View className="flex-row gap-2">
            {[0, 1, 2, 3, 4, 5].map((lvl) => {
              const isSelected = selectedSpice === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => setSelectedSpice(isSelected ? null : lvl)}
                  activeOpacity={0.8}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl border items-center justify-center shadow-sm h-10",
                    isSelected ? "bg-primary border-primary" : "bg-[#F5E3D8]/30 border-[#F5E3D8]/40"
                  )}
                >
                  {lvl === 0 ? (
                    <Text className={cn("font-jakarta-bold text-xs", isSelected ? "text-white" : "text-[#8B7D6F]")}>
                      None
                    </Text>
                  ) : (
                    <Image
                      source={SPICE_IMAGES[lvl]}
                      style={{ width: 40, height: 20, tintColor: isSelected ? "#FFFFFF" : undefined }}
                      contentFit="contain"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Results Container */}
      <FlatList
        className="flex-1"
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        ListHeaderComponent={
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-jakarta-semibold text-sm text-[#8B7D6F]">
              {filteredRecipes.length} {filteredRecipes.length === 1 ? "recipe" : "recipes"} found
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20 px-4">
            <View className="w-20 h-20 rounded-full bg-[#F5E3D8]/30 items-center justify-center mb-4">
              <Ionicons name="search-outline" size={40} color="#FBA82E" />
            </View>
            <Text className="font-jakarta-bold text-lg text-[#3B3328] text-center mb-1">
              No Recipes Found
            </Text>
            <Text className="font-inter-regular text-[#8B7D6F] text-sm text-center mb-6 leading-5">
              We couldn't find any recipes matching your current search or filter criteria. Try adjusting your settings or clearing query!
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                clearAllFilters();
              }}
              className="bg-primary px-6 py-3 rounded-full shadow-sm"
            >
              <Text className="text-white font-jakarta-semibold text-sm">
                Reset All Search & Filters
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: recipe }) => {
          const matchedAllergy = recipe.ingredients.find((ing) =>
            allergies.some((allergyName) =>
              ing.name.toLowerCase().includes(allergyName.toLowerCase())
            )
          );
          const hasAllergy = !!matchedAllergy;
          const allergyName = matchedAllergy?.name || "";

          const matchedDislikedIngredient = recipe.ingredients.find((ing) =>
            dislikes.some((dislikeName) =>
              ing.name.toLowerCase().includes(dislikeName.toLowerCase())
            )
          );
          const isDislikedCuisine = dislikes.some((dislikeName) =>
            recipe.cuisineType?.toLowerCase() === dislikeName.toLowerCase()
          );

          const hasDislike = !!matchedDislikedIngredient || isDislikedCuisine;
          const dislikeName = matchedDislikedIngredient
            ? matchedDislikedIngredient.name
            : isDislikedCuisine
            ? recipe.cuisineType || ""
            : "";

          return (
            <View className="w-[48%]">
              <SearchRecipeCard
                recipe={recipe}
                hasAllergy={hasAllergy}
                allergyName={allergyName}
                hasDislike={hasDislike}
                dislikeName={dislikeName}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  if (user?.id) {
                    recipeService.logInteraction(user.id, recipe.id, "SEARCH_CLICK").catch(err => 
                      console.error("Failed to log search click:", err)
                    );
                  }
                  router.push(`/recipe-detail?id=${recipe.id}`);
                }}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

// Compact Search Result Recipe Card
function SearchRecipeCard({
  recipe,
  onPress,
  hasAllergy,
  allergyName,
  hasDislike,
  dislikeName,
}: {
  recipe: UnifiedRecipe;
  onPress: () => void;
  hasAllergy: boolean;
  allergyName: string;
  hasDislike: boolean;
  dislikeName: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={hasAllergy || hasDislike ? 1.0 : 0.9}
      onPress={hasAllergy || hasDislike ? undefined : onPress}
      className="bg-white rounded-2xl overflow-hidden mb-4 relative"
      style={{
        shadowColor: "#3B3328",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* Image Container */}
      <View className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
        <Image
          source={{ uri: recipe.image }}
          className="w-full h-full"
          contentFit="cover"
          transition={300}
        />

        {/* Spice Level (Top Left) */}
        {recipe.spiceLevel > 0 && SPICE_IMAGES[recipe.spiceLevel] && (
          <View className="absolute top-2.5 left-2.5 z-10">
            <Image
              source={SPICE_IMAGES[recipe.spiceLevel]}
              style={{ width: 36, height: 18 }}
              contentFit="contain"
            />
          </View>
        )}

        {/* Rating overlay (Top Right) */}
        <View className="absolute top-2.5 right-2.5 bg-black/45 px-1.5 py-0.5 rounded-full flex-row items-center backdrop-blur-md z-10">
          <Ionicons name="star" size={8} color="#FBA82E" />
          <Text className="text-white text-[8px] font-jakarta-semibold ml-0.5">
            {recipe.rating}
          </Text>
        </View>

        {/* Progressive Blur Gradient to White */}
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.4)", "rgba(255,255,255,0.85)", "#FFFFFF"]}
          locations={[0, 0.4, 0.75, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "50%",
          }}
        />
      </View>

      {/* White Content Area */}
      <View className="px-3 pb-3 bg-white -mt-1">
        {/* Title */}
        <Text
          className="font-jakarta-bold text-[#3B3328] text-[13px] mb-2 leading-[17px]"
          numberOfLines={2}
          style={{ height: 34 }}
        >
          {recipe.title}
        </Text>

        {/* Bottom Info Row */}
        <View className="flex-row items-center justify-between">
          <Text className="font-inter-medium text-[#8B7D6F] text-[10px]">
            {recipe.ingredientsCount} Ingredients
          </Text>
          <View className="flex-row items-center">
            <Feather name="clock" size={10} color="#8B7D6F" />
            <Text className="font-inter-medium text-[#8B7D6F] text-[10px] ml-1">
              {recipe.time}
            </Text>
          </View>
        </View>
      </View>

      {/* Warning Overlay */}
      {(hasAllergy || hasDislike) && (
        <View
          className={cn(
            "absolute inset-0 z-30 justify-center items-center p-3 rounded-2xl",
            hasAllergy ? "bg-red-500/95" : "bg-neutral-800/95"
          )}
        >
          <Ionicons
            name={hasAllergy ? "alert-circle-outline" : "warning-outline"}
            size={26}
            color="#FFFFFF"
            style={{ marginBottom: 4 }}
          />
          <Text className="text-white font-jakarta-bold text-center text-[11px] leading-4 mb-0.5">
            {hasAllergy ? "Contains Allergen!" : "Contains Dislike"}
          </Text>
          <Text className="text-white/80 font-inter-regular text-center text-[9px] leading-3 mb-3 px-1">
            {hasAllergy ? `This recipe contains ${allergyName}.` : `Contains disliked ${dislikeName}.`}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            className="bg-white/20 border border-white/40 px-3 py-1.5 rounded-full"
          >
            <Text className="text-white font-jakarta-semibold text-[9px]">
              View Recipe Anyway
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}
