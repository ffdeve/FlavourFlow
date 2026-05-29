import { Image } from "expo-image";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

interface PopularRecipeCardProps {
  title: string;
  time: string;
  spiceLevel: number;
  image: string;
  onPress: () => void;
}

export const PopularRecipeCard = ({
  title,
  time,
  spiceLevel,
  image,
  onPress,
}: PopularRecipeCardProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden mr-4 p-2 w-48"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <View className="relative w-full h-36 rounded-xl overflow-hidden mb-3">
        <Image source={{ uri: image }} className="w-full h-full" contentFit="cover" />
        
        {/* Spice Level Badge Overlay */}
        {spiceLevel > 0 && (
          <View className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-full flex-row">
            {Array.from({ length: spiceLevel }).map((_, i) => (
              <Text key={i} className="text-xs">🌶️</Text>
            ))}
          </View>
        )}
      </View>

      <View className="px-2 pb-2">
        <Text
          className="font-jakarta-bold text-text text-sm mb-2"
          numberOfLines={2}
        >
          {title}
        </Text>

        <View className="flex-row items-center">
          <Feather name="clock" size={14} color="#8B7D6F" />
          <Text className="font-inter-medium text-text-secondary text-xs ml-1">
            {time}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
