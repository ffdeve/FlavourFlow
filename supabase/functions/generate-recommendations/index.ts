// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// 1. Feature Engineering Constants
const LAMBDAS: Record<string, number> = {
  VIEW: 0.20,
  FAVORITE: 0.05,
  COOK_START: 0.10,
  COOK_COMPLETE: 0.03,
  COOK_ABANDONED: 0.10,
};

const SIGNAL_WEIGHTS: Record<string, number> = {
  FAVORITE: 3,
  COOK_COMPLETE: 5,
  VIEW: 1,
  SEARCH_CLICK: 2,
};

function getDecay(type: string, daysOld: number): number {
  const lambda = LAMBDAS[type] || 0.1;
  return Math.exp(-lambda * daysOld);
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Claim Batch of Queue Events Atomically
    const { data: queueEvents, error: queueErr } = await supabaseClient.rpc('claim_recommendation_events', { batch_size: 500 });
    if (queueErr) throw queueErr;

    if (!queueEvents || queueEvents.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No pending events to process" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const uniqueUserIds = [...new Set(queueEvents.map((e: any) => e.user_id))];
    const eventIds = queueEvents.map((e: any) => e.id);

    // 2. Fetch All Recipes
    const { data: recipes, error: recipesErr } = await supabaseClient
      .from("recipes")
      .select("*");
    if (recipesErr) throw recipesErr;

    // 3. Compute Global Trending (7-day window)
    const { data: recentInteractions } = await supabaseClient
      .from("recipe_interactions")
      .select("recipe_id, interaction_type, created_at, metadata")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const globalStats: Record<string, any> = {};
    for (const r of recipes) {
      globalStats[r.id] = { impressions: 0, starts: 0, completions: 0, age_days: 0 };
      const ageMs = Date.now() - new Date(r.created_at).getTime();
      globalStats[r.id].age_days = ageMs / (1000 * 60 * 60 * 24);
    }

    if (recentInteractions) {
      for (const i of recentInteractions) {
        if (!globalStats[i.recipe_id]) continue;
        if (i.interaction_type === "RECIPE_IMPRESSION" || i.interaction_type === "VIEW") {
          globalStats[i.recipe_id].impressions += 1;
        } else if (i.interaction_type === "COOK_START") {
          globalStats[i.recipe_id].starts += 1;
        } else if (i.interaction_type === "COOK_COMPLETE") {
          globalStats[i.recipe_id].completions += 1;
        }
      }
    }

    // Calculate Trending Score
    const trendingScores: Record<string, number> = {};
    for (const r of recipes) {
      const stats = globalStats[r.id];
      const compRate = stats.starts > 0 ? stats.completions / stats.starts : 0;
      const freshness = Math.exp(-0.1 * stats.age_days);
      const trendScore = 
        0.4 * Math.log1p(stats.impressions) +
        0.3 * Math.log1p(stats.starts) +
        0.2 * compRate +
        0.1 * freshness;
      trendingScores[r.id] = trendScore;
    }

    const newRecommendations: any[] = [];
    const now = new Date();
    const hour = now.getHours();
    const isMorning = hour >= 5 && hour < 11;
    const isEvening = hour >= 17 && hour < 23;
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    // 4. Per-User Recommendation Generation
    for (const userId of uniqueUserIds) {
      const { data: userInteractions } = await supabaseClient
        .from("recipe_interactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const userPrefs = await supabaseClient.from("user_preferences").select("*").eq("user_id", userId).single();
      const prefs = userPrefs.data || { allergies: [], dislikes: [], spice_level: 3 };

      const recipeFeatures: Record<string, any> = {};
      let lastCooked: any = null;

      if (userInteractions) {
        // ==========================================
        // 🔵 PHASE A: Feature Builder
        // ==========================================
        for (const ix of userInteractions) {
          const rId = ix.recipe_id;
          if (!recipeFeatures[rId]) {
            recipeFeatures[rId] = {
              quick_exit_count: 0,
              abandonment_count: 0,
              repeated_short_views: 0,
              repeat_score: 0,
              behavior_score: 0,
              is_abandoned: false,
              abandon_duration: 0,
              abandon_date: null
            };
          }

          const feats = recipeFeatures[rId];
          const daysOld = (now.getTime() - new Date(ix.created_at).getTime()) / (1000 * 60 * 60 * 24);
          const decay = getDecay(ix.interaction_type, daysOld);

          if (ix.interaction_type === "VIEW" && ix.metadata?.engagement?.is_quick_exit) {
            feats.quick_exit_count += 1;
            feats.repeated_short_views += 1;
          }
          if (ix.interaction_type === "COOK_ABANDONED") {
            feats.abandonment_count += 1;
            if (!feats.is_abandoned) {
              feats.is_abandoned = true;
              feats.abandon_duration = ix.metadata?.engagement?.duration_seconds || 0;
              feats.abandon_date = ix.created_at;
            }
          }
          if (ix.interaction_type === "COOK_COMPLETE") {
            feats.repeat_score += 1;
            if (!lastCooked) lastCooked = recipes.find((r:any) => r.id === rId);
          }

          const weight = SIGNAL_WEIGHTS[ix.interaction_type] || 0;
          feats.behavior_score += (weight * decay);
        }
      }

      // ==========================================
      // 🔵 PHASE B: Ranking Engine
      // ==========================================
      for (const recipe of recipes) {
        // Safe Check
        const hasAllergen = recipe.ingredients?.some((ing: any) =>
          prefs.allergies?.some((a: string) => ing.name?.toLowerCase().includes(a.toLowerCase()))
        );
        const hasDisliked = recipe.ingredients?.some((ing: any) =>
          prefs.dislikes?.some((d: string) => ing.name?.toLowerCase().includes(d.toLowerCase()))
        );
        if (hasAllergen || hasDisliked) continue;

        const feats = recipeFeatures[recipe.id] || { quick_exit_count: 0, abandonment_count: 0, repeated_short_views: 0, behavior_score: 0, repeat_score: 0, is_abandoned: false };
        const penalty = clamp(
          (-2.0 * feats.quick_exit_count) + (-1.5 * feats.abandonment_count) + (-1.0 * feats.repeated_short_views),
          -10,
          0
        );

        let contentScore = 0;
        if (Math.abs((recipe.spice_level || 3) - (prefs.spice_level || 3)) <= 1) contentScore += 2;
        
        let contextBoost = 0;
        const lowerCat = recipe.dish_category?.toLowerCase() || "";
        if (isMorning && lowerCat.includes("breakfast")) contextBoost += 3;
        if (isEvening && (lowerCat.includes("dinner") || lowerCat.includes("comfort"))) contextBoost += 3;
        if (isWeekend && lowerCat.includes("heavy")) contextBoost += 2;

        const trendScore = trendingScores[recipe.id] || 0;

        const finalCoreScore = (contentScore + feats.behavior_score + trendScore) - Math.abs(penalty) + contextBoost;
        if (finalCoreScore > 0) {
          newRecommendations.push({
            user_id: userId,
            recipe_id: recipe.id,
            section_type: "CORE",
            score: finalCoreScore,
            trend_score: trendScore,
            behavior_score: feats.behavior_score,
            content_score: contentScore,
            negative_penalty: penalty
          });
        }

        if (feats.is_abandoned && feats.abandon_duration > 30) {
          newRecommendations.push({
            user_id: userId,
            recipe_id: recipe.id,
            section_type: "JUMP_BACK_IN",
            score: 1.0,
            created_at: feats.abandon_date
          });
        }

        if (feats.repeat_score >= 1) {
          newRecommendations.push({
            user_id: userId,
            recipe_id: recipe.id,
            section_type: "COOK_IT_AGAIN",
            score: feats.behavior_score,
          });
        }

        if (trendScore > 0.5) {
          newRecommendations.push({
            user_id: userId,
            recipe_id: recipe.id,
            section_type: "TRENDING",
            score: trendScore,
          });
        }

        if (lastCooked && recipe.id !== lastCooked.id) {
          let similarity = 0;
          if (recipe.cuisine_type === lastCooked.cuisine_type) similarity += 3;
          
          const refIngs = new Set(lastCooked.ingredients?.map((i:any) => i.name?.toLowerCase()));
          let ingMatches = 0;
          recipe.ingredients?.forEach((i:any) => { if (refIngs.has(i.name?.toLowerCase())) ingMatches++; });
          similarity += ingMatches;

          if (similarity >= 3) {
            newRecommendations.push({
              user_id: userId,
              recipe_id: recipe.id,
              section_type: "SIMILAR",
              score: similarity,
            });
          }
        }
      }
    }

    // Replace old recommendations for ONLY these users
    await supabaseClient.from("recipe_recommendations").delete().in("user_id", uniqueUserIds);

    // Insert all in chunks
    const chunkSize = 500;
    for (let i = 0; i < newRecommendations.length; i += chunkSize) {
      await supabaseClient.from("recipe_recommendations").insert(newRecommendations.slice(i, i + chunkSize));
    }

    // Mark Queue Events as Completed
    await supabaseClient
      .from("recommendation_events_queue")
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .in('id', eventIds);

    return new Response(JSON.stringify({ success: true, processedUsers: uniqueUserIds.length, generated: newRecommendations.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
