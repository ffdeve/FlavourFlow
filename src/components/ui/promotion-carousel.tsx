import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity } from "react-native";
import Animated from "react-native-reanimated";
import { Image } from "expo-image";
import { featuredRecipes } from "@/lib/dummy-data";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width; // Full width cards without rounding

interface PromotionCarouselProps {
  onIndexChange?: (index: number) => void;
}

export function PromotionCarousel({ onIndexChange }: PromotionCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-play interval
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % featuredRecipes.length;
      scrollViewRef.current?.scrollTo({ x: nextIndex * CARD_WIDTH, animated: true });
    }, 4000); // 4 seconds per slide
    return () => clearInterval(interval);
  }, [activeIndex]);

  // Real-time scrolling update for smooth color transitions
  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    // Calculate fractional index and round to nearest for early color trigger
    const exactIndex = scrollPosition / CARD_WIDTH;
    const index = Math.round(exactIndex);
    
    if (index >= 0 && index < featuredRecipes.length && index !== activeIndex) {
      setActiveIndex(index);
      onIndexChange?.(index);
    }
  };

  return (
    <View className="mt-4">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH}
      >
        {featuredRecipes.map((recipe) => (
          <TouchableOpacity
            key={recipe.id}
            activeOpacity={0.9}
            style={{
              width: CARD_WIDTH,
              height: 140, 
              backgroundColor: "transparent",
              flexDirection: "row",
              paddingHorizontal: 24, // Add padding to keep content off the screen edges
              alignItems: "center",
            }}
            onPress={() => console.log("Press Recipe", recipe.title)}
          >
            {/* Text Content - 65% */}
            <View style={{ width: "65%", paddingRight: "5%" }}>
              <Text 
                className="font-poppins-bold text-xl leading-snug mb-1 text-white"
                numberOfLines={2}
              >
                {recipe.title}
              </Text>
              <Text className="font-poppins-medium text-white/80 text-sm" numberOfLines={1}>
                By {recipe.author} • {recipe.time}
              </Text>
            </View>

            {/* Image Content - 30% */}
            <View style={{ width: "30%", height: 100, justifyContent: "center", alignItems: "flex-end" }}>
              <View className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/20">
                {recipe.image ? (
                  <Image
                    source={recipe.image}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  // Placeholder if no image is provided yet
                  <View className="w-full h-full bg-white/30 items-center justify-center">
                    <Text className="text-white text-xs">Image</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Dots Container (External, centered below the carousel) */}
      <View className="flex-row justify-center items-center py-4">
        {featuredRecipes.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <Animated.View
              key={index}
              style={{
                width: isActive ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: isActive ? "#FFFFFF" : "rgba(255,255,255,0.4)",
                marginHorizontal: 4,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
