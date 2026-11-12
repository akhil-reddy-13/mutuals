// Orchestrator loop (PRD §6.3, handoff fix 5): Spark agent A <-> Spark agent B for MAX_ROUNDS, then ONE Wonder
// referee call at the end. Streams turns via onTurn (for SSE).
//
// Privacy, structurally:
//   - Each agent's prompt is built ONLY from privacy.agentContext(ask.preferences). `never` prefs never enter.
//   - Money is compared in code (privacy.budgetsOverlap). The verdict strings are redacted
//     (privacy.redactPrivateValues) before they are stored, so no match_only number can reach a human.
//   - Every outgoing agent message is logged for its owner ("What my Muse shared").
import { getUser, logAgentMessage, newId, saveNegotiation } from "./db";
import { mockAgentTurn, mockReferee } from "./mocks";
import { museJSON } from "./muse";
import { agentPrompt, refereePrompt } from "./prompts";
import { agentContext, budgetsOverlap, formatPrefs, isShareable, redactPrivateValues } from "./privacy";
import { AgentTurnSchema, RefereeSchema } from "./schemas";
import type { Ask, Negotiation, NegotiationTurn, Verdict } from "./types";

export const MAX_ROUNDS = 2;
export const DEFAULT_TOPICS = ["rent", "move_in_date", "furniture_and_leftover_items", "quiet_hours", "guests", "pets_and_dealbreakers"];

export function describeAskContext(ask: Ask): string {
  const parts: string[] = [];
  if (ask.roomDetails) {
    const r = ask.roomDetails;
    parts.push(
      `Room (from the owner's video): ${r.furnished ? "furnished" : "unfurnished"}, ${r.approxSize} size, ${r.naturalLight} natural light, ${r.deskSpace ? "desk space" : "no desk space"}, ${r.closet ? "closet" : "no closet"}. ${r.notes.join(". ")}.`,
    );
  }
  if (ask.items?.length) {
    parts.push(`Leftover items available: ${ask.items.map((i) => `${i.name} (${i.condition}, ~$${i.suggestedPriceUsd})`).join(", ")}.`);
  }
  return parts.join("\n") || "(no room or items attached)";
}

function sealVerdict(raw: { compatible: boolean; score: number; fits: string[]; disagreements: string[]; compromise: string | null; summary_for_humans: string }, askA: Ask, askB: Ask): Verdict {
  const all = [...askA.preferences, ...askB.preferences];
  const red = (s: string) => redactPrivateValues(s, all);
  let fits = raw.fits.map(red);
  let disagreements = raw.disagreements.map(red);
  let compatible = raw.compatible;
  // Sealed comparison: code decides whether money overlaps, the model never sees the result as numbers.
  const overlap = budgetsOverlap(askA.preferences, askB.preferences);
  if (overlap === true && !fits.some((f) => /budget|rent|price/i.test(f))) fits = ["Budgets overlap", ...fits];
  if (overlap === false) {
    fits = fits.filter((f) => !/budget|rent|price/i.test(f));
    disagreements = ["Budgets don't overlap", ...disagreements.filter((d) => !/budget|rent|price/i.test(d))];
    compatible = false;
  }
  return {
    compatible,
    score: Math.max(0, Math.min(1, raw.score)),
    fits,
    disagreements,
    compromise: raw.compromise ? red(raw.compromise) : null,
    summaryForHumans: red(raw.summary_for_humans),
  };
}

