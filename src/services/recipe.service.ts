import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/services/supabase";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";

export const APP_SESSION_ID = Crypto.randomUUID();

export interface Recipe {
  id: string;
  title: string;
  description: string;
  time: string;
  cookingMinutes: number;
  prepTime?: number;
  spiceLevel: number;
  image: string;
  images: string[];
  videoUrl?: string;
  previewVideoStartTime?: number;
  previewVideoEndTime?: number;
  rating: number;
  categoryTag: string;
  ingredientsCount: number;
  authorAvatar: string;
  authorName: string;
  difficulty: "Easy" | "Medium" | "Hard";
  nutrition?: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
  servings: number;
  ingredients: { name: string; quantity: string }[];
  steps: {
    step: number;
    instruction: string;
    action?: string;
    parallel?: boolean;
    linkedIngredients?: string[];
    heatSetting?: string | null;
    hasTimer?: boolean;
    timerType?: "countdown" | "target";
    timerHours?: string;
    timerMinutes?: string;
    targetTime?: string;
    leaveOvernight?: boolean;
    video_start_time_frame?: number;
    video_end_time?: number;
  }[];
  kitchen_essentials?: string[];
  created_at?: string;
  matchScore?: number;
  matchReason?: string;
  cuisine_type?: string | null;
  dish_category?: string;
  created_by?: string;
  diet_tags?: string[];
}

