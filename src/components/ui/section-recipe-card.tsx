import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { HeartButton } from "@/components/ui/heart-button";
import { FrostedControl, FrostedImageCard, MetaPill } from "@/components/ui/frosted-recipe-card";

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
    <FrostedImageCard
      image={recipe.image}
      onPress={onPress}
      height={210}
      radius={20}
      blurHeightPct={50}
      activeOpacity={0.85}
      containerClassName="w-[220px] mr-4"
      contentClassName="px-3 pb-3"
      topLeft={
        recipe.spiceLevel > 0 && SPICE_IMAGES[recipe.spiceLevel] ? (
          <Image source={SPICE_IMAGES[recipe.spiceLevel]} style={{ width: 56, height: 28 }} contentFit="contain" />
        ) : null
      }
      topRight={
        <FrostedControl size={30}>
          <HeartButton isLiked={isLiked} onToggle={onToggleFavorite || (() => {})} size={16} />
        </FrostedControl>
      }
    >
      <Text className="font-jakarta-extrabold text-[#2A2018] text-[15px] mb-1.5" numberOfLines={1}>
        {recipe.title}
      </Text>
      <View className="flex-row items-center flex-wrap">
        <MetaPill>
          <Image source={require("@/assets/icons/recipe_card_time.webp")} style={{ width: 18, height: 18 }} contentFit="contain" />
          <Text className="font-inter-semibold text-[#8B7D6F] text-[11px] ml-1">{recipe.time}</Text>
        </MetaPill>
        {recipe.ingredientsCount != null && (
          <MetaPill>
            <View className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: "#FBA82E" }} />
            <Text className="font-inter-semibold text-[#FBA82E] text-[11px]">{recipe.ingredientsCount} Ingredients</Text>
          </MetaPill>
        )}
      </View>
    </FrostedImageCard>
  );
};
