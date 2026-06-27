import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { cn } from "@/utils";
import { HeartButton } from "@/components/ui/heart-button";
import { recipeService, Recipe } from "@/services/recipe.service";
import { useAuth } from "@/hooks/use-auth";

// Prepended "All" to categories list for filter convenience


// Spice level asset images
const SPICE_IMAGES: Record<number, any> = {
  1: require("@/assets/icons/spice_1.png"),
  2: require("@/assets/icons/spice_2.png"),
  3: require("@/assets/icons/spice_3.png"),
  4: require("@/assets/icons/spice_4.png"),
  5: require("@/assets/icons/spice_5.png"),
};

// Popular section categories
const POPULAR_CATEGORIES = [
  { id: "popular", name: "Popular" },
  { id: "most-rated", name: "Most Rated" },
  { id: "quick", name: "Quick Recipes" },
];

export default function CategoryDetailsScreen() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    recipeService.getCategories().then(setCategories).catch(console.error);
  }, []);

  const { category: queryCategory, type: queryType } = useLocalSearchParams<{ category?: string; type?: string }>();
  const { session } = useAuth();
  const userId = session?.user?.id;

  // Determine page mode
  const pageType = queryType || "recommendations";

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (pageType === "popular") return "Popular";
    if (queryCategory) return queryCategory;
    return "All";
  });

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Liked recipe IDs for heart toggle
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Load liked recipe IDs
  useEffect(() => {
    if (userId) {
      recipeService.getLikedRecipeIds(userId)
        .then(setLikedIds)
        .catch(() => {});
    }
  }, [userId]);

  // Fetch recipes based on page type

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchRecipes = async () => {
        setLoading(true);
        try {
          if (pageType === "liked" && userId) {
            const data = await recipeService.getLikedRecipes(userId);
            if (isActive) setRecipes(data);
          } else {
            const data = await recipeService.searchRecipes("");
            if (isActive) setRecipes(data);
          }
        } catch (err) {
          console.error("Failed to load recipes:", err);
        } finally {
          if (isActive) setLoading(false);
        }
      };
      fetchRecipes();
      return () => { isActive = false; };
    }, [pageType, userId])
  );

  // Toggle favorite
  const handleToggleFavorite = useCallback(async (recipeId: string) => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    
    const isNowLiked = await recipeService.toggleLikeRecipe(userId, recipeId);
    setLikedIds(prev => {
      const next = new Set(prev);
      if (isNowLiked) {
        next.add(recipeId);
      } else {
        next.delete(recipeId);
      }
      return next;
    });
  }, [userId]);

  // Page title
  const getPageTitle = () => {
    if (pageType === "liked") return "My Favorites";
    if (pageType === "popular") return "Explore Recipes";
    return "Daily Inspirations";
  };

  // Category tabs based on type
  const getCategoryTabs = () => {
    if (pageType === "liked") return [];
    if (pageType === "popular") return POPULAR_CATEGORIES;
    return [{ id: "all", name: "All" }, ...categories].map(c => ({ id: c.id, name: c.name }));
  };

  // Filter and sort recipes
  const getFilteredRecipes = () => {
    let list = [...recipes];

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q));
    }

    // Apply category/sort filters
    if (pageType === "popular") {
      if (selectedCategory === "Most Rated") {
        list = list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (selectedCategory === "Quick Recipes") {
        list = list.filter(r => r.cookingMinutes <= 30).sort((a, b) => a.cookingMinutes - b.cookingMinutes);
      } else {
        // Popular — sort by oldest (the existing "popular" logic)
        list = list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }
    } else if (pageType !== "liked") {
      // Recommendation category filter
      if (selectedCategory.toLowerCase() !== "all") {
        const searchCat = selectedCategory.toLowerCase();
        list = list.filter(recipe => {
          const tag = (recipe.categoryTag || "").toLowerCase();
          if (tag.includes(searchCat)) return true;
          if (searchCat === "breakfast" && tag.includes("breakfast")) return true;
          if (searchCat === "lunch" && tag.includes("lunch")) return true;
          if (searchCat === "dinner" && tag.includes("dinner")) return true;
          if (searchCat === "midnight snack" && tag.includes("snack")) return true;
          if (searchCat === "quick bites" && tag.includes("quick")) return true;
          return false;
        });
      }
    }

    return list;
  };

  const filteredRecipes = getFilteredRecipes();
  const categoryTabs = getCategoryTabs();

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]">
      {/* Header */}
      <View className="px-6 py-3 flex-row items-center justify-between bg-[#FFFDF5]">
        <TouchableOpacity
          className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100 shadow-sm"
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color="#3B3328" />
        </TouchableOpacity>
        
        <Text className="text-center font-jakarta-bold text-lg text-[#3B3328]">
          {getPageTitle()}
        </Text>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className="w-10 h-10 items-center justify-center"
            onPress={() => {
              setIsSearchVisible(prev => !prev);
              if (isSearchVisible) setSearchQuery("");
            }}
          >
            <Feather name="search" size={20} color="#3B3328" />
          </TouchableOpacity>
          <TouchableOpacity className="w-10 h-10 items-center justify-center">
            <Ionicons name="options-outline" size={20} color="#3B3328" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expandable Search Bar */}
      {isSearchVisible && (
        <View className="px-6 pb-3">
          <View className="flex-row items-center bg-white rounded-full px-4 h-11 border border-gray-100 shadow-sm">
            <Feather name="search" size={16} color="#B5A99A" />
            <TextInput
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search recipes..."
              placeholderTextColor="#B5A99A"
              className="flex-1 ml-2.5 font-jakarta-regular text-sm text-[#3B3328]"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={16} color="#B5A99A" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Category Tabs */}
      {categoryTabs.length > 0 && (
        <View className="border-b border-gray-100/50">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 10 }}
          >
            {categoryTabs.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setSelectedCategory(cat.name);
                  }}
                  activeOpacity={0.8}
                  className={cn(
                    "px-5 py-2 rounded-full mr-2.5 border",
                    isSelected 
                      ? "bg-primary border-primary" 
                      : "bg-[#F5E3D8]/40 border-[#F5E3D8]/50"
                  )}
                >
                  <Text
                    className={cn(
                      "font-jakarta-semibold text-sm",
                      isSelected ? "text-white" : "text-[#8B7D6F]"
                    )}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Recipe Grid Layout */}
        <View className="px-5 pt-4">
          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#FBA82E" />
              <Text className="font-jakarta-semibold text-text-secondary text-sm mt-3">
                Loading recipes...
              </Text>
            </View>
          ) : filteredRecipes.length > 0 ? (
            <View className="flex-row flex-wrap justify-between pb-10">
              {filteredRecipes.map((recipe) => (
                <View key={recipe.id} className="w-[48%]">
                  <CatalogRecipeCard
                    recipe={recipe}
                    isFavorite={likedIds.has(recipe.id)}
                    onToggleFavorite={() => handleToggleFavorite(recipe.id)}
                    onPress={() => router.push(`/recipe-detail?id=${recipe.id}`)}
                  />
                </View>
              ))}
            </View>
          ) : (
            /* Empty State */
            <View className="items-center justify-center py-16 px-4">
              <View className="w-20 h-20 rounded-full bg-[#F5E3D8]/30 items-center justify-center mb-4">
                <Ionicons name="restaurant-outline" size={36} color="#FBA82E" />
              </View>
              <Text className="font-jakarta-bold text-lg text-[#3B3328] text-center mb-1">
                {pageType === "liked" ? "No Favorites Yet" : "No Recipes Found"}
              </Text>
              <Text className="font-inter-regular text-text-secondary text-sm text-center mb-6 leading-5">
                {pageType === "liked" 
                  ? "Tap the heart icon on any recipe to add it to your favorites."
                  : `We are currently crafting new recipes for ${selectedCategory}. Try browsing our other delicious options in the meantime!`}
              </Text>
              {pageType !== "liked" && (
                <TouchableOpacity
                  onPress={() => setSelectedCategory("All")}
                  className="bg-primary px-6 py-3 rounded-full shadow-sm"
                >
                  <Text className="text-white font-jakarta-semibold text-sm">
                    Browse All Categories
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────
// Premium Catalog Recipe Card with Progressive Blur
// ─────────────────────────────────────────────────
function CatalogRecipeCard({
  recipe,
  isFavorite,
  onToggleFavorite,
  onPress,
}: {
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}) {
  const [imageUri, setImageUri] = React.useState(recipe.image);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden mb-4"
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
          source={imageUri === "fallback" ? require("@/assets/images/LogIn_front_photo.webp") : { uri: imageUri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={300}
          onError={() => {
            if (imageUri !== "fallback") {
              setImageUri("fallback");
            }
          }}
        />

        {/* Spice Level (Top Left) */}
        {recipe.spiceLevel > 0 && SPICE_IMAGES[recipe.spiceLevel] && (
          <View className="absolute top-3 left-3 z-10">
            <Image
              source={SPICE_IMAGES[recipe.spiceLevel]}
              style={{ width: 64, height: 32 }}
              contentFit="contain"
            />
          </View>
        )}

        {/* Heart Favorite (Top Right) */}
        <HeartButton
          isLiked={isFavorite}
          onToggle={onToggleFavorite}
          size={20}
          className="absolute top-2.5 right-2.5 z-10 bg-black/30 rounded-full items-center justify-center"
        />

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
    </TouchableOpacity>
  );
}
