import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { HeartButton } from "@/components/ui/heart-button";
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
  reviews = 500,
  onPress,
  isFavorite = false,
  onToggleFavorite,
}: FullWidthRecipeCardProps) => {
  const [imageUri, setImageUri] = React.useState(image);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="w-full mb-6"
    >
      {/* Top Image Area */}
      <View className="relative w-full h-64 bg-gray-100 rounded-[20px] overflow-hidden mb-3">
        <Image
          source={imageUri === "fallback" ? require("@/assets/images/LogIn_front_photo.webp") : { uri: imageUri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={300}
          onError={() => {
            if (imageUri !== "fallback") {
              setImageUri("fallback");
            }
          }}
        />

        {/* Spice Level Badge (Top Left) */}
        {spiceLevel > 0 && SPICE_IMAGES[spiceLevel] && (
          <View className="absolute top-3 left-3 z-10">
            <Image
              source={SPICE_IMAGES[spiceLevel]}
              style={{ width: 64, height: 32 }}
              contentFit="contain"
            />
          </View>
        )}

        {/* Heart Favorite Toggle (Top Right) */}
        <HeartButton
          isLiked={isFavorite}
          onToggle={onToggleFavorite || (() => {})}
          size={18}
          className="absolute top-2.5 right-2.5 z-10 bg-black/30 rounded-full items-center justify-center"
        />
      </View>

      {/* Content Area */}
      <View className="px-1">
        {/* Title Row */}
        <View className="flex-row justify-between items-start mb-1">
          <Text
            className="font-jakarta-bold text-[#3B3328] text-[16px] flex-1 mr-2"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Subtitle Details */}
        <View className="flex-row items-center">
          <Text className="font-inter-medium text-gray-500 text-[13px]">
            {time} • {ingredientsCount} Ingredients
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
