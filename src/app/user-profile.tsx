import React, { useCallback, useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Platform,
  Share,
  Text,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
} from "react-native";
import { CookingLoader } from "@/components/ui/cooking-loader";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/hooks/use-auth";
import { profileService } from "@/services/profile.service";
import Avatar from "@/components/ui/avatar";
import type { Profile } from "@/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const BANNER_HEIGHT = 200;

// ─── Search-style Recipe Card ────────────────────────────────
function ProfileRecipeCard({
  recipe,
  onPress,
}: {
  recipe: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="rounded-2xl overflow-hidden bg-white"
      style={{
        shadowColor: "#3B3328",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* Image */}
      <View className="relative w-full aspect-[1.1] overflow-hidden bg-gray-100">
        <Image
          source={{
            uri:
              recipe.image_url ||
              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600",
          }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={300}
        />
        {/* Rating overlay (Top Right) */}
        <View className="absolute top-2.5 right-2.5 bg-black/45 px-1.5 py-0.5 rounded-full flex-row items-center z-10">
          <Ionicons name="star" size={8} color="#FBA82E" />
          <Text className="text-white text-[8px] font-jakarta-semibold ml-0.5">
            {recipe.average_rating || "4.5"}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 }}>
        <Text
          className="font-jakarta-bold text-[#3B3328] text-[13px] mb-2 leading-[17px]"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {recipe.title}
        </Text>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Image source={require("@/assets/icons/Ingredients.webp")} style={{ width: 14, height: 14 }} contentFit="contain" />
            <Text className="font-inter-medium text-[#8B7D6F] text-[10px] ml-1">
              {recipe.ingredientsCount || (recipe.ingredients || []).length || 0} Ingredients
            </Text>
          </View>
          <View className="flex-row items-center">
            <Image source={require("@/assets/icons/recipe_card_time.webp")} style={{ width: 14, height: 14 }} contentFit="contain" />
            <Text className="font-inter-medium text-[#8B7D6F] text-[10px] ml-1">
              {recipe.cook_time ? `${recipe.cook_time} min` : recipe.time || "—"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatPill({
  value,
  label,
  showDivider,
  onPress,
  isPrivate,
}: {
  value: number | string;
  label: string;
  showDivider?: boolean;
  onPress?: () => void;
  isPrivate?: boolean;
}) {
  const display =
    isPrivate ? "-" : (typeof value === "number" && value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString());
  
  const inner = (
    <>
      {showDivider && (
        <View className="absolute left-0 top-1 bottom-1 w-px bg-[#F5E3D8]/60" pointerEvents="none" />
      )}
      <View className="flex-row items-center">
        {isPrivate && <Feather name="lock" size={12} color="#8B7D6F" style={{ marginRight: 4 }} />}
        <Text className="text-lg font-jakarta-bold text-[#3B3328]">
          {display}
        </Text>
      </View>
      <Text className="text-[11px] font-inter-medium text-[#8B7D6F] mt-0.5">
        {label}
      </Text>
    </>
  );

  if (onPress && !isPrivate) {
    return (
      <TouchableOpacity 
        activeOpacity={0.5} 
        onPress={onPress} 
        className="flex-1 items-center relative py-2"
        style={{ zIndex: 10 }}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-1 items-center relative py-2">
      {inner}
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
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0, recipes: 0 });
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  // ── Load Data ──
  useEffect(() => {
    let targetUserId = userId;
    if (!targetUserId || targetUserId === "null" || targetUserId === "undefined") {
      targetUserId = "5bf898af-4881-4998-9a9c-d3addfb32665"; // Real Chef Boo DB UUID
    }

    (async () => {
      try {
        const [profileStats, userRecipes] = await Promise.all([
          profileService.getUserProfileWithStats(targetUserId),
          profileService.getUserRecipesPublic(targetUserId, 1, 6),
        ]);
        setProfile(profileStats.profile);
        setStats({
          followers: profileStats.followers,
          following: profileStats.following,
          posts: profileStats.posts,
          recipes: profileStats.recipes,
        });
        setRecipes(userRecipes);
        setHasMore(userRecipes.length >= 6);
        setPage(1);

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

  const loadMoreRecipes = useCallback(async () => {
    let targetUserId = userId;
    if (!targetUserId || targetUserId === "null" || targetUserId === "undefined") {
      targetUserId = "5bf898af-4881-4998-9a9c-d3addfb32665";
    }
    
    if (loadingMore || !hasMore || loading) return;
    
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const moreRecipes = await profileService.getUserRecipesPublic(targetUserId, nextPage, 6);
      
      if (moreRecipes.length > 0) {
        setRecipes((prev) => [...prev, ...moreRecipes]);
        setPage(nextPage);
      }
      if (moreRecipes.length < 6) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more recipes:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, page, loadingMore, hasMore, loading]);

  const displayName = profile?.full_name || "User";
  const displayUsername =
    profile?.username || `@${displayName.toLowerCase().replace(/\s+/g, "")}`;

  // ── Toggle Follow ──
  const handleFollowToggle = useCallback(() => {
    if (!currentUser?.id || !userId || isOwnProfile) return;
    
    if (isFollowing) {
      // Unfollow Modal
      import("react-native").then(({ Alert }) => {
        Alert.alert(
          `Unfollow ${displayName}?`,
          "",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Unfollow",
              style: "destructive",
              onPress: async () => {
                // Optimistic Update
                setIsFollowing(false);
                setStats((prev) => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
                DeviceEventEmitter.emit('FOLLOW_STATUS_CHANGED', { userId, isFollowing: false });

                try {
                  await profileService.unfollowUser(currentUser.id, userId);
                } catch (err) {
                  // Revert if failed
                  setIsFollowing(true);
                  setStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
                  DeviceEventEmitter.emit('FOLLOW_STATUS_CHANGED', { userId, isFollowing: true });
                  console.error("Unfollow toggle error:", err);
                }
              },
            },
          ]
        );
      });
    } else {
      // Optimistic Follow
      setIsFollowing(true);
      setStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
      DeviceEventEmitter.emit('FOLLOW_STATUS_CHANGED', { userId, isFollowing: true });

      profileService.followUser(currentUser.id, userId).catch((err) => {
        // Revert if failed
        setIsFollowing(false);
        setStats((prev) => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
        DeviceEventEmitter.emit('FOLLOW_STATUS_CHANGED', { userId, isFollowing: false });
        console.error("Follow toggle error:", err);
      });
    }
  }, [currentUser?.id, userId, isOwnProfile, isFollowing, displayName]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#FFFDF5] items-center justify-center">
        <CookingLoader scale={0.8} />
      </View>
    );
  }

  // ── Header Component ──
  const renderHeader = () => (
    <View>
      {/* ── Banner ── */}
      <View style={{ height: BANNER_HEIGHT }} className="relative bg-[#F5E3D8]">
        {profile?.banner_url ? (
          <Image
            source={{ uri: profile.banner_url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <>
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
          </>
        )}

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-5 w-10 h-10 bg-white/30 rounded-full items-center justify-center"
          style={{
            top: Math.max(insets.top + 10, 56), // Ensure it clears dynamic island
          }}
        >
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Options */}
        <TouchableOpacity
          onPress={() => {
            const options = ["Share Profile", "Report User", "Block User", "Cancel"];
            const cancelIdx = 3;
            const destructiveIdx = 2;

            if (Platform.OS === "ios") {
              ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: cancelIdx, destructiveButtonIndex: destructiveIdx },
                (idx) => {
                  if (idx === 0) {
                    Share.share({ message: `Check out ${displayName}'s profile on FlavourFlow!` });
                  } else if (idx === 1) {
                    Alert.alert("Report", `${displayName} has been reported. We'll review this shortly.`);
                  } else if (idx === 2) {
                    Alert.alert("Block", `${displayName} has been blocked.`);
                  }
                },
              );
            } else {
              Alert.alert("Options", "", [
                { text: "Share Profile", onPress: () => Share.share({ message: `Check out ${displayName}'s profile on FlavourFlow!` }) },
                { text: "Report User", onPress: () => Alert.alert("Report", `${displayName} has been reported.`) },
                { text: "Block User", style: "destructive", onPress: () => Alert.alert("Block", `${displayName} has been blocked.`) },
                { text: "Cancel", style: "cancel" },
              ]);
            }
          }}
          className="absolute right-5 w-10 h-10 bg-white/30 rounded-full items-center justify-center"
          style={{
            top: Math.max(insets.top + 10, 56), // Ensure it clears dynamic island
          }}
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

              {/* Name & Username */}
              <View className="items-center mt-3">
                <View className="flex-row items-center">
                  <Text className="font-poppins-bold text-xl text-text-darker">
                    {displayName}
                  </Text>
                  {displayName === "Chef Boo" && (
                    <MaterialIcons name="verified" size={16} color="#1DA1F2" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <Text className="font-inter-medium text-text-light text-sm mt-0.5">
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
        <StatPill 
          value={stats.followers} 
          label="Followers" 
          showDivider 
          onPress={() => router.push(`/user-followers?userId=${userId}`)} 
          isPrivate={profile?.is_private && !isOwnProfile}
        />
        <StatPill 
          value={stats.following} 
          label="Following" 
          showDivider 
          onPress={() => router.push(`/user-following?userId=${userId}`)} 
          isPrivate={profile?.is_private && !isOwnProfile}
        />
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
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 20 }}
        renderItem={({ item }) => (
          <View style={{ width: '48%' }}>
            <ProfileRecipeCard
              recipe={item}
              onPress={() => router.push(`/recipe-detail?id=${item.id}`)}
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          <View className="h-20 items-center justify-center">
            {loadingMore && <ActivityIndicator size="small" color="#FBA82E" />}
          </View>
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMoreRecipes}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}
