import Avatar from "@/components/ui/avatar";
import { CookingLoader } from "@/components/ui/cooking-loader";
import { ErrorState } from "@/components/ui/error-state";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAuth } from "@/hooks/use-auth";
import {
  GroupedNotifications,
  Notification,
  NotificationType,
  notificationService,
} from "@/services/notification.service";
import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  DeviceEventEmitter,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

const TYPE_ICON: Record<
  NotificationType,
  { bg: string; render: () => React.ReactNode }
> = {
  FOLLOW: { bg: "#FFF2D9", render: () => <Feather name="user-plus" size={16} color="#FBA82E" /> },
  LIKE: { bg: "#FDF0EB", render: () => <Ionicons name="heart" size={16} color="#E05252" /> },
  COMMENT: { bg: "#E9F3EE", render: () => <Ionicons name="chatbubble" size={15} color="#3BB17A" /> },
  BOOKMARK: { bg: "#FFF2D9", render: () => <Feather name="bookmark" size={15} color="#FBA82E" /> },
  SHARE: { bg: "#EDF0FB", render: () => <Feather name="share-2" size={15} color="#4F5CD8" /> },
  REVIEW: { bg: "#FFF2D9", render: () => <FontAwesome name="star" size={15} color="#FBA82E" /> },
};

function navigateFor(n: Notification) {
  const d = n.data || {};
  if (d.recipeId) router.push(`/recipe-detail?id=${d.recipeId}`);
  else if (d.postId) router.push(`/post-detail?id=${d.postId}`);
  else if (d.profileId) router.push(`/user-profile?userId=${d.profileId}`);
}

const SECTION_LABELS: { key: keyof GroupedNotifications; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
  { key: "earlier", label: "Earlier" },
];

export default function NotificationsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetworkStatus();

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoadError(false);
    try {
      const data = await notificationService.getNotifications(user.id, { limit: 60 });
      setItems(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Mark everything read when the screen gains focus (clears the badge).
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        notificationService.markAllAsRead(user.id);
        DeviceEventEmitter.emit("notifications:read");
      }
    }, [user?.id]),
  );

  // Realtime: prepend new notifications + light haptic.
  useEffect(() => {
    if (!user?.id) return;
    const unsub = notificationService.subscribeToNotifications(user.id, (payload) => {
      const n = payload?.new as Notification;
      if (!n) return;
      setItems((prev) => [n, ...prev]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    });
    return unsub;
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await load();
    } finally {
      setRetrying(false);
    }
  }, [load]);

  const handlePress = (n: Notification) => {
    if (!n.is_read) {
      notificationService.markAsRead(n.id);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
      );
    }
    navigateFor(n);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    notificationService.deleteNotification(id);
  };

  const handleClearAll = () => {
    if (!user?.id || items.length === 0) return;
    setItems([]);
    notificationService.clearAll(user.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const unread = items.filter((n) => !n.is_read).length;
  const groups = notificationService.groupByTime(items);

  const Header = (
    <View
      style={{ paddingTop: insets.top + 8 }}
      className="px-6 pb-4 bg-[#FFFDF5]"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-[26px] font-jakarta-bold text-[#3B3328]">
            Notifications
          </Text>
          {unread > 0 && (
            <View className="ml-2 bg-primary rounded-full min-w-[22px] h-[22px] px-1.5 items-center justify-center">
              <Text className="text-white font-inter-medium text-[12px]">
                {unread > 99 ? "99+" : unread}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center">
          {items.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} className="mr-3" hitSlop={8}>
              <Text className="text-primary font-jakarta-semibold text-[14px]">
                Clear All
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push("/settings")} hitSlop={8}>
            <Feather name="settings" size={20} color="#8B7D6F" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const Row = ({ n }: { n: Notification }) => {
    const meta = TYPE_ICON[n.type] ?? TYPE_ICON.FOLLOW;
    return (
      <Swipeable
        renderRightActions={() => (
          <TouchableOpacity
            onPress={() => handleDelete(n.id)}
            className="bg-[#E05252] justify-center items-center px-6 my-1.5 rounded-2xl"
          >
            <Feather name="trash-2" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handlePress(n)}
          className={`flex-row items-center px-4 py-3 my-1.5 rounded-3xl border ${
            n.is_read
              ? "bg-white border-[#F5E3D8]/30"
              : "bg-[#FFF8EC] border-[#FBA82E]/25"
          }`}
          style={{
            shadowColor: "#3B3328",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="mr-3">
            {n.sender?.avatar_url ? (
              <Avatar url={n.sender.avatar_url} size={44} />
            ) : (
              <View
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: meta.bg }}
              >
                {meta.render()}
              </View>
            )}
            <View className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5">
              <View
                className="w-5 h-5 rounded-full items-center justify-center"
                style={{ backgroundColor: meta.bg }}
              >
                {meta.render()}
              </View>
            </View>
          </View>
          <View className="flex-1">
            <Text className="font-jakarta-semibold text-[14px] text-[#3B3328]" numberOfLines={1}>
              {n.title}
            </Text>
            <Text className="font-inter-regular text-[13px] text-text-secondary mt-0.5" numberOfLines={2}>
              {n.message}
            </Text>
          </View>
          <View className="items-end ml-2">
            <Text className="font-inter-medium text-[11px] text-text-secondary">
              {timeAgo(n.created_at)}
            </Text>
            {!n.is_read && <View className="w-2.5 h-2.5 rounded-full bg-primary mt-2" />}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loadError && !loading && items.length === 0) {
    return (
      <ErrorState
        variant={isConnected ? "error" : "offline"}
        onRetry={handleRetry}
        retrying={retrying}
      />
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#FFFDF5]">
        {Header}
        <View className="flex-1 items-center justify-center">
          <CookingLoader scale={0.7} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FFFDF5]">
      {Header}
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FBA82E" />
        }
      >
        {items.length === 0 ? (
          <View className="items-center justify-center mt-32 px-8">
            <View className="w-20 h-20 rounded-full bg-[#FFF2D9] items-center justify-center mb-5">
              <Feather name="bell" size={34} color="#FBA82E" />
            </View>
            <Text className="font-jakarta-bold text-[18px] text-[#3B3328] mb-1.5">
              No notifications yet
            </Text>
            <Text className="font-inter-regular text-[14px] text-text-secondary text-center leading-5">
              When people like, comment, follow, or review your recipes, you&apos;ll see it here.
            </Text>
          </View>
        ) : (
          SECTION_LABELS.map(({ key, label }) =>
            groups[key].length === 0 ? null : (
              <View key={key} className="mt-3">
                <Text className="font-inter-medium text-[12px] uppercase tracking-wide text-text-secondary mb-1 ml-1">
                  {label}
                </Text>
                {groups[key].map((n) => (
                  <Row key={n.id} n={n} />
                ))}
              </View>
            ),
          )
        )}
      </ScrollView>
    </View>
  );
}
