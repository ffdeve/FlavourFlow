import { Recipe } from "@/services/recipe.service";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width; // Full width cards without rounding

interface PromotionCarouselProps {
  recipes: Recipe[];
  onIndexChange?: (index: number) => void;
}

export function PromotionCarousel({
  recipes,
  onIndexChange,
}: PromotionCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Handle empty recipes array gracefully
  const list = recipes && recipes.length > 0 ? recipes : [];

  // Auto-play interval
  useEffect(() => {
    if (list.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % list.length;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * CARD_WIDTH,
        animated: true,
      });
    }, 4000); // 4 seconds per slide
    return () => clearInterval(interval);
  }, [activeIndex, list.length]);

  // Real-time scrolling update for smooth color transitions
  const handleScroll = (event: any) => {
    if (list.length === 0) return;
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const exactIndex = scrollPosition / CARD_WIDTH;
    const index = Math.round(exactIndex);

    if (index >= 0 && index < list.length && index !== activeIndex) {
      setActiveIndex(index);
      onIndexChange?.(index);
    }
  };

  if (list.length === 0) {
    return null;
  }

  return (
    <View className="mt-2">
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
        {list.map((recipe) => (
          <TouchableOpacity
            key={recipe.id}
            activeOpacity={0.9}
            style={{
              width: CARD_WIDTH,
              height: 120,
              backgroundColor: "transparent",
              flexDirection: "row",
              paddingLeft: 24,
              paddingRight: 24,
              alignItems: "center",
            }}
            onPress={() => router.push(`/recipe-detail?id=${recipe.id}`)}
          >
            {/* Text Content */}
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text
                className="font-poppins-bold text-xl leading-snug mb-1 text-white"
                numberOfLines={2}
              >
                {recipe.title}
              </Text>
              <Text
                className="font-poppins-medium text-white/80 text-sm"
                numberOfLines={1}
              >
                By {recipe.authorName || "Chef Flavour"} • {recipe.time}
              </Text>
            </View>

            {/* Image Content - fully rounded and inset from edge */}
            <View
              style={{
                width: "42%",
                height: 120,
                borderRadius: 22,
                overflow: "hidden",
              }}
            >
              {recipe.image ? (
                <Image
                  source={{ uri: recipe.image }}
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
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Dots Container */}
      <View className="flex-row justify-center items-center py-1 mt-2">
        {list.map((_, index) => {
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
