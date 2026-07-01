import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CookingLoader } from "@/components/ui/cooking-loader";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { formatDuration, scaleQuantity } from "@/utils/recipe-steps";
import { supabase } from "@/services/supabase";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.45 - 20;

// ChefBoo is the "author" of every AI recipe — tapping the byline opens its profile.
const CHEF_BOO_USER_ID = "5bf898af-4881-4998-9a9c-d3addfb32665";
const CHEF_BOO = require("@/assets/images/chatbot-image.webp");
const CHEF_BOO_HERO = require("@/assets/images/chef-boo-home.webp");
const INGREDIENTS_ICON = require("@/assets/icons/Ingredients.webp");
const SERVINGS_ICON = require("@/assets/icons/servings.png");
const COOKED_ICON = require("@/assets/icons/Chef_likes.webp");
const TIME_ICON = require("@/assets/icons/recipe_card_time.webp");

const TABS = ["Overview", "Ingredients", "Steps"] as const;
type TabType = (typeof TABS)[number];

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

// Same storage-icon resolver used by recipe-detail, so AI ingredients get the
// same tiles as real recipes.
function getIngredientStorageUrl(name: string) {
  if (!name) return "";
  const lowerName = name.toLowerCase().trim();
  const base = "https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons";
  if (lowerName.includes("chili") || lowerName.includes("chilli")) {
    if (lowerName.includes("green") || lowerName.includes("jalapeno")) return `${base}/jalapeno.webp`;
    return `${base}/redchili.webp`;
  }
  if (lowerName.includes("onion")) return `${base}/pearlonion.webp`;
  if (lowerName.includes("cilantro") || lowerName.includes("coriander") || lowerName.includes("mint"))
    return `${base}/cilantro.webp`;
  if (lowerName.includes("water")) return `${base}/Glass%20Water%20Jug.webp`;
  if (lowerName.includes("pasta") || lowerName.includes("noodle") || lowerName.includes("macaroni"))
    return `${base}/Farfalle%20Pasta.webp`;
  if (lowerName.includes("banana")) return `${base}/banana.webp`;
  if (lowerName.includes("ice")) return `${base}/Ice.webp`;
  if (lowerName.includes("soda")) return `${base}/bakingsoda.webp`;
  return `${base}/${name.trim().replace(/\s+/g, "%20")}.webp`;
}

function IngredientTile({ name, amount }: { name: string; amount: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <View className="w-[31.3%] m-[1%] min-h-[110px] bg-[#F5E3D8] rounded-3xl items-center justify-center p-2 shadow-sm">
      {failed ? (
        <View className="w-11 h-11 items-center justify-center">
          <Ionicons name="nutrition-outline" size={32} color="#C9A88F" />
        </View>
      ) : (
        <Image
          source={{ uri: getIngredientStorageUrl(name) }}
          style={{ width: 44, height: 44 }}
          contentFit="contain"
          onError={() => setFailed(true)}
        />
      )}
      <Text
        className="text-text-DEFAULT font-jakarta-medium text-[9px] text-center mt-2 leading-3"
        numberOfLines={2}
      >
        {amount ? `${amount} ` : ""}{name}
      </Text>
    </View>
  );
}

