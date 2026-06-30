import { FrostedControl, FrostedImageCard, MetaPill } from "@/components/ui/frosted-recipe-card";
import { HeartButton } from "@/components/ui/heart-button";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";

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
  onPress,
}: RecommendationCardProps) => {
  return (
    <FrostedImageCard
      image={recipe.image}
      onPress={onPress}
      height={250}
      radius={24}
      blurHeightPct={50}
      activeOpacity={0.9}
      containerClassName="w-[280px] mr-4"
      contentClassName="px-3.5 pb-3.5"
      topLeft={
        recipe.spiceLevel > 0 && SPICE_IMAGES[recipe.spiceLevel] ? (
          <Image source={SPICE_IMAGES[recipe.spiceLevel]} style={{ width: 60, height: 30 }} contentFit="contain" />
        ) : null
      }
      topRight={
        <FrostedControl size={34}>
          <HeartButton isLiked={isLiked} onToggle={onToggleFavorite || (() => {})} size={18} />
        </FrostedControl>
      }
    >
      <Text className="font-jakarta-extrabold text-[#2A2018] text-[16px] mb-2" numberOfLines={1}>
        {recipe.title}
      </Text>
      <View className="flex-row items-center flex-wrap">
        <MetaPill>
          <Feather name="clock" size={11} color="#8B7D6F" />
          <Text className="font-inter-semibold text-[#714d28] text-[11px] ml-1">{recipe.time}</Text>
        </MetaPill>
        <MetaPill>
          <View className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: "#FBA82E" }} />
          <Text className="font-inter-semibold text-[#FBA82E] text-[11px]">{recipe.ingredientsCount} Ingredients</Text>
        </MetaPill>
        <MetaPill>
          <FontAwesome name="star" size={10} color="#FBA82E" />
          <Text className="font-inter-semibold text-[#8B7D6F] text-[11px] ml-1">
            {recipe.rating?.toFixed(1) ?? "4.8"}
          </Text>
        </MetaPill>
      </View>
    </FrostedImageCard>
  );
};