export async function runNegotiation(
  askA: Ask,
  askB: Ask,
  onTurn?: (turn: NegotiationTurn) => void,
): Promise<{ negotiation: Negotiation; verdict: Verdict }> {
  const userA = getUser(askA.userId);
  const userB = getUser(askB.userId);
  if (!userA || !userB) throw new Error("unknown user");

  // The ONLY place preferences enter a prompt. `never` prefs are gone after this line.
  const ctx = { A: agentContext(askA.preferences), B: agentContext(askB.preferences) };
  const shareableIds = {
    A: new Set(askA.preferences.filter(isShareable).map((p) => p.id)),
    B: new Set(askB.preferences.filter(isShareable).map((p) => p.id)),
  };

  const negotiation: Negotiation = { id: newId("neg"), askAId: askA.id, askBId: askB.id, rounds: [], status: "running" };
  saveNegotiation(negotiation);

  const nameOf = (s: NegotiationTurn["speaker"]) => (s === "A" ? userA.name : s === "B" ? userB.name : "Referee");
  // The models negotiate over the raw transcript. Everything stored, logged or streamed is redacted against the
  // OTHER side's non-public values (and the owner's own `never` values), so an agent echoing "fine at $1,300"
  // can't put the counterpart's private number in front of a human.
  const rawTurns: NegotiationTurn[] = [];
  const transcript = () => rawTurns.map((t) => `${nameOf(t.speaker)}'s Muse: ${t.message}`).join("\n");
  const otherPrivate = {
    A: askB.preferences.filter((p) => p.visibility !== "public"),
    B: askA.preferences.filter((p) => p.visibility !== "public"),
  };

  const satisfied = { A: false, B: false };
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    for (const side of ["A", "B"] as const) {
      const owner = side === "A" ? userA : userB;
      const other = side === "A" ? userB : userA;
      const ask = side === "A" ? askA : askB;
      const p = agentPrompt({
        ownerName: owner.name,
        otherName: other.name,
        askSummary: askA.summary,
        publicPrefs: formatPrefs(ctx[side].public),
        matchOnlyPrefs: formatPrefs(ctx[side].matchOnly),
        context: describeAskContext(ask),
        topics: DEFAULT_TOPICS,
        transcript: transcript(),
        round,
        maxRounds: MAX_ROUNDS,
      });
      const out = await museJSON({
        model: "spark",
        system: p.system,
        user: p.user,
        schema: AgentTurnSchema,
        mock: mockAgentTurn(owner.id, other.id, side, round, userA.id),
      });
      // Defense in depth: an agent can only "disclose" ids it was actually given, and a `never` value can never
      // be echoed (it was not in the context, but strip it anyway).
      const ownNever = ask.preferences.filter((x) => x.visibility === "never");
      const rawTurn: NegotiationTurn = {
        speaker: side,
        message: redactPrivateValues(out.message, ownNever),
        disclosed: out.disclosed.filter((id) => shareableIds[side].has(id)),
        positions: out.positions,
      };
      rawTurns.push(rawTurn);
      const shield = [...ownNever, ...otherPrivate[side]];
      const turn: NegotiationTurn = {
        ...rawTurn,
        message: redactPrivateValues(rawTurn.message, shield),
        positions: Object.fromEntries(Object.entries(rawTurn.positions).map(([k, v]) => [k, redactPrivateValues(v, shield)])),
      };
      satisfied[side] = out.satisfied;
      negotiation.rounds.push(turn);
      saveNegotiation(negotiation);
      logAgentMessage({
        id: newId("log"),
        userId: owner.id,
        negotiationId: negotiation.id,
        counterpartId: other.id,
        message: turn.message,
        disclosed: turn.disclosed,
        at: new Date().toISOString(),
      });
      onTurn?.(turn);
    }
    if (satisfied.A && satisfied.B) break;
  }

  // One referee call, at the end (Wonder).
  const rp = refereePrompt({ aName: userA.name, bName: userB.name, transcript: transcript() });
  const raw = await museJSON({ model: "wonder", system: rp.system, user: rp.user, schema: RefereeSchema, mock: mockReferee(userA.id, userB.id) });
  const verdict = sealVerdict(raw, askA, askB);

  const refereeTurn: NegotiationTurn = { speaker: "orchestrator", message: verdict.summaryForHumans, disclosed: [], positions: {} };
  negotiation.rounds.push(refereeTurn);
  negotiation.verdict = verdict;
  negotiation.status = "done";
  saveNegotiation(negotiation);
  onTurn?.(refereeTurn);
  return { negotiation, verdict };
}
