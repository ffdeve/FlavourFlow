import Avatar from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { communityService } from "@/services/community.service";
import { profileService } from "@/services/profile.service";
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
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]" edges={["top"]}>
      <FlatList
        // key forces a fresh remount when switching between grid/list layouts
        key={activeTab === "Posts" ? "3-cols" : "1-col"}
        data={
          activeTab === "Posts"
            ? posts
            : [{ id: "dashboard-placeholder" } as any]
        }
        keyExtractor={(item) => item.id}
        numColumns={activeTab === "Posts" ? 3 : 1}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={() => (
          <View className="py-20 items-center justify-center">
            {postsLoading && activeTab === "Posts" ? (
              <ActivityIndicator size="small" color="#FBA82E" />
            ) : (
              <Text className="text-[#8B7D6F] font-inter-medium">
                {activeTab === "Posts" ? "No posts yet." : ""}
              </Text>
            )}
          </View>
        )}
        renderItem={({ item }) => {
          if (activeTab === "Recipes Dashboard") {
            return (
              <View className="w-full py-20 px-8 items-center justify-center">
                <View className="w-16 h-16 rounded-full bg-[#FAF5EF] items-center justify-center mb-4">
                  <Feather name="pie-chart" size={28} color="#FBA82E" />
                </View>
                <Text className="text-lg font-jakarta-bold text-[#3B3328] text-center mb-2">
                  Recipes Dashboard
                </Text>
                <Text className="text-[13px] font-inter-medium text-[#8B7D6F] text-center leading-5">
                  Analytics, trending stats, and overall recipe performance
                  metrics will appear here soon.
                </Text>
              </View>
            );
          }
          return renderPostItem({ item });
        }}
      />
    </SafeAreaView>
  );
}
