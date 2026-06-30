import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { FrostedImageCard, MetaPill } from "@/components/ui/frosted-recipe-card";

const SPICE_IMAGES: Record<number, any> = {
  1: require("@/assets/icons/spice_1.png"),
  2: require("@/assets/icons/spice_2.png"),
  3: require("@/assets/icons/spice_3.png"),
  4: require("@/assets/icons/spice_4.png"),
  5: require("@/assets/icons/spice_5.png"),
};

interface PopularRecipeCardProps {
  title: string;
  time: string;
  spiceLevel: number;
  image: string;
  ingredientsCount?: number;
  onPress: () => void;
}

export const PopularRecipeCard = ({
  title,
  time,
  spiceLevel,
  image,
  ingredientsCount,
  onPress,
}: PopularRecipeCardProps) => {
  return (
    <FrostedImageCard
      image={image}
      onPress={onPress}
      height={230}
      radius={24}
      blurHeightPct={50}
      activeOpacity={0.85}
      containerClassName="w-60 mr-5"
      contentClassName="px-4 pb-3"
      topLeft={
        spiceLevel > 0 && SPICE_IMAGES[spiceLevel] ? (
          <Image source={SPICE_IMAGES[spiceLevel]} style={{ width: 64, height: 32 }} contentFit="contain" />
        ) : null
      }
    >
      <Text
        className="font-jakarta-extrabold text-[#2A2018] text-[16px] mb-2 leading-[22px]"
        numberOfLines={1}
      >
        {title}
      </Text>
      <View className="flex-row items-center flex-wrap">
        {ingredientsCount != null && (
          <MetaPill>
            <View className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: "#FBA82E" }} />
            <Text className="font-inter-semibold text-[#FBA82E] text-[11px]">{ingredientsCount} Ingredients</Text>
          </MetaPill>
        )}
        <MetaPill>
          <Image source={require("@/assets/icons/recipe_card_time.webp")} style={{ width: 18, height: 18 }} contentFit="contain" />
          <Text className="font-inter-semibold text-[#8B7D6F] text-[11px] ml-1.5">{time}</Text>
        </MetaPill>
      </View>
    </FrostedImageCard>
  );
};
