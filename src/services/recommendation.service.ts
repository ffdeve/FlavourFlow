import { supabase } from "@/services/supabase";
import { mapDbRecipeToUiRecipe, Recipe } from "@/services/recipe.service";
import { detectUserCountry } from "@/services/geolocation.service";
import type { UserPreferences, RecommendationSection } from "@/types";

// Mapping country codes to cuisine types
const COUNTRY_CODE_TO_CUISINE: Record<string, string> = {
  PK: "Pakistani", IN: "Indian", IT: "Italian", MX: "Mexican",
  CN: "Chinese", US: "American", FR: "French", JP: "Japanese",
  TR: "Turkish", ES: "Spanish", YE: "Yemeni", SA: "Saudi",
  AE: "Emirati", BD: "Bangladeshi", TH: "Thai", KR: "Korean",
  PS: "Palestinian", GR: "Greek", DE: "German", GB: "British",
  IR: "Iranian", LB: "Lebanese", EG: "Egyptian", SY: "Syrian",
  IQ: "Iraqi", JO: "Jordanian", MA: "Moroccan", NG: "Nigerian",
  BR: "Brazilian", AR: "Argentinian", RU: "Russian", VN: "Vietnamese",
  ID: "Indonesian", MY: "Malaysian", PH: "Filipino",
};

// Signal weights for interaction history scoring
const SIGNAL_WEIGHTS = {
  COOK_COMPLETE: 5,
  COOK_START: 4,
  FAVORITE: 3,
  SAVE: 2,
  SEARCH_CLICK: 1.5,
  VIEW: 1,
  SHARE: 2,
};

// Helper to determine overlap of ingredients (useful for content-based similarity)
function ingredientOverlap(a: any[], b: any[]): number {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a.map((i: any) => i.name?.toLowerCase()).filter(Boolean));
  let matches = 0;
  for (const ing of b) {
    if (ing.name && setA.has(ing.name.toLowerCase())) matches++;
  }
  return matches;
}

