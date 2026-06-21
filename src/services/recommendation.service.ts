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
        return sections;
      }

      if (!data || data.length === 0) return sections;

      // Group by Section Type
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

      // Assemble the UI sections based on grouped data
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
