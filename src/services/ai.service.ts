/**
 * AI Service Skeleton
 * Awaiting strict Provider Implementation Details (Gemini vs OpenAI vs Edge)
 */

import { supabase } from './supabase';

interface AIRecommendationParams {
  pantryItems: string[];
  cuisinePreferences: string[];
  dietaryRestrictions: string[];
}

export const aiService = {
  /**
   * Ask ChefBoo (ai-chat Edge Function) for recipe suggestions built from
   * pantry items + preferences.
   */
  async generateRecipeSuggestions(params: AIRecommendationParams, userId?: string) {
    const parts: string[] = [];
    if (params.pantryItems?.length) parts.push(`I have: ${params.pantryItems.join(", ")}.`);
    if (params.cuisinePreferences?.length) parts.push(`I like ${params.cuisinePreferences.join(", ")} food.`);
    if (params.dietaryRestrictions?.length) parts.push(`Dietary restrictions: ${params.dietaryRestrictions.join(", ")}.`);
    parts.push("What can I cook?");

    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: {
        message: parts.join(" "),
        userId,
        ingredients: params.pantryItems ?? [],
        history: [],
      },
    });
    if (error) throw error;
    return [...(data?.recipes ?? []), ...(data?.generatedRecipes ?? [])];
  },

  /**
   * Free-form dialogue with ChefBoo via the ai-chat Edge Function.
   */
  async chatWithChefBoo(message: string, userId?: string, context?: any) {
    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: { message, userId, history: context?.history ?? [], ...context },
    });
    if (error) throw error;
    return data?.reply ?? "Sorry, something went wrong. Please try again.";
  },

  /**
   * Translate a recipe on-demand using Gemini (via Edge Function) and cache it.
   */
  async translateRecipe(recipe: any, targetLanguage: 'ur' | 'roman_ur'): Promise<any> {
    if (!recipe?.id) throw new Error("Recipe ID is required for translation caching.");

    // 1. Check Cache
    const { data: cached } = await supabase
      .from('recipe_translations')
      .select('translated_data')
      .eq('recipe_id', recipe.id)
      .eq('language', targetLanguage)
      .maybeSingle();

    if (cached?.translated_data) {
      console.log(`[Translate] Cache hit for ${targetLanguage}`);
      return cached.translated_data;
    }

    console.log(`[Translate] Cache miss for ${targetLanguage}, calling Gemini...`);

    // 2. Build cost-optimized payload (No metadata like views, likes, author)
    const payloadToTranslate = {
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients?.map((i: any) => ({ name: i.name })),
      steps: recipe.steps?.map((s: any) => ({ step: s.step, instruction: s.instruction, note: s.note })),
    };

    // 3. Call AI Edge Function (Gemini)
    // Instructing Gemini NOT to translate units like 180°C, 500g, 1 tbsp, etc.
    const { data: translationResult, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        action: 'translate_recipe',
        targetLanguage,
        recipeData: payloadToTranslate,
      }
    });

    if (error) {
      console.error("Translation API error:", error);
      throw new Error("Failed to translate recipe.");
    }

    const translatedData = translationResult?.translated_data;
    if (!translatedData) throw new Error("Invalid translation response.");

    // 4. Save to Cache
    await supabase.from('recipe_translations').insert({
      recipe_id: recipe.id,
      language: targetLanguage,
      translated_data: translatedData
    });

    return translatedData;
  }
};
