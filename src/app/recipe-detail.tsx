import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";

import { recommendedRecipes } from "@/lib/dummy-data";
import { Video, ResizeMode } from "expo-av";
import { WebView } from "react-native-webview";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.42;

// Spice level asset images
const SPICE_IMAGES: Record<number, any> = {
  1: require("@/assets/icons/spice_1.png"),
  2: require("@/assets/icons/spice_2.png"),
  3: require("@/assets/icons/spice_3.png"),
  4: require("@/assets/icons/spice_4.png"),
  5: require("@/assets/icons/spice_5.png"),
};

// Block icon asset images
const INGREDIENTS_ICON = require("@/assets/icons/Ingredients.webp");
const KCAL_ICON = require("@/assets/icons/kcal.png");
const SERVINGS_ICON = require("@/assets/icons/servings.png");

const TABS = ["Overview", "Ingredients", "Steps"] as const;
type TabType = (typeof TABS)[number];

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = recommendedRecipes.find((r) => r.id === id) || recommendedRecipes[0];

  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [activeVideo, setActiveVideo] = useState(false);

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeVideoId = recipe.videoUrl ? getYoutubeId(recipe.videoUrl) : null;

  const getIngredientStorageUrl = (name: string) => {
    if (!name) return "";
    const lowerName = name.toLowerCase().trim();
    
    // Exact matching for files currently in bucket
    if (lowerName.includes("chili") || lowerName.includes("chilli")) {
      if (lowerName.includes("green") || lowerName.includes("jalapeno")) {
        return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/jalapeno.webp`;
      }
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/redchili.webp`;
    }
    if (lowerName.includes("onion")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/pearlonion.webp`;
    }
    if (lowerName.includes("cilantro") || lowerName.includes("coriander") || lowerName.includes("mint")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/cilantro.webp`;
    }
    if (lowerName.includes("water")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/Glass%20Water%20Jug.webp`;
    }
    if (lowerName.includes("pasta") || lowerName.includes("noodle") || lowerName.includes("macaroni")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/Farfalle%20Pasta.webp`;
    }
    if (lowerName.includes("banana")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/banana.webp`;
    }
    if (lowerName.includes("ice")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/Ice.webp`;
    }
    if (lowerName.includes("soda")) {
      return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/bakingsoda.webp`;
    }

    // Generic dynamic URL construction for future uploaded ingredients
    const formattedName = name.trim().replace(/\s+/g, "%20");
    return `https://gcuunqmbapmoelvczanv.supabase.co/storage/v1/object/public/ingredient-icons/${formattedName}.webp`;
  };

  const displayIngredients = showAllIngredients
    ? recipe.ingredients
    : recipe.ingredients.slice(0, 6);

  return (
    <View className="flex-1 bg-[#FAF5EF]">
      <StatusBar barStyle="light-content" />

      {/* Floating Header Icons (over image) */}
      <View
        className="absolute top-0 left-0 right-0 z-20 flex-row justify-between items-center px-5"
        style={{ paddingTop: 54 }}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-11 h-11 bg-black/30 rounded-full items-center justify-center"
        >
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Right icons */}
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => setIsSaved(!isSaved)}
            className="w-11 h-11 bg-black/30 rounded-full items-center justify-center mr-2"
          >
            <FontAwesome
              name={isSaved ? "heart" : "heart-o"}
              size={18}
              color={isSaved ? "#FF4B4B" : "#FFFFFF"}
            />
          </TouchableOpacity>
          <TouchableOpacity className="w-11 h-11 bg-black/30 rounded-full items-center justify-center">
            <Feather name="share" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Area */}
        <View style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}>
          {activeVideo && recipe.videoUrl ? (
            <View style={{ width: "100%", height: "100%", overflow: "hidden" }}>
              {youtubeVideoId ? (
                <WebView
                  style={{ width: "100%", height: "100%" }}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  source={{
                    uri: `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&playsinline=1&controls=1`,
                  }}
                />
              ) : (
                <Video
                  source={{ uri: recipe.videoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  onPlaybackStatusUpdate={(status) => {
                    if (status.isLoaded && !status.isPlaying && status.didJustFinish) {
                      setActiveVideo(false);
                    }
                  }}
                />
              )}
              {/* Floating close button for video */}
              <TouchableOpacity
                onPress={() => setActiveVideo(false)}
                className="absolute top-16 right-5 w-8 h-8 bg-black/50 rounded-full items-center justify-center z-30"
              >
                <Feather name="x" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: "100%", height: "100%" }}>
              <Image
                source={{ uri: recipe.image }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
              {recipe.videoUrl && (
                <TouchableOpacity
                  onPress={() => setActiveVideo(true)}
                  className="absolute inset-0 items-center justify-center bg-black/10"
                  activeOpacity={0.8}
                >
                  <View className="w-16 h-16 rounded-full bg-black/45 items-center justify-center border border-white/20 shadow-md">
                    <FontAwesome name="play" size={22} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bottom fade gradient */}
          <LinearGradient
            colors={["transparent", "rgba(255,253,245,0.5)", "#FAF5EF"]}
            locations={[0.3, 0.7, 1]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 120,
            }}
          />

          {/* Time Overlay - Right Side Bottom */}
          <View className="absolute bottom-6 right-5 bg-black/40 rounded-full py-1.5 px-3.5 flex-row items-center border border-white/20">
            <Feather name="clock" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text className="font-jakarta-semibold text-white text-xs">
              {recipe.time || `${recipe.cookingMinutes} min`}
            </Text>
          </View>

          {/* Spice Overlay - Left Side Bottom */}
          {recipe.spiceLevel > 0 && (
            <View className="absolute bottom-6 left-5 bg-black/40 rounded-full p-1.5 flex-row items-center border border-white/20">
              <Image
                source={SPICE_IMAGES[Math.min(recipe.spiceLevel, 5)]}
                style={{ width: 20, height: 20 }}
                contentFit="contain"
              />
            </View>
          )}
        </View>

        {/* White Content Sheet */}
        <View
          className="bg-[#FAF5EF] -mt-4 rounded-t-[32px] px-6 pt-10 pb-32"
          style={{ minHeight: SCREEN_HEIGHT * 0.6 }}
        >
          {/* Recipe Title & Rating Row */}
          <View className="flex-row justify-between items-start mb-3">
            <Text className="font-jakarta-bold text-primary-dark text-2xl leading-8 flex-1 mr-4">
              {recipe.title}
            </Text>
            <View className="bg-primary/10 px-3 py-1.5 rounded-full flex-row items-center border border-primary/20">
              <FontAwesome name="star" size={14} color="#FBA82E" />
              <Text className="font-jakarta-bold text-primary-dark text-sm ml-1.5">
                {recipe.rating}
              </Text>
            </View>
          </View>

          {/* Author Row */}
          <View className="flex-row items-center mb-6">
            <Image
              source={{ uri: recipe.authorAvatar }}
              className="w-8 h-8 rounded-full bg-gray-200 mr-2.5"
            />
            <Text className="font-inter-medium text-text-lighter text-sm">
              By {recipe.authorName}
            </Text>
            <Feather name="chevron-right" size={14} color="#8B7D6F" style={{ marginLeft: 2 }} />
          </View>

          {/* 3 Blocks Row (Ingredients, Kcl, Serving) */}
          <View className="flex-row justify-between mb-6">
            {/* Block 1: Ingredients */}
            <View className="flex-1 bg-[#FFF2D9] rounded-2xl p-3 mr-2.5 items-center justify-center min-h-[110px]">
              <Image
                source={INGREDIENTS_ICON}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
              <Text className="font-jakarta-medium text-text-DEFAULT text-xs text-center mt-2.5">
                {recipe.ingredientsCount} Ingredients
              </Text>
            </View>

            {/* Block 2: Kcl */}
            <View className="flex-1 bg-[#FFEAD2] rounded-2xl p-3 mr-2.5 items-center justify-center min-h-[110px]">
              <Image
                source={KCAL_ICON}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
              <Text className="font-jakarta-medium text-text-DEFAULT text-xs text-center mt-2.5">
                {recipe.nutrition?.calories || 320} Kcal
              </Text>
            </View>

            {/* Block 3: Serving */}
            <View className="flex-1 bg-[#FDF0EB] rounded-2xl p-3 items-center justify-center min-h-[110px]">
              <Image
                source={SERVINGS_ICON}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
              <Text className="font-jakarta-medium text-text-DEFAULT text-xs text-center mt-2.5">
                {recipe.servings || 2} Servings
              </Text>
            </View>
          </View>

          {/* Tab Pills */}
          <View className="flex-row mb-5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                  className={`px-5 py-2.5 rounded-full mr-2.5 ${
                    isActive ? "bg-primary" : "bg-[#F4F4F4] border border-gray-200"
                  }`}
                >
                  <Text
                    className={`font-jakarta-semibold text-sm ${
                      isActive ? "text-white" : "text-text-lighter"
                    }`}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab Content */}
          {activeTab === "Overview" && (
            <View>
              <Text className="font-inter-semibold text-primary-dark text-base mb-2">
                Description
              </Text>
              <Text className="font-inter-regular text-text-lighter text-sm leading-6">
                {recipe.description}
              </Text>
            </View>
          )}

          {activeTab === "Ingredients" && (
            <View>
              <Text className="font-inter-semibold text-primary-dark text-base mb-4">
                Ingredients
              </Text>
              <View className="flex-row flex-wrap justify-start">
                {displayIngredients.map((ing, index) => (
                  <View
                    key={index}
                    className="w-[31.3%] m-[1%] min-h-[110px] bg-[#F5E3D8] rounded-3xl items-center justify-center p-2 shadow-sm"
                  >
                    <Image
                      source={{ uri: getIngredientStorageUrl(ing.name) }}
                      style={{ width: 44, height: 44 }}
                      contentFit="contain"
                    />
                    <Text
                      className="text-text-DEFAULT font-jakarta-medium text-[9px] text-center mt-2 leading-3"
                      numberOfLines={2}
                    >
                      {ing.quantity} {ing.name}
                    </Text>
                  </View>
                ))}
              </View>

              {recipe.ingredients.length > 6 && (
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

          {activeTab === "Steps" && (
            <View>
              <Text className="font-inter-semibold text-primary-dark text-base mb-3">
                Directions
              </Text>
              {recipe.steps.map((step, index) => (
                <View key={index} className="flex-row mb-5">
                  {/* Step number circle */}
                  <View className="w-8 h-8 bg-primary rounded-full items-center justify-center mr-4 mt-0.5">
                    <Text className="font-jakarta-bold text-white text-xs">{step.step}</Text>
                  </View>
                  {/* Step instruction */}
                  <View className="flex-1">
                    <Text className="font-inter-regular text-text-DEFAULT text-sm leading-6">
                      {step.instruction}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-4"
        style={{ backgroundColor: "transparent" }}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,253,245,0.9)", "#FAF5EF"]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
          }}
        />
        <TouchableOpacity
          activeOpacity={0.9}
          className="bg-primary py-4 rounded-full flex-row items-center justify-center shadow-lg"
          style={{
            shadowColor: "#FBA82E",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
            elevation: 8,
          }}
        >
          <Text className="text-base mr-2">🔥</Text>
          <Text className="font-jakarta-bold text-white text-base">
            Start Cooking
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
