import { supabase } from "@/services/supabase";
import { mapDbRecipeToUiRecipe, Recipe } from "@/services/recipe.service";
import type { UserPreferences } from "@/types";

// Mapping country codes to cuisine types
const COUNTRY_CODE_TO_CUISINE: Record<string, string> = {
  PK: "Pakistani",
  IN: "Indian",
  IT: "Italian",
  MX: "Mexican",
  CN: "Chinese",
  US: "American",
  FR: "French",
  JP: "Japanese",
  TR: "Turkish",
  ES: "Spanish",
  YE: "Yemeni",
};

export class RecommendationService {
  async getDailyRecommendations(
    userId: string,
    category?: string,
    limit = 5
  ): Promise<Recipe[]> {
    // 1. Fetch user preferences
    const { data: prefData, error: prefError } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (prefError && prefError.code !== "PGRST116") {
      throw prefError;
    }

    const preferences: Partial<UserPreferences> = prefData || {};
    const allergies = preferences.allergies || [];
    const dislikes = preferences.dislikes || [];
    const preferredSpice = preferences.spice_level !== undefined ? preferences.spice_level : 3;
    const preferredCountry = preferences.preferred_country || [];
    const preferredCuisines = preferences.preferred_cuisines || [];

    // 2. Fetch user's favorites to build "Favorite Dish Profile"
    const { data: favoriteData } = await supabase
      .from("favorites")
      .select(`
        recipe_id,
        recipes:recipe_id (
          dish_category,
          cuisine_type
        )
      `)
      .eq("user_id", userId);

    const favoriteCategories: Record<string, number> = {};
    const favoriteCuisines: Record<string, number> = {};
    let topFavoriteCategory: string | null = null;
    let topFavoriteCuisine: string | null = null;

    if (favoriteData && favoriteData.length > 0) {
      favoriteData.forEach((item: any) => {
        if (item.recipes) {
          const cat = item.recipes.dish_category;
          const cuis = item.recipes.cuisine_type;
          if (cat) {
            favoriteCategories[cat] = (favoriteCategories[cat] || 0) + 1;
          }
          if (cuis) {
            favoriteCuisines[cuis] = (favoriteCuisines[cuis] || 0) + 1;
          }
        }
      });

      // Find top category
      let maxCatCount = 0;
      for (const [cat, count] of Object.entries(favoriteCategories)) {
        if (count > maxCatCount) {
          maxCatCount = count;
          topFavoriteCategory = cat;
        }
      }

      // Find top cuisine
      let maxCuisCount = 0;
      for (const [cuis, count] of Object.entries(favoriteCuisines)) {
        if (count > maxCuisCount) {
          maxCuisCount = count;
          topFavoriteCuisine = cuis;
        }
      }
    }

    // 3. Fetch recipe interactions to build cooking time profile
    const { data: interactionData } = await supabase
      .from("recipe_interactions")
      .select(`
        recipe_id,
        recipes:recipe_id (
          prep_time,
          cook_time
        )
      `)
      .eq("user_id", userId)
      .in("interaction_type", ["cooked", "view", "save"]);

    let avgCookingTime = 30; // fallback default
    if (interactionData && interactionData.length > 0) {
      let totalTime = 0;
      let count = 0;
      interactionData.forEach((item: any) => {
        if (item.recipes) {
          const prep = item.recipes.prep_time || 0;
          const cook = item.recipes.cook_time || 0;
          if (prep + cook > 0) {
            totalTime += (prep + cook);
            count++;
          }
        }
      });
      if (count > 0) {
        avgCookingTime = Math.round(totalTime / count);
      }
    }

    // 4. Fetch candidate recipes
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

    const { data: recipeData, error: recipeError } = await query;
    if (recipeError) throw recipeError;

    const allRecipes = recipeData || [];
    const scoredRecipes: Recipe[] = [];

    // Map user's preferred country codes to cuisine types
    const userPreferredCuisineNames = preferredCountry
      .map(code => COUNTRY_CODE_TO_CUISINE[code.toUpperCase()])
      .filter(Boolean);

    // 5. Hard filter & score each recipe
    for (const dbRecipe of allRecipes) {
      const recipeIngredients = dbRecipe.ingredients || []; // array of {name, quantity}
      
      // A. Allergy check (strict filter)
      const hasAllergyItem = recipeIngredients.some((ing: any) =>
        allergies.some((allergyName: string) =>
          ing.name.toLowerCase().includes(allergyName.toLowerCase())
        )
      );
      if (hasAllergyItem) continue;

      // B. Disliked Ingredient check (strict filter)
      const hasDislikedIngredient = recipeIngredients.some((ing: any) =>
        dislikes.some((dislikeName: string) =>
          ing.name.toLowerCase().includes(dislikeName.toLowerCase())
        )
      );
      if (hasDislikedIngredient) continue;

      // C. Scoring
      let favScore = 0;
      let cuisineScore = 0;
      let spiceScore = 0;
      let timeScore = 0;
      let popScore = 0;

      // Favorite Dish Profile (30 pts)
      if (
        (topFavoriteCategory && dbRecipe.dish_category === topFavoriteCategory) ||
        (topFavoriteCuisine && dbRecipe.cuisine_type === topFavoriteCuisine)
      ) {
        favScore = 30;
      }

      // Country/Cuisine Match (20 pts)
      // First ensure the cuisine is not in dislikes
      const isDislikedCuisine = dislikes.some((dislikeName: string) =>
        dbRecipe.cuisine_type?.toLowerCase() === dislikeName.toLowerCase()
      );

      if (!isDislikedCuisine) {
        const matchesCountry = userPreferredCuisineNames.some(cName =>
          dbRecipe.cuisine_type?.toLowerCase().includes(cName.toLowerCase())
        );
        const matchesPrefCuisine = preferredCuisines.some((prefCuis: string) =>
          dbRecipe.cuisine_type?.toLowerCase().includes(prefCuis.toLowerCase())
        );

        if (matchesCountry || matchesPrefCuisine) {
          cuisineScore = 20;
        }
      }

      // Spice Level Match (20 pts)
      const recipeSpice = dbRecipe.spice_level || 0;
      const spiceDiff = Math.abs(recipeSpice - preferredSpice);
      if (spiceDiff === 0) {
        spiceScore = 20;
      } else if (spiceDiff === 1) {
        spiceScore = 10;
      } else {
        spiceScore = 0;
      }

      // Cooking Time Match (20 pts)
      const totalRecipeTime = (dbRecipe.prep_time || 0) + (dbRecipe.cook_time || 0);
      const timeDiff = Math.abs(totalRecipeTime - avgCookingTime);
      if (timeDiff <= 5) {
        timeScore = 20;
      } else if (timeDiff <= 15) {
        timeScore = 15;
      } else if (timeDiff <= 30) {
        timeScore = 10;
      } else {
        timeScore = 0;
      }

      // Popularity (10 pts)
      const avgRating = dbRecipe.average_rating ? Number(dbRecipe.average_rating) : 0;
      popScore = Math.min(10, Math.round(avgRating * 2));

      // Calculate total score out of 100
      const totalScore = favScore + cuisineScore + spiceScore + timeScore + popScore;

      // D. Generate Reason Subtitle based on the highest scoring bucket
      let matchReason = "Hand-picked for you";
      const maxBucket = Math.max(favScore, cuisineScore, spiceScore, timeScore, popScore);
      if (maxBucket > 0) {
        if (maxBucket === favScore) {
          matchReason = "Matches your favorite dishes";
        } else if (maxBucket === cuisineScore) {
          matchReason = "From your preferred cuisines";
        } else if (maxBucket === spiceScore) {
          matchReason = "Perfect spice level for you";
        } else if (maxBucket === timeScore) {
          matchReason = "Fits your cooking time profile";
        } else if (maxBucket === popScore) {
          matchReason = "Highly rated by community";
        }
      }

      const mappedRecipe = mapDbRecipeToUiRecipe(dbRecipe);
      mappedRecipe.matchScore = totalScore;
      mappedRecipe.matchReason = matchReason;

      scoredRecipes.push(mappedRecipe);
    }

    // 6. Sort by descending matchScore
    scoredRecipes.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return scoredRecipes.slice(0, limit);
  }
}

export const recommendationService = new RecommendationService();