export default function AiRecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<AiRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [scaledServings, setScaledServings] = useState<number | null>(null);
  const [showAllIngredients, setShowAllIngredients] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("ai_generated_recipes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) console.warn("Failed to load AI recipe:", error);
      if (data) {
        setRecipe(data as AiRecipe);
        setScaledServings((data as AiRecipe).servings || 2);
      }
      setLoading(false);
    })();
  }, [id]);

  const toggleSave = async () => {
    if (!recipe || saving) return;
    setSaving(true);
    Haptics.selectionAsync();
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
        <CookingLoader scale={0.8} />
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

  // ── Serving scaling (same behaviour as recipe-detail) ──
  const baseServings = recipe.servings || 2;
  const activeServings = scaledServings ?? baseServings;
  const scaleFactor = baseServings > 0 ? activeServings / baseServings : 1;
  const scaledAmount = (ing: { quantity: string }) =>
    scaleQuantity(ing.quantity || "", scaleFactor);

  const prep = recipe.prep_time || 0;
  const cook = recipe.cook_time || 0;
  const total = prep + cook;

  const allIngredients = recipe.ingredients || [];
  const displayIngredients = showAllIngredients ? allIngredients : allIngredients.slice(0, 6);

  return (
    <View className="flex-1 bg-[#FFFDF5]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── Hero ── */}
        <View style={{ height: HERO_HEIGHT, width: "100%" }}>
          {recipe.image_url ? (
            <>
              <Image
                source={{ uri: recipe.image_url }}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                contentFit="cover"
                blurRadius={60}
              />
              <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.3)" } as any} />
              <Image
                source={{ uri: recipe.image_url }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={300}
              />
            </>
          ) : (
            <LinearGradient
              colors={["#FBA82E", "#F6C56B", "#F5E3D8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
            >
              <Image source={CHEF_BOO_HERO} style={{ width: 150, height: 150 }} contentFit="contain" />
            </LinearGradient>
          )}

          {/* Spice & total-time overlays */}
          {total > 0 && (
            <View className="absolute bottom-10 right-5 bg-black/40 rounded-full py-1.5 px-3.5 flex-row items-center border border-white/20">
              <Image source={TIME_ICON} style={{ width: 18, height: 18, marginRight: 6 }} contentFit="contain" />
              <Text className="font-jakarta-semibold text-white text-sm">{formatDuration(total)}</Text>
            </View>
          )}
          {recipe.spice_level != null && recipe.spice_level > 0 && (
            <View className="absolute bottom-10 left-5 bg-black/40 rounded-full py-1.5 px-3.5 flex-row items-center border border-white/20">
              <FontAwesome name="fire" size={13} color="#FF7A45" style={{ marginRight: 6 }} />
              <Text className="font-jakarta-semibold text-white text-sm">Spice {recipe.spice_level}/5</Text>
            </View>
          )}
        </View>

        {/* ── White Content Sheet ── */}
        <View className="bg-[#FAF5EF] -mt-8 rounded-t-[32px] px-6 pt-6 pb-32" style={{ minHeight: SCREEN_HEIGHT * 0.6 }}>
          {/* Title + AI badge */}
          <View className="flex-row justify-between items-start mb-3">
            <Text className="font-jakarta-bold text-primary-dark text-2xl leading-8 flex-1 mr-4">
              {recipe.title}
            </Text>
            <View className="bg-primary/10 px-3 py-1.5 rounded-full flex-row items-center border border-primary/20">
              <Ionicons name="sparkles" size={12} color="#FBA82E" />
              <Text className="text-primary text-[10px] font-jakarta-semibold ml-1">AI</Text>
            </View>
          </View>

          {/* Author Row — ChefBoo */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/user-profile?userId=${CHEF_BOO_USER_ID}`)}
            className="flex-row items-center mb-5"
          >
            <Image source={CHEF_BOO} style={{ width: 32, height: 32, borderRadius: 16 }} contentFit="cover" />
            <Text className="font-inter-medium text-text-lighter text-sm ml-2">By Chef Boo</Text>
            <MaterialIcons name="verified" size={14} color="#1DA1F2" style={{ marginLeft: 4 }} />
            <Feather name="chevron-right" size={14} color="#8B7D6F" style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          {/* AI banner */}
          <View className="flex-row items-center bg-[#FBA82E]/10 border border-[#FBA82E]/30 rounded-[18px] px-4 py-3 mb-6">
            <Image source={CHEF_BOO} style={{ width: 34, height: 34 }} contentFit="contain" />
            <Text className="ml-3 flex-1 text-[12px] font-inter-medium text-[#8B7D6F]">
              Freshly created for you by ChefBoo
            </Text>
          </View>

          {/* 3 Blocks Row (Ingredients, Serving, Cuisine) */}
          <View className="flex-row justify-between mb-6">
            <View className="flex-1 bg-[#FFF2D9] rounded-2xl p-3 mr-2.5 items-center justify-center min-h-[110px]">
              <Image source={INGREDIENTS_ICON} style={{ width: 48, height: 48 }} contentFit="contain" />
              <Text className="font-jakarta-medium text-text-DEFAULT text-xs text-center mt-2.5">
                {allIngredients.length} Ingredients
              </Text>
            </View>

            <View className="flex-1 bg-[#FFEAD2] rounded-2xl p-3 mr-2.5 items-center justify-center min-h-[110px]">
              <Image source={SERVINGS_ICON} style={{ width: 40, height: 40 }} contentFit="contain" />
              <View className="flex-row items-center mt-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setScaledServings((prev) => Math.max(1, (prev ?? baseServings) - 1));
                  }}
                  className="w-6 h-6 rounded-full bg-white items-center justify-center border border-[#F0D9CE] shadow-sm"
                >
                  <Feather name="minus" size={13} color="#FBA82E" />
                </TouchableOpacity>
                <Text className="font-jakarta-bold text-text-DEFAULT text-sm mx-2.5 min-w-[18px] text-center">
                  {activeServings}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setScaledServings((prev) => (prev ?? baseServings) + 1);
                  }}
                  className="w-6 h-6 rounded-full bg-white items-center justify-center border border-[#F0D9CE] shadow-sm"
                >
                  <Feather name="plus" size={13} color="#FBA82E" />
                </TouchableOpacity>
              </View>
              <Text className="font-inter-medium text-text-lighter text-[10px] text-center mt-1">Servings</Text>
            </View>

            <View className="flex-1 bg-[#FDF0EB] rounded-2xl p-3 items-center justify-center min-h-[110px]">
              <Image source={COOKED_ICON} style={{ width: 48, height: 48 }} contentFit="contain" />
              <Text className="font-jakarta-medium text-text-DEFAULT text-xs text-center mt-2.5" numberOfLines={2}>
                {recipe.cuisine_type || "ChefBoo"}
              </Text>
            </View>
          </View>

          {/* Time breakdown — Prep / Cook / Total */}
          {total > 0 && (
            <View className="bg-white border border-[#F5E3D8]/60 rounded-2xl px-4 py-3 mb-6 flex-row items-center justify-between shadow-sm">
              <View className="items-center flex-1">
                <Text className="font-inter-semibold text-[10px] text-text-lighter mb-0.5">PREP</Text>
                <Text className="font-jakarta-bold text-text-DEFAULT text-xs">{formatDuration(prep)}</Text>
              </View>
              <View className="w-px h-7 bg-[#F5E3D8]" />
              <View className="items-center flex-1">
                <Text className="font-inter-semibold text-[10px] text-text-lighter mb-0.5">COOK</Text>
                <Text className="font-jakarta-bold text-text-DEFAULT text-xs">{formatDuration(cook)}</Text>
              </View>
              <View className="w-px h-7 bg-[#F5E3D8]" />
              <View className="items-center flex-1">
                <Text className="font-inter-semibold text-[10px] text-primary mb-0.5">TOTAL</Text>
                <Text className="font-jakarta-bold text-primary text-xs">{formatDuration(total)}</Text>
              </View>
            </View>
          )}

          {/* Tab Pills */}
          <View className="flex-row mb-5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                  className={`px-5 py-2.5 rounded-full mr-2.5 ${isActive ? "bg-primary" : "bg-[#F4F4F4] border border-gray-200"}`}
                >
                  <Text className={`font-jakarta-semibold text-sm ${isActive ? "text-white" : "text-text-lighter"}`}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Overview */}
          {activeTab === "Overview" && (
            <View>
              <Text className="font-inter-semibold text-primary-dark text-base mb-2">Description</Text>
              <Text className="font-inter-regular text-text-lighter text-sm leading-6">
                {recipe.description || "A delicious dish crafted just for you by ChefBoo. Jump into cooking mode and let's make it together!"}
              </Text>
            </View>
          )}

          {/* Ingredients */}
          {activeTab === "Ingredients" && (
            <View>
              <Text className="font-inter-semibold text-primary-dark text-base mb-4">Ingredients</Text>
              <View className="flex-row flex-wrap justify-start">
                {displayIngredients.map((ing, index) => (
                  <IngredientTile key={index} name={ing.name} amount={scaledAmount(ing)} />
                ))}
              </View>
              {allIngredients.length > 6 && (
                <TouchableOpacity
                  onPress={() => setShowAllIngredients(!showAllIngredients)}
                  className="items-center justify-center mt-4 py-2"
                  activeOpacity={0.7}
                >
                  <Text className="font-jakarta-semibold text-primary text-sm">
                    {showAllIngredients ? "Show less" : "Show more"}
                  </Text>
                  <Feather
                    name={showAllIngredients ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#FBA82E"
                    style={{ marginTop: 2 }}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Steps */}
          {activeTab === "Steps" && (
            <View>
              <Text className="font-inter-semibold text-primary-dark text-base mb-3">Directions</Text>
              {recipe.steps.map((step, index) => (
                <View key={index} className="flex-row mb-6 items-start">
                  <View className="w-8 h-8 bg-[#FBA82E] rounded-full items-center justify-center mr-4 mt-0.5 shadow-sm">
                    <Text className="font-jakarta-bold text-white text-xs">{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-inter-regular text-[#3B3328] text-sm leading-6">{step}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating back button */}
      <SafeAreaView className="absolute top-0 left-0" pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-black/35 border border-white/20 ml-4 mt-2"
        >
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>

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
    </View>
  );
}
