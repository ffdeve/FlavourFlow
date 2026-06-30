import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { profileService } from "@/services/profile.service";
import UserListItem from "@/components/ui/user-list-item";
import { useAuth } from "@/hooks/use-auth";

export default function UserFollowingScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (!userId) return;
    
    (async () => {
      try {
        const profileData = await profileService.getUserProfileWithStats(userId);
        if (profileData.profile?.is_private && user?.id !== userId) {
          setIsPrivate(true);
          return;
        }

        const data = await profileService.getFollowingList(userId);
        setUsers(data);
      } catch (err) {
        console.error("Error fetching following:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, user?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: "#FBA82E" }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#FBA82E" }}>
        {/* Top bar */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36, height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.25)",
              alignItems: "center", justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: "#FFFFFF" }}>
            Following
          </Text>
        </View>
      </SafeAreaView>

      {/* Rounded content card — overlaps the orange header slightly */}
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFDF5",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          marginTop: -4,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#FBA82E" />
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <UserListItem user={item} />}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 60, paddingTop: 16 }}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 96 }}>
                <View style={{
                  width: 64, height: 64, borderRadius: 32,
                  backgroundColor: "rgba(245,227,216,0.5)",
                  alignItems: "center", justifyContent: "center",
                  marginBottom: 16,
                }}>
                  <Feather name={isPrivate ? "lock" : "user-plus"} size={28} color="#FBA82E" />
                </View>
                <Text style={{ fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 16, color: "#3B3328" }}>
                  {isPrivate ? "This account is private" : "Not following anyone"}
                </Text>
                {!isPrivate && (
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: "#8B7D6F", marginTop: 4 }}>
                    Find chefs to follow for inspiration!
                  </Text>
                )}
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}