export function mapDbRecipeToUiRecipe(dbRecipe: any): Recipe {
  if (!dbRecipe) {
    throw new Error("Recipe not found");
  }
  const totalMinutes = (dbRecipe.prep_time || 0) + (dbRecipe.cook_time || 15);
  let difficulty: "Easy" | "Medium" | "Hard" = "Easy";
  if (dbRecipe.difficulty) {
    const diff = dbRecipe.difficulty.toLowerCase();
    if (diff.includes("medium")) difficulty = "Medium";
    else if (diff.includes("hard")) difficulty = "Hard";
  }

  // Ensure steps are properly sorted by the step number
  const rawSteps = dbRecipe.steps || [];
  const sortedSteps = [...rawSteps].sort((a: any, b: any) => (a.step || 0) - (b.step || 0));

  return {
    id: dbRecipe.id,
    title: dbRecipe.title,
    description: dbRecipe.description || "",
    time: `${totalMinutes} Min`,
    cookingMinutes: dbRecipe.cook_time || 15,
    prepTime: dbRecipe.prep_time || 0,
    spiceLevel: dbRecipe.spice_level || 0,
    image: dbRecipe.image_url || (dbRecipe.images && dbRecipe.images[0]) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
    images: dbRecipe.images && dbRecipe.images.length > 0 ? dbRecipe.images : [dbRecipe.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"],
    videoUrl: dbRecipe.video_url || "",
    previewVideoStartTime: dbRecipe.preview_video_start_time || 0,
    previewVideoEndTime: dbRecipe.preview_video_end_time || 0,
    rating: dbRecipe.average_rating ? Number(dbRecipe.average_rating) : 0,
    categoryTag: dbRecipe.dish_category || "Dinner",
    ingredientsCount: (dbRecipe.ingredients || []).length,
    authorAvatar: dbRecipe.profiles?.avatar_url || "https://i.pravatar.cc/150?img=9",
    authorName: dbRecipe.profiles?.full_name || "Chef Flavour",
    difficulty,
    nutrition: { calories: 350, carbs: 40, protein: 15, fat: 12 }, // default fallback nutrition
    servings: dbRecipe.servings || 2,
    ingredients: dbRecipe.ingredients || [],
    steps: sortedSteps,
    kitchen_essentials: dbRecipe.kitchen_essentials || [],
    created_at: dbRecipe.created_at,
    cuisine_type: dbRecipe.cuisine_type || "",
    dish_category: dbRecipe.dish_category || "Dinner",
    created_by: dbRecipe.created_by || "",
    diet_tags: dbRecipe.diet_tags || [],
  };
}

// ─── Allergy / Dietary Filter Helpers ─────────────────────────────────────

/**
 * Reads strict filter flags and user preferences from storage/DB,
 * then returns a filter function to apply to a Recipe array.
 */
export async function buildUserFilter(userId?: string): Promise<(r: Recipe) => boolean> {
  const [allergyFlag, dietaryFlag] = await Promise.all([
    AsyncStorage.getItem("strictAllergyFilter"),
    AsyncStorage.getItem("strictDietaryFilter"),
  ]);

  const strictAllergy = allergyFlag === "true";
  const strictDietary = dietaryFlag === "true";

  if (!strictAllergy && !strictDietary) return () => true;
  if (!userId) return () => true;

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("allergies, dislikes, diet_type")
    .eq("user_id", userId)
    .maybeSingle();

  const allergies: string[] = prefs?.allergies ?? [];
  const dislikes: string[] = prefs?.dislikes ?? [];
  const dietType: string | null = prefs?.diet_type ?? null;

  return (recipe: Recipe) => {
    const ingredientNames = recipe.ingredients.map((i) => i.name.toLowerCase());

    if (strictAllergy && allergies.length > 0) {
      const hasAllergen = allergies.some((a) =>
        ingredientNames.some((name) => name.includes(a.toLowerCase()))
      );
      if (hasAllergen) return false;
    }

    if (strictDietary && dislikes.length > 0) {
      const hasDisliked = dislikes.some((d) =>
        ingredientNames.some((name) => name.includes(d.toLowerCase()))
      );
      if (hasDisliked) return false;
    }

    if (strictDietary && dietType) {
      const tags = recipe.diet_tags ?? [];
      if (tags.length > 0 && !tags.map((t) => t.toLowerCase()).includes(dietType.toLowerCase())) {
        return false;
      }
    }

    return true;
  };
}

export const recipeService = {
  /**
   * Fetch trending or highest rated recipes
   */
  async getTrendingRecipes(limit = 10): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        profiles:created_by (
          full_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapDbRecipeToUiRecipe);
  },

  /**
   * Fetch popular recipes
   */
  async getPopularRecipes(limit = 10): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        profiles:created_by (
          full_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: true }) // variation order
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapDbRecipeToUiRecipe);
  },

  /**
   * Fetch paginated recipes for infinite scrolling feed.
   * Applies strict allergy/dietary filters from user settings if enabled.
   * Fetches extra rows to account for filtered-out results.
   * @param page 1-indexed page number
   * @param limit target items per page after filtering
   * @param userId optional — needed for allergy/diet filtering
   */
  async getFeedRecipes(page = 1, limit = 10, userId?: string): Promise<Recipe[]> {
    const filterFn = await buildUserFilter(userId);
    // Fetch 3x to survive heavy filtering; we'll slice to `limit` after
    const fetchLimit = limit * 3;
    const from = (page - 1) * fetchLimit;
    const to = from + fetchLimit - 1;

    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        profiles:created_by (
          full_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return (data || [])
      .map(mapDbRecipeToUiRecipe)
      .filter(filterFn)
      .slice(0, limit);
  },

  /**
   * Fetch all distinct dish categories
   */
  async getCategories(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase.rpc("get_dish_categories");
    if (error) throw error;
    // Map to the expected UI format { id: string, name: string }
    return (data || []).map((row: any, index: number) => ({ id: String(index + 1), name: row.category_name }));
  },

  /**
   * Fetch the master ingredient list (with icons) for the "What's in your fridge" selector
   */
  async getIngredients(): Promise<
    { ingredient_id: number; name: string; name_urdu: string | null; category: string | null; icon_url: string | null }[]
  > {
    const { data, error } = await supabase
      .from("ingredients")
      .select("ingredient_id, name, name_urdu, category, icon_url")
      .not("icon_url", "is", null)
      .order("name", { ascending: true });
    if (error) {
      console.warn("Failed to load ingredients:", error);
      return [];
    }
    return data || [];
  },

  /**
   * Fetch recommended recipes by category
   */
  async getRecommendedRecipes(category?: string, limit = 10): Promise<Recipe[]> {
    let query = supabase
      .from("recipes")
      .select(`
        *,
        profiles:created_by (
          full_name,
          avatar_url
        )
      `);

    if (category && category.toLowerCase() !== "all") {
      query = query.ilike("dish_category", `%${category}%`);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapDbRecipeToUiRecipe);
  },

  /**
   * Fetch featured recipes for the top carousel
   */
  async getFeaturedRecipes(limit = 5): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        profiles:created_by (
          full_name,
          avatar_url
        )
      `)
      .eq("is_verified", true)
      .limit(limit);

    if (error) throw error;

    if (!data || data.length === 0) {
      // Fallback to latest recipes
      const { data: latest, error: latestError } = await supabase
        .from("recipes")
        .select(`
          *,
          profiles:created_by (
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (latestError) throw latestError;
      return (latest || []).map(mapDbRecipeToUiRecipe);
    }

    return data.map(mapDbRecipeToUiRecipe);
  },

  /**
   * Search recipes by query string
   */
  async searchRecipes(query: string): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        profiles:created_by (
          full_name,
          avatar_url
        )
      `);

    if (error) throw error;

    const mapped = (data || []).map(mapDbRecipeToUiRecipe);
    if (!query || query.trim() === "") return mapped;

    const lowerQuery = query.toLowerCase();
    return mapped.filter((r) =>
      r.title.toLowerCase().includes(lowerQuery) ||
      r.description.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Log a search query to search_history with debounce/duplicate prevention
   */
  async logSearchQuery(userId: string, query: string) {
    if (!query) return;
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || normalizedQuery.length < 2) return;

    const { error } = await supabase
      .from("search_history")
      .insert([
        {
          user_id: userId,
          query: normalizedQuery,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      // Postgres unique violation code is 23505
      if (error.code !== "23505") {
        console.warn("Failed to log search history:", error);
      }
    }
  },

  /**
   * Fetch a specific recipe by ID
   */
  async getRecipeDetails(recipeId: string): Promise<Recipe> {
    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        profiles:created_by (
          full_name,
          avatar_url
        )
      `)
      .eq("id", recipeId)
      .single();

    if (error) throw error;
    return mapDbRecipeToUiRecipe(data);
  },

  /**
   * Create a new user recipe
   */
  async createRecipe(recipeData: {
    title: string;
    description: string;
    ingredients: { name: string; quantity: string }[];
    steps: any[];
    image_url?: string;
    images?: string[];
    video_url?: string;
    preview_video_start_time?: number;
    preview_video_end_time?: number;
    cook_time: number;
    prep_time?: number;
    servings: number;
    difficulty: string;
    cuisine_type: string;
    dish_category?: string;
    diet_tags?: string[];
    spice_level?: number;
    created_by: string;
    kitchen_essentials?: string[];
  }) {
    const { data, error } = await supabase
      .from("recipes")
      .insert([recipeData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing recipe in the database
   */
  async updateRecipe(
    recipeId: string,
    recipeData: Partial<{
      title: string;
      description: string;
      ingredients: { name: string; quantity: string }[];
      steps: any[];
      image_url?: string;
      images?: string[];
      video_url?: string;
      preview_video_start_time?: number;
      preview_video_end_time?: number;
      cook_time: number;
      prep_time?: number;
      servings: number;
      difficulty: string;
      cuisine_type: string;
      dish_category?: string;
      diet_tags?: string[];
      spice_level?: number;
      kitchen_essentials?: string[];
    }>,
  ) {
    const { data, error } = await supabase
      .from("recipes")
      .update({
        ...recipeData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Log user recipe interaction (view, cook)
   */
  async logInteraction(
    userId: string,
    recipeId: string,
    interactionType: "VIEW" | "SEARCH_CLICK" | "SAVE" | "FAVORITE" | "COOK_START" | "COOK_COMPLETE" | "COOK_ABANDONED" | "SHARE" | "RECIPE_IMPRESSION",
    metadata?: Record<string, any>
  ): Promise<void> {
    const enrichedMetadata = {
      ...metadata,
      context: {
        ...(metadata?.context || {}),
        session_id: APP_SESSION_ID,
        device: "mobile"
      }
    };

    const { error } = await supabase
      .from("recipe_interactions")
      .insert([
        {
          user_id: userId,
          recipe_id: recipeId,
          interaction_type: interactionType,
          metadata: enrichedMetadata,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.warn(`Failed to log interaction (${interactionType}):`, error);
    }
  },

  /**
   * Log batched recipe impressions
   */
  async logImpressions(userId: string, recipeIds: string[]) {
    if (!recipeIds.length) return;
    
    const enrichedMetadata = {
      context: {
        session_id: APP_SESSION_ID,
        device: "mobile"
      }
    };

    const inserts = recipeIds.map(id => ({
      user_id: userId,
      recipe_id: id,
      interaction_type: "RECIPE_IMPRESSION",
      metadata: enrichedMetadata,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("recipe_interactions").insert(inserts);
    if (error) {
      console.warn("Failed to log impressions:", error);
    }
  },

  /**
   * Get analytics for a recipe (views and cooks counts)
   */
  async getRecipeAnalytics(recipeId: string) {
    const { data, error } = await supabase
      .from("recipe_interactions")
      .select("interaction_type")
      .eq("recipe_id", recipeId);

    if (error) throw error;

    const views = data.filter((i) => i.interaction_type === "VIEW").length;
    const cooks = data.filter((i) => i.interaction_type === "COOK_START" || i.interaction_type === "COOK_COMPLETE").length;

    return { views, cooks };
  },

  /**
   * Fetch recipes created by the current user
   */
  async getUserRecipes(userId: string) {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Fetch recipes created by the current user, including their views and cooks counts
   */
  async getUserRecipesWithAnalytics(userId: string) {
    const { data, error } = await supabase
      .from("recipes")
      .select(`
        id,
        title,
        dish_category,
        image_url,
        created_at,
        recipe_interactions (
          interaction_type
        )
      `)
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((recipe: any) => {
      const interactions = recipe.recipe_interactions || [];
      const views = interactions.filter((i: any) => i.interaction_type === "VIEW").length;
      const cooks = interactions.filter((i: any) => i.interaction_type === "COOK_START" || i.interaction_type === "COOK_COMPLETE").length;

      return {
        id: recipe.id,
        title: recipe.title,
        category: recipe.dish_category || "Dinner",
        image: recipe.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        createdAt: recipe.created_at,
        views,
        cooks,
      };
    });
  },

  /**
   * Upload recipe cover image to storage
   */
  async uploadRecipeImage(localUri: string, userId: string) {
    // The caller passes an already-compressed WebP URI. Read the actual file
    // bytes and upload the Uint8Array — `fetch(uri).blob()` and FormData both
    // yield 0-byte uploads for file:// URIs in React Native, so images never
    // previewed. `File#bytes()` (expo-file-system v19) returns the real bytes.
    const filename = `${userId}/${Date.now()}.webp`;

    const bytes = await new File(localUri).bytes();
    if (!bytes || bytes.length === 0) {
      throw new Error("Image file is empty — failed to read local image bytes.");
    }

    const { error } = await supabase.storage
      .from("recipe-images")
      .upload(filename, bytes, {
        contentType: "image/webp",
        upsert: true,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(filename);

    return publicUrl;
  },

  /**
   * Delete a custom recipe
   */
  async deleteRecipe(recipeId: string) {
    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", recipeId);

    if (error) throw error;
  },

  /**
   * Fetch all master ingredients
   */
  async getAllIngredients() {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Fetch all master kitchen essentials
   */
  async getAllKitchenEssentials() {
    const { data, error } = await supabase
      .from("kitchen_essentials")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Fetch recipes liked by the current user
   */
  async getLikedRecipes(userId: string): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from("favorites")
      .select(`
        recipe_id,
        recipes:recipe_id (
          *,
          profiles:created_by (
            full_name,
            avatar_url
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Extract and map the recipes from the join
    return (data || [])
      .map((item: any) => {
        const dbRecipe = item.recipes;
        if (!dbRecipe) return null;
        return mapDbRecipeToUiRecipe(dbRecipe);
      })
      .filter(Boolean) as Recipe[];
  },

  /**
   * Fetch history of recipes cooked by the current user
   */
  async getCookedHistory(userId: string): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from("recipe_interactions")
      .select(`
        recipe_id,
        created_at,
        recipes:recipe_id (
          *,
          profiles:created_by (
            full_name,
            avatar_url
          )
        )
      `)
      .eq("user_id", userId)
      .eq("interaction_type", "COOK_COMPLETE")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter out duplicates (if user cooked the same recipe multiple times, only show the latest)
    const seenRecipeIds = new Set<string>();
    const uniqueRecipes: Recipe[] = [];

    for (const item of (data || [])) {
      if (!item.recipes || seenRecipeIds.has(item.recipe_id)) continue;
      
      seenRecipeIds.add(item.recipe_id);
      const dbRecipe = item.recipes as any;
      uniqueRecipes.push(mapDbRecipeToUiRecipe(dbRecipe));
    }

    return uniqueRecipes;
  },


  /**
   * Toggle like status for a recipe. Returns true if now liked, false if unliked.
   */
  async toggleLikeRecipe(userId: string, recipeId: string): Promise<boolean> {
    // Check if already liked
    const { data: existing } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("recipe_id", recipeId)
      .maybeSingle();

    if (existing) {
      // Unlike
      await supabase
        .from("favorites")
        .delete()
        .eq("id", existing.id);
      return false;
    } else {
      // Like
      await supabase
        .from("favorites")
        .insert([{ user_id: userId, recipe_id: recipeId }]);
        
      // Log behavior signal
      await this.logInteraction(userId, recipeId, "FAVORITE");
      return true;
    }
  },

  /**
   * Get liked recipe IDs for a user (for batch checking)
   */
  async getLikedRecipeIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from("favorites")
      .select("recipe_id")
      .eq("user_id", userId);

    if (error) throw error;
    return new Set((data || []).map((row: any) => row.recipe_id));
  }
};

