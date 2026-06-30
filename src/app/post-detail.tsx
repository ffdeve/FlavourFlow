import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { communityService } from "@/services/community.service";
import type { Post } from "@/types";
import PostCard from "@/components/ui/post-card";
import CommentsModal from "@/components/ui/comments-modal";
import { useAuth } from "@/hooks/use-auth";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const currentUserId = user?.id || "";
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [commentsVisible, setCommentsVisible] = useState(false);
  
  useEffect(() => {
    if (!id || typeof id !== "string") {
      setError("Invalid post ID.");
      setLoading(false);
      return;
    }
    
    const fetchPost = async () => {
      try {
        setLoading(true);
        const fetchedPost = await communityService.getPostById(id);
        if (fetchedPost) {
          setPost(fetchedPost);
        } else {
          setError("Post not found.");
        }
      } catch (err) {
        console.error("Error fetching post:", err);
        setError("Failed to load post.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [id]);
  
  const handleCommentAdded = () => {
    if (post) {
      setPost({
        ...post,
        comments_count: (post.comments_count || 0) + 1,
      });
    }
  };

  const handlePostDeleted = () => {
    // Navigate back if the currently viewed post is deleted
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAF5EF] items-center justify-center">
        <ActivityIndicator size="large" color="#FBA82E" />
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAF5EF]">
        <View className="px-5 py-3 border-b border-primary/10">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center bg-white rounded-full border border-gray-200 shadow-sm"
          >
            <Feather name="arrow-left" size={20} color="#3B3328" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="font-jakarta-medium text-[#8B7D6F]">{error || "Post not found."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAF5EF]">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-primary/10 bg-[#FAF5EF] z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center bg-white rounded-full border border-gray-200/50 shadow-sm mr-3"
        >
          <Feather name="arrow-left" size={20} color="#3B3328" />
        </TouchableOpacity>
        <Text className="font-jakarta-bold text-[18px] text-[#3B3328]">Post Details</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 16 }}>
        <View className="px-4">
          <PostCard
            post={post}
            currentUserId={currentUserId}
            onCommentPress={() => setCommentsVisible(true)}
            onPostDeleted={handlePostDeleted}
          />
        </View>
      </ScrollView>

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsVisible}
        postId={post.id}
        currentUserId={currentUserId}
        currentUserName={profile?.full_name || "FlavourFlow User"}
        currentUserAvatar={profile?.avatar_url || null}
        onClose={() => setCommentsVisible(false)}
        onCommentAdded={handleCommentAdded}
      />
    </SafeAreaView>
  );
}
