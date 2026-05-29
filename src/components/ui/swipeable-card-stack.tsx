import React, { useState } from "react";
import { View, Text, Dimensions, TouchableOpacity } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { Feather, FontAwesome } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = 380;

interface Recipe {
  id: string;
  title: string;
  time: string;
  spiceLevel: number;
  image: string;
  rating: number;
  categoryTag: string;
  ingredientsCount: number;
  authorAvatar: string;
}

interface SwipeableCardStackProps {
  data: Recipe[];
}

export const SwipeableCardStack = ({ data }: SwipeableCardStackProps) => {
  const [cards, setCards] = useState<Recipe[]>(data);
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});

  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);

  const handleSwipe = () => {
    // Move the swiped card to the end of the array
    setCards((prev) => {
      const [first, ...rest] = prev;
      return [...rest, first];
    });
    // Reset shared values for the new top card
    translationX.value = 0;
    translationY.value = 0;
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Pan gesture with activation threshold to allow tapping sub-buttons
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onUpdate((event) => {
      translationX.value = event.translationX;
      translationY.value = event.translationY;
    })
    .onEnd((event) => {
      const dragThreshold = 140;
      const swipeRight = event.translationX > dragThreshold;
      const swipeLeft = event.translationX < -dragThreshold;
      const swipeUp = event.translationY < -dragThreshold;

      if (swipeRight || swipeLeft || swipeUp) {
        let targetX = 0;
        let targetY = 0;

        if (swipeRight) {
          targetX = SCREEN_WIDTH * 1.5;
        } else if (swipeLeft) {
          targetX = -SCREEN_WIDTH * 1.5;
        } else if (swipeUp) {
          targetY = -SCREEN_WIDTH * 1.5;
        }

        translationX.value = withTiming(targetX, { duration: 220 });
        translationY.value = withTiming(targetY, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(handleSwipe)();
          }
        });
      } else {
        translationX.value = withSpring(0, { damping: 15, stiffness: 120 });
        translationY.value = withSpring(0, { damping: 15, stiffness: 120 });
      }
    });

  // Render top 3 cards in stack
  const visibleCards = cards.slice(0, 3);

  return (
    <View style={{ height: CARD_HEIGHT + 36 }} className="w-full items-center justify-start relative mt-2">
      {visibleCards
        .map((recipe, index) => {
          const actualIndex = cards.indexOf(recipe);
          const isTopCard = actualIndex === 0;

          // Reanimated styles for stacking effects
          const animatedStyle = useAnimatedStyle(() => {
            if (isTopCard) {
              return {
                transform: [
                  { translateX: translationX.value },
                  { translateY: translationY.value },
                  { rotate: `${(translationX.value / SCREEN_WIDTH) * 15}deg` },
                ],
                zIndex: 3,
              };
            }

            // Interpolate lower cards scaling/moving up as the top card is dragged
            const drag = Math.min(
              Math.max(Math.abs(translationX.value), Math.abs(translationY.value)),
              150
            );

            if (actualIndex === 1) {
              const scale = 0.94 + (drag / 150) * 0.06;
              const translateY = 14 - (drag / 150) * 14;
              return {
                transform: [{ scale }, { translateY }],
                zIndex: 2,
              };
            }

            if (actualIndex === 2) {
              const scale = 0.88 + (drag / 150) * 0.06;
              const translateY = 28 - (drag / 150) * 14;
              return {
                transform: [{ scale }, { translateY }],
                zIndex: 1,
              };
            }

            return {
              transform: [{ scale: 0.88 }, { translateY: 28 }],
              zIndex: 0,
              opacity: 0,
            };
          });

          const isBookmarked = !!bookmarkedIds[recipe.id];

          const CardContent = (
            <Animated.View
              style={[
                animatedStyle,
                {
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  position: "absolute",
                  left: 24, // Center align absolute cards perfectly
                  top: 0,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  elevation: 5,
                },
              ]}
              className="bg-white rounded-[32px] overflow-hidden border border-gray-100 p-3"
            >
              {/* Card Image Area with grey placeholder bg */}
              <View className="relative w-full h-[220px] rounded-[24px] overflow-hidden bg-gray-100">
                <Image
                  source={recipe.image}
                  className="w-full h-full"
                  contentFit="cover"
                />

                {/* Weeknight Dinner Tag Overlay */}
                <View className="absolute top-4 left-4 bg-white/95 px-3 py-1.5 rounded-full shadow-sm">
                  <Text className="font-poppins-semibold text-primary-dark text-xs">
                    {recipe.categoryTag}
                  </Text>
                </View>

                {/* Bookmark Toggle Overlay */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => toggleBookmark(recipe.id)}
                  className="absolute top-4 right-4 w-9 h-9 bg-black/25 rounded-full items-center justify-center"
                >
                  <FontAwesome
                    name={isBookmarked ? "bookmark" : "bookmark-o"}
                    size={16}
                    color={isBookmarked ? "#FBA82E" : "#FFFFFF"}
                  />
                </TouchableOpacity>

                {/* Time Badge Overlay */}
                <View className="absolute bottom-4 left-4 bg-black/40 px-3 py-1 rounded-lg">
                  <Text className="font-poppins-semibold text-white text-xs">
                    {recipe.time}
                  </Text>
                </View>
              </View>

              {/* Author Avatar Overlay (Outside overflow-hidden image container to prevent clipping) */}
              <View 
                style={{ position: "absolute", top: 210, right: 28 }}
                className="z-20 shadow-sm"
              >
                <Image
                  source={recipe.authorAvatar}
                  className="w-11 h-11 rounded-full border-2 border-white bg-gray-200"
                />
              </View>

              {/* Recipe Info Area */}
              <View className="px-3 pt-6 pb-2 justify-between flex-1">
                {/* Rating */}
                <View className="flex-row items-center mb-1">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const fillStar = i < Math.floor(recipe.rating);
                    return (
                      <FontAwesome
                        key={i}
                        name={fillStar ? "star" : "star-o"}
                        size={14}
                        color={fillStar ? "#FBA82E" : "#D1D1D1"}
                        className="mr-0.5"
                      />
                    );
                  })}
                </View>

                {/* Title and Ingredients */}
                <View className="w-full">
                  <Text
                    className="font-poppins-bold text-primary-dark text-lg leading-6 mb-1"
                    numberOfLines={1}
                  >
                    {recipe.title}
                  </Text>
                  <Text className="font-poppins-regular text-text-secondary text-xs">
                    {recipe.ingredientsCount} ingredients
                  </Text>
                </View>
              </View>
            </Animated.View>
          );

          // Wrap the top card only in GestureDetector
          if (isTopCard) {
            return (
              <GestureDetector key={recipe.id} gesture={panGesture}>
                {CardContent}
              </GestureDetector>
            );
          }

          return <View key={recipe.id}>{CardContent}</View>;
        })
        .reverse() /* Reverse renders card index 0 last, so it sits on top in Z-index */}
    </View>
  );
};
