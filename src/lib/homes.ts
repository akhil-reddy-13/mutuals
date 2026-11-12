// Selling, people-first: "3 of these already have a home."
// Instead of posting listings, the seller's Muse checks with the Muses of people in the Group who are looking for
// something, and routes each item to a specific person with a one-line human reason. Whatever has no home yet is
// offered more broadly (Marketplace). Agents never commit: the seller decides who to message.
//
//   buyers   = open "seeking" item asks in this Group from people whose Muse is on here
//   routing  = ONE Wonder call (judgment): which items fit whom, why (in human terms), optional real-overlap hook
//   budgets  = compared in CODE per home (privacy.moneyRange), so no one's private max is ever shown
import { allAsks, getUser, logAgentMessage, newId, saveAsk, saveMatch } from "./db";
import type { MatchEvent } from "./match";
import { museJSON } from "./muse";
import { homesPrompt } from "./prompts";
import { agentContext, formatPrefs, isShareable, moneyRange, redactPrivateValues } from "./privacy";
import { trustSignals } from "./reach";
import { HomesSchema, type HomesOutput } from "./schemas";
import type { Ask, Item, Match, User } from "./types";

export function buyersFor(ask: Ask): { ask: Ask; user: User }[] {
  const latest = new Map<string, Ask>();
  for (const a of allAsks()) {
    if (a.userId === ask.userId || a.groupId !== ask.groupId || a.type !== "item" || a.side !== "seeking") continue;
    const prev = latest.get(a.userId);
    if (!prev || prev.createdAt < a.createdAt) latest.set(a.userId, a);
  }
  return [...latest.values()]
    .map((a) => ({ ask: a, user: getUser(a.userId)! }))
    .filter(({ user }) => user && user.museEnabled && user.museGroups.includes(ask.groupId));
}

const itemLabel = (i: Item) => i.name;
export const joinItems = (items: Item[]) =>
  items.length <= 1 ? (items[0] ? itemLabel(items[0]) : "") : `${items.slice(0, -1).map(itemLabel).join(", ")} + ${itemLabel(items[items.length - 1])}`;

/** Offline fallback: keyword routing, so MOCK_MUSE still tells the same story. */
function mockHomes(items: Item[], buyers: { ask: Ask; user: User }[]): HomesOutput {
  const rules: [RegExp, RegExp][] = [
    [/desk|table|chair/i, /desk|chair/i],
    [/macbook|laptop/i, /laptop|macbook/i],
    [/camera/i, /camera/i],
    [/earbud|airpod|headphone/i, /earbud|headphone/i],
  ];
  const homes: HomesOutput["homes"] = [];
  for (const b of buyers) {
    const want = `${b.ask.summary} ${b.ask.preferences.map((p) => p.value).join(" ")}`;
    const ids = items.filter((it) => rules.some(([itemRe, wantRe]) => itemRe.test(`${it.name} ${it.model ?? ""}`) && wantRe.test(want))).map((i) => i.id);
    const free = ids.filter((id) => !homes.some((h) => h.item_ids.includes(id)));
    if (free.length) homes.push({ buyer_id: b.user.id, item_ids: free, why: `${b.user.name.split(" ")[0]}: ${b.ask.summary}.`, hook: null });
  }
  return { homes };
}

