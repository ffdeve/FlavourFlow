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
   * Initialize ChefBoo dialogue or recommendation engine
   */
  async generateRecipeSuggestions(params: AIRecommendationParams) {
    console.warn("AI Service provider not yet implemented.");
    
    // Mock response for now to prevent crashes
    return [
      {
        title: "ChefBoo's Golden Chicken",
        description: "A magical golden recipe dynamically generated.",
      }
    ];
  },
  
  /**
   * Free-form dialogue with ChefBoo
   */
  async chatWithChefBoo(message: string, context?: any) {
    console.warn("AI Chat not yet implemented.");
    return "I am ChefBoo! However, my core brain is still booting up.";
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
    const { data: translationResult, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        action: 'translate_recipe',
        targetLanguage,
        recipeData: payloadToTranslate,
        systemPrompt: "You are a professional chef translator. Translate the recipe to the target language. CRITICAL: Do NOT translate numerical units, measurements, or temperatures (e.g., keep '180°C', '500g', '1 tbsp', '30 min' exactly as they are). Only translate the descriptive text."
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
