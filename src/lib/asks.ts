// Ask parsing (PRD §5.1 step 2): the chat in the Muse sheet -> Spark -> structured, visibility-tagged prefs.
// Called after every user message. Returns Muse's next line until `ready`.
import { allAsks, asksForUser, getAsk, getGroup, getUser, newId, saveAsk } from "./db";
import { mockAskParse } from "./mocks";
import { modelFor, museJSON } from "./muse";
import { agentContext } from "./privacy";
import { askParsePrompt } from "./prompts";
import { AskParseSchema } from "./schemas";
import type { Ask, Preference, User } from "./types";

export interface ChatMsg {
  role: "user" | "muse";
  text: string;
}

/** Fallback when the model (or a scripted mock) doesn't say which side the user is on. */
export function guessSide(convo: string): "offering" | "seeking" {
  const t = convo.toLowerCase();
  if (/\b(looking for|need|searching for|iso|in search of|want to find|anyone (have|selling|driving))\b/.test(t) &&
      !/\b(i have|i've got|i signed|my room|selling|subletting my|giving away|i'm driving|have a spare|extra ticket)\b/.test(t)) return "seeking";
  return "offering";
}

/**
 * What Muse remembers from the owner's earlier asks: newest first, one fact per topic. Only asks that went out to
 * matching count (a draft was never confirmed), and only through agentContext, so never-shared facts and
 * unconfirmed guesses are never remembered.
 */
export function rememberedPrefs(asks: Ask[], currentAskId?: string): Preference[] {
  const seen = new Set<string>();
  const out: Preference[] = [];
  const past = asks.filter((x) => x.id !== currentAskId && x.status !== "draft").sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  for (const ask of past) {
    const ctx = agentContext(ask.preferences);
    for (const p of [...ctx.public, ...ctx.matchOnly]) {
      if (seen.has(p.topic)) continue;
      seen.add(p.topic);
      out.push(p);
    }
  }
  return out;
}

/** Clear "I have it" phrasing wins over the model: "need a roommate for my second bedroom" is OFFERING a room. */
const STRONG_OFFER = /\b(i signed|i have a (room|spare|extra)|i've got a (room|spare)|my (room|second bedroom|spare room|place)|room to fill|for the second bedroom|i'm selling|selling my|giving away|i'm driving)\b/i;
export function resolveSide(model: "offering" | "seeking" | null | undefined, prev: "offering" | "seeking" | undefined, text: string): "offering" | "seeking" {
  if (STRONG_OFFER.test(text)) return "offering";
  return model ?? prev ?? guessSide(text);
}

/**
 * The Group an ask from the Muse page lives in (the page is one chat, not one per Group): the one of my Groups
 * where the most people have an ask that could answer it. Stays put once it's somewhere with people.
 */
export function homeGroupFor(user: User, type: Ask["type"], side: "offering" | "seeking", current?: string): string {
  const family = (t: string) => (t === "sublet" ? "roommate" : t);
  const count = new Map<string, number>();
  for (const o of allAsks()) {
    if (o.userId === user.id || !user.groups.includes(o.groupId) || family(o.type) !== family(type)) continue;
    if (type === "item" && (o.side ?? "offering") === side) continue; // items: someone looking meets someone offering
    count.set(o.groupId, (count.get(o.groupId) ?? 0) + 1);
  }
  if (current && (count.get(current) ?? 0) > 0) return current;
  const best = [...user.groups].sort((x, y) => (count.get(y) ?? 0) - (count.get(x) ?? 0))[0];
  return (count.get(best) ?? 0) > 0 ? best : (current ?? user.groups[0]);
}

/** `groupId: "auto"` = asked from the Muse page: Muse works out which of my Groups the ask belongs in. */
export async function parseAsk(a: { userId: string; groupId: string; askId?: string; conversation: ChatMsg[] }) {
  const user = getUser(a.userId);
  const auto = a.groupId === "auto";
  const existing = a.askId ? getAsk(a.askId) : undefined;
  const group = getGroup(auto ? (existing?.groupId ?? user?.groups[0] ?? "") : a.groupId);
  if (!user || !group) throw new Error("unknown user/group");
  // Drop Muse lines before the user's first message: that's the sheet's fixed greeting, which the system prompt
  // already covers. Without this, the live sheet and `npm run warm` hash differently and the warm cache never hits.
  const firstUser = a.conversation.findIndex((m) => m.role === "user");
  const convo = a.conversation
    .slice(Math.max(0, firstUser))
    .map((m) => `${m.role === "user" ? "User" : "Muse"}: ${m.text}`)
    .join("\n");
  const memory = rememberedPrefs(asksForUser(user.id), a.askId);
  const p = askParsePrompt({
    ownerName: user.name.split(" ")[0],
    // From the Muse page, before the ask has a home, Muse is told about all of my Groups.
    groupName: auto && !existing ? user.groups.map((g) => getGroup(g)?.name).filter(Boolean).join(" / ") : group.name,
    conversation: convo,
    memory: memory.map((x) => `[${x.id}] ${x.topic}: ${x.value} (${x.importance}, ${x.visibility})`).join("\n"),
  });
  // Ember: every chat turn waits on this structured extraction. Measured Nov 12: ~1.3 s vs Spark 9-23 s, same tags.
  const out = await museJSON({ model: modelFor("ask"), system: p.system, user: p.user, schema: AskParseSchema, mock: mockAskParse(user.id, convo) });

  // Keep any visibility edits the user already made in the chips.
  const edited = new Map((existing?.preferences ?? []).map((x) => [x.id, x]));
  const preferences: Preference[] = out.preferences.map((x) => ({
    ...x,
    visibility: edited.get(x.id)?.visibility ?? x.visibility,
    importance: edited.get(x.id)?.importance ?? x.importance,
    confirmed: x.source === "stated" ? true : (edited.get(x.id)?.confirmed ?? false),
  }));
  const side = resolveSide(out.side, existing?.side, a.conversation.filter((m) => m.role === "user").map((m) => m.text).join("\n"));
  const ask: Ask = {
    id: existing?.id ?? newId("ask"),
    userId: user.id,
    groupId: auto ? homeGroupFor(user, out.ask_type, side, existing?.groupId) : group.id,
    type: out.ask_type,
    summary: out.summary,
    side,
    preferences,
    roomDetails: existing?.roomDetails,
    items: existing?.items,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    status: "draft",
  };
  saveAsk(ask);
  // Carried over from memory and not yet confirmed, so the chips can say "From your last ask" instead of "I guessed this".
  const memIds = new Set(memory.map((x) => x.id));
  const remembered = preferences.filter((x) => memIds.has(x.id) && !x.confirmed).map((x) => x.id);
  return { ask, followUp: out.ready ? null : (out.follow_up_question ?? null), ready: !!out.ready, remembered };
}
