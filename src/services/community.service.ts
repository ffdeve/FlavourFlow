import { supabase } from "@/services/supabase";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";
import type { Post, Comment } from "@/types";

export class CommunityService {
  /**
   * Fetch all posts or filtered by category
   */
  async getPosts(category: string = "All Feed", limit: number = 30): Promise<Post[]> {
    let query = supabase
      .from("posts")
      .select(`
        *,
        profile:profiles!posts_user_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        recipes (
          id,
          title,
          description,
          image_url,
          created_by
        )
      `);

    // Category filtering
    if (category === "Recipe Tips") {
      query = query.eq("category", "recipe_tip");
    } else if (category === "Q&A") {
      query = query.eq("category", "qa");
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }

    return (data || []) as Post[];
  }

  /**
   * Fetch posts for a specific user
   */
  async getUserPosts(userId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profile:profiles!posts_user_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        recipes (
          id,
          title,
          description,
          image_url,
          created_by
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user posts:", error);
      throw error;
    }

    return (data || []) as Post[];
  }

  /**
   * Upload post image to post-images storage bucket
   */
  async uploadPostImage(localUri: string, userId: string): Promise<string> {
    // Compress image to a reasonable size (max width 1080px) and convert to JPEG
    const manipResult = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1080 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    const fileExt = "jpg";
    const filename = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${filename}`;

    const formData = new FormData();
    formData.append("file", {
      uri: manipResult.uri,
      name: filename,
      type: "image/jpeg",
    } as any);

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(filePath, formData);

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("post-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Create a new community post
   */
  async createPost(
    userId: string,
    content: string,
    category: "general" | "recipe_tip" | "qa",
    imageUris: string[],
    recipeId: string | null = null,
    onProgress?: (uploaded: number, total: number) => void
  ): Promise<Post> {
    const imageUrls: string[] = [];
    const total = imageUris.length;

    // Upload images sequentially with progress
    for (let i = 0; i < imageUris.length; i++) {
      try {
        const publicUrl = await this.uploadPostImage(imageUris[i], userId);
        imageUrls.push(publicUrl);
        onProgress?.(i + 1, total);
      } catch (err) {
        console.error("Failed to upload image:", imageUris[i], err);
        throw new Error("Failed to upload one or more images. Please try again.");
      }
    }

    const mainImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        content,
        category,
        image_url: mainImageUrl, // fallback for older structure
        images: imageUrls.length > 0 ? imageUrls : null,
        recipe_id: recipeId,
        likes_count: 0,
        comments_count: 0,
      })
      .select(`
        *,
        profile:profiles!posts_user_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        recipes (
          id,
          title,
          description,
          image_url,
          created_by
        )
      `)
      .single();

    if (error) {
      console.error("Error creating post:", error);
      throw error;
    }

    return data as Post;
  }

  /**
   * Like a post
   */
  async likePost(postId: string, userId: string): Promise<void> {
    if (!userId) return;
    const { error } = await supabase
      .from("post_likes")
      .insert({
        post_id: postId,
        user_id: userId,
      });

    if (error) {
      console.error("Error liking post:", error);
      throw error;
    }
  }

  /**
   * Unlike a post
   */
  async unlikePost(postId: string, userId: string): Promise<void> {
    if (!userId) return;
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error unliking post:", error);
      throw error;
    }
  }

  /**
   * Check if a post is liked by the current user
   */
  async isPostLiked(postId: string, userId: string): Promise<boolean> {
    if (!userId) return false;
    const { data, error } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error checking post like state:", error);
      return false;
    }

    return !!data;
  }

  /**
   * Fetch comments for a post
   */
  async getComments(postId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        profile:profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      throw error;
    }

    return (data || []) as Comment[];
  }

  /**
   * Add a comment to a post
   */
  async addComment(postId: string, userId: string, content: string): Promise<Comment> {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: userId,
        content,
      })
      .select(`
        *,
        profile:profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error("Error adding comment:", error);
      throw error;
    }

    return data as Comment;
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting post:", error);
      throw error;
    }
  }

  /**
   * Search explore feed for users and posts
   */
  async searchExploreFeed(query: string = ""): Promise<{ users: any[]; posts: Post[] }> {
    if (!query.trim()) {
      // Just return latest explore posts
      const posts = await this.getPosts("All Feed", 50);
      return { users: [], posts };
    }

    // Search users
    const { data: usersData, error: usersError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .ilike("full_name", `%${query}%`)
      .limit(10);

    if (usersError) console.error("Error searching users:", usersError);

    // Search posts
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select(`
        *,
        profile:profiles!posts_user_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        recipes (
          id,
          title,
          description,
          image_url,
          created_by
        )
      `)
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (postsError) console.error("Error searching posts:", postsError);

    return {
      users: usersData || [],
      posts: (postsData || []) as Post[],
    };
  }
}

export const communityService = new CommunityService();
