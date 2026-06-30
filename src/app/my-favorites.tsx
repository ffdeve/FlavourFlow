import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { CookingLoader } from "@/components/ui/cooking-loader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { recipeService, Recipe } from "@/services/recipe.service";
import { useAuth } from "@/hooks/use-auth";
import { RecommendationCard } from "@/components/ui/recommendation-card";

export default function MyFavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = async () => {
    if (!user?.id) return;
    try {
      const data = await recipeService.getLikedRecipes(user.id);
      setFavorites(data);
    } catch (err) {
      console.error("Failed to load favorites", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavorites();
  }, [user?.id]);

  const handleUnlike = async (recipeId: string) => {
    if (!user?.id) return;
    try {
      // Optimistic update
      setFavorites((prev) => prev.filter((r) => r.id !== recipeId));
      await recipeService.toggleLikeRecipe(user.id, recipeId);
    } catch (err) {
      console.error("Failed to unlike", err);
      // Revert if failed
      loadFavorites();
    }
  };

  return (
    <View className="flex-1 bg-[#FFFDF5]">
      {/* Header */}
      <View 
        className="px-6 pb-4 flex-row items-center justify-between border-b border-[#F5E3D8]/50 bg-white"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#FAF5EF] items-center justify-center"
        >
          <Feather name="chevron-left" size={24} color="#3B3328" />
        </TouchableOpacity>
        <Text className="text-xl font-jakarta-bold text-[#3B3328]">
          My Favorites
        </Text>
        <View className="w-10" />
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <CookingLoader scale={0.8} />
          <Text className="mt-4 font-inter-medium text-[#8B7D6F]">Loading your favorites...</Text>
        </View>
      ) : favorites.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-24 h-24 bg-[#FAF5EF] rounded-full items-center justify-center mb-6">
            <Ionicons name="heart-outline" size={48} color="#FBA82E" />
          </View>
          <Text className="text-2xl font-jakarta-bold text-[#3B3328] text-center mb-3">
            No Favorites Yet
          </Text>
          <Text className="text-base font-inter-medium text-[#8B7D6F] text-center mb-8 leading-6">
            Explore our vast collection of recipes and heart the ones you love!
          </Text>
          <TouchableOpacity 
            onPress={() => router.push("/")}
            className="bg-[#FBA82E] px-8 py-4 rounded-full shadow-sm"
          >
            <Text className="text-white font-jakarta-bold text-base">
              Explore Recipes
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FBA82E" />}
        >
          <Text className="font-inter-medium text-[#8B7D6F] mb-6">
            You have {favorites.length} saved recipes
          </Text>
          
          <View className="flex-row flex-wrap justify-between">
            {favorites.map((recipe) => (
              <View key={recipe.id} className="mb-6" style={{ width: "100%" }}>
                {/* Wrap RecommendationCard to stretch full width or center */}
                <View className="items-center">
                  <RecommendationCard
                    recipe={recipe}
                    isLiked={true}
                    onToggleFavorite={() => handleUnlike(recipe.id)}
                    onPress={() => router.push(`/recipe-detail?id=${recipe.id}`)}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
