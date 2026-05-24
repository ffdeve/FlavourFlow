import { supabase } from "@/services/supabase";

export interface Recipe {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  cuisine: string;
  diet_types: string[];
  image_url?: string;
  created_at: string;
}

export const recipeService = {
  /**
   * Fetch trending or highest rated recipes
   */
  async getTrendingRecipes(limit = 10) {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Recipe[];
  },

  /**
   * Search recipes by query string
   */
  async searchRecipes(query: string) {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .textSearch("title", query);

    if (error) throw error;
    return data as Recipe[];
  },

  /**
   * Fetch a specific recipe by ID with its ingredients
   */
  async getRecipeDetails(recipeId: string) {
    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        recipe_ingredients (
          amount,
          unit,
          ingredients (
            name,
            image_url
          )
        )
      `)
      .eq("id", recipeId)
      .single();

    if (error) throw error;
    return data;
  },
};
