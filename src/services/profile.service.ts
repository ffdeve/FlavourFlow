import { supabase } from "@/services/supabase";
import { notificationService } from "@/services/notification.service";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";
import type { CuisineItem, Profile, UserPreferences } from "@/types";

export class ProfileService {
  // Get user profile
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // No profile found
      throw error;
    }

    return data;
  }

  // Check if username is available
  async checkUsernameAvailability(username: string, excludeUserId?: string): Promise<boolean> {
    if (!username) return false;
    let query = supabase
      .from("profiles")
      .select("id")
      .eq("username", username);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data, error } = await query.maybeSingle();
    if (error && error.code !== "PGRST116") {
      console.error("Error checking username:", error);
      return false; // Assume taken on error to be safe
    }

    return !data; // Available if no profile found
  }

  // Create or update profile
  async upsertProfile(profile: Partial<Profile> & { id: string }) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        ...profile,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get user preferences
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data;
  }

  // Create or update preferences — sends proper arrays for Postgres array columns
  async upsertPreferences(
    preferences: Partial<UserPreferences> & { user_id: string },
  ) {
    const { data, error } = await supabase
      .from("user_preferences")
      .upsert({
        ...preferences,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Mark preferences as completed
  async markPreferencesCompleted(userId: string) {
    const { data, error } = await supabase
      .from("user_preferences")
      .update({ preference_completed: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============= CUISINE CATALOG =============

  // Fetch cuisine items by category with optional search
  async getCuisineItems(
    category: 'cuisine' | 'allergen' | 'country',
    searchQuery?: string
  ): Promise<CuisineItem[]> {
    let query = supabase
      .from("cuisine_items")
      .select("*")
      .eq("category", category)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (searchQuery && searchQuery.trim().length > 0) {
      query = query.or(`name.ilike.%${searchQuery}%,name_urdu.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  // ============= AVATAR =============

  // Upload avatar image
  async uploadAvatar(userId: string, fileUri: string) {
    // Compress image for avatar (max width 400px) and convert to WebP.
    const manipResult = await ImageManipulator.manipulateAsync(
      fileUri,
      [{ resize: { width: 400 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
    );

    const fileExt = "webp";
    const fileName = `${userId}.${fileExt}`;
    // Using root path or 'avatars' folder depending on bucket structure.
    const filePath = `${fileName}`;

    const formData = new FormData();
    formData.append("file", {
      uri: manipResult.uri,
      name: fileName,
      type: "image/webp",
    } as any);

    const { error: uploadError } = await supabase.storage
      .from("user-avartars")
      .upload(filePath, formData, {
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("user-avartars")
      .getPublicUrl(filePath);

    // Update the profile in the database with the new URL
    await this.upsertProfile({ id: userId, avatar_url: data.publicUrl });

    return data.publicUrl;
  }

  // Upload banner image
  async uploadBanner(userId: string, fileUri: string) {
    // Compress image for banner (max width 1200px) and convert to WebP.
    const manipResult = await ImageManipulator.manipulateAsync(
      fileUri,
      [{ resize: { width: 1200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
    );

    const fileExt = "webp";
    const fileName = `${userId}-banner.${fileExt}`;
    const filePath = `${fileName}`;

    const formData = new FormData();
    formData.append("file", {
      uri: manipResult.uri,
      name: fileName,
      type: "image/webp",
    } as any);

    const { error: uploadError } = await supabase.storage
      .from("user-avartars") // Reusing the same bucket
      .upload(filePath, formData, {
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("user-avartars")
      .getPublicUrl(filePath);

    // Update profile
    await this.upsertProfile({ id: userId, banner_url: data.publicUrl });
    return data.publicUrl;
  }

  // ============= FOLLOW SYSTEM =============

  /** Follow a user */
  async followUser(followerId: string, followingId: string) {
    const { error } = await supabase.from("follows").insert({
      follower_id: followerId,
      following_id: followingId,
    });
    if (error && error.code !== "23505") throw error; // Ignore duplicate key if already following

    // Fire-and-forget: notify the followed user (never blocks the follow).
    void (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", followerId)
          .single();
        await notificationService.createFollowNotification(
          followingId,
          followerId,
          profile?.full_name || "Someone",
        );
      } catch (err) {
        console.warn("Follow notification failed:", err);
      }
    })();
  }

  /** Unfollow a user */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    if (error) throw error;
  }

  /** Check if current user follows target user */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  }

  /** Get follower count */
  async getFollowerCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId);
    if (error) return 0;
    return count || 0;
  }

  /** Get following count */
  async getFollowingCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId);
    if (error) return 0;
    return count || 0;
  }

  /** Get post count for a user */
  async getPostCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) return 0;
    return count || 0;
  }

  /** Get recipe count for a user */
  async getRecipeCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId);
    if (error) return 0;
    return count || 0;
  }

  /** Get user's recipes for display with pagination */
  async getUserRecipesPublic(userId: string, page = 1, limit = 6) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("recipes")
      .select("id, title, image_url, cook_time, difficulty, created_at, ingredients")
      .order("created_at", { ascending: false })
      .eq("created_by", userId)
      .range(from, to);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /** Get public profile + stats bundle */
  async getUserProfileWithStats(userId: string) {
    const [profile, followers, following, posts, recipes] = await Promise.all([
      this.getProfile(userId),
      this.getFollowerCount(userId),
      this.getFollowingCount(userId),
      this.getPostCount(userId),
      this.getRecipeCount(userId),
    ]);
    return { profile, followers, following, posts, recipes };
  }

  /** Get list of users following the given user */
  async getFollowersList(userId: string) {
    const { data, error } = await supabase
      .from("follows")
      .select(`
        profile:profiles!follows_follower_id_fkey (
          id,
          full_name,
          avatar_url,
          bio
        )
      `)
      .eq("following_id", userId);
    
    if (error) throw error;
    // @ts-ignore - Supabase types might be tricky here, but we know the shape
    return (data || []).map((row) => row.profile);
  }

  /** Get list of users the given user is following */
  async getFollowingList(userId: string) {
    const { data, error } = await supabase
      .from("follows")
      .select(`
        profile:profiles!follows_following_id_fkey (
          id,
          full_name,
          avatar_url,
          bio
        )
      `)
      .eq("follower_id", userId);
    
    if (error) throw error;
    // @ts-ignore
    return (data || []).map((row) => row.profile);
  }
}

export const profileService = new ProfileService();
