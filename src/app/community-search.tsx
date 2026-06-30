import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Keyboard, ScrollView } from "react-native";
import { CookingLoader } from "@/components/ui/cooking-loader";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { communityService } from "@/services/community.service";
import PostCard from "@/components/ui/post-card";
import Avatar from "@/components/ui/avatar";
import CommentsModal from "@/components/ui/comments-modal";
import { useAuth } from "@/hooks/use-auth";
import type { Post } from "@/types";

export default function CommunitySearchScreen() {
  const { user, profile } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchResults();
    }, 400); // 400ms debounce
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const results = await communityService.searchExploreFeed(query);
      setUsers(results.users);
      setPosts(results.posts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    if (!query && users.length === 0) return null;
    return (
      <View className="mb-4">
        {users.length > 0 && (
          <View>
            <Text className="text-sm font-jakarta-bold text-[#3B3328] mb-3 px-4">Profiles</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-4">
              {users.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  onPress={() => router.push(`/user-profile?userId=${u.id}`)}
                  className="items-center mr-4"
                  style={{ width: 70 }}
                >
                  <Avatar url={u.avatar_url} name={u.full_name || "User"} size={56} />
                  <Text className="text-xs font-inter-medium text-[#3B3328] mt-2 text-center" numberOfLines={1}>
                    {u.full_name || "User"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <Text className="text-sm font-jakarta-bold text-[#3B3328] px-4 mb-2">
          {query ? "Posts" : "Explore Posts"}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFFDF5]" edges={["top"]}>
      {/* Header / Search Bar */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-[#F5E3D8]/50">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Feather name="arrow-left" size={24} color="#3B3328" />
        </TouchableOpacity>
        
        <View className="flex-1 flex-row items-center bg-[#FAF5EF] rounded-xl px-3 h-10 border border-[#F5E3D8]/80">
          <Feather name="search" size={18} color="#8B7D6F" />
          <TextInput
            className="flex-1 ml-2 font-inter-medium text-[#3B3328] text-sm h-full"
            placeholder="Search profiles or posts..."
            placeholderTextColor="#8B7D6F"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} className="p-1">
              <Ionicons name="close-circle" size={18} color="#8B7D6F" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading && posts.length === 0 && users.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <CookingLoader scale={0.8} />
          <Text className="text-sm font-inter-medium text-[#8B7D6F] mt-3">
            Exploring the community...
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          className="flex-1"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <View className="px-4">
              <PostCard
                post={item}
                currentUserId={user?.id || ""}
                onCommentPress={(postId) => {
                  setCommentsPostId(postId);
                  setCommentsVisible(true);
                }}
                onPostDeleted={() => fetchResults()}
              />
            </View>
          )}
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-20 px-6">
              <Feather name="search" size={48} color="#F5E3D8" />
              <Text className="text-lg font-jakarta-bold text-[#3B3328] mt-4 mb-2 text-center">
                No Results Found
              </Text>
              <Text className="text-sm font-inter-medium text-[#8B7D6F] text-center">
                We couldn't find any profiles or posts matching "{query}".
              </Text>
            </View>
          )}
        />
      )}

      {/* Modals */}
      <CommentsModal
        visible={commentsVisible}
        postId={commentsPostId}
        currentUserId={user?.id || ""}
        currentUserName={profile?.full_name || "FlavourFlow User"}
        currentUserAvatar={profile?.avatar_url || null}
        onClose={() => {
          setCommentsVisible(false);
          setCommentsPostId(null);
        }}
        onCommentAdded={() => {
          // Optionally refresh posts or let PostCard handle local state
          fetchResults();
        }}
      />
    </SafeAreaView>
  );
}
