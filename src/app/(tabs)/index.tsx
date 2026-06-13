import React, { useState, useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/hooks/use-auth";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";

// Components
import { CategoryPill } from "@/components/ui/category-pill";
import { PopularRecipeCard } from "@/components/ui/popular-recipe-card";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";
import { PromotionCarousel } from "@/components/ui/promotion-carousel";

// Dummy Data
import { featuredRecipes, categories, popularRecipes, recommendedRecipes } from "@/lib/dummy-data";
import { router } from "expo-router";

// Colors for the top container background based on active promotion
const TOP_BACKGROUND_COLORS = ["#FF4B4B", "#4B7BFF", "#FBA82E"];

// Helper to determine the default category based on the current time
const getDefaultCategory = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Breakfast";
  if (hour >= 12 && hour < 16) return "Lunch";
  if (hour >= 16 && hour < 23) return "Dinner";
  return "Midnight Snack";
};

export default function HomeScreen() {
  const { profile } = useAuth();
  
  // Initialize with the time-based default
  const [selectedCategory, setSelectedCategory] = useState(getDefaultCategory());
  const [activePromoIndex, setActivePromoIndex] = useState(0);

  const topBackgroundStyle = useAnimatedStyle(() => {
    // Dynamically grab the background color from the featured recipes
    const activeColor = featuredRecipes[activePromoIndex]?.backgroundColor || "#FBA82E";
    return {
      backgroundColor: withTiming(activeColor, {
        duration: 300,
      }),
    };
  });

  return (
    <Animated.View style={[topBackgroundStyle, { flex: 1 }]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* Dynamic Colored Top Content */}
        <View className="pt-16 pb-2">
          
          {/* Header Section */}
          <View className="px-6 pb-6 flex-row justify-between items-center">
            <View className="flex-row items-center">
              {/* Fridge Icon on Left */}
              <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mr-3">
                <Feather name="box" size={22} color="#FFFFFF" /> 
              </View>
              <View>
                <Text className="font-poppins-regular text-white/80 text-sm">
                  Welcome Back!
                </Text>
                <Text className="font-poppins-bold text-white text-xl">
                  {profile?.full_name || "M.Usman"}
                </Text>
              </View>
            </View>
            
            {/* Heart Icon on Right */}
            <TouchableOpacity 
              className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
              onPress={() => console.log("Navigate to Favorites")}
            >
              <Feather name="heart" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Animated Search Bar */}
          <AnimatedSearchBar onPress={() => router.push("/search")} />

          {/* Promotional Carousel (Now displaying Featured Recipes) */}
          <View className="mt-4">
            <PromotionCarousel onIndexChange={setActivePromoIndex} />
          </View>
        </View>

        {/* Bottom Content Container */}
        <View className="flex-1 bg-[#FFFDF5] rounded-t-3xl pt-8 pb-10 min-h-[600px]">
          
          {/* Today's Recommendation Section (Formerly Category) */}
          <View>
            <View className="px-6 flex-row justify-between items-end mb-4">
              <Text className="font-poppins-bold text-primary-dark text-xl">
                Today's Recommendation
              </Text>
            </View>
            
            {/* Category Pills acting as tabs */}
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
              contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center' }}
              className="mt-2"
            >
              {recommendedRecipes.map((recipe) => (
                <PopularRecipeCard
                  key={recipe.id}
                  title={recipe.title}
                  time={recipe.time}
                  spiceLevel={recipe.spiceLevel}
                  image={recipe.image}
                  onPress={() => console.log("Press", recipe.title)}
                />
              ))}
              
              {/* "See All" Appendage Card */}
              <TouchableOpacity
                onPress={() => router.push("/category-details")}
                activeOpacity={0.8}
                className="w-32 h-[200px] ml-2 mr-6 bg-white rounded-3xl border-2 border-gray-100 items-center justify-center shadow-sm"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mb-3">
                  <Feather name="arrow-right" size={24} color="#FBA82E" />
                </View>
                <Text className="font-poppins-medium text-primary-dark">
                  See All
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Popular Recipes Section */}
          <View className="mt-6 pb-32">
            <View className="px-6 flex-row justify-between items-end mb-4">
              <Text className="font-poppins-bold text-primary-dark text-xl">
                Popular Recipes
              </Text>
              <TouchableOpacity>
                <Text className="font-poppins-medium text-primary text-sm">
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24 }}
            >
              {popularRecipes.map((recipe) => (
                <PopularRecipeCard
                  key={recipe.id}
                  title={recipe.title}
                  time={recipe.time}
                  spiceLevel={recipe.spiceLevel}
                  image={recipe.image}
                  onPress={() => console.log("Press", recipe.title)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}
