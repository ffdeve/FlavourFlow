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

// Generic / time words that carry no specific dish or ingredient meaning. When a
// query reduces to only these (and no ingredients), it's a "browse" request →
// show personalized DB recommendations rather than generating.
const GENERIC_TERMS = new Set([
  "tonight","today","now","quick","easy","fast","simple","light","healthy",
  "dinner","lunch","breakfast","brunch","snack","supper","meal","meals","dish","dishes",
  "something","anything","idea","ideas","suggest","suggestion","suggestions",
  "recommend","recommendation","surprise","yummy","tasty","delicious","good",
  "best","popular","minute","minutes","min","new","different","random",
]);

// Canned one-liners → present/browse replies need NO Gemini call (fast path).
const PRESENT_REPLIES = [
  "Here are a few that fit perfectly:",
  "Found some tasty matches for you:",
  "These look great for what you're after:",
  "Got some good ones for you below:",
];
const BROWSE_REPLIES = [
  "Here are some ideas to get you started:",
  "A few tasty picks for you:",
  "Some recipes you might love:",
  "Here's what I'd cook:",
];
// "Different/more" requests — acknowledge the variety + show fresh ones.
const VARIETY_REPLIES = [
  "Sure — here are some different ones:",
  "Got it, here's something else:",
  "No problem, try these instead:",
  "Here are a few more for you:",
];
const VARIETY_REPLIES_UR = ["ٹھیک ہے، یہ مختلف آپشنز دیکھیں:", "کچھ اور دیکھیں:"];
const NO_MORE_REPLIES = [
  "That's about all I have for now — want me to create a fresh one instead?",
];
// Urdu-script variants so the fast (no-Gemini) path still respects language.
const PRESENT_REPLIES_UR = ["یہ آپ کے لیے بہترین لگ رہی ہیں:", "کچھ مزیدار آپشنز آپ کے لیے:"];
const BROWSE_REPLIES_UR = ["یہ آئیڈیاز دیکھیں:", "کچھ مزیدار تجاویز آپ کے لیے:"];
const isUrduScript = (s: string) => /[؀-ۿ]/.test(s);
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

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
  | "FOLLOW_UP"
  | "VARIETY"
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
  if (/^(hi+|hey+|hello+|yo+|hola|sala?m|asalam|assalam|a?o?a|good (morning|afternoon|evening|day)|how are you|whats up|what'?s up|sup|thanks?|thank you|thank u|shukria|👋|🙏)[\s!.]*$/i.test(m))
    return "GREETING";

  // "Show me different/more recipes" → re-fetch, excluding what was already shown
  if (/^(more|more (recipes?|options?|ideas?|please)|different|different (recipes?|ones?|options?)|something (else|different)|anything else|other|others|other (ones?|recipes?|options?)|show (me )?more|new ones?|not these|change( them| it)?|alternatives?|give me (more|other)|any other)[\s!.?]*$/i.test(m))
    return "VARIETY";

  // Context-dependent follow-ups → continue the conversation WITH history (memory)
  if (/^(tell me more|explain|expand|go on|continue|details?|why|how about|what about|and( the)?|the (first|second|third|last|1st|2nd|3rd) one|that one|this one|yes( please)?|yeah|yep|sure|ok(ay)? (do it|go|sure)|do it|sounds good|i('| a)?m interested)[\s!.?]*$/i.test(m))
    return "FOLLOW_UP";

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

async function callGemini(systemPrompt: string, history: any[], userMessage: string, maxTokens?: number): Promise<string> {
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
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens ?? 2048,
        thinkingConfig: { thinkingBudget: 512 }
      },
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
        // Thinking DISABLED for structured generation: on 2.5-flash, thinking
        // tokens share the output budget and were truncating/emptying the JSON.
        // Recipe generation is straightforward structured output — no thinking needed.
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
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
  const cand = json?.candidates?.[0];
  const raw = cand?.content?.parts?.[0]?.text;
  if (!raw) {
    console.error("Recipes JSON empty — finishReason:", cand?.finishReason, "| safety:", JSON.stringify(cand?.safetyRatings ?? []), "| promptFeedback:", JSON.stringify(json?.promptFeedback ?? {}));
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse recipes JSON:", e, "| raw:", raw.slice(0, 300));
    return null;
  }
}

// ── Cooking-mode (sous-chef) structured reply ───────────────────────────────
// Returns a short spoken-style reply PLUS optional structured "suggestions"
// (ingredient swaps / appliance alternatives / technique alternatives) that the
// client renders as tappable chips with icons from the ingredient/appliance buckets.
const COOKING_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" }, // 1-3 short sentences, no emoji, in the user's language
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" }, // "ingredient" | "appliance" | "technique"
          name: { type: "string" }, // canonical name the client resolves an icon for
          note: { type: "string" }, // short how-to / ratio (e.g. "1 tbsp per tomato")
        },
        required: ["type", "name"],
      },
    },
  },
  required: ["reply"],
};

