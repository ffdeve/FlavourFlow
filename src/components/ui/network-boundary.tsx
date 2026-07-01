import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export function NetworkBoundary({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const translateY = useSharedValue(-100);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected);
      
      if (!connected) {
        translateY.value = withSpring(insets.top + 10, {
          damping: 15,
          stiffness: 90,
        });
      } else {
        translateY.value = withTiming(-100, { duration: 400 });
      }
    });

    return () => unsubscribe();
  }, [insets.top]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <View style={styles.container}>
      {children}
      
      <Animated.View style={[styles.banner, animatedStyle]} pointerEvents="none">
        <View className="flex-row items-center gap-2 bg-red-500 px-4 py-2.5 rounded-full shadow-lg">
          <Feather name="wifi-off" size={16} color="white" />
          <Text className="text-white font-inter-semibold text-sm">
            No internet connection
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
});
