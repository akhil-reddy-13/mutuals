// Matching for one ask (PRD §6, handoff fix 5): every candidate runs in PARALLEL.
//   candidateAsks  -> agent-to-agent negotiation (Spark x2 + one Wonder referee) -> Match
//   candidatePosts -> one-sided: Ember scores the human post, Spark drafts a reply -> Match
// Then one Wonder connection call per compatible match (both opted in). Events stream to the chat sheet.
import { judgeConnection } from "./connection";
import { getAsk, getEvent, getUser, newId, saveAsk, saveMatch } from "./db";
import { mockPostEval, mockReplyDraft } from "./mocks";
import { museJSON, museText, modelFor } from "./muse";
import { runNegotiation } from "./negotiation";
import { agentContext, formatPrefs, redactPrivateValues } from "./privacy";
import { REACH_LABEL, candidateAsks, candidatePosts, reachCounts, reachOf, trustSignals } from "./reach";
import { PostEvalSchema } from "./schemas";
import { postEvalPrompt, replyDraftPrompt } from "./prompts";
import type { Ask, ConnectionSuggestion, Match, MuseReach, NegotiationTurn, Verdict } from "./types";

export type MatchEvent =
  | { type: "start"; askId: string; candidates: { id: string; name: string; avatarUrl: string; mode: Match["mode"]; postId?: string }[] }
  | { type: "turn"; candidateId: string; turn: NegotiationTurn; disclosedMeta: { id: string; topic: string; visibility: string }[] }
  | { type: "verdict"; candidateId: string; match: Match }
  | { type: "connection"; candidateId: string; matchId: string; connection: ConnectionSuggestion | null; event: { id: string; name: string; when: string; where: string; going: number; coverEmoji: string } | null }
  | { type: "done"; askId: string; matches: Match[]; broaden?: { reach: MuseReach; label: string; people: number } | null }
  | { type: "error"; message: string };

/** Nobody in the reach I picked: the next wider reach that has people (network -> groups -> everyone), if any. */
export function broaderFor(ask: Ask): { reach: MuseReach; label: string; people: number } | null {
  const order: MuseReach[] = ["network", "groups", "everyone"];
  const counts = reachCounts(ask);
  for (const r of order.slice(order.indexOf(reachOf(ask)) + 1)) {
    if (counts[r] > 0) return { reach: r, label: REACH_LABEL[r], people: counts[r] };
  }
  return null;
}

export function sortMatches(ms: Match[]): Match[] {
  return [...ms].sort((a, b) => Number(b.verdict.compatible) - Number(a.verdict.compatible) || b.verdict.score - a.verdict.score);
}

