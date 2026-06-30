import { supabase } from "@/services/supabase";

export type NotificationType =
  | "FOLLOW"
  | "LIKE"
  | "COMMENT"
  | "BOOKMARK"
  | "SHARE"
  | "REVIEW";

export interface NotificationSender {
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
  sender?: NotificationSender | null;
}

export interface GroupedNotifications {
  today: Notification[];
  yesterday: Notification[];
  thisWeek: Notification[];
  earlier: Notification[];
}

const SENDER_SELECT =
  "*, sender:profiles!sender_id(full_name, avatar_url, username)";

export class NotificationService {
  /** DRY insert used by every creator. No-op when notifying yourself. */
  private async insert(row: {
    recipientId: string;
    senderId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
  }) {
    if (row.recipientId === row.senderId) return; // never notify yourself
    const { error } = await supabase.from("notifications").insert({
      recipient_id: row.recipientId,
      sender_id: row.senderId,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data ?? {},
    });
    if (error) console.warn(`Failed to insert ${row.type} notification:`, error);
  }

  createFollowNotification(recipientId: string, senderId: string, senderName: string) {
    return this.insert({
      recipientId,
      senderId,
      type: "FOLLOW",
      title: "New Follower",
      message: `${senderName} started following you`,
      data: { profileId: senderId },
    });
  }

  createLikeNotification(
    recipientId: string,
    senderId: string,
    senderName: string,
    recipeId: string,
    recipeTitle: string,
  ) {
    return this.insert({
      recipientId,
      senderId,
      type: "LIKE",
      title: "New Like",
      message: `${senderName} liked your recipe "${recipeTitle}"`,
      data: { recipeId },
    });
  }

  createCommentNotification(
    recipientId: string,
    senderId: string,
    senderName: string,
    postId: string,
    snippet: string,
  ) {
    return this.insert({
      recipientId,
      senderId,
      type: "COMMENT",
      title: "New Comment",
      message: `${senderName} commented: "${snippet}"`,
      data: { postId },
    });
  }

  createBookmarkNotification(
    recipientId: string,
    senderId: string,
    senderName: string,
    recipeId: string,
    recipeTitle: string,
  ) {
    return this.insert({
      recipientId,
      senderId,
      type: "BOOKMARK",
      title: "Recipe Saved",
      message: `${senderName} saved your recipe "${recipeTitle}"`,
      data: { recipeId },
    });
  }

  createShareNotification(
    recipientId: string,
    senderId: string,
    senderName: string,
    targetId: string,
  ) {
    return this.insert({
      recipientId,
      senderId,
      type: "SHARE",
      title: "Recipe Shared",
      message: `${senderName} shared your recipe`,
      data: { recipeId: targetId },
    });
  }

  createReviewNotification(
    recipientId: string,
    senderId: string,
    senderName: string,
    recipeId: string,
    recipeTitle: string,
    rating: number,
  ) {
    return this.insert({
      recipientId,
      senderId,
      type: "REVIEW",
      title: "New Review",
      message: `${senderName} reviewed "${recipeTitle}" (${rating}★)`,
      data: { recipeId },
    });
  }

  /** Newest-first page of notifications for a user, with sender profile joined. */
  async getNotifications(
    userId: string,
    opts: { limit?: number; before?: string } = {},
  ): Promise<Notification[]> {
    let query = supabase
      .from("notifications")
      .select(SENDER_SELECT)
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 40);
    if (opts.before) query = query.lt("created_at", opts.before);
    const { data, error } = await query;
    if (error) {
      console.error("Failed to load notifications:", error);
      return [];
    }
    return (data ?? []) as unknown as Notification[];
  }

  /** Bucket a list (assumed newest-first) into Today / Yesterday / This Week / Earlier. */
  groupByTime(notifications: Notification[]): GroupedNotifications {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const groups: GroupedNotifications = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };
    for (const n of notifications) {
      const t = new Date(n.created_at);
      if (t >= startOfToday) groups.today.push(n);
      else if (t >= startOfYesterday) groups.yesterday.push(n);
      else if (t >= startOfWeek) groups.thisWeek.push(n);
      else groups.earlier.push(n);
    }
    return groups;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("is_read", false);
    if (error) {
      console.error("Failed to count unread notifications:", error);
      return 0;
    }
    return count ?? 0;
  }

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    if (error) console.warn("Failed to mark notification read:", error);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", userId)
      .eq("is_read", false);
    if (error) console.warn("Failed to mark all read:", error);
  }

  async deleteNotification(id: string): Promise<void> {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) console.warn("Failed to delete notification:", error);
  }

  async clearAll(userId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("recipient_id", userId);
    if (error) console.warn("Failed to clear notifications:", error);
  }

  /** Subscribe to new notifications for the current user (realtime INSERTs). */
  subscribeToNotifications(userId: string, onNotification: (payload: any) => void) {
    const subscription = supabase
      .channel("notifications_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          onNotification(payload);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }
}

export const notificationService = new NotificationService();
