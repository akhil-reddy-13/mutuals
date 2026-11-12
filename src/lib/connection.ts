// Connection judgment (PRD §6.5): ONE Wonder call per compatible match, only when both people opted in.
// Threshold: suggest && confidence >= 0.7. Most matches should come back `suggest: false`.
import { allEvents } from "./db";
import { mockConnection } from "./mocks";
import { museJSON } from "./muse";
import { connectionPrompt } from "./prompts";
import { ConnectionSchema } from "./schemas";
import type { Ask, ConnectionSuggestion, User, Verdict } from "./types";

export const CONNECTION_THRESHOLD = 0.7;

export async function judgeConnection(a: User, b: User, ask: Ask, verdict: Verdict): Promise<ConnectionSuggestion | null> {
  if (!a.connectionSuggestionsOptIn || !b.connectionSuggestionsOptIn) return null;
  if (!verdict.compatible) return null;
  const shared = (u: User) => u.interests.filter((i) => i.shareForConnection).map((i) => i.value).join(", ") || "(nothing shared)";
  const events = allEvents()
    .filter((e) => e.open && (e.city === a.city || e.city === b.city))
    .map((e) => `${e.id}: ${e.name} (${e.when}, ${e.goingIds.length} going)`)
    .join("\n");
  const p = connectionPrompt({
    askSummary: ask.summary,
    aName: a.name,
    bName: b.name,
    aInterests: shared(a),
    bInterests: shared(b),
    verdict: verdict.summaryForHumans,
    events,
  });
  const out = await museJSON({ model: "wonder", system: p.system, user: p.user, schema: ConnectionSchema, mock: mockConnection(a.id, b.id) });
  const knownEvent = out.event_id && allEvents().some((e) => e.id === out.event_id) ? out.event_id : null;
  return {
    suggest: out.suggest && out.confidence >= CONNECTION_THRESHOLD,
    confidence: out.confidence,
    reason: out.reason,
    activity: out.activity,
    eventId: knownEvent,
  };
}
