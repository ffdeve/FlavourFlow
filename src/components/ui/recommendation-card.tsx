import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface Recipe {
  id: string;
  title: string;
  time: string;
  spiceLevel: number;
  image: string;
  rating: number;
  categoryTag: string;
  ingredientsCount: number;
  authorAvatar: string;
}

interface RecommendationCardProps {
  recipe: Recipe;
  onPress?: () => void;
}

export const RecommendationCard = ({ recipe, onPress }: RecommendationCardProps) => {
  const [isSaved, setIsSaved] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="bg-white rounded-[24px] overflow-hidden w-[240px] mr-4 border border-gray-100 shadow-sm"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      {/* Top Image Area with rounded corners and merging gradient at bottom */}
      <View className="relative w-full h-52 bg-gray-100 overflow-hidden rounded-t-[24px]">
        <Image
          source={{ uri: recipe.image }}
          className="w-full h-full"
          contentFit="cover"
        />

        {/* Fading gradient to merge image background into the white text area below */}
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.7)", "#FFFFFF"]}
          locations={[0, 0.6, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 70,
          }}
        />

        {/* Heart Favorite Toggle on Top Right of the Image */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsSaved(!isSaved)}
          className="absolute top-3 right-3 w-8 h-8 bg-black/30 rounded-full items-center justify-center z-10"
        >
          <FontAwesome
            name={isSaved ? "heart" : "heart-o"}
            size={14}
            color={isSaved ? "#FF4B4B" : "#FFFFFF"}
          />
        </TouchableOpacity>
      </View>

      {/* Details Area with padding */}
      <View className="px-4 pt-1.5 pb-4">
        {/* Title */}
        <Text
          className="font-jakarta-bold text-primary-dark text-base mb-2 leading-5"
          numberOfLines={1}
        >
          {recipe.title}
        </Text>

        {/* Ingredients Count and Preparation Time Row */}
        <View className="flex-row items-center justify-between mt-1">
          {/* Ingredients Count (Left) */}
          <Text className="font-inter-medium text-text-secondary/70 text-xs">
            {recipe.ingredientsCount} Ingredients
          </Text>

          {/* Cook Time (Right) */}
          <View className="flex-row items-center">
            <Feather name="clock" size={12} color="#8B7D6F" style={{ marginRight: 4 }} />
            <Text className="font-inter-medium text-text-secondary/70 text-xs">
              {recipe.time}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
