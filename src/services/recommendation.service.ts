import { mapDbRecipeToUiRecipe, Recipe } from "@/services/recipe.service";
import { supabase } from "@/services/supabase";
import type { RecommendationSection } from "@/types";

export class RecommendationService {
  /**
   * Fetches the pre-computed Netflix-style recommendations from the backend edge function/cron job.
   * Mobile app MUST NOT perform heavy scoring or similarity matching.
   */
  async getNetflixStyleRecommendations(
    userId: string,
  ): Promise<RecommendationSection[]> {
    const sections: RecommendationSection[] = [];

    try {
      const { data, error } = await supabase
        .from("recipe_recommendations")
        .select(
          `
          section_type,
          score,
          recipe_id,
          recipes (
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags, image_url, created_by,
            profiles (full_name, avatar_url)
          )
        `,
        )
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
          const recipeObj = Array.isArray(row.recipes)
            ? row.recipes[0]
            : row.recipes;
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

      const hasCore = sections.some((s) => s.id === "meals_to_cook_today");
      const hasTrending = sections.some((s) => s.id === "trending_now");

      // If no Core section, build one from top-rated recipes
      if (!hasCore) {
        // Try to use user preferences for a personalized cold-start
        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("preferred_cuisines, spice_level")
          .eq("user_id", userId)
          .maybeSingle();

        let query = supabase
          .from("recipes")
          .select(
            `
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags, image_url, created_by,
            profiles (full_name, avatar_url)
          `,
          )
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

      // If no Trending section, always build one from recent recipes
      if (!hasTrending) {
        const shownIds = new Set(
          sections.flatMap((s) => s.recipes.map((r: any) => r.id)),
        );
        const { data: trendingData } = await supabase
          .from("recipes")
          .select(
            `
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags, image_url, created_by,
            profiles (full_name, avatar_url)
          `,
          )
          .order("created_at", { ascending: false })
          .limit(15);

        if (trendingData && trendingData.length > 0) {
          const unique = trendingData
            .map(mapDbRecipeToUiRecipe)
            .filter((r) => !shownIds.has(r.id));
          if (unique.length > 0) {
            sections.push({
              id: "trending_now",
              title: "Trending Now",
              subtitle: "Fresh recipes gaining popularity",
              recipes: unique.slice(0, 10),
            });
          }
        }
      }

      // Always add Quick & Easy — every user benefits from this
      if (!sections.some((s) => s.id === "quick_easy")) {
        const shownIds = new Set(
          sections.flatMap((s) => s.recipes.map((r: any) => r.id)),
        );
        const { data: quickData } = await supabase
          .from("recipes")
          .select(
            `
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags, image_url, created_by,
            steps,
            profiles (full_name, avatar_url)
          `,
          )
          .lte("cook_time", 30)
          .order("cook_time", { ascending: true })
          .limit(20);

        if (quickData && quickData.length > 0) {
          // Sort in JS to combine cook_time + prep_time + steps length (minimum effort)
          const sortedQuick = quickData.sort((a, b) => {
            const aEffort =
              (a.cook_time || 0) +
              (a.prep_time || 0) +
              ((a.steps as any[])?.length || 0);
            const bEffort =
              (b.cook_time || 0) +
              (b.prep_time || 0) +
              ((b.steps as any[])?.length || 0);
            return aEffort - bEffort;
          });

          const unique = sortedQuick
            .map(mapDbRecipeToUiRecipe)
            .filter((r) => !shownIds.has(r.id));
          if (unique.length > 0) {
            sections.push({
              id: "quick_easy",
              title: "Quick & Easy",
              subtitle: "Ready fast with minimal steps",
              recipes: unique.slice(0, 10),
            });
          }
        }
      }

      // Always add Just Added — shows community is alive
      if (!sections.some((s) => s.id === "new_recipes")) {
        const shownIds = new Set(
          sections.flatMap((s) => s.recipes.map((r: any) => r.id)),
        );
        const { data: newData } = await supabase
          .from("recipes")
          .select(
            `
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags, image_url, created_by,
            profiles (full_name, avatar_url)
          `,
          )
          .order("created_at", { ascending: false })
          .limit(15);

        if (newData && newData.length > 0) {
          const unique = newData
            .map(mapDbRecipeToUiRecipe)
            .filter((r) => !shownIds.has(r.id));
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

      // Add a 5th section specifically for new users to flesh out the feed
      if (sections.length < 5) {
        const shownIds = new Set(
          sections.flatMap((s) => s.recipes.map((r: any) => r.id)),
        );
        const { data: favoritesData } = await supabase
          .from("recipes")
          .select(
            `
            id, title, dish_category, cuisine_type, prep_time, cook_time,
            spice_level, ingredients, average_rating, tags, image_url, created_by,
            profiles (full_name, avatar_url)
          `,
          )
          .order("average_rating", { ascending: false })
          .limit(15);

        if (favoritesData && favoritesData.length > 0) {
          const unique = favoritesData
            .map(mapDbRecipeToUiRecipe)
            .filter((r) => !shownIds.has(r.id));
          if (unique.length > 0) {
            sections.push({
              id: "community_favorites",
              title: "Community Favorites",
              subtitle: "Top-rated recipes loved by everyone",
              recipes: unique.slice(0, 10),
            });
          }
        }
      }

      // ==========================================
      // 🎯 DYNAMIC PERSONALIZED SECTIONS (from user data)
      // Built from the cuisines the user engages with most (behavior) +
      // their onboarding cuisines + diet. Inserted right after the main
      // "Meals to Cook Today" so the feed adapts to each user.
      // ==========================================
      try {
        const dynSections = await this.buildDynamicSections(userId, sections);
        if (dynSections.length > 0) {
          const coreIdx = sections.findIndex(
            (s) => s.id === "meals_to_cook_today",
          );
          if (coreIdx >= 0) sections.splice(coreIdx + 1, 0, ...dynSections);
          else sections.unshift(...dynSections);
        }
      } catch (e) {
        console.error("Dynamic preference sections failed:", e);
      }
    } catch (err) {
      console.error("Error formatting recommendation sections:", err);
    }

    return sections;
  }

  /**
   * Personalized "category" sections derived from real user data:
   * top cuisine from recent behavior, onboarding cuisines, and diet type.
   * Each section needs ≥3 unseen recipes to render (avoids thin rows).
   */
  private async buildDynamicSections(
    userId: string,
    existing: RecommendationSection[],
  ): Promise<RecommendationSection[]> {
    const RECIPE_SELECT = `
      id, title, dish_category, cuisine_type, prep_time, cook_time,
      spice_level, ingredients, average_rating, tags, image_url, created_by,
      profiles (full_name, avatar_url)
    `;
    const dyn: RecommendationSection[] = [];
    const seenId = () =>
      new Set(
        [...existing, ...dyn].flatMap((s) => s.recipes.map((r: any) => r.id)),
      );

    // Preferences (onboarding)
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("preferred_cuisines, diet_type")
      .eq("user_id", userId)
      .maybeSingle();

    // Behavior: most-engaged cuisines from the last 50 interactions
    const { data: ix } = await supabase
      .from("recipe_interactions")
      .select("recipes ( cuisine_type )")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    const cuisineCount: Record<string, number> = {};
    (ix ?? []).forEach((row: any) => {
      const c = Array.isArray(row.recipes)
        ? row.recipes[0]?.cuisine_type
        : row.recipes?.cuisine_type;
      if (c) cuisineCount[c] = (cuisineCount[c] ?? 0) + 1;
    });
    const behaviorCuisines = Object.entries(cuisineCount)
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0]);

    // Merge behavior-first, then onboarding cuisines; dedupe; take up to 2
    const cuisineList = [
      ...behaviorCuisines,
      ...(prefs?.preferred_cuisines ?? []),
    ]
      .filter((c, i, arr) => c && arr.indexOf(c) === i)
      .slice(0, 2);

    for (const cuisine of cuisineList) {
      const shown = seenId();
      const { data } = await supabase
        .from("recipes")
        .select(RECIPE_SELECT)
        .eq("cuisine_type", cuisine)
        .order("average_rating", { ascending: false })
        .limit(12);
      const unique = (data ?? [])
        .map(mapDbRecipeToUiRecipe)
        .filter((r) => !shown.has(r.id));
      if (unique.length >= 3) {
        dyn.push({
          id: `cuisine_${cuisine.toLowerCase().replace(/\s+/g, "_")}`,
          title: `More ${cuisine} Recipes`,
          recipes: unique.slice(0, 10),
        });
      }
    }

    // Diet-based section (e.g. "Vegan Picks"); try given casing + capitalized
    if (prefs?.diet_type) {
      const diet: string = prefs.diet_type;
      const cap = diet.charAt(0).toUpperCase() + diet.slice(1);
      const shown = seenId();
      let unique: Recipe[] = [];
      for (const tag of [diet, cap]) {
        const { data } = await supabase
          .from("recipes")
          .select(RECIPE_SELECT)
          .contains("diet_tags", [tag])
          .order("average_rating", { ascending: false })
          .limit(12);
        unique = (data ?? [])
          .map(mapDbRecipeToUiRecipe)
          .filter((r) => !shown.has(r.id));
        if (unique.length >= 3) break;
      }
      if (unique.length >= 3) {
        dyn.push({
          id: `diet_${diet.toLowerCase()}`,
          title: `${cap} Picks`,
          recipes: unique.slice(0, 10),
        });
      }
    }

    return dyn;
  }

  // Legacy fallback compatibility
  async getDailyRecommendations(
    userId: string,
    category?: string,
    limit = 5,
  ): Promise<Recipe[]> {
    const sections = await this.getNetflixStyleRecommendations(userId);
    if (sections.length > 0) {
      return sections[0].recipes.slice(0, limit);
    }
    return [];
  }
}

export const recommendationService = new RecommendationService();
