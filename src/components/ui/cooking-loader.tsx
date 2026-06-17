import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface CookingLoaderProps {
  scale?: number;
  isAnimating?: boolean;
}

export const CookingLoader = ({
  scale = 1,
  isAnimating = true,
}: CookingLoaderProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isAnimating) {
      progress.value = withRepeat(
        withTiming(1, { duration: 1700, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      progress.value = withTiming(0, { duration: 300 });
    }
  }, [isAnimating]);

  const panStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      progress.value,
      [0, 0.1, 0.3, 0.6, 1],
      [0, -4, 20, 0, 0],
    );

    return {
      // @ts-ignore
      transformOrigin: "right top",
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const foodStyle = useAnimatedStyle(() => {
    // translateY timeline:
    // 0.0 -> 0.15: Rest in pan
    // 0.15 -> 0.45: Rises to peak height of -120px
    // 0.45 -> 0.70: Falls back to pan base (0px)
    // 0.70 -> 0.75: First bounce up to -4px
    // 0.75 -> 0.80: Falls back to pan base (0px)
    // 0.80 -> 0.83: Second micro-bounce up to -1px
    // 0.83 -> 0.86: Settles back at 0px
    // 0.86 -> 1.00: Rests in pan
    const translateY = interpolate(
      progress.value,
      [0, 0.15, 0.45, 0.7, 0.75, 0.8, 0.83, 0.86, 1],
      [0, 0, -120, 0, -4, 0, -1, 0, 0],
    );

    // rotate timeline:
    // 0.00 -> 0.25: Rises vertically without rotating (delayed flip)
    // 0.25 -> 0.65: Performs a full 360-degree flip in mid-air
    // 0.65 -> 1.00: Lands and stays at 360 degrees (settled)
    const rotate = interpolate(
      progress.value,
      [0, 0.25, 0.65, 1],
      [0, 0, 360, 360],
    );

    return {
      transform: [{ translateY }, { rotate: `${rotate}deg` }],
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    // Scale shadow with food height and bounces
    const scaleX = interpolate(
      progress.value,
      [0, 0.15, 0.45, 0.7, 0.75, 0.8, 0.86, 1],
      [1, 1, 0.45, 1, 0.97, 1, 1, 1],
    );
    const opacity = interpolate(
      progress.value,
      [0, 0.15, 0.45, 0.7, 0.75, 0.8, 0.86, 1],
      [1, 1, 0.25, 1, 0.95, 1, 1, 1],
    );

    return {
      transform: [{ scaleX }],
      opacity,
    };
  });

  return (
    <View style={[styles.loader, { transform: [{ scale }] }]}>
      <View style={styles.panWrapper}>
        <Animated.View style={[styles.food, foodStyle]} />
        <Animated.View style={[styles.pan, panStyle]}>
          <LinearGradient
            colors={["rgb(18, 18, 18)", "rgb(74, 74, 74)"]}
            style={styles.panBase}
          />
          <LinearGradient
            colors={["rgb(18, 18, 18)", "rgb(74, 74, 74)"]}
            style={styles.panHandle}
          />
        </Animated.View>
        <Animated.View style={[styles.panShadow, shadowStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loader: {
    alignItems: "center",
    justifyContent: "center",
  },
  panWrapper: {
    width: 200,
    height: 150, // Fixed height to allow absolute positioning of food
    alignItems: "flex-start",
    justifyContent: "flex-end",
    flexDirection: "column",
    gap: 20,
  },
  pan: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    width: "100%",
    zIndex: 3,
  },
  food: {
    position: "absolute",
    width: "35%",
    height: 6,
    backgroundColor: "#FBA82E", // Using primary color
    left: 10,
    bottom: 42, // Position above the pan
    borderRadius: 3,
    zIndex: 2,
  },
  panBase: {
    width: "60%",
    height: 22,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  panHandle: {
    width: "40%",
    height: 10,
    borderRadius: 10,
  },
  panShadow: {
    width: 70,
    height: 8,
    backgroundColor: "rgba(0, 0, 0, 0.21)",
    marginLeft: 15,
    borderRadius: 10,
    // Simulate CSS filter: blur(5px)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
});
