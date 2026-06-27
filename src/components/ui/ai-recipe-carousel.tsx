import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Image } from "expo-image";

const SPICE_IMAGES: Record<number, any> = {
  1: require("@/assets/icons/spice_1.png"),
  2: require("@/assets/icons/spice_2.png"),
  3: require("@/assets/icons/spice_3.png"),
  4: require("@/assets/icons/spice_4.png"),
  5: require("@/assets/icons/spice_5.png"),
};
const CHEF_BOO = require("@/assets/images/chef-boo-home.webp");

export interface AIRecipe {
  id: string;
  title: string;
  image?: string | null;
  isAI?: boolean;
  time?: number;
  ingredientsCount?: number;
  spiceLevel?: number;
  cuisine?: string | null;
}

interface Props {
  recipes: AIRecipe[];
  onOpen: (recipe: AIRecipe) => void;
}

export function AIRecipeCarousel({ recipes, onOpen }: Props) {
  if (!recipes || recipes.length === 0) return null;

  return (
    <View className="pt-2 pb-1">
      <Text className="px-4 pb-2 text-[12px] font-jakarta-semibold text-[#8B7D6F] uppercase tracking-wider">
        Recipes for you
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {recipes.map((r) => (
          <TouchableOpacity
            key={r.id}
            activeOpacity={0.9}
            onPress={() => onOpen(r)}
            className="mr-3 bg-white rounded-[18px] border border-[#F5E3D8]/60 overflow-hidden"
            style={{
              width: 180,
              shadowColor: "#3B3328",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {/* Image */}
            <View className="relative w-full h-28 bg-gray-100">
              <Image
                source={r.image ? { uri: r.image } : require("@/assets/images/LogIn_front_photo.webp")}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
              {/* Spice level badge (asset icon) */}
              {!!r.spiceLevel && SPICE_IMAGES[r.spiceLevel] && (
                <View className="absolute top-2 left-2">
                  <Image source={SPICE_IMAGES[r.spiceLevel]} style={{ width: 56, height: 28 }} contentFit="contain" />
                </View>
              )}
              {/* AI-generated → ChefBoo avatar badge */}
              {r.isAI && (
                <View className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 items-center justify-center overflow-hidden border border-[#F5E3D8]">
                  <Image source={CHEF_BOO} style={{ width: 24, height: 24 }} contentFit="cover" />
                </View>
              )}
            </View>

            {/* Title + meta (home-card style) */}
            <View className="px-3 pt-2 pb-3">
              <Text numberOfLines={1} className="text-[14px] font-jakarta-bold text-[#3B3328]">
                {r.title}
              </Text>
              <Text className="text-[12px] font-inter-medium text-gray-500 mt-1" numberOfLines={1}>
                {[r.time ? `${r.time} min` : null, r.ingredientsCount ? `${r.ingredientsCount} Ingredients` : null]
                  .filter(Boolean)
                  .join(" • ") || (r.cuisine ?? "Recipe")}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
