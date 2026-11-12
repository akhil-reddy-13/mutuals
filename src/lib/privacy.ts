// Privacy is STRUCTURAL (PRD §3.2, §19.4, handoff fixes 1 and 2):
//   1. `never` prefs and unconfirmed inferred prefs are removed here, before any agent prompt is built.
//      Every prompt that includes a user's preferences MUST go through agentContext().
//   2. Private numbers (rent floors, budget ceilings, times) are compared in code, and every string that
//      reaches a human is scanned with redactPrivateValues() so a match_only value cannot be printed.
// Tested in privacy.test.ts.
import type { Preference } from "./types";

export interface AgentPrefContext {
  public: Preference[];
  matchOnly: Preference[];
}

/** Can this preference ever leave the owner's side? */
export function isShareable(p: Preference): boolean {
  if (p.visibility === "never") return false;
  if (p.source === "inferred" && !p.confirmed) return false;
  return true;
}

export function agentContext(prefs: Preference[]): AgentPrefContext {
  const shareable = prefs.filter(isShareable);
  return {
    public: shareable.filter((p) => p.visibility === "public"),
    matchOnly: shareable.filter((p) => p.visibility === "match_only"),
  };
}

/** Only what may be shown to the OTHER human (match cards, profile). */
export function publicOnly(prefs: Preference[]): Preference[] {
  return prefs.filter((p) => isShareable(p) && p.visibility === "public");
}

/** Compact line format for prompts: "[id] topic: value (importance)". */
export function formatPrefs(prefs: Preference[]): string {
  if (prefs.length === 0) return "(none)";
  return prefs.map((p) => `[${p.id}] ${p.topic}: ${p.value} (${p.importance})`).join("\n");
}

// ---------- sealed comparisons (code, not the model) ----------

const MONEY = /\$\s?\d[\d,]*(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+\b|\b\d{3,5}\b/g;
const TIME = /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/gi;

export function dollarAmounts(text: string): number[] {
  return (text.match(MONEY) ?? []).map((m) => Number(m.replace(/[^\d.]/g, ""))).filter((n) => !Number.isNaN(n));
}

/** Rent/budget range implied by a set of preferences: [min, max] of every dollar amount on money topics. */
export function moneyRange(prefs: Preference[]): [number, number] | null {
  const nums = prefs
    .filter((p) => /rent|budget|price|money/i.test(p.topic))
    .flatMap((p) => dollarAmounts(p.value));
  if (nums.length === 0) return null;
  return [Math.min(...nums), Math.max(...nums)];
}

/**
 * Do the two sides' money ranges overlap? Computed in code from both sides' full (public + match_only)
 * preferences. The result is a boolean; the numbers never leave this function.
 */
export function budgetsOverlap(a: Preference[], b: Preference[]): boolean | null {
  const ra = moneyRange(a.filter(isShareable));
  const rb = moneyRange(b.filter(isShareable));
  if (!ra || !rb) return null;
  return ra[0] <= rb[1] && rb[0] <= ra[1];
}

/** Every number and clock time that appears in a non-public preference value. */
export function privateTokens(prefs: Preference[]): string[] {
  return privateTokenList(prefs).map((t) => t.token);
}
function privateTokenList(prefs: Preference[]): { token: string; kind: "money" | "time" }[] {
  const out = new Map<string, "money" | "time">();
  for (const p of prefs) {
    if (p.visibility === "public") continue;
    for (const m of p.value.match(TIME) ?? []) out.set(m.trim(), "time");
    for (const m of p.value.match(MONEY) ?? []) if (!out.has(m.trim())) out.set(m.trim(), "money");
  }
  return [...out].map(([token, kind]) => ({ token, kind })).sort((x, y) => y.token.length - x.token.length);
}

/**
 * A regex that matches every common way a model might rewrite a private token:
 *   "$1,300" → $1,300 · 1300 · $1300 · 1,300 · $1.3k · 1.3k · 1,300/mo
 *   "11pm"   → 11pm · 11 pm · 11:00pm · 11 p.m. · 11PM
 */
function tokenPattern(token: string, kind: "money" | "time"): RegExp {
  if (kind === "time") {
    const m = token.match(/(\d{1,2})(?::(\d{2}))?\s?(am|pm)/i)!;
    const h = m[1];
    const ap = m[3][0].toLowerCase();
    return new RegExp(`(?<![\\d:])${h}(?::\\d{2})?\\s?${ap}\\.?m\\.?(?![a-z])`, "gi");
  }
  const digits = token.replace(/[^\d.]/g, "");
  const n = Number(digits);
  const intPart = String(Math.trunc(n));
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",?");
  const alts = [`${grouped}(?:\\.\\d+)?`];
  if (n >= 1000 && n % 100 === 0) alts.push(`${(n / 1000).toString().replace(".", "\\.")}\\s?k`);
  return new RegExp(`(?<![\\d$.])(?:\\$\\s?)?(?:${alts.join("|")})(?![\\d])(?:\\s?\\/\\s?mo(?:nth)?)?`, "gi");
}

/** Returns the private values that appear (in any common spelling) in `text` (for tests and logging). */
export function leaks(text: string, prefs: Preference[]): string[] {
  return privateTokenList(prefs)
    .filter(({ token, kind }) => tokenPattern(token, kind).test(text))
    .map((t) => t.token);
}

/**
 * Replace any private number or time from EITHER side's prefs with a neutral phrase before a string is shown
 * to a human. Also strips `never` values entirely (defense in depth: they should never be in the text at all).
 */
export function redactPrivateValues(text: string, prefs: Preference[]): string {
  let out = text;
  for (const p of prefs) {
    if (p.visibility === "never" && p.value.length > 3) out = out.split(p.value).join("[private]");
  }
  for (const { token, kind } of privateTokenList(prefs)) {
    out = out.replace(tokenPattern(token, kind), kind === "time" ? "a private time" : "a private number");
  }
  return out.replace(/[ \t]{2,}/g, " ");
}
