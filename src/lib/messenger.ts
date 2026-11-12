// Messenger handoff (PRD §5.1 step 6): the human picks a match, a thread opens with a Spark-drafted opener.
// Agents never send anything. The draft sits in the composer until the human edits/sends it.
import { getMatch, getNegotiation, getPost, getThread, getUser, newId, saveMatch, saveThread, threadBetween } from "./db";
import { mockOpener } from "./mocks";
import { museText } from "./muse";
import { openerPrompt } from "./prompts";
import { redactPrivateValues } from "./privacy";
import { getAsk } from "./db";
import type { MessengerThread } from "./types";

export async function openThreadForMatch(matchId: string, senderId: string): Promise<MessengerThread> {
  const match = getMatch(matchId);
  if (!match) throw new Error("unknown match");
  const sender = getUser(senderId)!;
  const recipientId = match.userId === senderId ? match.candidateId : match.userId;
  const recipient = getUser(recipientId)!;
  const ask = getAsk(match.askId)!;

  const existing = threadBetween(senderId, recipientId);
  if (existing && (existing.draft?.for === senderId || existing.messages.some((m) => m.from === senderId))) return existing;

  let draft: string;
  if (match.mode === "one_sided" && match.draftReply) {
    draft = match.draftReply;
  } else {
    const p = openerPrompt({ sender: sender.name, recipient: recipient.name, askSummary: ask.summary, summaryForHumans: match.verdict.summaryForHumans });
    draft = await museText({ model: "spark", system: p.system, user: p.user, mock: mockOpener(sender.id, recipient.id, recipient.name.split(" ")[0]) });
  }
  // The sender reads this draft, so hide the RECIPIENT's private values (Alex's draft must not repeat Priya's
  // match_only wake-up time). The sender's own facts are theirs to share. `never` values are stripped for both.
  const neg = match.negotiationId ? getNegotiation(match.negotiationId) : undefined;
  const otherAsk = neg ? getAsk(neg.askAId === ask.id ? neg.askBId : neg.askAId) : undefined;
  const senderAsk = ask.userId === senderId ? ask : otherAsk;
  const recipientAsk = ask.userId === senderId ? otherAsk : ask;
  const shield = [
    ...(recipientAsk?.preferences.filter((p) => p.visibility !== "public") ?? []),
    ...(senderAsk?.preferences.filter((p) => p.visibility === "never") ?? []),
  ];
  draft = redactPrivateValues(draft, shield);

  if (existing) {
    // The other person opened the thread first. Give this person their own opener.
    existing.draft = { for: senderId, text: draft };
    saveThread(existing);
    return existing;
  }

  const thread: MessengerThread = {
    id: newId("thread"),
    participantIds: [senderId, recipientId],
    matchId,
    draft: { for: senderId, text: draft },
    messages: [],
  };
  // One-sided: the human's post is the first message in the thread, for context.
  if (match.sourcePostId) {
    const post = getPost(match.sourcePostId);
    if (post) thread.messages.push({ from: recipientId, text: `(from their post in the Group) ${post.text}`, at: post.createdAt });
  }
  saveThread(thread);
  saveMatch({ ...match, threadId: thread.id });
  return thread;
}

export function sendMessage(threadId: string, from: string, text: string): MessengerThread {
  const t = getThread(threadId);
  if (!t) throw new Error("unknown thread");
  t.messages.push({ from, text, at: new Date().toISOString() });
  if (t.draft?.for === from) t.draft = undefined;
  saveThread(t);
  return t;
}
