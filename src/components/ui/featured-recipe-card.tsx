import { Image } from "expo-image";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

interface FeaturedRecipeCardProps {
  title: string;
  author: string;
  authorAvatar: string;
  time: string;
  image: string;
  backgroundColor: string;
  onPress: () => void;
}

export const FeaturedRecipeCard = ({
  title,
  author,
  authorAvatar,
  time,
  image,
  backgroundColor,
  onPress,
}: FeaturedRecipeCardProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="rounded-3xl overflow-hidden mr-4"
      style={{
        width: 320,
        height: 180,
        backgroundColor: backgroundColor,
      }}
    >
      {/* Background overlapping image */}
      <View className="absolute right-[-40px] top-0 bottom-0 justify-center h-full w-1/2">
        <Image
          source={image}
          className="w-48 h-48 rounded-full"
          contentFit="cover"
        />
      </View>

      {/* Content */}
      <View className="flex-1 p-5 justify-between w-2/3">
        {/* Title */}
        <Text
          className="font-poppins-bold text-white text-xl leading-tight"
          numberOfLines={3}
        >
          {title}
        </Text>

        {/* Footer */}
        <View className="flex-row items-center justify-between mt-auto">
          {/* Author */}
          <View className="flex-row items-center">
            <Image
              source={authorAvatar}
              className="w-6 h-6 rounded-full mr-2 bg-white/20"
              contentFit="cover"
            />
            <Text className="font-poppins-regular text-white/90 text-xs">
              {author}
            </Text>
          </View>

          {/* Time */}
          <View className="flex-row items-center">
            <Feather name="clock" size={12} color="white" className="mr-1" />
            <Text className="font-poppins-regular text-white text-xs ml-1">
              {time}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
