import Avatar from "@/components/ui/avatar";
import { communityService } from "@/services/community.service";
import { profileService } from "@/services/profile.service";
import type { Post } from "@/types";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  DeviceEventEmitter,
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onCommentPress: (postId: string) => void;
  onPostDeleted: (postId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32; // px-4 padding on container

// Toggle this to switch between post card themes
// "default": Clean white background (original design)
// "ambient": Glassmorphic ambient background extracted from the image
let POST_THEME: "default" | "ambient" = "ambient";

// Adaptive text styling
const IS_AMBIENT = POST_THEME === "ambient";
const SECONDARY_TEXT_COLOR = IS_AMBIENT ? "#3B3328" : "#8B7D6F";
const SECONDARY_TEXT_CLASS = IS_AMBIENT ? "text-[#3B3328]" : "text-[#8B7D6F]";
const FOOTER_TEXT_COLOR = IS_AMBIENT ? "#FFFFFF" : "#8B7D6F";
const FOOTER_TEXT_CLASS = IS_AMBIENT ? "text-white" : "text-[#8B7D6F]";

// Subtle shadow style to guarantee legibility over dynamic backgrounds
const textShadowStyle = IS_AMBIENT
  ? {
      textShadowColor: "rgba(0, 0, 0, 0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    }
  : {};

export default function PostCard({
  post,
  currentUserId,
  onCommentPress,
  onPostDeleted,
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const heartScale = useSharedValue(1);

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // State to hold the exact width of the carousel container to ensure perfect image snapping
  const [carouselWidth, setCarouselWidth] = useState(CARD_WIDTH - 40);

  // Load initial states
  useEffect(() => {
    let active = true;
    const checkStates = async () => {
      try {
        const [liked, following] = await Promise.all([
          communityService.isPostLiked(post.id, currentUserId),
          post.user_id !== currentUserId
            ? profileService.isFollowing(currentUserId, post.user_id)
            : Promise.resolve(false),
        ]);
        if (active) {
          setIsLiked(liked);
          setIsFollowing(following);
        }
      } catch (err) {
        console.error("Error loading states:", err);
      }
    };
    checkStates();

    // Setup real-time time ago refresh
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000); // 10 seconds

    // Listen for follow status changes from other post cards
    const subscription = DeviceEventEmitter.addListener(
      "FOLLOW_STATUS_CHANGED",
      (event: { userId: string; isFollowing: boolean }) => {
        if (event.userId === post.user_id) {
          setIsFollowing(event.isFollowing);
        }
      },
    );

    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [post.id, currentUserId, post.user_id]);

  const handleFollowToggle = async () => {
    if (isFollowLoading) return;
    setIsFollowLoading(true);

    // Optimistic UI update
    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);
    DeviceEventEmitter.emit("FOLLOW_STATUS_CHANGED", {
      userId: post.user_id,
      isFollowing: newFollowing,
    });

    try {
      if (newFollowing) {
        await profileService.followUser(currentUserId, post.user_id);
      } else {
        await profileService.unfollowUser(currentUserId, post.user_id);
      }
    } catch (error) {
      // Revert if error
      setIsFollowing(!newFollowing);
      DeviceEventEmitter.emit("FOLLOW_STATUS_CHANGED", {
        userId: post.user_id,
        isFollowing: !newFollowing,
      });
      Alert.alert("Error", "Could not update follow status.");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleLikePress = async () => {
    // Haptics and Animation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    heartScale.value = withSequence(
      withSpring(1.2, { damping: 12, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );

    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      if (newLiked) {
        await communityService.likePost(post.id, currentUserId);
      } else {
        await communityService.unlikePost(post.id, currentUserId);
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      // Revert if error
      setIsLiked(!newLiked);
      setLikesCount((prev) => (newLiked ? Math.max(0, prev - 1) : prev + 1));
      Alert.alert("Error", "Could not complete like action. Please try again.");
    }
  };

  const handleOptionsPress = () => {
    if (post.user_id === currentUserId) {
      Alert.alert("Manage Post", "What would you like to do with this post?", [
        {
          text: "Delete Post",
          style: "destructive",
          onPress: handleDeletePost,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]);
    } else {
      Alert.alert("Post Options", "You can report inappropriate content.", [
        {
          text: "Report Content",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Report Submitted",
              "Thank you for helping keep our community safe.",
            ),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]);
    }
  };

  const handleDeletePost = async () => {
    try {
      await communityService.deletePost(post.id, currentUserId);
      onPostDeleted(post.id);
    } catch (err) {
      console.error("Error deleting post:", err);
      Alert.alert("Error", "Could not delete post. Please try again.");
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    // If dateStr lacks timezone info, append 'Z' to force UTC parsing
    const normalizedDateStr =
      dateStr.endsWith("Z") || dateStr.includes("+")
        ? dateStr
        : `${dateStr.replace(" ", "T")}Z`;

    const now = new Date();
    const created = new Date(normalizedDateStr);
    let diffMs = now.getTime() - created.getTime();

    // Fallback for slight clock skew (treat future dates as "Just now")
    if (diffMs < 0) diffMs = 0;

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const images = post.images || (post.image_url ? [post.image_url] : []);
  const sharedRecipe = post.recipes;

  return (
    <View
      style={{
        shadowColor: "#3B3328",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
      }}
      className="mb-5 rounded-[24px] border border-[#F5E3D8]/50 overflow-hidden relative bg-white"
    >
      {/* Ambient Gradient Background INSIDE the card (Theme 2) */}
      {POST_THEME === "ambient" && images.length > 0 && (
        <View className="absolute inset-0">
          <ExpoImage
            source={{ uri: images[activeImageIndex] || images[0] }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            blurRadius={90}
            transition={400}
          />
          <LinearGradient
            colors={[
              "rgba(250, 245, 239, 0.95)", // Solid cream at top ensures dark text is readable
              "rgba(250, 245, 239, 0.3)", // Fades out
              "rgba(42, 37, 32, 0.4)", // Darkens slightly over image
              "rgba(42, 37, 32, 0.85)", // Solid charcoal at bottom ensures white text is readable
            ]}
            locations={[0, 0.3, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </View>
      )}

      {/* Card Content */}
      <View className="p-5">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity
            className="flex-row items-center"
            activeOpacity={0.7}
            onPress={() => router.push(`/user-profile?userId=${post.user_id}`)}
          >
            <Avatar
              url={post.profile?.avatar_url}
              name={post.profile?.full_name || "FlavourFlow User"}
              size={44}
            />
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="text-base font-jakarta-bold text-[#3B3328] mr-2">
                  {(post.profile?.full_name || "FlavourFlow User").split(" ")[0]}
                </Text>

                {post.user_id !== currentUserId && (
                  <TouchableOpacity
                    onPress={handleFollowToggle}
                    disabled={isFollowLoading}
                    className={`px-3 py-1 rounded-full ${isFollowing ? "bg-[#F5E3D8]/50" : "bg-[#FBA82E]"}`}
                  >
                    <Text
                      className={`text-[10px] font-jakarta-bold ${isFollowing ? "text-[#8B7D6F]" : "text-white"}`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text
                className={`text-xs font-inter-medium mt-0.5 ${SECONDARY_TEXT_CLASS}`}
              >
                {formatTimeAgo(post.created_at)}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleOptionsPress} className="p-2">
            <Feather
              name="more-horizontal"
              size={20}
              color={SECONDARY_TEXT_COLOR}
            />
          </TouchableOpacity>
        </View>

        {/* Content Text */}
        {post.content && (
          <Text className="text-sm font-inter-regular text-[#3B3328] mb-4 leading-5">
            {post.content}
          </Text>
        )}

        {/* Premium Image Carousel */}
        {images.length > 0 && (
          <View 
            className="mb-4 rounded-[20px] overflow-hidden bg-gray-100"
            onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}
          >
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              snapToInterval={carouselWidth}
              snapToAlignment="center"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              style={{ width: carouselWidth }}
              onMomentumScrollEnd={(e) => {
                const slide = Math.round(
                  e.nativeEvent.contentOffset.x / carouselWidth,
                );
                setActiveImageIndex(slide);
              }}
              keyExtractor={(item, index) => `${item}_${index}`}
              renderItem={({ item }) => (
                <ExpoImage
                  source={{ uri: item }}
                  style={{
                    width: carouselWidth,
                    height: carouselWidth * 1.25, // 4:5 aspect ratio
                  }}
                  contentFit="cover"
                  transition={200}
                />
              )}
            />

            {/* Pagination Dots (Removed the gradient blur as requested) */}
            {images.length > 1 && (
              <View className="absolute bottom-0 left-0 right-0 justify-end items-center">
                <View className="flex-row justify-center py-2">
                  {images.map((_, i) => (
                    <Animated.View
                      key={i}
                      className={`h-1.5 rounded-full mx-1 ${
                        i === activeImageIndex ? "bg-[#FBA82E]" : "bg-white/70"
                      }`}
                      style={{ width: i === activeImageIndex ? 16 : 6 }}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Enhanced Shared Recipe Card */}
        {sharedRecipe && (
          <TouchableOpacity
            onPress={() => router.push(`/recipe-detail?id=${sharedRecipe.id}`)}
            className="flex-row bg-white rounded-2xl p-3 mb-4 items-center border border-[#F5E3D8]"
            style={{
              shadowColor: "#3B3328",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
            activeOpacity={0.8}
          >
            <ExpoImage
              source={{
                uri:
                  sharedRecipe.image_url ||
                  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
              }}
              style={{ width: 60, height: 60, borderRadius: 14 }}
              contentFit="cover"
            />
            <View className="ml-4 flex-1">
              <Text
                className="text-[15px] font-jakarta-bold text-[#3B3328] mb-1"
                numberOfLines={1}
              >
                {sharedRecipe.title}
              </Text>
              <View className="flex-row items-center">
                <ExpoImage
                  source={require("@/assets/icons/share_recipe.webp")}
                  style={{ width: 14, height: 14 }}
                  contentFit="contain"
                />
                <Text className="text-xs font-inter-medium text-[#8B7D6F] ml-1.5">
                  {sharedRecipe.created_by === currentUserId
                    ? "Your Recipe"
                    : "Community Recipe"}
                </Text>
              </View>
            </View>
            <View className="w-8 h-8 rounded-full bg-[#FAF5EF] items-center justify-center">
              <Feather name="arrow-right" size={16} color="#FBA82E" />
            </View>
          </TouchableOpacity>
        )}

        {/* Action Buttons Footer */}
        <View className="flex-row justify-between items-center border-t border-[#F5E3D8]/30 pt-3">
          <View className="flex-row items-center space-x-6">
            {/* Like */}
            <TouchableOpacity
              onPress={handleLikePress}
              activeOpacity={0.7}
              className="flex-row items-center py-1 pr-3"
            >
              <Animated.View style={animatedHeartStyle}>
                {isLiked ? (
                  <ExpoImage
                    source={require("@/assets/icons/heart_filled.webp")}
                    style={{ width: 32, height: 32 }}
                    contentFit="contain"
                  />
                ) : (
                  <ExpoImage
                    source={require("@/assets/icons/heart_empty.webp")}
                    style={{ width: 28, height: 28 }}
                    contentFit="contain"
                  />
                )}
              </Animated.View>
              <Text
                className={`text-sm font-jakarta-medium ml-2 ${FOOTER_TEXT_CLASS}`}
                style={textShadowStyle}
              >
                {likesCount > 0
                  ? likesCount >= 1000
                    ? `${(likesCount / 1000).toFixed(1)}K`
                    : likesCount
                  : "Like"}
              </Text>
            </TouchableOpacity>

            {/* Comment */}
            <TouchableOpacity
              onPress={() => onCommentPress(post.id)}
              className="flex-row items-center py-1 pr-3"
            >
              <ExpoImage
                source={require("@/assets/icons/comment.webp")}
                style={{ width: 40, height: 40 }}
                contentFit="contain"
              />
              <Text
                className={`text-sm font-inter-medium ml-1.5 ${FOOTER_TEXT_CLASS}`}
                style={textShadowStyle}
              >
                {post.comments_count > 0 ? post.comments_count : "Comment"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
