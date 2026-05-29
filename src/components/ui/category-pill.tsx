import React from "react";
import { Text, TouchableOpacity } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

interface CategoryPillProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

export const CategoryPill = ({ label, isSelected, onPress }: CategoryPillProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className={`px-6 py-3 rounded-full mr-3 ${
        isSelected ? "bg-primary" : "bg-white"
      }`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <Text
        className={`font-poppins-medium text-sm ${
          isSelected ? "text-white" : "text-text"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};
