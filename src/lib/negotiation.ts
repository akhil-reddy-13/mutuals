// Orchestrator loop (PRD §6.3). OWNER: agent engine.
// Wonder referee <-> Spark agent A <-> Spark agent B, max 4 rounds, streams turns via onTurn (for SSE).
//
// Contract:
//   - Build each agent's prompt ONLY from privacy.agentContext(ask.preferences)  <-- never pass raw prefs
//   - After each agent turn: db.logAgentMessage(...) for that agent's owner ("what my agent shared")
//   - Referee (Wonder) after each round: continue | conclude. Force conclude on the last round.
//   - Persist with db.saveNegotiation(); return the final Verdict.
import type { Ask, Negotiation, NegotiationTurn, Verdict } from "./types";

export const MAX_ROUNDS = 4;
export const DEFAULT_TOPICS = ["budget", "move_in", "sleep_schedule", "guests", "cleanliness", "dealbreakers"];

export async function runNegotiation(
  askA: Ask,
  askB: Ask,
  onTurn?: (turn: NegotiationTurn) => void,
): Promise<{ negotiation: Negotiation; verdict: Verdict }> {
  void askA; void askB; void onTurn;
  throw new Error("TODO: implement runNegotiation (see docs/PRD.md §6.3, prompts.agentPrompt/refereePrompt)");
}