export async function runMatching(askInput: Ask, emitRaw: (e: MatchEvent) => void = () => {}): Promise<Match[]> {
  // A broken stream must never abort matching.
  const emit = (e: MatchEvent) => {
    try {
      emitRaw(e);
    } catch {}
  };
  const ask = getAsk(askInput.id) ?? askInput;
  const me = getUser(ask.userId);
  if (!me) throw new Error("unknown user");
  saveAsk({ ...ask, status: "matching" });
  // Selling: route each item to a person who needs it ("3 of these already have a home"), not a negotiation.
  if (ask.type === "item" && ask.side !== "seeking" && (ask.items?.length ?? 0) > 0) {
    const { runHomes } = await import("./homes");
    return runHomes(ask, emit);
  }

  const agentCands = candidateAsks(ask);
  const posts = candidatePosts(ask);
  // Nobody to check with here: don't run anything, point to the Group where people could actually fit.
  if (agentCands.length === 0 && posts.filter((p) => p.groupId === ask.groupId).length === 0) {
    emit({ type: "start", askId: ask.id, candidates: [] });
    saveAsk({ ...ask, status: "matched" });
    emit({ type: "done", askId: ask.id, matches: [], broaden: broaderFor(ask) });
    return [];
  }
  emit({
    type: "start",
    askId: ask.id,
    candidates: [
      ...agentCands.map(({ user }) => ({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, mode: "agent_to_agent" as const })),
      ...posts.map((p) => {
        const u = getUser(p.authorId)!;
        return { id: u.id, name: u.name, avatarUrl: u.avatarUrl, mode: "one_sided" as const, postId: p.id };
      }),
    ],
  });

  const matches: Match[] = [];

  const agentJobs = agentCands.map(async ({ ask: other, user }) => {
    const { negotiation, verdict } = await runNegotiation(ask, other, (turn) => {
      // What streams to the asker's screen: their own Muse's words in full, the other Muse's words with that
      // person's private numbers redacted, plus topic-level metadata for the "disclosed" chips.
      const src = turn.speaker === "A" ? ask : other;
      emit({
        type: "turn",
        candidateId: user.id,
        turn:
          turn.speaker === "B"
            ? {
                ...turn,
                message: redactPrivateValues(turn.message, other.preferences),
                positions: Object.fromEntries(Object.entries(turn.positions).map(([k, v]) => [k, redactPrivateValues(v, other.preferences)])),
              }
            : turn,
        disclosedMeta: turn.disclosed
          .map((id) => src.preferences.find((p) => p.id === id))
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => ({ id: p.id, topic: p.topic, visibility: p.visibility })),
      });
    });
    const match: Match = {
      id: newId("match"),
      userId: me.id,
      candidateId: user.id,
      askId: ask.id,
      mode: "agent_to_agent",
      verdict,
      trustSignals: trustSignals(me, user),
      negotiationId: negotiation.id,
      createdAt: new Date().toISOString(),
    };
    saveMatch(match);
    matches.push(match);
    emit({ type: "verdict", candidateId: user.id, match });
    const connection = await judgeConnection(me, user, ask, verdict);
    match.connection = connection;
    saveMatch(match);
    const ev = connection?.eventId ? getEvent(connection.eventId) : undefined;
    emit({
      type: "connection",
      candidateId: user.id,
      matchId: match.id,
      connection,
      event: ev ? { id: ev.id, name: ev.name, when: ev.when, where: ev.where, going: ev.goingIds.length, coverEmoji: ev.coverEmoji } : null,
    });
  });

  const postJobs = posts.map(async (post) => {
    const author = getUser(post.authorId)!;
    emit({
      type: "turn",
      candidateId: author.id,
      turn: { speaker: "orchestrator", message: `${author.name.split(" ")[0]} doesn't have Muse on. Reading their post in the group instead.`, disclosed: [], positions: {} },
      disclosedMeta: [],
    });
    const ctx = agentContext(ask.preferences); // never prefs stripped here
    const ep = postEvalPrompt({
      askSummary: ask.summary,
      prefs: formatPrefs([...ctx.public, ...ctx.matchOnly]),
      postText: post.text,
      authorName: author.name,
    });
    const ev = await museJSON({ model: modelFor("posteval"), effort: "low", system: ep.system, user: ep.user, schema: PostEvalSchema, mock: mockPostEval(post.id, me.id) });
    const red = (s: string) => redactPrivateValues(s, ask.preferences);
    const verdict: Verdict = {
      compatible: ev.fit,
      score: ev.score,
      fits: ev.reasons.map(red),
      disagreements: ev.concerns.map(red),
      compromise: null,
      summaryForHumans: ev.fit
        ? `${author.name.split(" ")[0]} posted in the Group and looks like a fit. They don't have Muse on, so here's a reply you can send.`
        : `${author.name.split(" ")[0]}'s post doesn't fit.`,
    };
    let draftReply: string | undefined;
    if (ev.fit) {
      const rp = replyDraftPrompt({
        sender: me.name,
        recipient: author.name,
        askSummary: ask.summary,
        postText: post.text,
        reasons: ev.reasons.join("; "),
      });
      draftReply = red(await museText({ model: modelFor("opener"), system: rp.system, user: rp.user, mock: mockReplyDraft(author.name.split(" ")[0], post.id) }));
    }
    const match: Match = {
      id: newId("match"),
      userId: me.id,
      candidateId: author.id,
      askId: ask.id,
      mode: "one_sided",
      verdict,
      trustSignals: trustSignals(me, author),
      sourcePostId: post.id,
      draftReply,
      createdAt: new Date().toISOString(),
    };
    saveMatch(match);
    matches.push(match);
    emit({ type: "verdict", candidateId: author.id, match });
  });

  await Promise.all([...agentJobs, ...postJobs]);
  saveAsk({ ...(getAsk(ask.id) ?? ask), status: "matched" });
  const sorted = sortMatches(matches);
  emit({ type: "done", askId: ask.id, matches: sorted });
  return sorted;
}
