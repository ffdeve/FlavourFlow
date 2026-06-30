import Avatar from "@/components/ui/avatar";
import { FullWidthRecipeCard } from "@/components/ui/full-width-recipe-card";
import { useAuth } from "@/hooks/use-auth";
import { communityService } from "@/services/community.service";
import { profileService } from "@/services/profile.service";
import { recipeService } from "@/services/recipe.service";
import type { Post } from "@/types";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

type ProfileTab = "Posts" | "Cooked History";

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, profile, updateProfile } = useAuth();
  const { t } = useTranslation();

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    recipes: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ProfileTab>("Posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [cookedHistory, setCookedHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Load Stats & Posts ──
  useEffect(() => {
    if (!user?.id) return;

    // Load Stats
    (async () => {
      try {
        const s = await profileService.getUserProfileWithStats(user.id);
        setStats({
          followers: s.followers,
          following: s.following,
          recipes: s.recipes,
        });
      } catch (e) {
        console.error("Failed to load stats:", e);
      } finally {
        setStatsLoading(false);
      }
    })();

    // Load Posts
    (async () => {
      try {
        const userPosts = await communityService.getUserPosts(user.id);
        setPosts(userPosts);
      } catch (e) {
        console.error("Failed to load user posts:", e);
      } finally {
        setPostsLoading(false);
      }
    })();
  }, [user?.id]);

  // ── Load Cooked History ──
  useEffect(() => {
    if (activeTab !== "Cooked History" || !user?.id) return;

    (async () => {
      setHistoryLoading(true);
      try {
        const data = await recipeService.getCookedHistory(user.id);
        setCookedHistory(data);
      } catch (e) {
        console.error("Failed to load cooked history:", e);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [activeTab, user?.id]);

  // ── Avatar Picker ──
  const handleAvatarPress = useCallback(async () => {
    if (!user?.id) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setAvatarLoading(true);
    try {
      const publicUrl = await profileService.uploadAvatar(
        user.id,
        result.assets[0].uri,
      );
      await updateProfile({ avatar_url: publicUrl });
    } catch (err) {
      Alert.alert(
        "Upload Failed",
        "Could not upload avatar. Please try again.",
      );
      console.error(err);
    } finally {
      setAvatarLoading(false);
    }
  }, [user?.id, updateProfile]);

  // ── Banner Picker ──
  const [bannerLoading, setBannerLoading] = useState(false);
  const handleBannerPress = useCallback(async () => {
    if (!user?.id) return;

    const pickAndUpload = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [21, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setBannerLoading(true);
      try {
        const publicUrl = await profileService.uploadBanner(
          user.id,
          result.assets[0].uri,
        );
        await updateProfile({ banner_url: publicUrl });
      } catch (err) {
        console.error("Banner upload failed:", err);
      } finally {
        setBannerLoading(false);
      }
    };

    if (profile?.banner_url) {
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ["Change Banner", "Remove Banner", "Cancel"],
            cancelButtonIndex: 2,
            destructiveButtonIndex: 1,
          },
          (idx) => {
            if (idx === 0) pickAndUpload();
            if (idx === 1) updateProfile({ banner_url: null });
          }
        );
      } else {
        Alert.alert("Banner Options", "What would you like to do?", [
          { text: "Change Banner", onPress: pickAndUpload },
          { text: "Remove Banner", style: "destructive", onPress: () => updateProfile({ banner_url: null }) },
          { text: "Cancel", style: "cancel" }
        ]);
      }
    } else {
      pickAndUpload();
    }
  }, [user?.id, profile?.banner_url, updateProfile]);

  const displayName = profile?.full_name || "FlavourFlow User";
  const displayEmail = user?.email || "";

  // ── Grid Item Render ──
  const renderPostItem = ({ item }: { item: Post }) => {
    const thumbnail =
      item.image_url ||
      (item.images && item.images.length > 0 ? item.images[0] : null);
    const itemSize = width / 3;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/post-detail?id=${item.id}`)}
        style={{ width: itemSize, height: itemSize, padding: 1 }}
      >
        {thumbnail ? (
          <View className="flex-1 relative bg-[#EAE2D8]">
            <Image
              source={{ uri: thumbnail }}
              style={{ width: "100%", height: "100%" }}
            />
            {item.images && item.images.length > 1 && (
              <View className="absolute top-2 right-2 shadow-sm">
                <Ionicons
                  name="copy"
                  size={14}
                  color="white"
                  style={{ opacity: 0.9 }}
                />
              </View>
            )}
          </View>
        ) : (
          <View className="flex-1 bg-[#FAF5EF] items-center justify-center p-2 border border-[#F5E3D8]/50">
            <Text
              className="text-[10px] font-inter-medium text-[#8B7D6F] text-center"
              numberOfLines={4}
            >
              {item.content}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHistoryEmpty = () => {
    if (historyLoading) {
      return (
        <View className="py-20 items-center justify-center">
          <ActivityIndicator size="small" color="#FBA82E" />
        </View>
      );
    }

    return (
      <View className="mx-5 mt-4 p-8 bg-white rounded-3xl border border-[#F5E3D8]/30 items-center justify-center">
        <View className="w-16 h-16 rounded-full bg-[#FAF5EF] items-center justify-center mb-4">
          <MaterialCommunityIcons name="chef-hat" size={28} color="#FBA82E" />
        </View>
        <Text className="text-lg font-jakarta-bold text-[#3B3328] text-center mb-2">
          No Cooking History Yet
        </Text>
        <Text className="text-[13px] font-inter-medium text-[#8B7D6F] text-center leading-5 mb-5 px-4">
          When you finish cooking a recipe, it will appear here so you can keep
          track of all your culinary achievements.
        </Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/search")}
          className="bg-[#FBA82E] px-6 py-3 rounded-full flex-row items-center justify-center"
          style={{
            shadowColor: "#FBA82E",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Image
            source={require("@/assets/icons/magnifying_glass.webp")}
            style={{ width: 22, height: 22, marginRight: 6 }}
            contentFit="contain"
          />
          <Text className="text-white font-jakarta-bold text-sm">
            Find Recipes
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Profile Header Render ──
  const renderHeader = () => (
    <View>
      {/* ── Top Header ── */}
      <View className="flex-row items-center justify-between px-6 pt-3 pb-2">
        <Text className="text-2xl font-jakarta-bold text-[#3B3328]">
          {t("Profile")}
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          className="p-2 -mr-2"
        >
          <Image
            source={require("@/assets/icons/settings.webp")}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* ── Profile Card ── */}
      <View
        className="mx-5 mt-3 bg-white rounded-[28px] border border-[#F5E3D8]/40 overflow-hidden relative"
        style={{
          shadowColor: "#3B3328",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        {/* Banner Background */}
        {profile?.banner_url ? (
          <View
            className="absolute top-0 left-0 right-0"
            style={{ height: 160, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}
          >
            <Image
              source={{ uri: profile.banner_url }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
            {/* Subtle gradient at the bottom to blend into the white card */}
            <LinearGradient
              colors={["rgba(255,255,255,0.01)", "rgba(255,255,255,1)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 32 }}
            />
          </View>
        ) : (
          <View
            className="absolute top-0 left-0 right-0"
            style={{ height: 160 }}
          />
        )}

        <View
          className="flex-row items-center p-5 pt-16 pb-6 z-10"
          pointerEvents="box-none"
        >
          {/* Avatar with camera overlay */}
          <TouchableOpacity
            onPress={handleAvatarPress}
            activeOpacity={0.8}
            className="relative"
          >
            {avatarLoading ? (
              <View
                style={{ width: 72, height: 72, borderRadius: 36 }}
                className="bg-[#FAF5EF] items-center justify-center"
              >
                <ActivityIndicator size="small" color="#FBA82E" />
              </View>
            ) : (
              <View className="border-2 border-white rounded-full shadow-sm bg-white">
                <Avatar
                  url={profile?.avatar_url}
                  name={displayName}
                  size={68}
                />
              </View>
            )}
            {/* Camera badge */}
            <View className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#FBA82E] rounded-full items-center justify-center border-2 border-white shadow-sm">
              <Feather name="camera" size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Name + Email */}
          <View className="flex-1 ml-4 justify-center">
            <Text
              className="text-lg font-jakarta-bold text-[#3B3328]"
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              className={`text-[13px] font-inter-medium mt-0.5 ${profile?.banner_url ? 'text-[#3B3328]' : 'text-[#8B7D6F]'}`}
              numberOfLines={1}
            >
              {displayEmail}
            </Text>
          </View>
        </View>

        {/* Camera button for banner */}
        <TouchableOpacity
          onPress={handleBannerPress}
          style={{ zIndex: 20, elevation: 5 }}
          className="absolute top-3 right-3 w-9 h-9 bg-[#FBA82E] rounded-full items-center justify-center shadow-md border-2 border-white"
        >
          {bannerLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="camera" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        {/* Stats Bar */}
        <View className="flex-row py-4 px-2">
          {[
            { label: t("Recipes"), value: stats.recipes, onPress: undefined },
            {
              label: t("Followers"),
              value: stats.followers,
              onPress: () => router.push(`/user-followers?userId=${user?.id}`),
            },
            {
              label: t("Following"),
              value: stats.following,
              onPress: () => router.push(`/user-following?userId=${user?.id}`),
            },
          ].map((stat, i) => {
            const content = (
              <>
                {i > 0 && (
                  <View
                    className="absolute left-0 top-1 bottom-1 w-px bg-[#F5E3D8]/50"
                    pointerEvents="none"
                  />
                )}
                {statsLoading ? (
                  <ActivityIndicator size="small" color="#FBA82E" />
                ) : (
                  <Text className="text-lg font-jakarta-bold text-[#3B3328]">
                    {stat.value >= 1000
                      ? `${(stat.value / 1000).toFixed(1)}K`
                      : stat.value}
                  </Text>
                )}
                <Text className="text-[11px] font-inter-medium text-[#8B7D6F] mt-0.5">
                  {stat.label}
                </Text>
              </>
            );

            if (stat.onPress) {
              return (
                <TouchableOpacity
                  key={stat.label}
                  activeOpacity={0.5}
                  onPress={stat.onPress}
                  className="flex-1 items-center relative"
                >
                  {content}
                </TouchableOpacity>
              );
            }

            return (
              <View key={stat.label} className="flex-1 items-center relative">
                {content}
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Content Tabs ── */}
      <View className="flex-row mt-2 border-b border-[#F5E3D8]/50 mb-4">
        <TouchableOpacity
          className="flex-1 py-4 items-center justify-center"
          onPress={() => setActiveTab("Posts")}
        >
          <Feather
            name="grid"
            size={22}
            color={activeTab === "Posts" ? "#FBA82E" : "#C4B8AC"}
          />
          {activeTab === "Posts" && (
            <View className="absolute bottom-0 w-16 h-[3px] bg-[#FBA82E] rounded-t-full" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-4 items-center justify-center"
          onPress={() => setActiveTab("Cooked History")}
        >
          <Feather
            name="book-open"
            size={22}
            color={activeTab === "Cooked History" ? "#FBA82E" : "#C4B8AC"}
          />
          {activeTab === "Cooked History" && (
            <View className="absolute bottom-0 w-16 h-[3px] bg-[#FBA82E] rounded-t-full" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]" edges={["top"]}>
      <FlatList
        key={activeTab === "Posts" ? "3-cols" : "1-col"}
        data={activeTab === "Posts" ? posts : cookedHistory}
        keyExtractor={(item) => item.id}
        numColumns={activeTab === "Posts" ? 3 : 1}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={() => (
          <View>
            {activeTab === "Posts" ? (
              <View className="py-20 items-center justify-center">
                {postsLoading ? (
                  <ActivityIndicator size="small" color="#FBA82E" />
                ) : (
                  <Text className="text-[#8B7D6F] font-inter-medium">
                    No posts yet.
                  </Text>
                )}
              </View>
            ) : (
              renderHistoryEmpty()
            )}
          </View>
        )}
        renderItem={({ item }) => {
          if (activeTab === "Cooked History") {
            return (
              <View className="px-5 mb-4">
                <FullWidthRecipeCard
                  title={item.title}
                  time={item.time}
                  spiceLevel={item.spiceLevel}
                  image={item.image}
                  ingredientsCount={item.ingredientsCount}
                  rating={item.rating}
                  onPress={() => router.push(`/recipe-detail?id=${item.id}`)}
                  isFavorite={false}
                  onToggleFavorite={() => {}}
                />
              </View>
            );
          }
          return renderPostItem({ item });
        }}
      />
    </SafeAreaView>
  );
}
