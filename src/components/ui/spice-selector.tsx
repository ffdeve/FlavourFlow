import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface SpiceSelectorProps {
  value: number; // 1 to 5
  onChange: (value: number) => void;
}

const SPICE_ICONS: Record<number, any> = {
  1: require("@/assets/icons/spice_1.png"),
  2: require("@/assets/icons/spice_2.png"),
  3: require("@/assets/icons/spice_3.png"),
  4: require("@/assets/icons/spice_4.png"),
  5: require("@/assets/icons/spice_5.png"),
};

const SPICE_LEVELS = [
  { level: 1, title: "Mild & Mellow", subtitle: "Just a gentle warmth", color: "#FFC107" },
  { level: 2, title: "Warming Up", subtitle: "A pleasant kick", color: "#FF9800" },
  { level: 3, title: "Getting Spicy", subtitle: "The sweet spot for most", color: "#FF5722" },
  { level: 4, title: "Fiery!", subtitle: "For the adventurous palate", color: "#F44336" },
  { level: 5, title: "Inferno! 🔥", subtitle: "Maximum heat, maximum flavor", color: "#B71C1C" },
];

export default function SpiceSelector({ value, onChange }: SpiceSelectorProps) {
  const currentLevel = SPICE_LEVELS[value - 1] || SPICE_LEVELS[2];
  
  // Animation shared values
  const iconScale = useSharedValue(1);
  const textOpacity = useSharedValue(1);

  // Trigger animation when value changes
  useEffect(() => {
    // Scale bounce: shrink → overshoot → settle
    iconScale.value = withSequence(
      withTiming(0.6, { duration: 120, easing: Easing.in(Easing.cubic) }),
      withTiming(1.15, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 120, easing: Easing.inOut(Easing.cubic) }),
    );
    // Fade text
    textOpacity.value = withSequence(
      withTiming(0, { duration: 100 }),
      withTiming(1, { duration: 200 }),
    );
  }, [value]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

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
    <View className="w-full py-8 items-center px-4 bg-white/40 rounded-3xl border border-primary/10">
      {/* Spice Icon — animated */}
      <Animated.View style={iconAnimatedStyle} className="mb-6">
        <Image
          source={SPICE_ICONS[value]}
          style={{ width: 140, height: 140 }}
          contentFit="contain"
          transition={100}
        />
      </Animated.View>

      {/* Level dots */}
      <View className="flex-row items-center justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((level) => (
          <Pressable
            key={level}
            onPress={() => {
              if (level !== value) {
                triggerHaptic();
                onChange(level);
              }
            }}
          >
            <View
              style={{
                width: level <= value ? 12 : 8,
                height: level <= value ? 12 : 8,
                borderRadius: 6,
                backgroundColor: level <= value ? currentLevel.color : "rgba(0,0,0,0.1)",
              }}
            />
          </Pressable>
        ))}
      </View>

      {/* Selector controls: Minus and Plus */}
      <View className="flex-row items-center justify-center gap-8 mb-6">
        {/* Decrease Button */}
        <Pressable
          onPress={handleDecrease}
          disabled={value <= 1}
          className={`w-14 h-14 rounded-full items-center justify-center border-2 ${
            value <= 1
              ? "border-black/10 opacity-30"
              : "border-primary bg-primary/5 active:bg-primary/20"
          }`}
        >
          <Text className={`text-2xl font-poppins-bold ${value <= 1 ? "text-text-secondary" : "text-primary"}`}>−</Text>
        </Pressable>

        {/* Level Number */}
        <Animated.View style={textAnimatedStyle}>
          <Text
            style={{ color: currentLevel.color }}
            className="text-5xl font-poppins-bold"
          >
            {value}
          </Text>
        </Animated.View>

        {/* Increase Button */}
        <Pressable
          onPress={handleIncrease}
          disabled={value >= 5}
          className={`w-14 h-14 rounded-full items-center justify-center border-2 ${
            value >= 5
              ? "border-black/10 opacity-30"
              : "border-primary bg-primary/5 active:bg-primary/20"
          }`}
        >
          <Text className={`text-2xl font-poppins-bold ${value >= 5 ? "text-text-secondary" : "text-primary"}`}>+</Text>
        </Pressable>
      </View>

      {/* Dynamic Descriptive Text */}
      <Animated.View style={textAnimatedStyle} className="items-center px-4">
        <Text className="text-xl font-poppins-bold text-text mb-1">
          {currentLevel.title}
        </Text>
        <Text className="text-sm font-poppins-regular text-text-secondary text-center leading-5">
          {currentLevel.subtitle}
        </Text>
      </Animated.View>
    </View>
  );
}