async function callGeminiCookingJSON(systemPrompt: string, history: any[], userMessage: string): Promise<any | null> {
  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Understood — I'll reply as a sous-chef in JSON." }] },
  ];
  for (const msg of history) contents.push({ role: msg.role === "user" ? "user" : "model", parts: [{ text: msg.text }] });
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: COOKING_SCHEMA,
      },
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini cooking JSON error ${response.status}: ${body}`);
  }
  const json = await response.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse cooking JSON:", e, "| raw:", String(raw).slice(0, 300));
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
Return 3 DISTINCT recipe ideas as JSON matching the schema (the "recipes" array must have 3 items). The "reply" is ONE short, warm sentence (max ~14 words, in the user's language) — these recipes appear to the user as TAPPABLE CARDS below, so DON'T list or describe them in the reply, just point to them (e.g. "Made you a few fresh ideas:" or "Cooked up some options for you:"). Do NOT use emoji. Never say "no recipe found" or "available in the app". Respect the user's allergies, dislikes, and spice level.
Make each recipe complete and genuinely cookable:
- "ingredients": every item with a clear quantity (e.g. "2 cups rice", "1 tsp salt").
- "steps": ordered, numbered-in-sequence cooking instructions — each step ONE clear action (prep → cook → finish). 4-8 steps. No step should reference an ingredient not in that recipe's ingredient list.
- Always fill prep_time, cook_time, servings, cuisine_type, and spice_level.`;

  const result = await callGeminiRecipesJSON(prompt, history, message);
  const recipes: any[] = Array.isArray(result?.recipes) ? result.recipes.slice(0, 4) : [];
  if (recipes.length === 0) {
    return {
      reply:
        result?.reply ??
        "Hmm, my recipe ideas didn't come through that time. Try again, or tell me an ingredient or two and I'll cook up something specific!",
      generatedRecipes: [],
    };
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

// Personalized recommendations for "browse" asks ("what can I cook tonight?").
// Source 1: precomputed recipe_recommendations (cron-built, score-ranked).
// Source 2 (fallback): top-rated recipes, allergen-filtered. Returns rows in the
// same shape the response mapper expects (recipe_id, title, image_url, …).
async function getRecommendations(supabase: any, userId: string, limit = 6, excludeIds: string[] = []): Promise<any[]> {
  const exclude = new Set((excludeIds ?? []).map(String));
  const shape = (r: any) => ({
    recipe_id: r.id,
    title: r.title,
    image_url: r.image_url,
    cuisine_type: r.cuisine_type,
    spice_level: r.spice_level,
    prep_time: r.prep_time,
    cook_time: r.cook_time,
    ingredients: r.ingredients,
  });

  // De-dupe by recipe id + skip anything already shown to the user this session.
  const dedupe = (rows: any[]) => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const r of rows) {
      if (!r || seen.has(r.recipe_id) || exclude.has(String(r.recipe_id))) continue;
      seen.add(r.recipe_id);
      out.push(r);
      if (out.length >= limit) break;
    }
    return out;
  };

  // 1) Precomputed personalized recommendations (fetch extra to survive de-dupe)
  const { data: recs } = await supabase
    .from("recipe_recommendations")
    .select("score, recipes ( id, title, cuisine_type, prep_time, cook_time, spice_level, ingredients, image_url )")
    .eq("user_id", userId)
    .order("score", { ascending: false })
    .limit(limit * 6);
  const fromRecs = dedupe(
    (recs ?? [])
      .map((row: any) => (Array.isArray(row.recipes) ? row.recipes[0] : row.recipes))
      .filter(Boolean)
      .map(shape),
  );
  if (fromRecs.length > 0) return fromRecs;

  // 2) Fallback: top-rated recipes, excluding the user's allergens
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("allergies")
    .eq("user_id", userId)
    .maybeSingle();
  const allergies = (prefs?.allergies ?? []).map((a: string) => String(a).toLowerCase());
  const { data: top } = await supabase
    .from("recipes")
    .select("id, title, cuisine_type, prep_time, cook_time, spice_level, ingredients, image_url, allergens, average_rating")
    .order("average_rating", { ascending: false })
    .limit(limit * 8);
  return dedupe(
    (top ?? [])
      .filter((r: any) => {
        const al = (r.allergens ?? []).map((a: string) => String(a).toLowerCase());
        return !al.some((a: string) => allergies.includes(a));
      })
      .map(shape),
  );
}

