import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

// Components
import { PopularRecipeCard } from "@/components/ui/popular-recipe-card";

// Dummy Data
import { recommendedRecipes } from "@/lib/dummy-data";

export default function CategoryDetailsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]">
      
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity 
          className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100 shadow-sm"
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="flex-1 text-center font-poppins-bold text-lg text-primary-dark mr-10">
          All Recommendations
        </Text>
      </View>

      <ScrollView 
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4">
          <Text className="font-poppins-bold text-2xl text-primary-dark">
            Find what you crave
          </Text>
          <Text className="font-poppins-regular text-text-secondary mt-1">
            Browse all our personalized recommendations for you right now.
          </Text>
        </View>

        {/* Recipe Grid Layout */}
        <View className="flex-row flex-wrap justify-between pb-10">
          {recommendedRecipes.map((recipe, index) => (
            <View key={recipe.id} className="w-[48%] mb-4">
              <PopularRecipeCard
                title={recipe.title}
                time={recipe.time}
                spiceLevel={recipe.spiceLevel}
                image={recipe.image}
                onPress={() => console.log("Press", recipe.title)}
              />
            </View>
          ))}
          
          {/* Repeat dummy data to show scrolling list */}
          {recommendedRecipes.map((recipe, index) => (
            <View key={recipe.id + "_clone"} className="w-[48%] mb-4">
              <PopularRecipeCard
                title={recipe.title}
                time={recipe.time}
                spiceLevel={recipe.spiceLevel}
                image={recipe.image}
                onPress={() => console.log("Press", recipe.title)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