export async function runHomes(ask: Ask, emit: (e: MatchEvent) => void): Promise<Match[]> {
  const me = getUser(ask.userId)!;
  const items = (ask.items ?? []).filter((i) => i.mentioned !== false);
  const buyers = buyersFor(ask);

  emit({
    type: "start",
    askId: ask.id,
    candidates: buyers.map(({ user }) => ({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, mode: "agent_to_agent" as const })),
  });
  for (const { user, ask: b } of buyers) {
    emit({
      type: "turn",
      candidateId: user.id,
      turn: { speaker: "B", message: `${user.name.split(" ")[0]}'s Muse: looking for ${b.summary.charAt(0).toLowerCase()}${b.summary.slice(1)}.`, disclosed: [], positions: {} },
      disclosedMeta: [],
    });
  }

  // Each buyer's Muse shares only public + match_only facts (never `never`), exactly like a negotiation.
  const buyerBlock = buyers
    .map(({ user, ask: b }) => {
      const ctx = agentContext(b.preferences);
      const shares = user.interests.filter((i) => i.shareForConnection).map((i) => i.value).join(", ") || "(nothing)";
      return `[${user.id}] ${user.name}. About them: ${user.bio ?? ""}\n  Looking for: ${b.summary}\n  Their Muse says:\n${formatPrefs([...ctx.public, ...ctx.matchOnly])
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n")}\n  Interests they share: ${shares}`;
    })
    .join("\n\n");
  const itemBlock = items.map((i) => `[${i.id}] ${i.name}${i.model && i.model !== i.name ? ` (${i.model})` : ""}, ${i.condition}, $${i.suggestedPriceUsd}`).join("\n");
  const p = homesPrompt({
    sellerName: me.name.split(" ")[0],
    items: itemBlock || "(none)",
    buyers: buyerBlock || "(nobody is looking right now)",
    sellerShares: me.interests.filter((i) => i.shareForConnection).map((i) => i.value).join(", ") || "(nothing)",
  });
  const out =
    items.length && buyers.length
      ? await museJSON({ model: "wonder", system: p.system, user: p.user, schema: HomesSchema, mock: mockHomes(items, buyers) })
      : { homes: [] };

  // Validate: known buyers and items only, each item at most once.
  const used = new Set<string>();
  const matches: Match[] = [];
  for (const h of out.homes) {
    const b = buyers.find((x) => x.user.id === h.buyer_id);
    const routed = h.item_ids.map((id) => items.find((i) => i.id === id)).filter((i): i is Item => !!i && !used.has(i.id));
    if (!b || routed.length === 0) continue;
    routed.forEach((i) => used.add(i.id));
    const shield = b.ask.preferences.filter((x) => x.visibility !== "public");
    const total = routed.reduce((s, i) => s + (Number(i.suggestedPriceUsd) || 0), 0);
    // Sealed budget check: the buyer's private max is compared here and never leaves as a number.
    const range = moneyRange(b.ask.preferences.filter(isShareable));
    const budgetOk = range ? total <= range[1] : null;
    const first = b.user.name.split(" ")[0];
    const why = redactPrivateValues(h.why, shield);
    const match: Match = {
      id: newId("match"),
      userId: me.id,
      candidateId: b.user.id,
      askId: ask.id,
      candidateAskId: b.ask.id,
      mode: "agent_to_agent",
      routedItems: routed,
      hook: h.hook ? redactPrivateValues(h.hook, shield) : null,
      verdict: {
        compatible: true,
        score: 0.8,
        fits: [`${joinItems(routed)} → ${first}`, budgetOk === false ? "" : budgetOk ? `Fits what ${first} wants to spend` : ""].filter(Boolean),
        disagreements: budgetOk === false ? [`A bit over what ${first} wants to spend, so talk price`] : [],
        compromise: null,
        summaryForHumans: why,
      },
      trustSignals: trustSignals(me, b.user),
      createdAt: new Date().toISOString(),
    };
    saveMatch(match);
    matches.push(match);
    // "What my Muse shared": exactly what the seller's Muse told this buyer's Muse.
    logAgentMessage({
      id: newId("log"),
      userId: me.id,
      negotiationId: match.id,
      counterpartId: b.user.id,
      message: `Told ${first}'s Muse about: ${routed.map((i) => `${i.name} ($${i.suggestedPriceUsd})`).join(", ")}.`,
      disclosed: [],
      at: new Date().toISOString(),
    });
    emit({ type: "verdict", candidateId: b.user.id, match });
  }
  // People Muse checked with who don't need anything here: say so quietly, no card.
  for (const { user } of buyers.filter((b) => !matches.some((m) => m.candidateId === b.user.id))) {
    emit({
      type: "turn",
      candidateId: user.id,
      turn: { speaker: "orchestrator", message: `Nothing here ${user.name.split(" ")[0]} needs right now.`, disclosed: [], positions: {} },
      disclosedMeta: [],
    });
  }
  saveAsk({ ...ask, status: "matched" });
  emit({ type: "done", askId: ask.id, matches });
  return matches;
}