// Turn the user's fridge selection + availability answer ("only these" vs
// "I also have basics") into an explicit, enforceable constraint for Gemini.
function buildIngredientConstraint(message: string, ingredients: string[]): string {
  if (!ingredients || ingredients.length === 0) return "";
  const lower = message.toLowerCase();
  const onlyThese = /only these|nothing else/.test(lower);
  const hasBasics = /basic kitchen|common spices|staples/.test(lower);
  const list = ingredients.join(", ");

  if (onlyThese) {
    return `\nINGREDIENT CONSTRAINT (STRICT — the user confirmed this): They have ONLY these ingredients and NOTHING else — not even oil, salt, or spices: ${list}. Every recipe MUST be makeable using only this exact list. Do NOT introduce any ingredient outside it. If a full dish isn't possible, give the best simple thing that still uses only these.`;
  }
  if (hasBasics) {
    return `\nINGREDIENT CONSTRAINT (STRICT — the user confirmed this): Their main ingredients are: ${list}. They ALSO have basic kitchen staples (oil, salt, pepper, common dried spices, water). Build each recipe around the main list, using ONLY those plus basic staples. Do NOT require any other fresh ingredient, protein, vegetable, dairy, or sauce they didn't list.`;
  }
  // Ingredients provided but no explicit availability answer (e.g. typed "I have X").
  return `\nINGREDIENT CONTEXT: The user has these on hand: ${list}. Center recipes on them and keep any extra ingredients to a minimum.`;
}

