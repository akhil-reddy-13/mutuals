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

/**
 * Money range implied by a side's preferences, reading the words around the numbers:
 *   "up to $70", "can stretch to $1,300", "max"            → ceiling: [0, n]
 *   "would go down to $1,200", "at least", "floor"          → floor:   [n, ∞)
 *   "$1,350/mo", "$1,250 to $1,350", "$62, would take $50"  → [min, max] of the numbers
 * The side's range is the loosest combination (lowest low, highest high).
 */
export function moneyRange(prefs: Preference[]): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  let any = false;
  for (const p of prefs) {
    if (!/rent|budget|price|money|cost/i.test(p.topic)) continue;
    const nums = dollarAmounts(p.value);
    if (nums.length === 0) continue;
    any = true;
    const v = p.value.toLowerCase();
    if (/up to|max|no more than|under|ceiling|stretch to|at most|cap/.test(v)) {
      lo = Math.min(lo, 0);
      hi = Math.max(hi, Math.max(...nums));
    } else if (/down to|at least|minimum|floor|no less than|or more/.test(v)) {
      lo = Math.min(lo, Math.min(...nums));
      hi = Math.max(hi, Infinity);
    } else {
      lo = Math.min(lo, Math.min(...nums));
      hi = Math.max(hi, Math.max(...nums));
    }
  }
  return any ? [lo, hi] : null;
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
    // "11pm", "11 p.m.", "11:00pm" anywhere; bare "11" / "11:00" only right after a time word ("up at 7",
    // "quiet after 11"), so unrelated numbers like "11 months" or "CS 161" survive.
    const withSuffix = `(?<![\\d:])${h}(?::\\d{2})?\\s?${ap}\\.?m\\.?(?![a-z])`;
    const bare = `(?<=\\b(?:at|after|before|until|till|til|by|past|around|from)\\s)${h}(?::\\d{2})?(?![\\d:%/-])(?!\\s?(?:months?|weeks?|days?|years?|people|minutes?|min|hours?|hrs?)\\b)`;
    return new RegExp(`${withSuffix}|${bare}`, "gi");
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

/**
 * An ask's one-line summary as OTHER people may see it. The model writes the summary in the owner's words and can
 * slip a kept-private number into it ("budget around $1200"), so anywhere a summary is shown to someone other than
 * its owner (home card, Muse conversation page, candidate's shortlist, digest), its own private values are redacted.
 */
export function publicSummary(ask: { summary: string; preferences: Preference[] }): string {
  return redactPrivateValues(ask.summary, ask.preferences.filter((p) => p.visibility !== "public"));
}

// ---------- private phrases (qualitative match_only facts) ----------
// Numbers and times are caught above. This catches the words of a private fact ("night owl", "partner stays over
// some weekends", "doesn't drink") echoed into a string BOTH people see (the match card, a drafted opener). The
// prompts already say "describe the topic, never the fact"; this is the code-level check behind them.

const STOP = new Set(
  ("a an the to of for and or but on in at by with from up down over out off about into than then so as is are was were be been " +
    "am i im me my mine we us our you your they them their he she his her it its this that these those some any usually just " +
    "really pretty very also can could would will should may might have has had do does did get gets got go going want wants " +
    "like likes person people right fine ok okay sometimes often most more less all both each other others only until till " +
    "after before when while if there here what which who how much many per lot bit kind")
    .split(" "),
);
const NEGATION = /^(no|not|never|cannot|cant|dont|doesnt|didnt|wont|isnt|arent|aint|nope)$/;

function stem(raw: string): string | null {
  const w = raw.replace(/'/g, "");
  if (!w || /\d/.test(w)) return null; // numbers and times have their own redaction
  if (NEGATION.test(w)) return "not";
  if (STOP.has(w)) return null;
  let s = w;
  if (s.length > 4 && s.endsWith("ies")) s = `${s.slice(0, -3)}y`;
  else if (s.length > 5 && s.endsWith("ing")) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith("ed")) s = s.slice(0, -2);
  else if (s.length > 4 && /(s|x|ch|sh)es$/.test(s)) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
  if (s.length > 3 && s.endsWith("e")) s = s.slice(0, -1); // "drive" / "driving" -> "driv"
  return s;
}

function stems(text: string): string[] {
  const words = text.toLowerCase().replace(/[’‘]/g, "'").replace(/'s\b/g, "").match(/[a-z0-9']+/g) ?? [];
  return words.map(stem).filter((s): s is string => !!s);
}

/**
 * Non-public prefs whose wording shows up in `text`. Each value is split into clauses; a clause with n >= 2
 * content words counts as leaked when at least max(2, ceil(2n/3)) of them appear. One-word clauses are skipped
 * (too many false positives), and negations count as content ("doesn't drink" vs "drinks").
 */
export function leakedPrivateFacts(text: string, prefs: Preference[]): Preference[] {
  const seen = new Set(stems(text));
  return prefs.filter((p) => {
    if (p.visibility === "public") return false;
    return p.value.split(/[,;.!?()]|\band\b|\bbut\b/i).some((clause) => {
      const words = [...new Set(stems(clause))];
      if (words.length < 2) return false;
      const need = Math.max(2, Math.ceil((2 * words.length) / 3));
      return words.filter((w) => seen.has(w)).length >= need;
    });
  });
}

// ---------- move-in timing (code, not the model) ----------
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** Month (0-11) a side says they start, from a move-in/start/date preference ("first two weeks of June", "Sept 1"). */
export function moveInMonth(prefs: Preference[]): number | null {
  for (const p of prefs) {
    if (!/move|start|date|timing|when/i.test(p.topic)) continue;
    const m = p.value.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\b/);
    if (m) return MONTHS.indexOf(m[1]);
  }
  return null;
}
/** Months between two sides' move-in dates (null if either didn't say). */
export function moveInGapMonths(a: Preference[], b: Preference[]): number | null {
  const ma = moveInMonth(a.filter(isShareable));
  const mb = moveInMonth(b.filter(isShareable));
  if (ma === null || mb === null) return null;
  const d = Math.abs(ma - mb);
  return Math.min(d, 12 - d);
}
