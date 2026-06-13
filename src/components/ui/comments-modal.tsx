import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Avatar from "@/components/ui/avatar";
import type { Comment } from "@/types";
import { communityService } from "@/services/community.service";

interface CommentsModalProps {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
  onCommentAdded: () => void;
}

export default function CommentsModal({
  visible,
  postId,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onCommentAdded,
}: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && postId) {
      loadComments();
    }
  }, [visible, postId]);

  const loadComments = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const data = await communityService.getComments(postId);
      setComments(data);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!postId || !newComment.trim() || submitting) return;

    setSubmitting(true);
    const tempText = newComment.trim();
    setNewComment(""); // Clear input early for responsive feel

    try {
      const added = await communityService.addComment(postId, currentUserId, tempText);
      setComments((prev) => [...prev, added]);
      onCommentAdded();
    } catch (err) {
      console.error("Failed to send comment:", err);
      setNewComment(tempText); // restore if failed
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const created = new Date(dateStr);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return created.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        {/* Backdrop Tap to Close */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="absolute inset-0 w-full h-full"
        />

        {/* Modal Sheet Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="bg-white rounded-t-[32px] w-full max-h-[85%] min-h-[60%] flex-col overflow-hidden"
        >
          {/* Grab handle bar */}
          <View className="items-center py-3">
            <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pb-4 border-b border-[#F5E3D8]/30">
            <Text className="text-lg font-jakarta-bold text-[#3B3328]">
              Comments
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={24} color="#8B7D6F" />
            </TouchableOpacity>
          </View>

          {/* List or Loader */}
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#FBA82E" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
              ListEmptyComponent={
                <View className="py-12 items-center justify-center">
                  <Text className="text-4xl mb-3">💬</Text>
                  <Text className="text-sm font-inter-medium text-[#8B7D6F] text-center">
                    No comments yet. Start the conversation!
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View className="flex-row mb-6 items-start">
                  <Avatar
                    url={item.profile?.avatar_url}
                    name={item.profile?.full_name || "User"}
                    size={36}
                  />
                  <View className="ml-3 flex-1 bg-[#FAF5EF]/55 border border-[#F5E3D8]/30 rounded-2xl p-3.5">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-sm font-jakarta-bold text-[#3B3328]">
                        {item.profile?.full_name || "User"}
                      </Text>
                      <Text className="text-[10px] font-inter-medium text-[#8B7D6F]">
                        {formatTimeAgo(item.created_at)}
                      </Text>
                    </View>
                    <Text className="text-sm font-inter-regular text-[#3B3328] leading-5">
                      {item.content}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}

          {/* Sticky Input Bar */}
          <SafeAreaView className="border-t border-[#F5E3D8]/40 bg-white px-4 py-3 flex-row items-center">
            <Avatar url={currentUserAvatar} name={currentUserName} size={36} />
            <View className="flex-1 flex-row items-center border border-[#F5E3D8] bg-[#FAF5EF]/45 rounded-full px-4 ml-3 py-1.5">
              <TextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add a comment..."
                placeholderTextColor="#8B7D6F"
                multiline
                className="flex-1 text-sm font-inter-medium text-[#3B3328] max-h-20"
                style={{ textAlignVertical: "center" }}
              />
              <TouchableOpacity
                onPress={handleSendComment}
                disabled={!newComment.trim() || submitting}
                className="ml-2 p-1.5 rounded-full"
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={newComment.trim() && !submitting ? "#FBA82E" : "#8B7D6F/40"}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
