import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { HeartButton } from "@/components/ui/heart-button";

const SPICE_IMAGES: Record<number, any> = {
  1: require("@/assets/icons/spice_1.png"),
  2: require("@/assets/icons/spice_2.png"),
  3: require("@/assets/icons/spice_3.png"),
  4: require("@/assets/icons/spice_4.png"),
  5: require("@/assets/icons/spice_5.png"),
};

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
  matchScore?: number;
  matchReason?: string;
}

interface RecommendationCardProps {
  recipe: Recipe;
  isLiked?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
}

export const RecommendationCard = ({ 
  recipe, 
  isLiked = false,
  onToggleFavorite,
  onPress 
}: RecommendationCardProps) => {
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
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />

        {/* Spice Level Badge (Top Left) */}
        {recipe.spiceLevel > 0 && SPICE_IMAGES[recipe.spiceLevel] && (
          <View className="absolute top-3 -left-1 z-10">
            <Image
              source={SPICE_IMAGES[recipe.spiceLevel]}
              style={{ width: 64, height: 32 }}
              contentFit="contain"
            />
          </View>
        )}

        {/* Fading gradient to merge image background into the white text area below */}
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.7)", "#FFFFFF"]}
          locations={[0, 0.6, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 35,
          }}
        />

        {/* Heart Favorite Toggle on Top Right of the Image */}
        <HeartButton
          isLiked={isLiked}
          onToggle={onToggleFavorite || (() => {})}
          size={22}
          className="absolute top-2.5 right-2.5 z-10 bg-black/30 rounded-full items-center justify-center"
        />

      </View>

      {/* Details Area with padding */}
      <View className="px-4 pt-2 pb-4">
        {/* Match Reason */}
        {recipe.matchReason && (
          <Text
            className="font-jakarta-bold text-primary text-[9px] uppercase mb-1"
            numberOfLines={1}
          >
            ✨ {recipe.matchReason}
          </Text>
        )}

        {/* Title */}
        <Text
          className="font-jakarta-bold text-primary-dark text-base mb-2 leading-5"
          numberOfLines={1}
        >
          {recipe.title}
        </Text>

        {/* Ingredients Count and Preparation Time Row */}
        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-inter-medium text-text-secondary/70 text-xs">
              {recipe.ingredientsCount} Ingredients
            </Text>
          </View>

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
