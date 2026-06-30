import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { FrostedImageCard, MetaPill } from "@/components/ui/frosted-recipe-card";

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
        {recipes.map((r, idx) => (
          <FrostedImageCard
            key={`${r.id}_${idx}`}
            image={r.image}
            onPress={() => onOpen(r)}
            height={170}
            radius={16}
            blurHeightPct={50}
            activeOpacity={0.9}
            containerClassName="mr-3"
            containerStyle={{ width: 180 }}
            contentClassName="px-3 pb-2.5"
            topLeft={
              r.spiceLevel && SPICE_IMAGES[r.spiceLevel] ? (
                <Image source={SPICE_IMAGES[r.spiceLevel]} style={{ width: 52, height: 26 }} contentFit="contain" />
              ) : null
            }
            topRight={
              r.isAI ? (
                <View
                  className="w-8 h-8 rounded-full bg-background items-center justify-center overflow-hidden border border-[#F5E3D8]"
                  style={{
                    shadowColor: "#3B3328",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 3,
                    elevation: 3,
                  }}
                >
                  <Image source={CHEF_BOO} style={{ width: 26, height: 26 }} contentFit="cover" />
                </View>
              ) : null
            }
          >
            <Text numberOfLines={1} className="font-jakarta-extrabold text-[#2A2018] text-[14px] mb-1.5">
              {r.title}
            </Text>
            <View className="flex-row items-center flex-wrap">
              {r.time ? (
                <MetaPill>
                  <Image source={require("@/assets/icons/recipe_card_time.webp")} style={{ width: 18, height: 18 }} contentFit="contain" />
                  <Text className="font-inter-semibold text-[#8B7D6F] text-[10px] ml-1">{r.time} min</Text>
                </MetaPill>
              ) : null}
              {r.ingredientsCount ? (
                <MetaPill>
                  <View className="w-1 h-1 rounded-full mr-1" style={{ backgroundColor: "#FBA82E" }} />
                  <Text className="font-inter-semibold text-[#FBA82E] text-[10px]">{r.ingredientsCount} Ingr.</Text>
                </MetaPill>
              ) : null}
              {!r.time && !r.ingredientsCount ? (
                <MetaPill>
                  <Text className="font-inter-semibold text-[#8B7D6F] text-[10px]">{r.cuisine ?? "Recipe"}</Text>
                </MetaPill>
              ) : null}
            </View>
          </FrostedImageCard>
        ))}
      </ScrollView>
    </View>
  );
}
