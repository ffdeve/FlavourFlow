// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Confidence bands (0–100, from search_recipes_ranked):
//   ≥80 present DB recipes · 50–79 present + offer to also create · <50 generate
const CONF_PRESENT = 80;
const CONF_OFFER = 50;

const STOP_WORDS = new Set(["a","an","the","is","are","was","were","i","me","my","we","you","it","in","on","at","to","for","of","and","or","with","have","has","can","give","make","want","need","please","recipe","recipes","cook","cooking","food","meal","dish","some","any","what","how","do","from","using","use","got","leftover","fridge"]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 8);
}

// ─── Safety pre-filter ─────────────────────────────────────────────────────
// Blocks attempts to extract credentials / internal data. No Gemini, no DB.
const SAFETY_PATTERN =
  /\b(password|passwd|api[\s_-]?key|secret|token|credential|auth\s*token|database|schema|\bsql\b|\btable\b|admin|service[\s_-]?role|env\s*var|environment\s*variable|connection\s*string)\b/i;

// ─── Off-topic (clearly non-food domains) ──────────────────────────────────
const OFFTOPIC_PATTERN =
  /\b(weather|stock|crypto|bitcoin|politic|election|football|cricket|nba|code|coding|program(ming)?|javascript|python|math|homework|essay|stock\s*market|news|movie|song|lyrics)\b/i;
const FOOD_HINT =
  /\b(recipe|cook|cooking|food|eat|meal|dish|ingredient|spice|spicy|bake|fry|grill|boil|roast|dinner|lunch|breakfast|snack|dessert|chicken|beef|mutton|rice|egg|vegetable|fruit|kitchen|cuisine|biryani|curry|substitut|flavou?r)\b/i;

// ─── Intent classification (heuristic-first, cost-free) ─────────────────────
type Intent =
  | "GREETING"
  | "RECIPE_SEARCH"
  | "INGREDIENT_SEARCH"
  | "MEAL_PLANNING"
  | "COOKING_HELP"
  | "SUBSTITUTION"
  | "AI_RECIPE_GENERATION"
  | "GENERAL_FOOD_QUESTION"
  | "OFF_TOPIC";

function classifyIntent(msg: string): Intent {
  const m = msg.toLowerCase().trim();

  // Pure greetings / small talk → cheap canned reply, no Gemini, no DB
  if (/^(hi+|hey+|hello+|yo+|hola|sala?m|asalam|assalam|a?o?a|good (morning|afternoon|evening|day)|how are you|whats up|what'?s up|sup|thanks?|thank you|thank u|shukria|ok+|okay|cool|nice|great|👋|🙏)[\s!.]*$/i.test(m))
    return "GREETING";

  if (OFFTOPIC_PATTERN.test(m) && !FOOD_HINT.test(m)) return "OFF_TOPIC";

  if (/\b(create|invent|generate|come up with|make me)\b.*\b(recipe|dish)\b/.test(m))
    return "AI_RECIPE_GENERATION";

  if (/\b(substitut|replace|instead of|alternative to|swap)\b/.test(m)) return "SUBSTITUTION";

  if (/\b(meal\s*plan|plan (my|a|the) (week|day|meals?)|weekly (menu|plan)|what should i (cook|eat) (this|for the) week)\b/.test(m))
    return "MEAL_PLANNING";

  if (/\b(i have|i've got|using|with these|got|leftover|in my (fridge|kitchen))\b/.test(m))
    return "INGREDIENT_SEARCH";

  if (/\b(how (do|to|can|long)|why (does|is|are|do)|fix|too (salty|spicy|dry|watery|sweet)|stop .*(stick|burn)|reheat|store|temperature|tips?)\b/.test(m))
    return "COOKING_HELP";

  if (/\b(what (is|are)|tell me about|difference between|is it (safe|ok)|can i eat)\b/.test(m))
    return "GENERAL_FOOD_QUESTION";

  return "RECIPE_SEARCH";
}

const SEARCH_INTENTS = new Set<Intent>(["RECIPE_SEARCH", "INGREDIENT_SEARCH", "MEAL_PLANNING"]);
const DIRECT_ANSWER_INTENTS = new Set<Intent>([
  "COOKING_HELP",
  "SUBSTITUTION",
  "GENERAL_FOOD_QUESTION",
]);

async function callGemini(systemPrompt: string, history: any[], userMessage: string): Promise<string> {
  const contents = [];
  contents.push({ role: "user", parts: [{ text: systemPrompt }] });
  contents.push({ role: "model", parts: [{ text: "Understood! I'm ChefBoo, ready to help with cooking." }] });
  for (const msg of history) {
    contents.push({ role: msg.role === "user" ? "user" : "model", parts: [{ text: msg.text }] });
  }
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 512 } },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }
  const json = await response.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't generate a response. Please try again.";
}

// Structured-recipe schema for Gemini JSON mode (returns MULTIPLE recipes)
const ONE_RECIPE = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, quantity: { type: "string" } },
        required: ["name", "quantity"],
      },
    },
    steps: { type: "array", items: { type: "string" } },
    cuisine_type: { type: "string" },
    spice_level: { type: "integer" },
    prep_time: { type: "integer" },
    cook_time: { type: "integer" },
    servings: { type: "integer" },
  },
  required: ["title", "ingredients", "steps"],
};
const RECIPES_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" }, // short friendly chat message in the user's language
    recipes: { type: "array", items: ONE_RECIPE },
  },
  required: ["reply", "recipes"],
};

