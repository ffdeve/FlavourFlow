import CommentsModal from "@/components/ui/comments-modal";
import CreatePostModal from "@/components/ui/create-post-modal";
import type { PostDraft } from "@/components/ui/create-post-modal";
import { CookingLoader } from "@/components/ui/cooking-loader";
import PostCard from "@/components/ui/post-card";
import { useAuth } from "@/hooks/use-auth";
import { communityService } from "@/services/community.service";
import type { Post } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  useAnimatedScrollHandler,
  interpolate,
} from "react-native-reanimated";

const FILTER_TABS = ["All Feed", "Following", "Recipe Tips", "Q&A"];

export default function CommunityScreen() {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All Feed");
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const { isConnected } = useNetworkStatus();

  // Modals
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentsVisible, setCommentsVisible] = useState(false);

  // Background upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("Preparing post...");
  const uploadProgressAnim = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Initial load
  useEffect(() => {
    loadPosts();
  }, [activeFilter, user?.id]);

  // Auto-refresh timer (Silent background fetch)
  useEffect(() => {
    if (!isFocused) return;

    const interval = setInterval(() => {
      if (AppState.currentState !== "active") return;

      communityService.getPosts(activeFilter, 30, user?.id).then((data) => {
        setPosts(data);
      }).catch((err) => {
        console.error("Auto-refresh background fetch error:", err);
      });
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [activeFilter, isFocused, user?.id]);

  const loadPosts = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await communityService.getPosts(activeFilter, 30, user?.id);
      setPosts(data);
    } catch (err) {
      console.error("Failed to load community posts:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await loadPosts();
    } finally {
      setRetrying(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Enforce a minimum 1.5s delay so the native 'hold' and animation can actually be seen!
      const minWait = new Promise((resolve) => setTimeout(resolve, 1500));
      const fetchPosts = communityService.getPosts(activeFilter, 30, user?.id);
      
      // Wait for both the minimum time AND the actual fetch to complete
      const [data] = await Promise.all([fetchPosts, minWait]);
      setPosts(data);
    } catch (err) {
      console.error("Error refreshing:", err);
    } finally {
      setRefreshing(false);
    }
  }, [activeFilter, user?.id]);

  const handleCommentPress = (postId: string) => {
    setCommentsPostId(postId);
    setCommentsVisible(true);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleCommentAdded = () => {
    if (commentsPostId) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === commentsPostId
            ? { ...p, comments_count: (p.comments_count || 0) + 1 }
            : p,
        ),
      );
    }
  };

  const handlePostSubmit = async (draft: PostDraft) => {
    // Show uploading banner immediately
    setIsUploading(true);
    setUploadProgress(0);
    uploadProgressAnim.value = 0;

    const totalImages = draft.imageUris.length;

    if (totalImages > 0) {
      setUploadStatusText("Uploading post...");
      // Small delay to start progress
      uploadProgressAnim.value = withTiming(0.05, { duration: 300 });
    } else {
      setUploadStatusText("Publishing post...");
      uploadProgressAnim.value = withTiming(0.5, { duration: 300 });
    }

    // Scroll to top to show the banner
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    try {
      const newPost = await communityService.createPost(
        currentUserId,
        draft.content,
        draft.category,
        draft.imageUris,
        draft.recipeId,
        (uploaded, total) => {
          const progress = uploaded / total;
          setUploadProgress(progress);
          uploadProgressAnim.value = withTiming(progress * 0.9, {
            duration: 200,
          });
          // Keep text as "Uploading post..."
        },
      );

      // Final push — show "Publishing..."
      setUploadStatusText("Publishing post...");
      uploadProgressAnim.value = withTiming(1, { duration: 300 });

      // Add the new post to the top of the feed
      setPosts((prev) => [newPost, ...prev]);

      // Brief delay so user sees 100%
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        uploadProgressAnim.value = 0;
      }, 800);
    } catch (err: any) {
      console.error("Background post creation error:", err);
      setIsUploading(false);
      setUploadProgress(0);
      uploadProgressAnim.value = 0;
      Alert.alert("Post Failed", err.message || "Something went wrong. Please try again.");
    }
  };

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${uploadProgressAnim.value * 100}%`,
  }));

  const currentUserId = user?.id || "";
  const currentUserName = profile?.full_name || "FlavourFlow User";
  const currentUserAvatar = profile?.avatar_url || null;

  const renderUploadBanner = () => {
    if (!isUploading) return null;
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(300)}
        className="mx-4 mb-4 bg-white rounded-2xl border border-[#F5E3D8]/50 overflow-hidden"
        style={{
          shadowColor: "#FBA82E",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <View className="px-4 py-3 flex-row items-center">
          <View className="w-9 h-9 rounded-full bg-[#FBA82E]/10 items-center justify-center mr-3">
            <ActivityIndicator size="small" color="#FBA82E" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-jakarta-bold text-[#3B3328]">
              Posting to Community
            </Text>
            <Text className="text-xs font-inter-medium text-[#8B7D6F] mt-0.5">
              {uploadStatusText}
            </Text>
          </View>
        </View>
        {/* Progress Bar */}
        <View className="h-1 bg-[#F5E3D8]/30">
          <Animated.View
            style={[
              animatedProgressStyle,
              {
                height: "100%",
                borderRadius: 2,
              },
            ]}
          >
            <LinearGradient
              colors={["#FBA82E", "#F59E0B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1, borderRadius: 2 }}
            />
          </Animated.View>
        </View>
      </Animated.View>
    );
  };

  // Instant fade out on completion
  const backgroundLoaderStyle = useAnimatedStyle(() => {
    return {
      opacity: refreshing ? 1 : withTiming(0, { duration: 0 }),
    };
  });

  const renderHeader = () => (
    <View>
      {/* Screen Header */}
      <LinearGradient
        colors={["#FAF5EF", "transparent"]}
        className="absolute top-0 left-0 right-0 h-40"
      />
      <View className="px-6 pt-16 pb-4 z-10">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-jakarta-bold text-[#3B3328]">
              Community
            </Text>
            <Text className="text-sm font-inter-medium text-[#8B7D6F] mt-0.5">
              Connect with fellow food lovers
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/community-search")}
            className="p-2"
            activeOpacity={0.7}
          >
            <ExpoImage
              source={require("@/assets/icons/magnifying_glass.webp")}
              style={{ width: 40, height: 40 }}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs (Animated) */}
      <View className="flex-row px-4 mb-5 gap-x-3">
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveFilter(tab)}
            activeOpacity={0.7}
          >
            <Animated.View
              layout={LinearTransition}
              className={`px-5 py-2.5 rounded-[20px] border ${
                activeFilter === tab
                  ? "bg-[#FBA82E] border-transparent"
                  : "bg-white border-[#F5E3D8]"
              }`}
            >
              <Text
                className={`text-[13px] tracking-tight font-jakarta-bold ${
                  activeFilter === tab ? "text-white" : "text-[#8B7D6F]"
                }`}
              >
                {tab}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Upload Banner */}
      {renderUploadBanner()}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View className="items-center justify-center py-20 px-6">
        <View className="w-20 h-20 bg-[#F5E3D8]/30 rounded-full items-center justify-center mb-5">
          <Ionicons name="chatbubbles-outline" size={36} color="#FBA82E" />
        </View>
        <Text className="text-lg font-jakarta-bold text-[#3B3328] mb-2 text-center">
          No posts yet
        </Text>
        <Text className="text-sm font-inter-medium text-[#8B7D6F] text-center leading-5">
          Be the first to share your culinary{"\n"}experience with the
          community!
        </Text>
      </View>
    );
  };

  if (loadError && !loading && posts.length === 0) {
    return (
      <ErrorState
        variant={isConnected ? "error" : "offline"}
        onRetry={handleRetry}
        retrying={retrying}
      />
    );
  }

  return (
    <View className="flex-1 bg-[#FFFDF5]">
      {/* 
        The Magnetic Background Holder:
        Placed behind the list, perfectly sized to fit within the native ~60px
        iOS hold offset. The header natively locks below this without overlapping.
      */}
      <Animated.View 
        className="absolute left-0 right-0 items-center justify-center z-0"
        style={[{ top: insets.top, height: 60 }, backgroundLoaderStyle]}
      >
        <View style={{ transform: [{ scale: 0.35 }] }}>
          <CookingLoader isAnimating={refreshing} />
        </View>
      </Animated.View>

      {loading && posts.length === 0 ? (
        <>
          {renderHeader()}
          <View className="flex-1 justify-center items-center">
            <CookingLoader scale={0.5} />
            <Text className="text-sm font-inter-medium text-[#8B7D6F] mt-6">
              Loading community feed...
            </Text>
          </View>
        </>
      ) : (
        <Animated.FlatList
          ref={flatListRef as any}
          data={posts}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          className="z-10 bg-transparent"
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-4">
              <PostCard
                post={item}
                currentUserId={currentUserId}
                onCommentPress={handleCommentPress}
                onPostDeleted={handlePostDeleted}
              />
            </View>
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={<View className="h-28" />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="transparent"
              colors={["transparent"]}
              progressBackgroundColor="transparent"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button — zIndex must beat the FlatList's z-10 or it's hidden */}
      <TouchableOpacity
        onPress={() => setCreatePostVisible(true)}
        className="absolute bottom-28 right-6 w-14 h-14 bg-[#FBA82E] rounded-full items-center justify-center"
        style={{
          zIndex: 50,
          shadowColor: "#FBA82E",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <ExpoImage
          source={require("@/assets/icons/add_post.webp")}
          style={{ width: 32, height: 32 }}
          contentFit="contain"
        />
      </TouchableOpacity>

      {/* Modals */}
      <CreatePostModal
        visible={createPostVisible}
        onClose={() => setCreatePostVisible(false)}
        userId={currentUserId}
        userName={profile?.full_name || "FlavourFlow User"}
        userAvatar={profile?.avatar_url || null}
        onPostSubmit={handlePostSubmit}
      />
      <CommentsModal
        visible={commentsVisible}
        postId={commentsPostId}
        currentUserId={currentUserId}
        currentUserName={profile?.full_name || "FlavourFlow User"}
        currentUserAvatar={profile?.avatar_url || null}
        onClose={() => {
          setCommentsVisible(false);
          setCommentsPostId(null);
        }}
        onCommentAdded={handleCommentAdded}
      />
    </View>
  );
}
