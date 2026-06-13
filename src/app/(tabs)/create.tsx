import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useIsFocused } from "@react-navigation/native";
import { useAuthStore } from "@/store/auth.store";
import { recipeService } from "@/services/recipe.service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function CreateTabScreen() {
  const user = useAuthStore((state) => state.user);
  const isFocused = useIsFocused();
  
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRecipes = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await recipeService.getUserRecipes(user.id);
      setRecipes(data || []);
    } catch (error: any) {
      console.error("Failed to load user recipes:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadRecipes();
    }
  }, [isFocused]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRecipes(true);
  };

  const handleDeleteRecipe = (recipeId: string, title: string) => {
    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await recipeService.deleteRecipe(recipeId);
              loadRecipes();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete recipe");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]" edges={["top"]}>
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#FBA82E" />
        }
      >
        {/* Create Recipe Banner Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/create-recipe")}
          className="bg-[#FBA82E] rounded-[32px] relative overflow-hidden mb-8 mt-2 shadow-sm flex-row min-h-[140px]"
        >
          {/* Left Side: 70% Text */}
          <View className="w-[70%] p-7 justify-center z-10">
            <Text className="text-[#3B3328] font-jakarta-bold text-[22px] mb-2 leading-7">
              Create Your Own Recipe
            </Text>
            <Text className="text-[#3B3328]/80 font-inter-regular text-xs leading-4 pr-2">
              Start our 5-step wizard to share your culinary masterpiece.
            </Text>
          </View>

          {/* Right Side: 30% Image */}
          <View className="absolute right-0 bottom-0 top-0 w-[40%] justify-end items-end">
            <Image
              source={require("@/assets/icons/create_recipe.webp")}
              style={{ width: "100%", height: "120%", position: "absolute", bottom: -10, right: -10 }}
              contentFit="contain"
            />
          </View>
        </TouchableOpacity>

        {/* Your Recipes Section Header */}
        <View className="flex-row justify-between items-end mb-5 px-1">
          <Text className="font-jakarta-bold text-lg text-[#3B3328]">
            Your Recipes
          </Text>
          <Text className="font-inter-medium text-xs text-[#8B7D6F] mb-0.5">
            {isLoading ? "--" : `${recipes.length} ${recipes.length === 1 ? "Recipe" : "Recipes"}`}
          </Text>
        </View>

        {/* Recipes Grid/List */}
        {isLoading ? (
          <View className="py-20 justify-center items-center">
            <ActivityIndicator size="large" color="#FBA82E" />
          </View>
        ) : recipes.length > 0 ? (
          <View className="pb-10">
            {recipes.map((recipe, index) => (
              <UserRecipeCard
                key={recipe.id}
                index={index}
                recipe={recipe}
                onDelete={() => handleDeleteRecipe(recipe.id, recipe.title)}
                onPress={() => router.push(`/recipe-detail?id=${recipe.id}`)}
              />
            ))}
          </View>
        ) : (
          /* Empty State */
          <View className="items-center justify-center py-16 px-4">
            <View className="w-20 h-20 rounded-full bg-[#F5E3D8]/30 items-center justify-center mb-4">
              <Ionicons name="receipt-outline" size={36} color="#FBA82E" />
            </View>
            <Text className="font-jakarta-bold text-lg text-[#3B3328] text-center mb-1">
              No Recipes Created Yet
            </Text>
            <Text className="font-inter-regular text-text-secondary text-sm text-center mb-6 leading-5">
              Start building your personal cookbook! Tap the banner above to create your first custom recipe.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// User Recipe Card component
function UserRecipeCard({
  recipe,
  index,
  onDelete,
  onPress,
}: {
  recipe: any;
  index: number;
  onDelete: () => void;
  onPress: () => void;
}) {
  const stepsCount = Array.isArray(recipe.steps) ? recipe.steps.length : 0;
  const isEven = index % 2 === 0;

  const handleOptionsPress = () => {
    Alert.alert(
      "Recipe Options",
      `What would you like to do with "${recipe.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Recipe",
          style: "destructive",
          onPress: onDelete,
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      className="bg-white rounded-[32px] overflow-hidden mb-6 border border-[#F5E3D8]/35 shadow-sm"
      style={{
        shadowColor: "#3B3328",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* Image Container with steps overlay */}
      <View className="relative w-full aspect-[16/10] overflow-hidden bg-gray-50">
        <Image
          source={{ uri: recipe.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600" }}
          className="w-full h-full"
          contentFit="cover"
          transition={300}
        />
        
        {/* Steps Overlay (Top Right) */}
        <View className="absolute top-4 right-4 bg-white/90 px-3 py-1.5 rounded-full flex-row items-center border border-white/20 shadow-sm">
          <Ionicons 
            name={isEven ? "image-outline" : "play-circle-outline"} 
            size={14} 
            color="#8B7D6F" 
          />
          <Text className="text-[#8B7D6F] text-[11px] font-jakarta-semibold ml-1.5">
            {stepsCount} {stepsCount === 1 ? "Step" : "Steps"}
          </Text>
        </View>
      </View>

      {/* Details Row */}
      <View className="px-6 py-5">
        <View className="flex-row items-center justify-between mb-3">
          {/* Title */}
          <Text
            className="font-jakarta-bold text-[#3B3328] text-lg flex-1 mr-4 leading-6"
            numberOfLines={1}
          >
            {recipe.title}
          </Text>

          {/* Options dot icon */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleOptionsPress();
            }}
            className="w-8 h-8 items-center justify-center rounded-full bg-gray-50"
            activeOpacity={0.7}
          >
            <Feather name="more-vertical" size={20} color="#3B3328" />
          </TouchableOpacity>
        </View>

        {/* Time Badge (Bottom Left) */}
        <View className="flex-row items-center bg-[#F0EDEB]/60 self-start px-3 py-1.5 rounded-full">
          <Feather name="clock" size={13} color="#8B7D6F" />
          <Text className="text-[#8B7D6F] text-[11px] font-inter-medium ml-1.5">
            {recipe.cook_time || 0} Mins
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
