import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, { FadeInUp, FadeOutUp, SlideInDown, SlideOutUp } from "react-native-reanimated";

const SEARCH_ITEMS = ["Ramen", "Nihari", "Biryani", "Sushi", "Pasta", "Burgers"];

export function AnimatedSearchBar({ onPress }: { onPress: () => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SEARCH_ITEMS.length);
    }, 4000); // Slowed down from 2500 to 4000
    return () => clearInterval(interval);
  }, []);

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      className="flex-row items-center bg-white rounded-full px-4 mx-6 shadow-sm border border-gray-100 h-11"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Image source={require("@/assets/icons/magnifying_glass.webp")} style={{ width: 26, height: 26 }} contentFit="contain" />
      
      {/* Search Text Container */}
      <View pointerEvents="none" className="flex-row items-center ml-3 overflow-hidden flex-1 h-full relative justify-center">
        <Text className="text-[#8B7D6F] font-poppins-regular text-base absolute left-0">
          Search for 
        </Text>
        
        <Animated.Text
          key={index} // Key change triggers enter/exit animations
          entering={SlideInDown.duration(600)}
          exiting={SlideOutUp.duration(600)}
          className="text-primary font-poppins-medium text-base absolute left-[90px]"
        >
          {SEARCH_ITEMS[index]}
        </Animated.Text>
      </View>
    </TouchableOpacity>
  );
}