export class RecommendationService {
  // Fetch and normalize onboarding user preferences
  private async getUserPreferences(userId: string) {
    const { data: prefData } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    const preferences: Partial<UserPreferences> = prefData || {};
    return {
      allergies: preferences.allergies || [],
      dislikes: preferences.dislikes || [],
      preferredSpice: preferences.spice_level ?? 3,
      preferredCountry: preferences.preferred_country || [],
      preferredCuisines: preferences.preferred_cuisines || [],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN: Generate Netflix-Style Feed
  // ═══════════════════════════════════════════════════════════════════════
  async getNetflixStyleRecommendations(userId: string): Promise<RecommendationSection[]> {
    const sections: RecommendationSection[] = [];
    const prefs = await this.getUserPreferences(userId);

    // ─── 1. Parallel Data Fetch (includes IP Geolocation) ─────────────────
    const [
      { data: interactions },
      { data: favorites },
      { data: searchHistory },
      { data: recipeData },
      ipLocation,
    ] = await Promise.all([
      supabase
        .from("recipe_interactions")
        .select(`
          interaction_type,
          recipe_id,
          recipes:recipe_id (
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("favorites")
        .select("recipe_id")
        .eq("user_id", userId),
      supabase
        .from("search_history")
        .select("query")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("recipes")
        .select(`
          *,
          profiles:created_by (
            full_name,
            avatar_url
          )
        `)
        .limit(200),
      detectUserCountry(),
    ]);

    // ─── Pre-filter all recipes for safety (Allergens & Dislikes) ───────────
    const allRecipes = this.filterSafeSimple(recipeData || [], prefs);
    if (allRecipes.length === 0) return sections;

    // ─── Build User Behavior Profile ─────────────────────────────────────
    const interactedCuisines: Record<string, number> = {};
    const interactedCategories: Record<string, number> = {};
    const cookedRecipeIds = new Set<string>();
    const viewedRecipeIds = new Set<string>();
    const favoriteIds = new Set((favorites || []).map((f: any) => f.recipe_id));
    let lastCookedRecipe: any = null;
    let lastViewedRecipe: any = null;

    if (interactions && interactions.length > 0) {
      for (const item of interactions) {
        if (!item.recipes) continue;
        const recipeObj = Array.isArray(item.recipes) ? item.recipes[0] : item.recipes;
        if (!recipeObj) continue;

        const type = item.interaction_type as keyof typeof SIGNAL_WEIGHTS;
        const weight = SIGNAL_WEIGHTS[type] || 1;

        if (recipeObj.cuisine_type) {
          interactedCuisines[recipeObj.cuisine_type] =
            (interactedCuisines[recipeObj.cuisine_type] || 0) + weight;
        }
        if (recipeObj.dish_category) {
          interactedCategories[recipeObj.dish_category] =
            (interactedCategories[recipeObj.dish_category] || 0) + weight;
        }

        if (type === "COOK_START" || type === "COOK_COMPLETE") {
          cookedRecipeIds.add(item.recipe_id);
          if (!lastCookedRecipe) lastCookedRecipe = recipeObj;
        }
        if (type === "VIEW") {
          viewedRecipeIds.add(item.recipe_id);
          if (!lastViewedRecipe) lastViewedRecipe = recipeObj;
        }
      }
    }

    // ─── Determine Top Cuisine & Category from behavior ──────────────────
    const topCuisine = this.getTopKey(interactedCuisines) 
      || (prefs.preferredCuisines.length > 0 ? prefs.preferredCuisines[0] : null);
    const topCategory = this.getTopKey(interactedCategories);

    // ─── Resolve Country: IP Location + Onboarding Preferences ───────────
    const hasRecipesForCuisine = (cuisineName: string) => {
      return allRecipes.some(r => r.cuisine_type?.toLowerCase() === cuisineName.toLowerCase());
    };

    // IP country primary location signal
    const ipCountryCode = ipLocation?.country_code?.toUpperCase() || "PK";
    const ipCountryName = COUNTRY_CODE_TO_CUISINE[ipCountryCode] || ipLocation?.country_name || "Pakistani";

    const userCuisineNames = prefs.preferredCountry
      .map(code => COUNTRY_CODE_TO_CUISINE[code.toUpperCase()])
      .filter(Boolean);

    const allUserCuisineNames = [...new Set([ipCountryName, ...userCuisineNames])];

    // Primary country for location-based feeds ( Trending / Top 10 ) with fallback
    let userCountryName = ipCountryName;
    if (!hasRecipesForCuisine(userCountryName)) {
      const preferredWithRecipes = userCuisineNames.find(c => hasRecipesForCuisine(c));
      userCountryName = preferredWithRecipes || "Pakistani"; // Fallback to Pakistani (guaranteed to have recipes)
    }

    // Keep track of shown recipe IDs in the primary sections to prevent duplicate recommendations on one page
    const shownRecipeIds = new Set<string>();

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 1: "Meals to Cook Today" (MAIN SECTION ⭐)
    // ═══════════════════════════════════════════════════════════════════════
    const mealsToCook = allRecipes.map(r => {
      let score = 0;

      // Content-based preferences
      if (prefs.preferredCuisines.some(c => r.cuisine_type?.toLowerCase().includes(c.toLowerCase()))) score += 20;
      if (allUserCuisineNames.some(c => r.cuisine_type?.toLowerCase().includes(c.toLowerCase()))) score += 15;
      if (Math.abs((r.spice_level || 0) - prefs.preferredSpice) <= 1) score += 15;

      // Behavior history
      if (r.cuisine_type && interactedCuisines[r.cuisine_type]) {
        score += Math.min(20, interactedCuisines[r.cuisine_type] * 3);
      }

      // Popularity (Rating)
      const avgRating = r.average_rating ? Number(r.average_rating) : 0;
      score += avgRating * 4;

      // Novelty bonus for new items
      if (!viewedRecipeIds.has(r.id) && !cookedRecipeIds.has(r.id)) score += 5;

      const recipe = mapDbRecipeToUiRecipe(r);
      recipe.matchScore = score;
      recipe.matchReason = "Recommended for you today";
      return recipe;
    }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    if (mealsToCook.length > 0) {
      sections.push({
        id: "meals_to_cook_today",
        title: "Meals to Cook Today",
        subtitle: "Your personalized picks based on taste & activity",
        recipes: mealsToCook.slice(0, 30), // 30 recipes to allow filtering by Category Pills client-side
      });

      // Track the top 10 as shown, since the user sees them on the main tab
      mealsToCook.slice(0, 10).forEach(r => shownRecipeIds.add(r.id));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 2: "Because You Like {Top Interacted Cuisine/Category}"
    // ═══════════════════════════════════════════════════════════════════════
    const becauseLabel = topCuisine || topCategory;
    if (becauseLabel) {
      const becauseRecipes = allRecipes
        .filter(r => {
          if (r.id === lastCookedRecipe?.id || cookedRecipeIds.has(r.id) || shownRecipeIds.has(r.id)) return false;
          // Filter strictly based on the label to prevent cross-cuisine pollution
          return topCuisine ? r.cuisine_type === topCuisine : r.dish_category === topCategory;
        })
        .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
        .map(r => {
          const recipe = mapDbRecipeToUiRecipe(r);
          recipe.matchReason = `Similar to dishes you love`;
          return recipe;
        });

      if (becauseRecipes.length > 0) {
        sections.push({
          id: "because_you_like",
          title: `Because You Like ${becauseLabel}`,
          subtitle: "Explore similar flavors",
          recipes: becauseRecipes.slice(0, 10),
        });
        becauseRecipes.slice(0, 10).forEach(r => shownRecipeIds.add(r.id));
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 3: "Top Picks for You Today"
    // ═══════════════════════════════════════════════════════════════════════
    const topPicks = allRecipes
      .filter(r => !cookedRecipeIds.has(r.id) && !shownRecipeIds.has(r.id))
      .map(r => {
        let contentScore = 0;
        let behaviorScore = 0;

        if (prefs.preferredCuisines.some(c => r.cuisine_type?.toLowerCase().includes(c.toLowerCase()))) contentScore += 25;
        if (Math.abs((r.spice_level || 0) - prefs.preferredSpice) === 0) contentScore += 20;
        else if (Math.abs((r.spice_level || 0) - prefs.preferredSpice) === 1) contentScore += 10;

        if (r.cuisine_type && interactedCuisines[r.cuisine_type]) {
          behaviorScore += Math.min(25, interactedCuisines[r.cuisine_type] * 4);
        }

        const finalScore = contentScore + behaviorScore;
        const recipe = mapDbRecipeToUiRecipe(r);
        recipe.matchScore = finalScore;
        recipe.matchReason = "Matches your taste profile";
        return recipe;
      })
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    if (topPicks.length > 0) {
      sections.push({
        id: "top_picks",
        title: "Top Picks for You Today",
        subtitle: "Hybrid picks from your preferences & behavior",
        recipes: topPicks.slice(0, 10),
      });
      topPicks.slice(0, 10).forEach(r => shownRecipeIds.add(r.id));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 4: "Trending {Country} Recipes"
    // ═══════════════════════════════════════════════════════════════════════
    const trendingInCountry = allRecipes
      .filter(r => r.cuisine_type?.toLowerCase() === userCountryName.toLowerCase() && !shownRecipeIds.has(r.id))
      .sort((a, b) => {
        const scoreA = (a.average_rating || 0) * 2 + (favoriteIds.has(a.id) ? 1 : 0);
        const scoreB = (b.average_rating || 0) * 2 + (favoriteIds.has(b.id) ? 1 : 0);
        return scoreB - scoreA;
      })
      .map(mapDbRecipeToUiRecipe);

    if (trendingInCountry.length > 0) {
      sections.push({
        id: "trending_country",
        title: `Trending ${userCountryName} Recipes`,
        subtitle: `Most popular ${userCountryName} dishes right now`,
        recipes: trendingInCountry.slice(0, 10),
      });
      trendingInCountry.slice(0, 10).forEach(r => shownRecipeIds.add(r.id));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 5: "Top 10 {Country} Recipes"
    // ═══════════════════════════════════════════════════════════════════════
    const recipeFavCounts: Record<string, number> = {};
    const recipeCookCounts: Record<string, number> = {};
    if (interactions) {
      for (const item of interactions) {
        if (item.recipe_id && (item.interaction_type === "COOK_START" || item.interaction_type === "COOK_COMPLETE")) {
          recipeCookCounts[item.recipe_id] = (recipeCookCounts[item.recipe_id] || 0) + 1;
        }
      }
    }
    if (favorites) {
      for (const f of favorites) {
        recipeFavCounts[f.recipe_id] = (recipeFavCounts[f.recipe_id] || 0) + 1;
      }
    }

    const top10 = allRecipes
      .filter(r => r.cuisine_type?.toLowerCase() === userCountryName.toLowerCase() && !shownRecipeIds.has(r.id))
      .map(r => {
        const popularityScore = (r.average_rating || 0) * 0.5 + (recipeFavCounts[r.id] || 0) * 0.3 + (recipeCookCounts[r.id] || 0) * 0.2;
        const recipe = mapDbRecipeToUiRecipe(r);
        recipe.matchScore = Math.round(popularityScore * 10);
        return recipe;
      })
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    if (top10.length > 0) {
      sections.push({
        id: "top_10_country",
        title: `Top 10 ${userCountryName} Recipes`,
        subtitle: "The most loved recipes by the community",
        recipes: top10.slice(0, 10),
      });
      top10.slice(0, 10).forEach(r => shownRecipeIds.add(r.id));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 6: "Quick & Easy (Under 30 min)"
    // ═══════════════════════════════════════════════════════════════════════
    const quickRecipes = allRecipes
      .filter(r => (r.prep_time || 0) + (r.cook_time || 0) <= 30 && !shownRecipeIds.has(r.id))
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .map(mapDbRecipeToUiRecipe);

    if (quickRecipes.length > 0) {
      sections.push({
        id: "quick_easy",
        title: "Quick & Easy",
        subtitle: "Ready in 30 minutes or less",
        recipes: quickRecipes.slice(0, 10),
      });
      quickRecipes.slice(0, 10).forEach(r => shownRecipeIds.add(r.id));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 7: "Spicy Picks for You 🌶️"
    // ═══════════════════════════════════════════════════════════════════════
    const spicyPicks = allRecipes
      .filter(r => {
        const spice = r.spice_level || 0;
        return Math.abs(spice - prefs.preferredSpice) <= 1 && spice >= 3 && !shownRecipeIds.has(r.id);
      })
      .sort((a, b) => (b.spice_level || 0) - (a.spice_level || 0))
      .map(mapDbRecipeToUiRecipe);

    if (spicyPicks.length > 0 && prefs.preferredSpice >= 3) {
      sections.push({
        id: "spicy_picks",
        title: "Spicy Picks for You 🌶️",
        subtitle: `Matching your spice level ${prefs.preferredSpice}/5`,
        recipes: spicyPicks.slice(0, 10),
      });
      spicyPicks.slice(0, 10).forEach(r => shownRecipeIds.add(r.id));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 8: "Because You Cooked/Viewed This"
    // ═══════════════════════════════════════════════════════════════════════
    const referenceRecipe = lastCookedRecipe || lastViewedRecipe;
    if (referenceRecipe) {
      const similar = allRecipes
        .filter(r => r.id !== referenceRecipe.id && !shownRecipeIds.has(r.id))
        .map(r => {
          let similarity = 0;
          if (r.cuisine_type && r.cuisine_type === referenceRecipe.cuisine_type) similarity += 3;
          if (r.dish_category && r.dish_category === referenceRecipe.dish_category) similarity += 2;
          similarity += Math.min(5, ingredientOverlap(referenceRecipe.ingredients || [], r.ingredients || []));
          return { recipe: r, similarity };
        })
        .filter(item => item.similarity >= 2)
        .sort((a, b) => b.similarity - a.similarity)
        .map(item => mapDbRecipeToUiRecipe(item.recipe));

      if (similar.length > 0) {
        const actionLabel = lastCookedRecipe ? "Cooked" : "Viewed";
        const refTitle = referenceRecipe.title || referenceRecipe.cuisine_type || "this";
        sections.push({
          id: "because_you_watched",
          title: `Because You ${actionLabel} "${refTitle.length > 20 ? refTitle.substring(0, 20) + '…' : refTitle}"`,
          subtitle: "Similar recipes you might enjoy",
          recipes: similar.slice(0, 10),
        });
        similar.slice(0, 10).forEach(r => shownRecipeIds.add(r.id));
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 9: "Based on Your Searches 🔍"
    // ═══════════════════════════════════════════════════════════════════════
    if (searchHistory && searchHistory.length > 0) {
      const searchTerms = [...new Set(searchHistory.map((s: any) => s.query.toLowerCase()))].slice(0, 5);
      const searchMatches = allRecipes
        .filter(r =>
          !shownRecipeIds.has(r.id) &&
          searchTerms.some(term =>
            r.title?.toLowerCase().includes(term) ||
            r.cuisine_type?.toLowerCase().includes(term) ||
            r.dish_category?.toLowerCase().includes(term)
          )
        )
        .map(mapDbRecipeToUiRecipe);

      if (searchMatches.length > 0) {
        const termLabel = searchTerms[0].charAt(0).toUpperCase() + searchTerms[0].slice(1);
        sections.push({
          id: "top_searches",
          title: "Based on Your Searches 🔍",
          subtitle: `Recipes matching "${termLabel}" and more`,
          recipes: searchMatches.slice(0, 10),
        });
        searchMatches.slice(0, 10).forEach(r => shownRecipeIds.add(r.id));
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 10: "Your Favorites ❤️"
    // ═══════════════════════════════════════════════════════════════════════
    if (favoriteIds.size > 0) {
      const favRecipes = allRecipes
        .filter(r => favoriteIds.has(r.id))
        .map(mapDbRecipeToUiRecipe);

      if (favRecipes.length > 0) {
        sections.push({
          id: "your_favorites",
          title: "Your Favorites ❤️",
          subtitle: "Recipes you've saved",
          recipes: favRecipes.slice(0, 10),
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 11: "Discover New Flavors"
    // ═══════════════════════════════════════════════════════════════════════
    const discoverRecipes = allRecipes
      .filter(r =>
        r.cuisine_type &&
        r.cuisine_type !== topCuisine &&
        r.cuisine_type?.toLowerCase() !== userCountryName.toLowerCase() &&
        !interactedCuisines[r.cuisine_type] &&
        !prefs.preferredCuisines.some(c => r.cuisine_type?.toLowerCase().includes(c.toLowerCase())) &&
        !userCuisineNames.some(c => r.cuisine_type?.toLowerCase().includes(c.toLowerCase())) &&
        !shownRecipeIds.has(r.id)
      )
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .map(r => {
        const recipe = mapDbRecipeToUiRecipe(r);
        recipe.matchReason = "Something different for you";
        return recipe;
      });

    if (discoverRecipes.length > 0) {
      sections.push({
        id: "discover",
        title: "Discover New Flavors",
        subtitle: "Highly rated dishes outside your usual zone",
        recipes: discoverRecipes.slice(0, 10),
      });
    }

    return sections;
  }

  // Get key with highest weight from a record
  private getTopKey(record: Record<string, number>): string | null {
    let topKey: string | null = null;
    let maxWeight = 0;
    for (const [key, weight] of Object.entries(record)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        topKey = key;
      }
    }
    return topKey;
  }

  // Simple allergen/dislike filter
  private filterSafeSimple(recipes: any[], prefs: { allergies: string[]; dislikes: string[] }) {
    return recipes.filter(r => {
      const ings = r.ingredients || [];
      const hasAllergen = ings.some((ing: any) =>
        prefs.allergies.some((a: string) => ing.name?.toLowerCase().includes(a.toLowerCase()))
      );
      if (hasAllergen) return false;

      const hasDisliked = ings.some((ing: any) =>
        prefs.dislikes.some((d: string) => ing.name?.toLowerCase().includes(d.toLowerCase()))
      );
      return !hasDisliked;
    });
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