// Server-side fallback for odd-phrased timer requests in cooking mode. The client
// handles the common patterns with a regex; this catches anything it misses.
function parseTimerRequest(msg: string): { type: string; seconds: number; label: string } | null {
  const m = (msg || "").toLowerCase();
  const hasIntent =
    /\b(set|start|create|put on|add|begin)\b[\s\S]*\btimer\b/.test(m) ||
    /\btimer\b[\s\S]*\bfor\b/.test(m) ||
    /\bremind me\b[\s\S]*\bin\b/.test(m);
  if (!hasIntent) return null;
  let seconds = 0;
  const hr = m.match(/(\d+)\s*(hours?|hrs?|h)\b/);
  const min = m.match(/(\d+)\s*(minutes?|mins?|m)\b/);
  const sec = m.match(/(\d+)\s*(seconds?|secs?|s)\b/);
  if (hr) seconds += parseInt(hr[1], 10) * 3600;
  if (min) seconds += parseInt(min[1], 10) * 60;
  if (sec) seconds += parseInt(sec[1], 10);
  if (seconds === 0) {
    const bare = m.match(/timer\s*(?:for\s*)?(\d+)\b/);
    if (bare) seconds = parseInt(bare[1], 10) * 60; // bare number → minutes
  }
  if (seconds <= 0) return null;
  const mins = Math.round(seconds / 60);
  const label = seconds % 60 === 0 ? `${mins} min timer` : `${seconds}s timer`;
  return { type: "start_timer", seconds, label };
}
function buildSettingsPrompt(settings: any, isSafetyEmergency: boolean): string {
  const { language, responseStyle, skillLevel, personality } = settings || {};

  let langText = "Preferred language: Auto Detect. Respond using the same language style used by the user (English, Urdu script, or Roman Urdu).";
  if (language === "english") {
    langText = "STRICT RULE: Always respond in English. Do NOT write in Urdu script or Roman Urdu.";
  } else if (language === "urdu") {
    langText = "STRICT RULE: Always respond in Urdu script. Never switch to English unless the user explicitly requests it. (e.g. آنچ درمیانی کر دیں).";
  } else if (language === "roman_urdu") {
    langText = "STRICT RULE: Always respond in Roman Urdu (Urdu using Latin/English characters). Never switch to English unless the user explicitly requests it. (e.g. heat medium kar dein).";
  }

  let styleText = "Response style: Balanced. Normal conversational responses.";
  if (isSafetyEmergency) {
    styleText = "Response style: DETAILED SAFETY OVERRIDE. The user is experiencing a safety emergency (e.g. fire, burning, cut). IGNORE any short response restrictions and provide complete, detailed safety guidance immediately.";
  } else if (responseStyle === "short") {
    styleText = "Response style: Short & Direct. Keep responses extremely brief and to the point. Answer in 1 short sentence. No conversational filler.";
  } else if (responseStyle === "detailed") {
    styleText = "Response style: Detailed. Provide detailed explanations, educational tips, and the culinary reasoning behind the advice.";
  }

  let skillText = "Cooking skill level: Intermediate. Normal cooking guidance.";
  if (skillLevel === "beginner") {
    skillText = "Cooking skill level: Beginner. Explain terminology, avoid advanced culinary jargon, and provide detailed step-by-step guidance.";
  } else if (skillLevel === "expert") {
    skillText = "Cooking skill level: Expert. Short, professional instructions without explaining basic terms.";
  }

  let personalityText = "Personality: Friendly Chef. Be warm, cute, encouraging, friendly, and conversational, using cooking metaphors.";
  if (personality === "professional_chef") {
    personalityText = "Personality: Professional Chef. Speak as a Professional Chef. Use professional culinary terminology. Focus on precision, efficiency, presentation, and proper techniques. Maintain a structured and authoritative tone.";
  } else if (personality === "cooking_teacher") {
    personalityText = "Personality: Cooking Teacher. Speak as a Cooking Teacher. Explain why each cooking step matters. Teach techniques and cooking science. Focus on helping the user learn.";
  } else if (personality === "grandma_style") {
    personalityText = "Personality: Grandma Style. Speak warmly and encouragingly like an experienced grandmother teaching home cooking. Use caring, comforting, and reassuring language.";
  }

  return `${langText}\n${styleText}\n${skillText}\n${personalityText}`;
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const reqBody = await req.json();

    // ── TRANSLATE RECIPE (Short-circuit) ───────────────────────────────────
    if (reqBody.action === "translate_recipe") {
      const { targetLanguage, recipeData, systemPrompt } = reqBody;
      const prompt = `${systemPrompt}\n\nTarget Language: ${targetLanguage}\n\nRecipe to translate:\n${JSON.stringify(recipeData, null, 2)}`;
      const contents = [{ role: "user", parts: [{ text: prompt }] }];
      
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Gemini translation error ${response.status}: ${body}`);
      }
      const json = await response.json();
      const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) throw new Error("No translation returned");
      
      const cleanedRaw = raw.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
      
      return new Response(
        JSON.stringify({ translated_data: JSON.parse(cleanedRaw) }),
        { headers: CORS_HEADERS },
      );
    }

    const { message, userId, history = [], ingredients: clientIngredients = [], excludeIds = [], mode: requestMode, cookingContext, assistantSettings } = reqBody;
    const lowerMessage = (message || "").toLowerCase();
    const excludeList: string[] = Array.isArray(excludeIds) ? excludeIds.filter((x: any) => typeof x === "string") : [];
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

    // ── RATE LIMIT (per-user AI abuse + Gemini cost guard) ─────────────────
    // Atomic check-and-increment in Postgres so concurrent requests can't race
    // past the limit. Fails OPEN — a limiter error must never block cooking.
    const AI_HOUR_LIMIT = 30;
    const AI_DAY_LIMIT = 100;
    try {
      const { data: rl, error: rlError } = await supabase.rpc("check_ai_rate_limit", {
        p_user_id: userId,
        p_hour_limit: AI_HOUR_LIMIT,
        p_day_limit: AI_DAY_LIMIT,
      });
      if (!rlError && rl && rl.allowed === false) {
        await logEvent("PROMPT", { intent: "RATE_LIMITED" });
        const secs = Number(rl.retry_after_seconds) || 60;
        const mins = Math.max(1, Math.ceil(secs / 60));
        const wait = mins >= 60 ? `${Math.ceil(mins / 60)} hour${mins >= 120 ? "s" : ""}` : `${mins} minute${mins === 1 ? "" : "s"}`;
        return new Response(
          JSON.stringify({
            reply: `Whew — we've been cooking up a storm together! 🍳 I need a short breather so I can keep helping everyone. Let's pick this back up in about ${wait}.`,
            intent: "RATE_LIMITED",
            mode: "rate_limited",
            rateLimited: true,
            retryAfterSeconds: secs,
          }),
          { status: 200, headers: CORS_HEADERS },
        );
      }
    } catch (e) {
      console.error("rate limit check failed (failing open):", e);
    }

    // ── SAFETY PRE-FILTER (no Gemini, no DB) ───────────────────────────────
    if (SAFETY_PATTERN.test(message)) {
      await logEvent("PROMPT", { intent: "BLOCKED" });
      return new Response(
        JSON.stringify({
          reply:
            "I'm ChefBoo, your cooking companion — I can't help with accounts, passwords, or anything technical like that. But I'd love to help you cook something delicious! What are you in the mood for?",
          intent: "BLOCKED",
          mode: "refusal",
          recipes: [],
        }),
        { headers: CORS_HEADERS },
      );
    }

    // ── IN-COOK ChefBoo (sous-chef mode) — text-only, scoped to the current dish ─
    // Cooking Mode passes mode:"cooking" + cookingContext. We swap to a constrained
    // sous-chef persona: no recipe cards, no generation, declines off-topic asks.
    if (requestMode === "cooking") {
      await logEvent("COOKING_PROMPT", { text: message.slice(0, 200) });

      const ctx = cookingContext ?? {};
      const recipeTitle = ctx.recipe?.title ?? "this dish";

      // Full step awareness: ChefBoo knows every direction, what's done, and what's next.
      const allSteps: string[] = Array.isArray(ctx.steps)
        ? ctx.steps.map((s: any) => (typeof s === "string" ? s : s?.instruction)).filter(Boolean)
        : [];
      const stepIndex = typeof ctx.stepIndex === "number" ? ctx.stepIndex : null;
      const stepNum = stepIndex != null ? stepIndex + 1 : null;
      const currentStepText =
        (stepIndex != null && allSteps[stepIndex]) ||
        ctx.currentStep?.instruction ||
        (typeof ctx.currentStep === "string" ? ctx.currentStep : "");
      const stepsOutline =
        allSteps.length > 0
          ? allSteps
              .map((s, i) => {
                const marker =
                  stepIndex != null
                    ? i < stepIndex
                      ? "[done]"
                      : i === stepIndex
                        ? "[CURRENT]"
                        : "[upcoming]"
                    : "";
                return `  ${i + 1}. ${marker} ${s}`;
              })
              .join("\n")
          : "";

      const ings = Array.isArray(ctx.recipe?.ingredients)
        ? ctx.recipe.ingredients
            .map((x: any) => (typeof x === "string" ? x : x?.name))
            .filter(Boolean)
            .join(", ")
        : "";
      const allergies = Array.isArray(ctx.preferences?.allergies) ? ctx.preferences.allergies : [];
      const dietary = Array.isArray(ctx.preferences?.dietary) ? ctx.preferences.dietary : [];
      const runningTimers = Array.isArray(ctx.runningTimers) ? ctx.runningTimers : [];
      const timerLine = runningTimers.length
        ? `\nTIMERS RUNNING RIGHT NOW: ${runningTimers
            .map((t: any) => `${t.label}${t.remaining ? ` (${t.remaining} left)` : ""}`)
            .join(", ")}.`
        : "";

      // Serving scale — so quantity advice matches what the user actually cooks.
      const baseServings = ctx.recipe?.servings ?? null;
      const scaledServings = ctx.recipe?.scaledServings ?? null;
      const servingsLine =
        scaledServings && baseServings && scaledServings !== baseServings
          ? `\nSERVINGS: the user scaled this to ${scaledServings} (recipe base is ${baseServings}) — scale any quantity advice to ${scaledServings} servings.`
          : scaledServings
            ? `\nSERVINGS: ${scaledServings}.`
            : "";

      // Structured detail for the CURRENT step (action / heat / temp / note / uses).
      const cs =
        ctx.currentStep && typeof ctx.currentStep === "object" ? ctx.currentStep : null;
      const detailBits: string[] = [];
      if (cs?.action) detailBits.push(`action: ${cs.action}`);
      if (cs?.heatSetting) detailBits.push(`heat: ${cs.heatSetting}`);
      if (cs?.temperature) detailBits.push(`temperature: ${cs.temperature}`);
      const stepDetailLine = detailBits.length
        ? `\nCurrent step details — ${detailBits.join(", ")}.`
        : "";
      const linked = Array.isArray(cs?.linkedIngredients) ? cs.linkedIngredients : [];
      const linkedLine = linked.length
        ? `\nThis step uses: ${linked
            .map((l: any) => (l?.quantity ? `${l.quantity} ${l.name}` : l?.name))
            .filter(Boolean)
            .join(", ")}.`
        : "";
      const noteLine = cs?.note ? `\nChef tip on this step: ${cs.note}.` : "";
      const remainingSteps =
        typeof ctx.remainingSteps === "number"
          ? ctx.remainingSteps
          : stepNum && allSteps.length
            ? allSteps.length - stepNum
            : null;
      const remainingLine =
        remainingSteps != null ? `\n${remainingSteps} step(s) remain after this one.` : "";

      const isSafetyEmergency = /\b(fire|burning|smoke|oil fire|cut|bleeding|gas|leak|jal\s*raha|jal\s*rhi|khoon|zakhmi|aag)\b/i.test(lowerMessage);
      const settingsBlock = buildSettingsPrompt(assistantSettings, isSafetyEmergency);

      const sousPrompt = `You are ChefBoo in COOKING MODE — a calm, hands-on sous-chef helping the user RIGHT NOW as they cook "${recipeTitle}". You ALREADY know the recipe, so the user NEVER has to tell you what they're cooking.
${stepNum ? `They are on step ${stepNum} of ${allSteps.length || "?"}${currentStepText ? `: "${currentStepText}"` : ""}.` : ""}${stepDetailLine}${linkedLine}${noteLine}${remainingLine}${servingsLine}
${stepsOutline ? `FULL METHOD (so you know what's done and what's coming next):\n${stepsOutline}` : ""}
${ings ? `\nRecipe ingredients: ${ings}.` : ""}${timerLine}
${allergies.length ? `\nUser allergies — NEVER suggest these as substitutes: ${allergies.join(", ")}.` : ""}${dietary.length ? `\nDietary restrictions to respect in any suggestion: ${dietary.join(", ")}.` : ""}

WHAT YOU HELP WITH (only these, and only about THIS dish):
- Troubleshooting what's happening now ("my onions went dark brown", "gravy too thick", "it's too salty").
- Ingredient substitutions ("can I skip tomatoes?", "I'm out of coriander").
- Equipment/technique alternatives ("I don't have a steamer", "no oven").
- Technique guidance ("what does simmer mean?", "how do I know it's done?").
- Measurement & temperature conversions.

ASSISTANT PREFERENCES:
${settingsBlock}

RETURN JSON: { "reply": string, "suggestions": [{ "type", "name", "note" }] }.
- "reply": The answer to the user. Strictly follow the preferred language, response style (unless safety emergency is active), and personality instructions from the ASSISTANT PREFERENCES block. NO emoji. NO preamble. NO markdown.
- "suggestions": ONLY fill this when you offer concrete swaps/alternatives. Each item:
   - type: "ingredient" (a food swap), "appliance" (equipment alternative), or "technique" (a method alternative).
   - name: the single canonical thing (e.g. "Tomato Paste", "Yogurt", "Oven", "Boil and strain"). No quantities in the name.
   - note: a SHORT how-to or ratio (e.g. "2 tbsp per tomato", "190C for 20 min").
   Keep suggestions to the 2-4 best options. If you're not offering swaps, return an empty array.
- Do NOT suggest other recipes, do NOT output a full recipe. If asked for a different recipe or anything off-topic, set suggestions to [] and briefly steer back to this dish in "reply".`;

      let reply = "";
      let suggestions: any[] = [];
      try {
        const parsed = await callGeminiCookingJSON(sousPrompt, history, message);
        reply = parsed?.reply ?? "";
        suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions.slice(0, 4) : [];
      } catch (e) {
        console.error("cooking JSON failed, falling back to plain text:", e);
      }
      if (!reply) {
        // Fallback to a plain-text reply so the user always gets an answer.
        let maxTokens = 300;
        const style = assistantSettings?.responseStyle ?? "balanced";
        if (style === "short") maxTokens = 100;
        else if (style === "detailed") maxTokens = 700;
        if (isSafetyEmergency) maxTokens = 1024;

        reply = await callGemini(sousPrompt, history, message, maxTokens);
      }
      const action = parseTimerRequest(message);

      return new Response(
        JSON.stringify({
          reply,
          intent: "COOKING_HELP",
          mode: "cooking",
          action,
          suggestions,
          recipes: [],
          generatedRecipes: [],
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
        "Hey! I'm ChefBoo. Tell me what's in your fridge or ask for a recipe and I'll get cooking!",
        "Hi there! Hungry? Share a few ingredients or a craving and I'll whip up some ideas.",
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

    // Determine token limit based on response style
    let maxTokens = 300;
    const style = assistantSettings?.responseStyle ?? "balanced";
    if (style === "short") maxTokens = 100;
    else if (style === "detailed") maxTokens = 700;

    const isSafetyEmergency = /\b(fire|burning|smoke|oil fire|cut|bleeding|gas|leak|jal\s*raha|jal\s*rhi|khoon|zakhmi|aag)\b/i.test(lowerMessage);
    if (isSafetyEmergency) {
      maxTokens = 1024; // safety override
    }

    const settingsBlock = buildSettingsPrompt(assistantSettings, isSafetyEmergency);

    const basePersona = `You are ChefBoo, FlavourFlow's friendly AI cooking assistant — a cute chef ghost who loves food.
User's name: ${userName}. Their favorites: ${favorites.join(", ") || "none yet"}. Recently cooked: ${completed.join(", ") || "none yet"}.${tasteLine}

ASSISTANT PREFERENCES:
${settingsBlock}

RESPONSE STYLE & CONSTRAINTS:
- Do NOT use emoji anywhere in your replies (they render badly in the app).
- Full ingredients + steps ONLY if the user explicitly asks for the recipe/steps/"how to make it".
- Use the user's name occasionally.
- Strictly follow the preferred language, response style (unless safety emergency is active), and personality instructions from the ASSISTANT PREFERENCES block.

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

      // "Browse" = vague ask like "what can I cook tonight?" — no real dish word
      // and no ingredients. These get personalized DB recommendations, NOT AI.
      const meaningful = keywords.filter((k: string) => !GENERIC_TERMS.has(k));
      const isBrowse = meaningful.length === 0 && ingredients.length === 0;

      if (ingredients.length > 0) {
        await logEvent("INGREDIENTS_SELECTED", { ingredients, source: provided.length > 0 ? "chips" : "text" });
      }
      const ingredientConstraint = buildIngredientConstraint(message, ingredients);

      if (isBrowse) {
        // Recommendation mode — personalized DB recommendations, no generation.
        // Canned reply (no Gemini) → fast.
        presentRows = await getRecommendations(supabase, userId, 6, excludeList);
        if (presentRows.length > 0) {
          mode = "present";
          reply = pick(isUrduScript(message) ? BROWSE_REPLIES_UR : BROWSE_REPLIES);
        } else {
          // DB truly empty → fall back to AI so the user still gets something.
          mode = "generate";
          ({ reply, generatedRecipes } = await generateAndStore(
            supabase, userId, basePersona, history, message,
            "Suggest a few crowd-pleasing recipes the user might enjoy.",
          ));
        }
      } else {
        // Specific query/ingredients → confidence-gated DB match (≥50).
        const cleanedQuery = keywords.join(" ").trim() || message;
        const { data: ranked, error: rpcError } = await supabase.rpc("search_recipes_ranked", {
          p_user_id: userId,
          p_query: cleanedQuery,
          p_ingredients: ingredients,
          p_limit: 6,
        });
        if (rpcError) console.error("search_recipes_ranked error:", rpcError);
        const rows = ranked ?? [];
        const candidates = rows.filter(
          (r: any) => (r.confidence ?? 0) >= CONF_OFFER && !excludeList.includes(String(r.recipe_id)),
        );
        const topConf = candidates.reduce((mx: number, r: any) => Math.max(mx, r.confidence ?? 0), 0);

        if (candidates.length > 0) {
          // Present DB matches with a canned reply (no Gemini) → fast.
          presentRows = candidates;
          mode = "present";
          const ur = isUrduScript(message);
          reply = pick(ur ? PRESENT_REPLIES_UR : PRESENT_REPLIES);
          // 50–79 band: decent but not perfect → offer to generate instead.
          if (topConf < CONF_PRESENT) {
            reply += ur
              ? "\n\nٹھیک نہیں؟ \"recipe banao\" کہیں اور میں نئی بنا دوں گا۔"
              : "\n\nNot quite right? Say \"create a recipe\" and I'll make one for you.";
          }
        } else {
          // No DB match for a specific request → generate fresh AI recipes.
          mode = "generate";
          ({ reply, generatedRecipes } = await generateAndStore(
            supabase, userId, basePersona, history, message,
            `No suitable database recipe fits this request, so create fresh ones.${ingredientConstraint}`,
          ));
        }
      }
    } else if (intent === "VARIETY") {
      // ── "Different / more / other" → fresh picks, EXCLUDING what was shown ─
      presentRows = await getRecommendations(supabase, userId, 6, excludeList);
      if (presentRows.length > 0) {
        mode = "present";
        reply = pick(isUrduScript(message) ? VARIETY_REPLIES_UR : VARIETY_REPLIES);
      } else {
        // Ran out of unseen DB recipes → generate fresh so "different" still delivers.
        mode = "generate";
        ({ reply, generatedRecipes } = await generateAndStore(
          supabase, userId, basePersona, history, message,
          "The user wants DIFFERENT ideas from what was already shown — invent fresh, varied recipes (vary cuisine/protein).",
        ));
        if (generatedRecipes.length === 0) reply = pick(NO_MORE_REPLIES);
      }
    } else if (intent === "AI_RECIPE_GENERATION") {
      // ── Explicit generation → structured JSON, stored ───────────────────
      mode = "generate";
      const genIngredients = Array.isArray(clientIngredients)
        ? clientIngredients.filter((s: any) => typeof s === "string" && s.trim())
        : [];
      const genConstraint = buildIngredientConstraint(message, genIngredients);
      ({ reply, generatedRecipes } = await generateAndStore(
        supabase, userId, basePersona, history, message,
        `The user explicitly wants you to create new recipes.${genConstraint}`,
      ));
    } else if (DIRECT_ANSWER_INTENTS.has(intent)) {
      // ── Cooking help / substitution / general — answer directly, no cards ─
      mode = "answer";
      const systemPrompt = `${basePersona}

The user is asking a ${intent === "SUBSTITUTION" ? "substitution" : intent === "COOKING_HELP" ? "cooking technique/help" : "general food"} question. Answer it directly and concisely. Do NOT recommend or list recipes unless they ask. No recipe cards.`;
      reply = await callGemini(systemPrompt, history, message, maxTokens);
    } else if (intent === "FOLLOW_UP") {
      // ── Conversational follow-up — rely on the chat history for context ────
      mode = "answer";
      const systemPrompt = `${basePersona}

The user is following up on the conversation above. Read the recent messages and respond to what they're referring to (e.g. "tell me more" = expand on the dish/recipes you JUST mentioned; "the first one" = the first item you listed). Stay concise and specific. Do not start a new unrelated topic.`;
      reply = await callGemini(systemPrompt, history, message, maxTokens);
    } else {
      reply = await callGemini(basePersona, history, message, maxTokens);
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
      ? "I'm getting a lot of requests right now — give me a few seconds and try again!"
      : "Oops, my kitchen had a hiccup. Mind trying that again in a moment?";
    return new Response(
      JSON.stringify({ reply, intent: "ERROR", mode: "error", recipes: [], generatedRecipes: [] }),
      { headers: CORS_HEADERS },
    );
  }
});
