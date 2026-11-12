// Matching for one ask (PRD §6, handoff fix 5): every candidate runs in PARALLEL.
//   candidateAsks  -> agent-to-agent negotiation (Spark x2 + one Wonder referee) -> Match
//   candidatePosts -> one-sided: Ember scores the human post, Spark drafts a reply -> Match
// Then one Wonder connection call per compatible match (both opted in). Events stream to the chat sheet.
import { judgeConnection } from "./connection";
import { getAsk, getUser, newId, saveAsk, saveMatch } from "./db";
import { mockPostEval, mockReplyDraft } from "./mocks";
import { museJSON, museText } from "./muse";
import { runNegotiation } from "./negotiation";
import { agentContext, formatPrefs, redactPrivateValues } from "./privacy";
import { candidateAsks, candidatePosts, trustSignals } from "./reach";
import { PostEvalSchema } from "./schemas";
import { postEvalPrompt, replyDraftPrompt } from "./prompts";
import type { Ask, ConnectionSuggestion, Match, NegotiationTurn, Verdict } from "./types";

export type MatchEvent =
  | { type: "start"; askId: string; candidates: { id: string; name: string; avatarUrl: string; mode: Match["mode"]; postId?: string }[] }
  | { type: "turn"; candidateId: string; turn: NegotiationTurn }
  | { type: "verdict"; candidateId: string; match: Match }
  | { type: "connection"; candidateId: string; matchId: string; connection: ConnectionSuggestion | null }
  | { type: "done"; askId: string; matches: Match[] }
  | { type: "error"; message: string };

export function sortMatches(ms: Match[]): Match[] {
  return [...ms].sort((a, b) => Number(b.verdict.compatible) - Number(a.verdict.compatible) || b.verdict.score - a.verdict.score);
}

export async function runMatching(askInput: Ask, emit: (e: MatchEvent) => void = () => {}): Promise<Match[]> {
  const ask = getAsk(askInput.id) ?? askInput;
  const me = getUser(ask.userId);
  if (!me) throw new Error("unknown user");
  saveAsk({ ...ask, status: "matching" });

  const agentCands = candidateAsks(ask);
  const posts = candidatePosts(ask);
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
    const { negotiation, verdict } = await runNegotiation(ask, other, (turn) => emit({ type: "turn", candidateId: user.id, turn }));
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
    emit({ type: "connection", candidateId: user.id, matchId: match.id, connection });
  });

  const postJobs = posts.map(async (post) => {
    const author = getUser(post.authorId)!;
    const ctx = agentContext(ask.preferences); // never prefs stripped here
    const ep = postEvalPrompt({
      askSummary: ask.summary,
      prefs: formatPrefs([...ctx.public, ...ctx.matchOnly]),
      postText: post.text,
      authorName: author.name,
    });
    const ev = await museJSON({ model: "ember", system: ep.system, user: ep.user, schema: PostEvalSchema, mock: mockPostEval(post.id) });
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
      draftReply = red(await museText({ model: "spark", system: rp.system, user: rp.user, mock: mockReplyDraft(author.name.split(" ")[0]) }));
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
