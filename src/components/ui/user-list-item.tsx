import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, DeviceEventEmitter } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { profileService } from "@/services/profile.service";

interface UserListItemProps {
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    bio?: string;
  };
  onFollowToggle?: () => void;
}

export default function UserListItem({ user, onFollowToggle }: UserListItemProps) {
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSelf = currentUser?.id === user.id;

  useEffect(() => {
    if (!currentUser?.id || isSelf) {
      setLoading(false);
      return;
    }
    
    // Check initial follow state
    profileService.isFollowing(currentUser.id, user.id).then((following) => {
      setIsFollowing(following);
      setLoading(false);
    });

    // Listen for follow changes globally
    const sub = DeviceEventEmitter.addListener('FOLLOW_STATUS_CHANGED', ({ userId, isFollowing: newStatus }) => {
      if (userId === user.id) {
        setIsFollowing(newStatus);
      }
    });

    return () => sub.remove();
  }, [currentUser?.id, user.id, isSelf]);

  const handleFollowToggle = () => {
    if (!currentUser?.id || isSelf) return;

    if (isFollowing) {
      Alert.alert(
        `Unfollow ${user.full_name}?`,
        "",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unfollow",
            style: "destructive",
            onPress: async () => {
              setIsFollowing(false);
              DeviceEventEmitter.emit('FOLLOW_STATUS_CHANGED', { userId: user.id, isFollowing: false });
              try {
                await profileService.unfollowUser(currentUser.id, user.id);
                onFollowToggle?.();
              } catch (err) {
                setIsFollowing(true);
                DeviceEventEmitter.emit('FOLLOW_STATUS_CHANGED', { userId: user.id, isFollowing: true });
                console.error("Unfollow error:", err);
              }
            }
          }
        ]
      );
    } else {
      setIsFollowing(true);
      DeviceEventEmitter.emit('FOLLOW_STATUS_CHANGED', { userId: user.id, isFollowing: true });
      profileService.followUser(currentUser.id, user.id).then(() => {
        onFollowToggle?.();
      }).catch((err) => {
        setIsFollowing(false);
        DeviceEventEmitter.emit('FOLLOW_STATUS_CHANGED', { userId: user.id, isFollowing: false });
        console.error("Follow error:", err);
      });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/user-profile?userId=${user.id}`)}
      className="flex-row items-center px-5 py-3 border-b border-primary/10 bg-white"
    >
      <Image
        source={{ uri: user.avatar_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600" }}
        className="w-12 h-12 rounded-full border border-gray-200"
        contentFit="cover"
      />
      
      <View className="flex-1 ml-3 mr-2">
        <Text className="font-jakarta-semibold text-[15px] text-[#3B3328]" numberOfLines={1}>
          {user.full_name}
        </Text>
        {user.bio ? (
          <Text className="font-inter-medium text-[12px] text-[#8B7D6F] mt-0.5" numberOfLines={1}>
            {user.bio}
          </Text>
        ) : null}
      </View>

      {!isSelf && !loading && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleFollowToggle}
          className={`px-4 py-1.5 rounded-full items-center justify-center ${
            isFollowing ? "bg-white border border-[#F5E3D8]" : "bg-[#FBA82E]"
          }`}
        >
          <Text className={`font-jakarta-semibold text-[13px] ${
            isFollowing ? "text-[#3B3328]" : "text-white"
          }`}>
            {isFollowing ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
