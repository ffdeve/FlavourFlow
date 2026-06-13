import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React from "react";
import { GestureResponderEvent, TouchableOpacity } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface HeartButtonProps {
  isLiked: boolean;
  onToggle: () => void;
  size?: number;
  className?: string;
  style?: any;
}

export function HeartButton({
  isLiked,
  onToggle,
  size = 24,
  className = "",
  style = {},
}: HeartButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation();

    // Trigger instant haptic impact
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Trigger pop animation
    scale.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withTiming(1.0, { duration: 150 }),
    );

    // Call toggle function
    onToggle();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      className={className}
      style={[
        {
          width: size + 14,
          height: size + 14,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Animated.View style={animatedStyle}>
        <Image
          source={
            isLiked
              ? require("@/assets/icons/heart_filled.webp")
              : require("@/assets/icons/heart_empty.webp")
          }
          style={{ 
            width: isLiked ? size * 1.5 : size, 
            height: isLiked ? size * 1.5 : size 
          }}
          contentFit="contain"
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