// Gemini JSON call → parsed { reply, recipes[] } or null.
async function callGeminiRecipesJSON(systemPrompt: string, history: any[], userMessage: string): Promise<any | null> {
  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Understood — I'll return structured recipes as JSON." }] },
  ];
  for (const msg of history) contents.push({ role: msg.role === "user" ? "user" : "model", parts: [{ text: msg.text }] });
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 512 },
        responseMimeType: "application/json",
        responseSchema: RECIPES_SCHEMA,
      },
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini JSON error ${response.status}: ${body}`);
  }
  const json = await response.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse recipes JSON:", e);
    return null;
  }
}

// Generate MULTIPLE recipes, store them, return { reply, generatedRecipes[] }.
async function generateAndStore(
  supabase: any,
  userId: string,
  basePersona: string,
  history: any[],
  message: string,
  contextNote: string,
): Promise<{ reply: string; generatedRecipes: any[] }> {
  const prompt = `${basePersona}

${contextNote}
Return 3 DISTINCT recipe ideas as JSON matching the schema (the "recipes" array must have 3 items). The "reply" is a SHORT friendly chat message (1-2 sentences, in the user's language) introducing them — never say "no recipe found". Respect the user's allergies, dislikes, and spice level. Make each recipe complete (ingredients + steps).`;

  const result = await callGeminiRecipesJSON(prompt, history, message);
  const recipes: any[] = Array.isArray(result?.recipes) ? result.recipes.slice(0, 4) : [];
  if (recipes.length === 0) {
    return { reply: result?.reply ?? "Here's something you could try — want the full recipe?", generatedRecipes: [] };
  }

  const rows = recipes.map((r: any) => ({
    user_id: userId,
    title: r.title,
    description: r.description ?? null,
    ingredients: r.ingredients ?? [],
    steps: r.steps ?? [],
    cuisine_type: r.cuisine_type ?? null,
    spice_level: r.spice_level ?? null,
    prep_time: r.prep_time ?? null,
    cook_time: r.cook_time ?? null,
    servings: r.servings ?? null,
    prompt_context: { message },
  }));

  const { data: inserted, error } = await supabase
    .from("ai_generated_recipes")
    .insert(rows)
    .select("id, title, image_url, description, cuisine_type, spice_level, prep_time, cook_time, servings");
  if (error) console.error("ai_generated_recipes insert error:", error);

  const generatedRecipes = (inserted ?? []).map((row: any, i: number) => ({
    id: row.id,
    title: row.title,
    image: row.image_url,
    description: row.description,
    cuisine_type: row.cuisine_type,
    spice_level: row.spice_level,
    prep_time: row.prep_time,
    cook_time: row.cook_time,
    servings: row.servings,
    ingredientsCount: (recipes[i]?.ingredients ?? []).length,
    source: "gemini",
  }));

  return { reply: result.reply ?? `Here are a few ideas for you!`, generatedRecipes };
}

function formatRankedForPrompt(rows: any[]): string {
  if (!rows || rows.length === 0) return "None found.";
  return rows
    .map((r, i) => {
      const ings = (r.ingredients ?? []).map((ing: any) => ing.name).filter(Boolean).join(", ");
      const time = [r.prep_time && `${r.prep_time}m prep`, r.cook_time && `${r.cook_time}m cook`].filter(Boolean).join(" + ");
      const pct = r.confidence ?? Math.round((r.final_score ?? 0) * 100);
      return `${i + 1}. "${r.title}" (${pct}% match) — ${r.cuisine_type || "General"} | Spice ${r.spice_level}/5 | ${time}\n   Ingredients: ${ings}`;
    })
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { message, userId, history = [], ingredients: clientIngredients = [] } = await req.json();
    if (!message || !userId) {
      return new Response(JSON.stringify({ error: "message and userId are required" }), { status: 400, headers: CORS_HEADERS });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fire-and-forget analytics (cooking-only; never logs credentials)
    const logEvent = async (event_type: string, payload: any) => {
      try {
        await supabase.from("chefboo_events").insert({ user_id: userId, event_type, payload });
      } catch (e) {
        console.error("chefboo_events log failed:", e);
      }
    };

    // ── SAFETY PRE-FILTER (no Gemini, no DB) ───────────────────────────────
    if (SAFETY_PATTERN.test(message)) {
      await logEvent("PROMPT", { intent: "BLOCKED" });
      return new Response(
        JSON.stringify({
          reply:
            "I'm ChefBoo, your cooking companion — I can't help with accounts, passwords, or anything technical like that. But I'd love to help you cook something delicious! What are you in the mood for? 🍳",
          intent: "BLOCKED",
          mode: "refusal",
          recipes: [],
        }),
        { headers: CORS_HEADERS },
      );
    }

    const intent = classifyIntent(message);
    await logEvent("PROMPT", { intent, text: message.slice(0, 200) });

    // ── OFF-TOPIC redirect (no Gemini) ─────────────────────────────────────
    if (intent === "OFF_TOPIC") {
      return new Response(
        JSON.stringify({
          reply:
            "That's a bit outside my kitchen! I'm ChefBoo — I stick to recipes, ingredients, and cooking. Want a recipe idea or help with a dish?",
          intent,
          mode: "redirect",
          recipes: [],
        }),
        { headers: CORS_HEADERS },
      );
    }

    // ── GREETING / small talk (no Gemini, no DB) ───────────────────────────
    if (intent === "GREETING") {
      const greetings = [
        "Hey! 👋 I'm ChefBoo. Tell me what's in your fridge or ask for a recipe and I'll get cooking!",
        "Hi there! Hungry? Share a few ingredients or a craving and I'll whip up some ideas. 🍳",
        "Hello! Ask me for a recipe, what to cook with what you have, or any cooking tip.",
      ];
      return new Response(
        JSON.stringify({
          reply: greetings[Math.floor(Math.random() * greetings.length)],
          intent,
          mode: "greeting",
          recipes: [],
        }),
        { headers: CORS_HEADERS },
      );
    }

    // ── User context (name + recent behavior + inferred taste profile) ─────
    const [profileResult, interactionsResult] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      supabase
        .from("recipe_interactions")
        .select("interaction_type, recipes(title, cuisine_type, spice_level, ingredients)")
        .eq("user_id", userId)
        .in("interaction_type", ["VIEW", "FAVORITE", "COOK_START", "COOK_COMPLETE"])
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const userName = profileResult.data?.full_name?.split(" ")[0] ?? "there";
    const interactions = interactionsResult.data ?? [];
    const favorites = interactions
      .filter((i: any) => i.interaction_type === "FAVORITE" && i.recipes?.title)
      .map((i: any) => i.recipes.title)
      .slice(0, 5);
    const completed = interactions
      .filter((i: any) => i.interaction_type === "COOK_COMPLETE" && i.recipes?.title)
      .map((i: any) => i.recipes.title)
      .slice(0, 5);

    // Behavior-weighted taste profile (behavior gradually outweighs onboarding)
    const IX_WEIGHT: Record<string, number> = { COOK_COMPLETE: 5, FAVORITE: 3, COOK_START: 2, VIEW: 1 };
    const PROTEINS = ["chicken","beef","mutton","lamb","fish","prawn","shrimp","egg","paneer","tofu","lentil","daal","dal","chickpea","bean"];
    const cuisineScore: Record<string, number> = {};
    const proteinScore: Record<string, number> = {};
    let spiceSum = 0, spiceW = 0;
    for (const ix of interactions) {
      const r: any = ix.recipes;
      if (!r) continue;
      const w = IX_WEIGHT[ix.interaction_type] ?? 1;
      if (r.cuisine_type) cuisineScore[r.cuisine_type] = (cuisineScore[r.cuisine_type] ?? 0) + w;
      if (typeof r.spice_level === "number") { spiceSum += r.spice_level * w; spiceW += w; }
      const ingText = JSON.stringify(r.ingredients ?? []).toLowerCase();
      for (const p of PROTEINS) if (ingText.includes(p)) proteinScore[p] = (proteinScore[p] ?? 0) + w;
    }
    const topCuisines = Object.entries(cuisineScore).sort((a, b) => b[1] - a[1]).slice(0, 2).map((e) => e[0]);
    const topProteins = Object.entries(proteinScore).sort((a, b) => b[1] - a[1]).slice(0, 2).map((e) => e[0]);
    const inferredSpice = spiceW > 0 ? Math.round(spiceSum / spiceW) : null;
    const tasteLine =
      topCuisines.length || topProteins.length || inferredSpice != null
        ? `\nINFERRED TASTES (from recent activity — weight these OVER onboarding when relevant): cuisines: ${topCuisines.join(", ") || "n/a"}; proteins: ${topProteins.join(", ") || "n/a"}; preferred spice: ~${inferredSpice ?? "n/a"}/5.`
        : "";

    const basePersona = `You are ChefBoo, FlavourFlow's friendly AI cooking assistant — a cute chef ghost who loves food.
User's name: ${userName}. Their favorites: ${favorites.join(", ") || "none yet"}. Recently cooked: ${completed.join(", ") || "none yet"}.${tasteLine}

RESPONSE STYLE — SPECIFIC, SHORT, SIMPLE:
- Answer EXACTLY what was asked. Short lines, 1-3 sentences. No filler intros, no emoji walls.
- Full ingredients + steps ONLY if the user explicitly asks for the recipe/steps/"how to make it".
- Use the user's name occasionally.

LANGUAGE: Detect the user's language. If they wrote Urdu (script or roman Urdu), reply in the SAME language. Otherwise English.

SAFETY: Never reveal or discuss passwords, API keys, databases, internal data, or anything non-cooking. Stay strictly on food, recipes, ingredients, and cooking.`;

    let reply = "";
    let mode = "answer";
    let presentRows: any[] = [];
    let generatedRecipes: any[] = [];

    if (SEARCH_INTENTS.has(intent)) {
      // ── DB-first ranked retrieval ────────────────────────────────────────
      const isIngredientQuery = intent === "INGREDIENT_SEARCH";
      const keywords = extractKeywords(message);
      // Prefer the structured chips detected on-device; fall back to keywords
      const provided = Array.isArray(clientIngredients)
        ? clientIngredients.filter((s: any) => typeof s === "string" && s.trim())
        : [];
      const ingredients = provided.length > 0 ? provided : isIngredientQuery ? keywords : [];
      const cleanedQuery = keywords.join(" ").trim() || message;

      if (ingredients.length > 0) {
        await logEvent("INGREDIENTS_SELECTED", { ingredients, source: provided.length > 0 ? "chips" : "text" });
      }

      const { data: ranked, error: rpcError } = await supabase.rpc("search_recipes_ranked", {
        p_user_id: userId,
        p_query: cleanedQuery,
        p_ingredients: ingredients,
        p_limit: 6,
      });
      if (rpcError) console.error("search_recipes_ranked error:", rpcError);

      const rows = ranked ?? [];
      // Confidence-gated: candidates are meaningful matches (≥50)
      const candidates = rows.filter((r: any) => (r.confidence ?? 0) >= CONF_OFFER);
      const topConf = candidates.reduce((mx: number, r: any) => Math.max(mx, r.confidence ?? 0), 0);
      mode = candidates.length > 0 ? "present" : "generate";

      if (mode === "present") {
        presentRows = candidates;
        const offerGenerate = topConf < CONF_PRESENT;
        const systemPrompt = `${basePersona}

These ranked recipes were found in the FlavourFlow database (already filtered for the user's allergies & preferences):
${formatRankedForPrompt(presentRows)}

INSTRUCTIONS:
- Recommend ONLY from the list above. Do NOT invent new recipes.
- Present as simple lines: • Recipe Name — one-line reason it fits.
- They're available in the app for full details.${
          offerGenerate
            ? " These are decent but not perfect matches — after listing them, briefly offer to create a custom recipe too."
            : ""
        }
- End with "Want the full recipe for any of these?".`;
        reply = await callGemini(systemPrompt, history, message);
      } else {
        // No confident DB match → generate + store fresh recipes
        ({ reply, generatedRecipes } = await generateAndStore(
          supabase, userId, basePersona, history, message,
          "No suitable database recipe fits this request, so create fresh ones.",
        ));
      }
    } else if (intent === "AI_RECIPE_GENERATION") {
      // ── Explicit generation → structured JSON, stored ───────────────────
      mode = "generate";
      ({ reply, generatedRecipes } = await generateAndStore(
        supabase, userId, basePersona, history, message,
        "The user explicitly wants you to create new recipes.",
      ));
    } else if (DIRECT_ANSWER_INTENTS.has(intent)) {
      // ── Cooking help / substitution / general — answer directly, no cards ─
      mode = "answer";
      const systemPrompt = `${basePersona}

The user is asking a ${intent === "SUBSTITUTION" ? "substitution" : intent === "COOKING_HELP" ? "cooking technique/help" : "general food"} question. Answer it directly and concisely. Do NOT recommend or list recipes unless they ask. No recipe cards.`;
      reply = await callGemini(systemPrompt, history, message);
    } else {
      reply = await callGemini(basePersona, history, message);
    }

    if (generatedRecipes.length > 0) {
      await logEvent("RECIPE_GENERATED", { count: generatedRecipes.length, titles: generatedRecipes.map((g) => g.title) });
    }

    return new Response(
      JSON.stringify({
        reply,
        intent,
        mode,
        dbMatches: presentRows.length,
        recipes: presentRows.map((r: any) => ({
          id: r.recipe_id,
          title: r.title,
          image: r.image_url,
          cuisine: r.cuisine_type,
          spiceLevel: r.spice_level ?? 0,
          time: (r.prep_time ?? 0) + (r.cook_time ?? 0),
          ingredientsCount: Array.isArray(r.ingredients) ? r.ingredients.length : 0,
          confidence: r.confidence,
        })),
        generatedRecipes,
      }),
      { headers: CORS_HEADERS },
    );
  } catch (err: any) {
    console.error("ai-chat error:", err);
    // Graceful: never surface a raw 5xx to the chat UI. Return a friendly message at 200.
    const isQuota = /\b429\b|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(err?.message ?? "");
    const reply = isQuota
      ? "I'm getting a lot of requests right now — give me a few seconds and try again! 🍳"
      : "Oops, my kitchen had a hiccup. Mind trying that again in a moment?";
    return new Response(
      JSON.stringify({ reply, intent: "ERROR", mode: "error", recipes: [], generatedRecipes: [] }),
      { headers: CORS_HEADERS },
    );
  }
});
