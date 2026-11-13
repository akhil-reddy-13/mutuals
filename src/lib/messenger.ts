// Messenger handoff (PRD §5.1 step 6): the human picks a match, a thread opens with a Spark-drafted opener.
// Agents never send anything. The draft sits in the composer until the human edits/sends it.
import { getMatch, getNegotiation, getPost, getThread, getUser, newId, saveMatch, saveThread, threadBetween } from "./db";
import { mockOpener } from "./mocks";
import { museText, modelFor } from "./muse";
import { openerPrompt } from "./prompts";
import { leakedPrivateFacts, publicSummary, redactPrivateValues } from "./privacy";
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

  // The sender reads this draft, so hide the RECIPIENT's private values (Alex's draft must not repeat Priya's
  // match_only wake-up time). The sender's own facts are theirs to share. `never` values are stripped for both.
  const neg = match.negotiationId ? getNegotiation(match.negotiationId) : undefined;
  const otherAsk = neg ? getAsk(neg.askAId === ask.id ? neg.askBId : neg.askAId) : match.candidateAskId ? getAsk(match.candidateAskId) : undefined;
  const senderAsk = ask.userId === senderId ? ask : otherAsk;
  const recipientAsk = ask.userId === senderId ? otherAsk : ask;
  const recipientPrivate = (recipientAsk?.preferences ?? []).filter((p) => p.visibility !== "public");

  let draft: string;
  if (match.mode === "one_sided" && match.draftReply) {
    draft = match.draftReply;
  } else {
    const p = openerPrompt({
      sender: sender.name,
      recipient: recipient.name,
      // Selling: name the exact items so the opener carries context, never "is this still available?".
      askSummary: match.routedItems?.length
        ? `${ask.userId === senderId ? "selling" : "buying"} ${match.routedItems.map((i) => i.model || i.name).join(" and ")} (${match.routedItems.map((i) => `$${i.suggestedPriceUsd}`).join(", ")})`
        : ask.userId === senderId
          ? ask.summary
          : // The matched person is replying to someone else's ask: say whose it is, or the opener comes out as if
            // they own the room ("the second bedroom in my 2BR") when it's the asker's.
            `${recipient.name.split(" ")[0]}'s ask, which ${sender.name.split(" ")[0]} is replying to (it's ${recipient.name.split(" ")[0]}'s, not ${sender.name.split(" ")[0]}'s): ${publicSummary(ask)}`,
      summaryForHumans: match.verdict.summaryForHumans,
      recipientPrivate: recipientPrivate.filter((p) => p.visibility === "match_only").map((p) => p.value).join("; "),
    });
    draft = await museText({ model: modelFor("opener"), system: p.system, user: p.user, mock: mockOpener(sender.id, recipient.id, recipient.name.split(" ")[0]) });
  }
  const shield = [...recipientPrivate, ...(senderAsk?.preferences.filter((p) => p.visibility === "never") ?? [])];
  draft = redactPrivateValues(draft, shield);
  // The sender has never been told the recipient's match_only facts. If the draft echoes one anyway, fall back to
  // a plain opener built from the (already guarded) match summary.
  if (leakedPrivateFacts(draft, recipientPrivate).length) {
    draft = `Hey ${recipient.name.split(" ")[0]}! Our Muses think we could be a good fit. ${match.verdict.summaryForHumans} Want to hop on a quick call this week to sort out the details?`;
  }

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
