import { supabase } from "@/services/supabase";

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: "FOLLOW" | "LIKE" | "COMMENT" | "BOOKMARK" | "SHARE";
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export class NotificationService {
  /** Insert a follow notification */
  async createFollowNotification(recipientId: string, senderId: string, senderName: string) {
    if (recipientId === senderId) return; // Don't notify yourself

    const { error } = await supabase.from("notifications").insert({
      recipient_id: recipientId,
      sender_id: senderId,
      type: "FOLLOW",
      title: "New Follower",
      message: `${senderName} started following you`,
      data: { profileId: senderId },
    });

    if (error) {
      console.error("Failed to insert follow notification:", error);
    }
  }

  /** Subscribe to notifications for the current user */
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }
}

export const notificationService = new NotificationService();
