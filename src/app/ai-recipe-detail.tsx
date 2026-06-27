import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/services/supabase";

interface AiRecipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: { name: string; quantity: string }[];
  steps: string[];
  cuisine_type: string | null;
  spice_level: number | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  image_url: string | null;
  is_saved: boolean;
}

const CHEF_BOO = require("@/assets/images/chatbot-image.webp");

function MetaPill({ icon, label }: { icon: string; label: string }) {
  return (
    <View className="flex-row items-center bg-[#FAF5EF] rounded-full px-3 py-1.5 mr-2 mb-2">
      <Feather name={icon as any} size={13} color="#FBA82E" />
      <Text className="ml-1.5 text-[12px] font-inter-medium text-[#3B3328]">{label}</Text>
    </View>
  );
}

export default function AiRecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<AiRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("ai_generated_recipes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) console.warn("Failed to load AI recipe:", error);
      if (data) setRecipe(data as AiRecipe);
      setLoading(false);
    })();
  }, [id]);

  const toggleSave = async () => {
    if (!recipe || saving) return;
    setSaving(true);
    const next = !recipe.is_saved;
    setRecipe({ ...recipe, is_saved: next });
    const { error } = await supabase
      .from("ai_generated_recipes")
      .update({ is_saved: next })
      .eq("id", recipe.id);
    if (error) {
      console.warn("Save failed:", error);
      setRecipe({ ...recipe, is_saved: !next }); // revert
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#FFFDF5] items-center justify-center">
        <ActivityIndicator size="large" color="#FBA82E" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFFDF5] items-center justify-center px-8">
        <Text className="text-[15px] font-inter-medium text-[#8B7D6F] text-center">
          This recipe is no longer available.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-5 py-2.5 bg-[#FBA82E] rounded-full">
          <Text className="text-white font-jakarta-semibold">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const meta: { icon: string; label: string }[] = [];
  if (recipe.prep_time) meta.push({ icon: "clock", label: `${recipe.prep_time}m prep` });
  if (recipe.cook_time) meta.push({ icon: "thermometer", label: `${recipe.cook_time}m cook` });
  if (recipe.servings) meta.push({ icon: "users", label: `Serves ${recipe.servings}` });
  if (recipe.spice_level != null) meta.push({ icon: "zap", label: `Spice ${recipe.spice_level}/5` });

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-[#F5E3D8]/40">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 items-center justify-center rounded-full bg-[#FAF5EF]">
          <Feather name="arrow-left" size={19} color="#3B3328" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[15px] font-jakarta-bold text-[#3B3328] mr-9">
          ChefBoo Recipe
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* AI banner */}
        <View className="mx-5 mt-4 flex-row items-center bg-[#FBA82E]/10 border border-[#FBA82E]/30 rounded-[18px] px-4 py-3">
          <Image source={CHEF_BOO} style={{ width: 36, height: 36 }} contentFit="contain" />
          <Text className="ml-3 flex-1 text-[12px] font-inter-medium text-[#8B7D6F]">
            Freshly created for you by ChefBoo
          </Text>
        </View>

        {/* Title + cuisine */}
        <View className="px-5 mt-4">
          <Text className="text-[22px] font-jakarta-bold text-[#3B3328] leading-7">{recipe.title}</Text>
          {recipe.cuisine_type && (
            <Text className="text-[13px] font-inter-medium text-[#FBA82E] mt-1">{recipe.cuisine_type}</Text>
          )}
          {recipe.description && (
            <Text className="text-[14px] font-inter-medium text-[#8B7D6F] leading-5 mt-2">{recipe.description}</Text>
          )}
        </View>

        {/* Meta */}
        {meta.length > 0 && (
          <View className="flex-row flex-wrap px-5 mt-4">
            {meta.map((m) => (
              <MetaPill key={m.label} icon={m.icon} label={m.label} />
            ))}
          </View>
        )}

        {/* Ingredients */}
        <View className="px-5 mt-5">
          <View className="flex-row items-center mb-3">
            <Ionicons name="list" size={18} color="#FBA82E" />
            <Text className="ml-2 text-[16px] font-jakarta-bold text-[#3B3328]">Ingredients</Text>
          </View>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} className="flex-row items-center py-2 border-b border-[#F5E3D8]/40">
              <View className="w-1.5 h-1.5 rounded-full bg-[#FBA82E] mr-3" />
              <Text className="flex-1 text-[14px] font-inter-medium text-[#3B3328]">{ing.name}</Text>
              <Text className="text-[13px] font-inter-medium text-[#8B7D6F]">{ing.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Steps */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center mb-3">
            <Ionicons name="restaurant-outline" size={18} color="#FBA82E" />
            <Text className="ml-2 text-[16px] font-jakarta-bold text-[#3B3328]">Steps</Text>
          </View>
          {recipe.steps.map((step, i) => (
            <View key={i} className="flex-row mb-4">
              <View className="w-7 h-7 rounded-full bg-[#FBA82E] items-center justify-center mr-3 mt-0.5">
                <Text className="text-[13px] font-jakarta-bold text-white">{i + 1}</Text>
              </View>
              <Text className="flex-1 text-[14px] font-inter-medium text-[#3B3328] leading-5">{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center px-5 py-4 bg-[#FFFDF5] border-t border-[#F5E3D8]/40" style={{ gap: 12 }}>
        <TouchableOpacity
          onPress={toggleSave}
          className="w-14 h-14 items-center justify-center rounded-[18px] bg-[#FAF5EF] border border-[#F5E3D8]"
        >
          <Feather name="heart" size={22} color={recipe.is_saved ? "#E05252" : "#8B7D6F"} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push(`/cooking-mode?aiRecipeId=${recipe.id}` as any)}
          className="flex-1 h-14 flex-row items-center justify-center rounded-[18px] bg-[#FBA82E]"
          style={{ shadowColor: "#FBA82E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
        >
          <Feather name="play" size={18} color="#FFFFFF" />
          <Text className="ml-2 text-[15px] font-jakarta-semibold text-white">Start Cooking</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
