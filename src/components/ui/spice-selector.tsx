import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface SpiceSelectorProps {
  value: number; // 1 to 5
  onChange: (value: number) => void;
}

const SPICE_LEVELS = [
  { level: 1, title: "Mild & Mellow", subtitle: "Just a gentle warmth", colors: ["#FFD54F", "#FFC107"] }, // Yellow
  { level: 2, title: "Warming Up", subtitle: "A pleasant kick", colors: ["#FFB74D", "#FF9800"] },       // Light Orange
  { level: 3, title: "Getting Spicy", subtitle: "The sweet spot for most", colors: ["#FF8A65", "#FF5722"] }, // Dark Orange/Red
  { level: 4, title: "Fiery!", subtitle: "For the adventurous palate", colors: ["#E57373", "#F44336"] },     // Red
  { level: 5, title: "Inferno! 🔥", subtitle: "Maximum heat, maximum flavor", colors: ["#D32F2F", "#B71C1C"] }, // Dark Red
];

export default function SpiceSelector({ value, onChange }: SpiceSelectorProps) {
  const currentLevel = SPICE_LEVELS[value - 1] || SPICE_LEVELS[2];

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const handleDecrease = () => {
    if (value > 1) {
      triggerHaptic();
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < 5) {
      triggerHaptic();
      onChange(value + 1);
    }
  };

  return (
    <View className="w-full py-6 items-center px-4 bg-white/40 rounded-3xl border border-primary/10">
      {/* Selector controls: Minus, Segments, Plus */}
      <View className="flex-row items-center justify-between w-full mb-6">
        {/* Decrease Button */}
        <Pressable
          onPress={handleDecrease}
          disabled={value <= 1}
          className={`w-12 h-12 rounded-full items-center justify-center border ${
            value <= 1 
              ? "border-black/5 bg-transparent opacity-40" 
              : "border-primary bg-primary/5 active:bg-primary/20"
          }`}
        >
          <FontAwesome6 name="minus" size={16} color={value <= 1 ? "#8B7D6F" : "#FBA82E"} />
        </Pressable>

        {/* Segments */}
        <View className="flex-1 flex-row justify-center gap-1.5 px-4">
          {[1, 2, 3, 4, 5].map((level) => {
            const isFilled = level <= value;
            
            // Get gradient colors for this level segment
            const colors = SPICE_LEVELS[level - 1].colors;

            return (
              <View 
                key={level} 
                className="flex-1 h-3.5 rounded-full overflow-hidden bg-black/10"
              >
                {isFilled && (
                  <LinearGradient
                    colors={colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="w-full h-full"
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Increase Button */}
        <Pressable
          onPress={handleIncrease}
          disabled={value >= 5}
          className={`w-12 h-12 rounded-full items-center justify-center border ${
            value >= 5 
              ? "border-black/5 bg-transparent opacity-40" 
              : "border-primary bg-primary/5 active:bg-primary/20"
          }`}
        >
          <FontAwesome6 name="plus" size={16} color={value >= 5 ? "#8B7D6F" : "#FBA82E"} />
        </Pressable>
      </View>

      {/* Dynamic Descriptive Text */}
      <View className="items-center px-4">
        <Text className="text-xl font-poppins-bold text-text mb-1">
          {currentLevel.title}
        </Text>
        <Text className="text-sm font-poppins-regular text-text-secondary text-center leading-5">
          {currentLevel.subtitle}
        </Text>
      </View>
    </View>
  );
}
