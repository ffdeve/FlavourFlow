import { Image } from "expo-image";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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
  const [imageUri, setImageUri] = React.useState(image);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-white rounded-[24px] overflow-hidden mr-5 w-60"
      style={{
        shadowColor: "#FBA82E",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 5,
        borderWidth: 1,
        borderColor: "rgba(245, 227, 216, 0.4)"
      }}
    >
      {/* Image Area with overlays */}
      <View className="relative w-full h-44 bg-gray-100 overflow-hidden">
        <Image 
          source={imageUri === "fallback" ? require("@/assets/images/LogIn_front_photo.webp") : { uri: imageUri }} 
          className="w-full h-full" 
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
          <View className="absolute top-2.5 -left-1 z-10">
            <Image
              source={SPICE_IMAGES[spiceLevel]}
              style={{ width: 64, height: 32 }}
              contentFit="contain"
            />
          </View>
        )}

        {/* Progressive blur — image fading into the white card below */}
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.4)", "rgba(255,255,255,0.85)", "#FFFFFF"]}
          locations={[0, 0.4, 0.75, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "25%",
          }}
        />
      </View>

      {/* White Content Area */}
      <View className="px-4 pb-4 -mt-2">
        <Text
          className="font-jakarta-extrabold text-[#3B3328] text-[16px] mb-2.5 leading-[22px]"
          numberOfLines={2}
        >
          {title}
        </Text>
        <View className="flex-row items-center justify-between">
          {ingredientsCount != null && (
            <View className="bg-[#FAF5EF] px-2 py-1 rounded-md">
              <Text className="font-inter-semibold text-[#FBA82E] text-[11px]">
                {ingredientsCount} Ingredients
              </Text>
            </View>
          )}
          <View className="flex-row items-center bg-[#FAF5EF] px-2 py-1 rounded-md">
            <Feather name="clock" size={12} color="#8B7D6F" />
            <Text className="font-inter-semibold text-[#8B7D6F] text-[11px] ml-1.5">
              {time}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
