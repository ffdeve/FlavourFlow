import React from "react";
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

interface SectionRecipeCardProps {
  recipe: {
    id: string;
    title: string;
    time: string;
    spiceLevel: number;
    image: string;
    ingredientsCount: number;
    rating?: number;
    matchScore?: number;
  };
  sectionType: string;
  isLiked?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
}

export const SectionRecipeCard = ({
  recipe,
  sectionType,
  isLiked = false,
  onToggleFavorite,
  onPress,
}: SectionRecipeCardProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="bg-white rounded-[24px] overflow-hidden mr-4 w-[220px]"
      style={{
        shadowColor: "#3B3328",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        borderWidth: 1,
        borderColor: "rgba(245, 227, 216, 0.35)",
      }}
    >
      {/* Image Area */}
      <View className="relative w-full h-40 overflow-hidden rounded-t-[24px]">
        <Image
          source={{ uri: recipe.image }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />

        {/* Spice Badge (Top Left) */}
        {recipe.spiceLevel > 0 && SPICE_IMAGES[recipe.spiceLevel] && (
          <View className="absolute top-2.5 -left-1 z-10">
            <Image
              source={SPICE_IMAGES[recipe.spiceLevel]}
              style={{ width: 56, height: 28 }}
              contentFit="contain"
            />
          </View>
        )}

        {/* Heart Favorite Toggle (Top Right) */}
        <HeartButton
          isLiked={isLiked}
          onToggle={onToggleFavorite || (() => {})}
          size={18}
          className="absolute top-2.5 right-2.5 z-10 bg-black/30 rounded-full items-center justify-center"
        />

        {/* Gradient fade into content */}
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.6)", "#FFFFFF"]}
          locations={[0, 0.65, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "30%",
          }}
        />
      </View>

      {/* Content Area */}
      <View className="px-3.5 pb-3.5 -mt-1">
        <Text
          className="font-jakarta-bold text-[#3B3328] text-[15px] mb-2 leading-[20px]"
          numberOfLines={2}
        >
          {recipe.title}
        </Text>

        <View className="flex-row items-center justify-between">
          {recipe.ingredientsCount != null && (
            <View className="bg-[#FAF5EF] px-2 py-0.5 rounded-md">
              <Text className="font-inter-semibold text-[#FBA82E] text-[10px]">
                {recipe.ingredientsCount} Ingredients
              </Text>
            </View>
          )}
          <View className="flex-row items-center bg-[#FAF5EF] px-2 py-0.5 rounded-md">
            <Feather name="clock" size={10} color="#8B7D6F" />
            <Text className="font-inter-semibold text-[#8B7D6F] text-[10px] ml-1">
              {recipe.time}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
