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

export interface FullWidthRecipeCardProps {
  title: string;
  time: string;
  spiceLevel: number;
  image: string;
  ingredientsCount: number;
  rating?: number;
  reviews?: number;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const FullWidthRecipeCard = ({
  title,
  time,
  spiceLevel,
  image,
  ingredientsCount,
  rating = 4.8,
  onPress,
  isFavorite = false,
  onToggleFavorite,
}: FullWidthRecipeCardProps) => {
  return (
    <FrostedImageCard
      image={image}
      onPress={onPress}
      aspectRatio={1.5}
      radius={24}
      blurHeightPct={50}
      containerClassName="w-full mb-6"
      contentClassName="px-4 pb-4"
      topLeft={
        spiceLevel > 0 && SPICE_IMAGES[spiceLevel] ? (
          <Image source={SPICE_IMAGES[spiceLevel]} style={{ width: 64, height: 32 }} contentFit="contain" />
        ) : null
      }
      topRight={
        <>
          <FrostedControl size={34} style={{ marginRight: 8 }}>
            <HeartButton isLiked={isFavorite} onToggle={onToggleFavorite || (() => {})} size={18} />
          </FrostedControl>
          <FrostedControl size={34} onPress={onPress} style={{ backgroundColor: "#2A2018" }}>
            <Feather name="arrow-up-right" size={18} color="#FFFFFF" />
          </FrostedControl>
        </>
      }
    >
      <Text className="font-jakarta-extrabold text-[#2A2018] text-[18px] mb-2" numberOfLines={1}>
        {title}
      </Text>
      <View className="flex-row items-center flex-wrap">
        <MetaPill>
          <Image source={require("@/assets/icons/recipe_card_time.webp")} style={{ width: 18, height: 18 }} contentFit="contain" />
          <Text className="font-inter-semibold text-[#8B7D6F] text-[12px] ml-1.5">{time}</Text>
        </MetaPill>
        <MetaPill>
          <View className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: "#FBA82E" }} />
          <Text className="font-inter-semibold text-[#FBA82E] text-[12px]">{ingredientsCount} Ingredients</Text>
        </MetaPill>
      </View>
    </FrostedImageCard>
  );
};
