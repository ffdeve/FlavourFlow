import type { RecipeStep } from "@/types";

// ─── Step action categories ──────────────────────────────────────────────────
// Single source of truth shared by the recipe wizard, detail screen, and cooking
// mode so action-aware behaviour stays consistent everywhere.

/** Full ordered action list shown in the step action picker. */
export const STEP_ACTIONS = [
  "Mix",
  "Chop",
  "Preheat",
  "Marinate",
  "Rest",
  "Bake",
  "Air Fry",
  "Roast",
  "Fry",
  "Sauté",
  "Simmer",
  "Boil",
  "Cook",
  "Chill / Refrigerate",
  "Garnish",
  "Serve",
  "Other",
];

/** Temperature-driven actions: show a numeric temperature + C/F unit toggle. */
export const TEMP_ACTIONS = ["Preheat", "Bake", "Air Fry", "Roast"];
/** Stovetop heat-level actions: show the Low/Medium/Medium-High/High selector. */
export const HEAT_ACTIONS = ["Fry", "Sauté", "Simmer", "Boil", "Cook"];
/** Passive time actions (resting/chilling): timer/overnight, no heat or temp. */
export const REST_ACTIONS = ["Marinate", "Rest", "Chill / Refrigerate"];
/** Strict heat-level enum. */
export const HEAT_LEVELS = ["Low", "Medium", "Medium-High", "High"] as const;

/** Actions whose timer duration counts as active *cook* time. */
export const COOK_TIME_ACTIONS = [...TEMP_ACTIONS, ...HEAT_ACTIONS].filter(
  (a) => a !== "Preheat",
);

export const isTempAction = (a?: string | null) =>
  !!a && TEMP_ACTIONS.includes(a);
export const isHeatAction = (a?: string | null) =>
  !!a && HEAT_ACTIONS.includes(a);
export const isRestAction = (a?: string | null) =>
  !!a && REST_ACTIONS.includes(a);

// ─── Durations & time breakdown ──────────────────────────────────────────────

/** Minutes encoded in a step's countdown timer (hours + minutes). 0 if none. */
export function stepDurationMinutes(step: RecipeStep): number {
  if (!step?.hasTimer) return 0;
  const h = parseInt(String(step.timerHours ?? ""), 10);
  const m = parseInt(String(step.timerMinutes ?? ""), 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export interface TimeBreakdown {
  prep: number; // minutes
  cook: number; // minutes
  wait: number; // minutes
  total: number; // minutes
}

/**
 * Prep is the raw chef-entered prep time. Cook is the sum of timer durations on
 * active cooking actions; Wait is the sum on resting/chilling actions. Total is
 * the sum of all three.
 */
export function computeTimeBreakdown(
  steps: RecipeStep[] | undefined | null,
  prepMinutes: number,
): TimeBreakdown {
  let cook = 0;
  let wait = 0;
  (steps || []).forEach((s) => {
    const mins = stepDurationMinutes(s);
    if (mins <= 0) return;
    const action = s.action ?? "";
    if (COOK_TIME_ACTIONS.includes(action)) cook += mins;
    else if (REST_ACTIONS.includes(action)) wait += mins;
  });
  const prep = Math.max(0, prepMinutes || 0);
  return { prep, cook, wait, total: prep + cook + wait };
}

/** "8 hr 55 min" / "35 min" / "2 hr" — compact human duration. */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m === 0) return "0 min";
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h === 0) return `${mins} min`;
  if (mins === 0) return `${h} hr`;
  return `${h} hr ${mins} min`;
}

// ─── Quantity scaling ────────────────────────────────────────────────────────

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

/** Parse a leading numeric token (whole, decimal, fraction, or mixed) → number. */
function parseLeadingNumber(token: string): number | null {
  const t = token.trim();
  if (!t) return null;
  // Unicode fraction (optionally with a leading whole number, e.g. "1½")
  const uniMatch = t.match(/^(\d+)?\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅛⅜⅝⅞])/);
  if (uniMatch) {
    const whole = uniMatch[1] ? parseInt(uniMatch[1], 10) : 0;
    return whole + (UNICODE_FRACTIONS[uniMatch[2]] ?? 0);
  }
  // Mixed number "1 1/2"
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (mixed) {
    return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  }
  // Simple fraction "1/2"
  const frac = t.match(/^(\d+)\/(\d+)/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  // Decimal / whole "1.5" or "200"
  const dec = t.match(/^\d*\.?\d+/);
  if (dec) return parseFloat(dec[0]);
  return null;
}

/** Trim float noise → at most 2 decimals, no trailing zeros. */
function prettyNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/**
 * Scale the numeric portion(s) of a quantity string by `factor`, preserving the
 * trailing unit/text. Handles ranges ("2-3 cups" → both ends) and a single
 * leading number ("200g"). If no number is found, returns the input unchanged.
 */
export function scaleQuantity(quantity: string, factor: number): string {
  if (!quantity || factor === 1 || !isFinite(factor)) return quantity || "";
  const str = String(quantity).trim();

  // Range like "2-3" or "2 - 3"
  const range = str.match(/^(\d*\.?\d+)\s*[-–]\s*(\d*\.?\d+)(.*)$/);
  if (range) {
    const lo = prettyNumber(parseFloat(range[1]) * factor);
    const hi = prettyNumber(parseFloat(range[2]) * factor);
    return `${lo}-${hi}${range[3]}`;
  }

  const num = parseLeadingNumber(str);
  if (num == null) return str;

  // Strip the matched numeric prefix to keep the unit/remainder.
  const rest = str.replace(/^(\d+)?\s*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅛⅜⅝⅞]|^\d+\s+\d+\/\d+|^\d+\/\d+|^\d*\.?\d+/, "").trim();
  const scaled = prettyNumber(num * factor);
  return rest ? `${scaled} ${rest}` : scaled;
}
