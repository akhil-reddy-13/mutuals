// Privacy is STRUCTURAL (PRD §3.2, §19.4): `never` prefs and unconfirmed inferred prefs are removed
// here, before any agent prompt is built. Every prompt that includes a user's preferences MUST go through
// agentContext(). Tested in privacy.test.ts.
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
