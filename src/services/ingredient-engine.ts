import Fuse from "fuse.js";
import { recipeService } from "@/services/recipe.service";
import type { Ingredient } from "@/types";

export interface DetectedIngredient {
  name: string;
  icon_url: string | null;
}

// Filler words stripped before matching (English-only by design — non-English
// terms are handled by Gemini at send time, per the plan).
const FILLER = new Set([
  "i", "have", "ve", "got", "with", "and", "a", "an", "the", "some", "also",
  "my", "in", "fridge", "kitchen", "what", "can", "cook", "cooking", "make",
  "made", "using", "use", "of", "to", "for", "is", "are", "there", "do",
  "you", "please", "need", "want", "today", "tonight", "dinner", "lunch",
  "breakfast", "recipe", "recipes", "only", "these", "just", "left", "over",
  "leftover", "leftovers", "me", "we", "us", "it", "that", "this",
]);

let cache: Ingredient[] | null = null;
let fuse: Fuse<Ingredient> | null = null;
let loadingPromise: Promise<void> | null = null;

// Fast exact-name lookup (case-insensitive) so typed ingredient names always win.
let exactByName: Map<string, Ingredient> | null = null;

async function ensureLoaded(): Promise<void> {
  if (cache && fuse) return;
  if (!loadingPromise) {
    loadingPromise = recipeService.getIngredients().then((rows) => {
      cache = rows as Ingredient[];
      exactByName = new Map();
      for (const ing of cache) {
        if (ing.name) exactByName.set(ing.name.toLowerCase(), ing);

      }
      fuse = new Fuse(cache, {
        // Tight threshold → only near-exact (~90%+) matches are even considered.
        keys: ["name"],
        threshold: 0.2,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 3,
      });
    });
  }
  await loadingPromise;
}

/** Warm the ingredient cache (call once when the chat screen mounts). */
export function preloadIngredients(): void {
  void ensureLoaded();
}

/**
 * Detect canonical ingredients from free text — fully local (no Gemini).
 * Cleans filler, then a 3→2→1 sliding window fuzzy-matches against the
 * ingredients master list (so "olive oil", "soy sauce" win before "olive").
 */
export async function detectIngredients(text: string): Promise<DetectedIngredient[]> {
  await ensureLoaded();
  if (!fuse || !text) return [];

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    // Require ≥3 chars so stray 1–2 letter tokens can't fuzzy-match.
    .filter((w) => w.length >= 3 && !FILLER.has(w));

  const found = new Map<string, DetectedIngredient>();
  let i = 0;
  while (i < words.length) {
    let matched = false;
    for (let win = Math.min(3, words.length - i); win >= 1; win--) {
      const span = words.slice(i, i + win).join(" ");

      // 1) Exact name match → accept instantly (handles all clean typed names).
      const exact = exactByName?.get(span);
      if (exact) {
        found.set(exact.name, { name: exact.name, icon_url: exact.icon_url ?? null });
        i += win;
        matched = true;
        break;
      }

      // 2) Fuzzy fallback — only HIGH-confidence matches (~90%+). Multi-word
      //    spans get a touch more slack; single words must be very close.
      const res = fuse.search(span);
      const limit = win >= 2 ? 0.12 : 0.08;
      if (res.length > 0 && (res[0].score ?? 1) <= limit) {
        const ing = res[0].item;
        found.set(ing.name, { name: ing.name, icon_url: ing.icon_url ?? null });
        i += win;
        matched = true;
        break;
      }
    }
    if (!matched) i += 1;
  }

  return Array.from(found.values()).slice(0, 12);
}
