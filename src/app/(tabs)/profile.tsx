import Avatar from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { communityService } from "@/services/community.service";
import { profileService } from "@/services/profile.service";
import { recipeService } from "@/services/recipe.service";
import type { Post } from "@/types";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProfileTab = "Posts" | "Recipes Dashboard";

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, profile, updateProfile } = useAuth();

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

  const [analytics, setAnalytics] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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

  // ── Load Analytics ──
  useEffect(() => {
    if (activeTab !== "Recipes Dashboard" || !user?.id) return;

    (async () => {
      setAnalyticsLoading(true);
      try {
        const data = await recipeService.getUserRecipesWithAnalytics(user.id);
        setAnalytics(data);
      } catch (e) {
        console.error("Failed to load recipe analytics:", e);
      } finally {
        setAnalyticsLoading(false);
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

  const displayName = profile?.full_name || "FlavourFlow User";
  const displayEmail = user?.email || "";

  // ── Grid Item Render ──
  const renderPostItem = ({ item }: { item: Post }) => {
    // Determine the thumbnail image
    const thumbnail =
      item.image_url ||
      (item.images && item.images.length > 0 ? item.images[0] : null);
    const itemSize = width / 3;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          Alert.alert("Coming soon", "Post detail view coming soon.")
        }
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

  // ── Recipes Dashboard UI Components ──
  const renderDashboardOverview = () => {
    const totalViews = analytics.reduce((sum, r) => sum + (r.views || 0), 0);
    const totalCooks = analytics.reduce((sum, r) => sum + (r.cooks || 0), 0);

    return (
      <View className="px-5 mt-5">
        <Text className="text-lg font-jakarta-bold text-[#3B3328] mb-3">
          Dashboard Overview
        </Text>
        
        {/* Analytics stats row */}
        <View className="flex-row justify-between gap-3">
          {/* Card 1: Views */}
          <View className="flex-1 bg-white p-4 rounded-2xl border border-[#F5E3D8]/30 items-center" style={{ elevation: 1 }}>
            <View className="w-8 h-8 rounded-full bg-[#FAF5EF] items-center justify-center mb-2">
              <Feather name="eye" size={16} color="#FBA82E" />
            </View>
            <Text className="text-xl font-jakarta-bold text-[#3B3328]">
              {analyticsLoading ? "..." : totalViews}
            </Text>
            <Text className="text-[11px] font-inter-medium text-[#8B7D6F] mt-1 text-center">
              Total Views
            </Text>
          </View>

          {/* Card 2: Cooks */}
          <View className="flex-1 bg-white p-4 rounded-2xl border border-[#F5E3D8]/30 items-center" style={{ elevation: 1 }}>
            <View className="w-8 h-8 rounded-full bg-[#FAF5EF] items-center justify-center mb-2">
              <Feather name="check-circle" size={16} color="#FBA82E" />
            </View>
            <Text className="text-xl font-jakarta-bold text-[#3B3328]">
              {analyticsLoading ? "..." : totalCooks}
            </Text>
            <Text className="text-[11px] font-inter-medium text-[#8B7D6F] mt-1 text-center">
              Times Cooked
            </Text>
          </View>
        </View>

        {analytics.length > 0 && (
          <Text className="text-lg font-jakarta-bold text-[#3B3328] mt-6 mb-2">
            Recipe Analytics ({analytics.length})
          </Text>
        )}
      </View>
    );
  };

  const renderAnalyticsItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/recipe-detail?id=${item.id}`)}
        className="mx-5 my-2 bg-white p-4 rounded-2xl border border-[#F5E3D8]/30 flex-row"
        style={{
          shadowColor: "#3B3328",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.02,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Image
          source={{ uri: item.image }}
          className="w-20 h-20 rounded-xl bg-[#EAE2D8]"
        />
        <View className="flex-1 ml-4 justify-between">
          <View>
            <View className="flex-row items-center justify-between">
              <Text
                className="text-xs font-inter-semibold text-[#8B7D6F] uppercase tracking-wider text-[10px]"
              >
                {item.category}
              </Text>
              <Text className="text-[10px] text-[#C4B8AC] font-inter-regular">
                {new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <Text
              className="text-base font-jakarta-bold text-[#3B3328] mt-0.5"
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </View>

          {/* Views & Cooks Counter Row */}
          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center">
                <Feather name="eye" size={13} color="#8B7D6F" />
                <Text className="text-xs font-inter-medium text-[#8B7D6F] ml-1">
                  {item.views}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Feather name="check" size={13} color="#8B7D6F" />
                <Text className="text-xs font-inter-medium text-[#8B7D6F] ml-1">
                  {item.cooks}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDashboardEmpty = () => {
    if (analyticsLoading) {
      return (
        <View className="py-20 items-center justify-center">
          <ActivityIndicator size="small" color="#FBA82E" />
        </View>
      );
    }

    return (
      <View className="mx-5 mt-4 p-8 bg-white rounded-3xl border border-[#F5E3D8]/30 items-center justify-center">
        <View className="w-16 h-16 rounded-full bg-[#FAF5EF] items-center justify-center mb-4">
          <Feather name="plus-circle" size={28} color="#FBA82E" />
        </View>
        <Text className="text-lg font-jakarta-bold text-[#3B3328] text-center mb-2">
          No Custom Recipes Yet
        </Text>
        <Text className="text-[13px] font-inter-medium text-[#8B7D6F] text-center leading-5 mb-5 px-4">
          Share your culinary secrets with FlavourFlow! Publish your first recipe to see view counts, cooking analytics, and audience engagement.
        </Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/create-recipe")}
          className="bg-[#FBA82E] px-6 py-3 rounded-full flex-row items-center justify-center"
          style={{
            shadowColor: "#FBA82E",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Feather name="plus" size={16} color="white" style={{ marginRight: 6 }} />
          <Text className="text-white font-jakarta-bold text-sm">
            Create First Recipe
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
          Profile
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
        className="mx-5 mt-3 bg-white rounded-[28px] border border-[#F5E3D8]/40 overflow-hidden"
        style={{
          shadowColor: "#3B3328",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <View className="flex-row items-center p-5">
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
              <Avatar url={profile?.avatar_url} name={displayName} size={72} />
            )}
            {/* Camera badge */}
            <View className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#FBA82E] rounded-full items-center justify-center border-2 border-white">
              <Feather name="camera" size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Name + Email */}
          <View className="flex-1 ml-4">
            <Text
              className="text-lg font-jakarta-bold text-[#3B3328]"
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              className="text-[13px] font-inter-medium text-[#8B7D6F] mt-0.5"
              numberOfLines={1}
            >
              {displayEmail}
            </Text>
          </View>
        </View>

        {/* Stats Bar */}
        <View className="flex-row border-t border-[#F5E3D8]/30 py-4 px-2">
          {[
            { label: "Recipes", value: stats.recipes },
            { label: "Followers", value: stats.followers },
            { label: "Following", value: stats.following },
          ].map((stat, i) => (
            <View key={stat.label} className="flex-1 items-center">
              {i > 0 && (
                <View className="absolute left-0 top-1 bottom-1 w-px bg-[#F5E3D8]/50" />
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
            </View>
          ))}
        </View>
      </View>

      {/* ── Content Tabs ── */}
      <View className="flex-row mt-6 border-b border-[#F5E3D8]/50">
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
          onPress={() => setActiveTab("Recipes Dashboard")}
        >
          <Feather
            name="pie-chart"
            size={22}
            color={activeTab === "Recipes Dashboard" ? "#FBA82E" : "#C4B8AC"}
          />
          {activeTab === "Recipes Dashboard" && (
            <View className="absolute bottom-0 w-16 h-[3px] bg-[#FBA82E] rounded-t-full" />
          )}
        </TouchableOpacity>
      </View>
      {activeTab === "Recipes Dashboard" && renderDashboardOverview()}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]" edges={["top"]}>
      <FlatList
        // key forces a fresh remount when switching between grid/list layouts
        key={activeTab === "Posts" ? "3-cols" : "1-col"}
        data={activeTab === "Posts" ? posts : analytics}
        keyExtractor={(item) => item.id}
        numColumns={activeTab === "Posts" ? 3 : 1}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
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
              renderDashboardEmpty()
            )}
          </View>
        )}
        renderItem={({ item }) => {
          if (activeTab === "Recipes Dashboard") {
            return renderAnalyticsItem({ item });
          }
          return renderPostItem({ item });
        }}
      />
    </SafeAreaView>
  );
}
