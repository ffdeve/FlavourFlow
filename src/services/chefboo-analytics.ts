import { supabase } from "@/services/supabase";

export type ChefBooEvent =
  | "FRIDGE_SEARCH"
  | "RECIPE_OPENED"
  | "RECIPE_SAVED"
  | "RECIPE_CLICKED"
  | "RECIPE_COOK_STARTED"
  | "AI_RECO_CLICKED";

/**
 * Cooking-only analytics for ChefBoo. Fire-and-forget — never blocks the UI,
 * never stores sensitive data. Server-side events (PROMPT, INGREDIENTS_SELECTED,
 * RECIPE_GENERATED) are logged by the ai-chat edge function.
 */
export const chefbooAnalytics = {
  log(userId: string | undefined | null, eventType: ChefBooEvent, payload: Record<string, any> = {}) {
    if (!userId) return;
    supabase
      .from("chefboo_events")
      .insert({ user_id: userId, event_type: eventType, payload })
      .then(({ error }) => {
        if (error) console.warn("chefbooAnalytics.log failed:", error.message);
      });
  },
};
