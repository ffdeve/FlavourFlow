import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/hooks/use-auth";
import { profileService } from "@/services/profile.service";
import Avatar from "@/components/ui/avatar";
import type { Profile } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;
const BANNER_HEIGHT = 200;

// ─── Recipe Grid Card ────────────────────────────────────────
function RecipeGridCard({
  recipe,
  onPress,
}: {
  recipe: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      className="rounded-[20px] overflow-hidden bg-white border border-[#F5E3D8]/30"
      style={{
        width: CARD_WIDTH,
        shadowColor: "#3B3328",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      {/* Image */}
      <View className="relative" style={{ height: CARD_WIDTH * 0.85 }}>
        <Image
          source={{
            uri:
              recipe.image_url ||
              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600",
          }}
          className="w-full h-full"
          contentFit="cover"
          transition={300}
        />
        {/* Gradient overlay at bottom */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.35)"]}
          className="absolute bottom-0 left-0 right-0 h-16"
        />
        {/* Cook time badge */}
        {recipe.cook_time && (
          <View className="absolute bottom-2.5 left-2.5 flex-row items-center bg-white/90 px-2.5 py-1 rounded-full">
            <Feather name="clock" size={11} color="#8B7D6F" />
            <Text className="text-[10px] font-inter-medium text-[#8B7D6F] ml-1">
              {recipe.cook_time} min
            </Text>
          </View>
        )}
      </View>

      {/* Title */}
      <View className="px-3 py-3">
        <Text
          className="text-[13px] font-jakarta-semibold text-[#3B3328] leading-4"
          numberOfLines={2}
        >
          {recipe.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Stats Pill ──────────────────────────────────────────────
function StatPill({
  value,
  label,
  showDivider,
}: {
  value: number;
  label: string;
  showDivider?: boolean;
}) {
  const display =
    value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString();
  return (
    <View className="flex-1 items-center relative">
      {showDivider && (
        <View className="absolute left-0 top-1 bottom-1 w-px bg-[#F5E3D8]/60" />
      )}
      <Text className="text-lg font-jakarta-bold text-[#3B3328]">
        {display}
      </Text>
      <Text className="text-[11px] font-inter-medium text-[#8B7D6F] mt-0.5">
        {label}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0, recipes: 0 });
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.id === userId;

  // ── Load Data ──
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [profileStats, userRecipes] = await Promise.all([
          profileService.getUserProfileWithStats(userId),
          profileService.getUserRecipesPublic(userId),
        ]);
        setProfile(profileStats.profile);
        setStats({
          followers: profileStats.followers,
          following: profileStats.following,
          posts: profileStats.posts,
          recipes: profileStats.recipes,
        });
        setRecipes(userRecipes);

        // Check follow state
        if (currentUser?.id && currentUser.id !== userId) {
          const following = await profileService.isFollowing(
            currentUser.id,
            userId
          );
          setIsFollowing(following);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, currentUser?.id]);

  // ── Toggle Follow ──
  const handleFollowToggle = useCallback(async () => {
    if (!currentUser?.id || !userId || isOwnProfile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await profileService.unfollowUser(currentUser.id, userId);
        setIsFollowing(false);
        setStats((prev) => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
        DeviceEventEmitter.emit('FOLLOW_STATUS_CHANGED', { userId, isFollowing: false });
      } else {
        await profileService.followUser(currentUser.id, userId);
        setIsFollowing(true);
        setStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
        DeviceEventEmitter.emit('FOLLOW_STATUS_CHANGED', { userId, isFollowing: true });
      }
    } catch (err) {
      console.error("Follow toggle error:", err);
    } finally {
      setFollowLoading(false);
    }
  }, [currentUser?.id, userId, isOwnProfile, isFollowing]);

  const displayName = profile?.full_name || "User";
  const displayUsername =
    profile?.username || `@${displayName.toLowerCase().replace(/\s+/g, "")}`;

  if (loading) {
    return (
      <View className="flex-1 bg-[#FFFDF5] items-center justify-center">
        <ActivityIndicator size="large" color="#FBA82E" />
      </View>
    );
  }

  // ── Header Component ──
  const renderHeader = () => (
    <View>
      {/* ── Banner ── */}
      <View style={{ height: BANNER_HEIGHT }} className="relative bg-[#F5E3D8]">
        {/* Warm gradient banner */}
        <LinearGradient
          colors={["#FBA82E", "#F5905E", "#F5E3D8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-full h-full"
        />
        {/* Decorative circles */}
        <View
          className="absolute opacity-10"
          style={{
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: "#FFFFFF",
            top: -40,
            right: -30,
          }}
        />
        <View
          className="absolute opacity-[0.06]"
          style={{
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: "#FFFFFF",
            bottom: -20,
            left: 30,
          }}
        />

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-14 left-5 w-10 h-10 bg-white/30 rounded-full items-center justify-center"
          style={{
            backdropFilter: "blur(10px)",
          }}
        >
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Options */}
        <TouchableOpacity
          onPress={() => {}}
          className="absolute top-14 right-5 w-10 h-10 bg-white/30 rounded-full items-center justify-center"
        >
          <Feather name="more-horizontal" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── Avatar (overlapping the banner) ── */}
      <View className="items-center -mt-14 z-10">
        <View
          className="rounded-full border-4 border-[#FFFDF5]"
          style={{
            shadowColor: "#3B3328",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Avatar url={profile?.avatar_url} name={displayName} size={96} />
        </View>
      </View>

      {/* ── Name & Username ── */}
      <View className="items-center mt-4 px-6">
        <Text className="text-[22px] font-jakarta-bold text-[#3B3328]">
          {displayName}
        </Text>
        <Text className="text-sm font-inter-medium text-[#8B7D6F] mt-1">
          {displayUsername.startsWith("@")
            ? displayUsername
            : `@${displayUsername}`}
        </Text>
        {profile?.bio && (
          <Text className="text-[13px] font-inter-medium text-[#8B7D6F] text-center mt-3 leading-5 max-w-[280px]">
            {profile.bio}
          </Text>
        )}
      </View>

      {/* ── Stats Row ── */}
      <View className="flex-row mx-6 mt-6 py-4 bg-white rounded-[20px] border border-[#F5E3D8]/40"
        style={{
          shadowColor: "#3B3328",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <StatPill value={stats.recipes} label="Recipes" />
        <StatPill value={stats.followers} label="Followers" showDivider />
        <StatPill value={stats.following} label="Following" showDivider />
      </View>

      {/* ── Follow Button (only for other users) ── */}
      {!isOwnProfile && (
        <View className="flex-row px-6 mt-5 space-x-3">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleFollowToggle}
            disabled={followLoading}
            className={`flex-1 py-3.5 rounded-full items-center justify-center ${
              isFollowing
                ? "bg-white border border-[#F5E3D8]"
                : "bg-[#FBA82E]"
            }`}
            style={
              !isFollowing
                ? {
                    shadowColor: "#FBA82E",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }
                : undefined
            }
          >
            {followLoading ? (
              <ActivityIndicator
                size="small"
                color={isFollowing ? "#3B3328" : "#FFFFFF"}
              />
            ) : (
              <Text
                className={`text-[15px] font-jakarta-semibold ${
                  isFollowing ? "text-[#3B3328]" : "text-white"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Recipes Section Header ── */}
      <View className="flex-row items-center justify-between px-6 mt-7 mb-4">
        <View className="flex-row items-center">
          <Ionicons name="restaurant-outline" size={18} color="#FBA82E" />
          <Text className="text-base font-jakarta-bold text-[#3B3328] ml-2">
            Recipes
          </Text>
        </View>
        <Text className="text-xs font-inter-medium text-[#8B7D6F]">
          {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
        </Text>
      </View>
    </View>
  );

  // ── Empty Recipes ──
  const renderEmpty = () => (
    <View className="items-center py-16 px-6">
      <View className="w-16 h-16 bg-[#F5E3D8]/30 rounded-full items-center justify-center mb-4">
        <Ionicons name="receipt-outline" size={28} color="#FBA82E" />
      </View>
      <Text className="text-base font-jakarta-bold text-[#3B3328] mb-1">
        No recipes yet
      </Text>
      <Text className="text-sm font-inter-medium text-[#8B7D6F] text-center leading-5">
        {isOwnProfile
          ? "Create your first recipe to showcase it here!"
          : `${displayName} hasn't shared any recipes yet.`}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-[#FFFDF5]">
      <FlatList
        data={recipes}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{
          paddingHorizontal: 14,
          gap: CARD_GAP,
          marginBottom: CARD_GAP,
        }}
        renderItem={({ item }) => (
          <RecipeGridCard
            recipe={item}
            onPress={() => router.push(`/recipe-detail?id=${item.id}`)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={<View className="h-20" />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
