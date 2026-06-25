import { supabase } from "@/services/supabase";
import { mapDbRecipeToUiRecipe, Recipe } from "@/services/recipe.service";
import type { RecommendationSection } from "@/types";

export class RecommendationService {
  /**
   * Fetches the pre-computed Netflix-style recommendations from the backend edge function/cron job.
   * Mobile app MUST NOT perform heavy scoring or similarity matching. 
   */
  async getNetflixStyleRecommendations(userId: string): Promise<RecommendationSection[]> {
    const sections: RecommendationSection[] = [];

    try {
      const { data, error } = await supabase
        .from("recipe_recommendations")
        .select(`
          section_type,
          score,
          recipe_id,
          recipes (
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags, image, created_by,
            profiles (full_name, avatar_url)
          )
        `)
        .eq("user_id", userId)
        .order("score", { ascending: false });

      if (error) {
        console.error("Failed to fetch precomputed recommendations:", error);
      }

      // If we have precomputed data, group by section
      if (data && data.length > 0) {
        const grouped: Record<string, any[]> = {};
        data.forEach((row) => {
          if (!row.recipes) return;
          const recipeObj = Array.isArray(row.recipes) ? row.recipes[0] : row.recipes;
          if (!recipeObj) return;

          const uiRecipe = mapDbRecipeToUiRecipe(recipeObj);
          uiRecipe.matchScore = row.score;

          if (!grouped[row.section_type]) {
            grouped[row.section_type] = [];
          }
          grouped[row.section_type].push(uiRecipe);
        });

        if (grouped["CORE"] && grouped["CORE"].length > 0) {
          sections.push({
            id: "meals_to_cook_today",
            title: "Meals to Cook Today",
            subtitle: "Your personalized picks based on taste & activity",
            recipes: grouped["CORE"].slice(0, 30),
          });
        }

        if (grouped["JUMP_BACK_IN"] && grouped["JUMP_BACK_IN"].length > 0) {
          sections.push({
            id: "jump_back_in",
            title: "Jump Back In",
            subtitle: "Recipes you started recently",
            recipes: grouped["JUMP_BACK_IN"].slice(0, 10),
          });
        }

        if (grouped["COOK_IT_AGAIN"] && grouped["COOK_IT_AGAIN"].length > 0) {
          sections.push({
            id: "cook_it_again",
            title: "Cook It Again",
            subtitle: "Your most successful recipes",
            recipes: grouped["COOK_IT_AGAIN"].slice(0, 10),
          });
        }

        if (grouped["TRENDING"] && grouped["TRENDING"].length > 0) {
          sections.push({
            id: "trending_now",
            title: "Trending Now",
            subtitle: "Gaining popularity over the last 72h",
            recipes: grouped["TRENDING"].slice(0, 10),
          });
        }

        if (grouped["SIMILAR"] && grouped["SIMILAR"].length > 0) {
          sections.push({
            id: "because_you_liked",
            title: "Because You Liked This",
            subtitle: "Recipes similar to your recent favorites",
            recipes: grouped["SIMILAR"].slice(0, 10),
          });
        }
      }

      // ==========================================
      // 🧠 HYBRID COLD START — Netflix/TikTok/Instagram style
      // NEVER show an empty feed. Always fill missing sections
      // with global signals so the app feels alive from day 1.
      // ==========================================

      const hasCore = sections.some(s => s.id === "meals_to_cook_today");
      const hasTrending = sections.some(s => s.id === "trending_now");

      // If no Core section, build one from top-rated recipes
      if (!hasCore) {
        // Try to use user preferences for a personalized cold-start
        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("preferred_cuisines, spice_level")
          .eq("user_id", userId)
          .single();

        let query = supabase
          .from("recipes")
          .select(`
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags, image, created_by,
            profiles (full_name, avatar_url)
          `)
          .order("average_rating", { ascending: false })
          .limit(20);

        // If user has cuisine preferences from onboarding, use them
        if (prefs?.preferred_cuisines && prefs.preferred_cuisines.length > 0) {
          query = query.in("cuisine_type", prefs.preferred_cuisines);
        }

        const { data: coreData } = await query;
        if (coreData && coreData.length > 0) {
          sections.unshift({
            id: "meals_to_cook_today",
            title: prefs?.preferred_cuisines?.length
              ? "Picked For You"
              : "Popular Right Now",
            subtitle: prefs?.preferred_cuisines?.length
              ? "Based on your taste preferences"
              : "Top-rated recipes loved by everyone",
            recipes: coreData.map(mapDbRecipeToUiRecipe),
          });
        }
      }

      // If no Trending section, always build one from recent high-rated recipes
      if (!hasTrending) {
        const { data: trendingData } = await supabase
          .from("recipes")
          .select(`
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags, image, created_by,
            profiles (full_name, avatar_url)
          `)
          .order("created_at", { ascending: false })
          .limit(10);

        if (trendingData && trendingData.length > 0) {
          sections.push({
            id: "trending_now",
            title: "Trending Now",
            subtitle: "Fresh recipes gaining popularity",
            recipes: trendingData.map(mapDbRecipeToUiRecipe),
          });
        }
      }

      // Always add a "Quick & Easy" section if not enough sections exist
      if (sections.length < 3) {
        const { data: quickData } = await supabase
          .from("recipes")
          .select(`
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags, image, created_by,
            profiles (full_name, avatar_url)
          `)
          .lte("cook_time", 30)
          .order("average_rating", { ascending: false })
          .limit(10);

        if (quickData && quickData.length > 0) {
          sections.push({
            id: "quick_easy",
            title: "Quick & Easy",
            subtitle: "Ready in 30 minutes or less",
            recipes: quickData.map(mapDbRecipeToUiRecipe),
          });
        }
      }

      // Always add a "New Recipes" section if we still have room
      if (sections.length < 4) {
        const { data: newData } = await supabase
          .from("recipes")
          .select(`
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags, image, created_by,
            profiles (full_name, avatar_url)
          `)
          .order("created_at", { ascending: false })
          .limit(10);

        if (newData && newData.length > 0) {
          // Deduplicate against already-shown recipes
          const shownIds = new Set(sections.flatMap(s => s.recipes.map((r: any) => r.id)));
          const unique = newData
            .map(mapDbRecipeToUiRecipe)
            .filter(r => !shownIds.has(r.id));

          if (unique.length > 0) {
            sections.push({
              id: "new_recipes",
              title: "Just Added",
              subtitle: "Newest recipes from the community",
              recipes: unique.slice(0, 10),
            });
          }
        }
      }

    } catch (err) {
      console.error("Error formatting recommendation sections:", err);
    }

    return sections;
  }

  // Legacy fallback compatibility
  async getDailyRecommendations(userId: string, category?: string, limit = 5): Promise<Recipe[]> {
    const sections = await this.getNetflixStyleRecommendations(userId);
    if (sections.length > 0) {
      return sections[0].recipes.slice(0, limit);
    }
    return [];
  }
}

export const recommendationService = new RecommendationService();
