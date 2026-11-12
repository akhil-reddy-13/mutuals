// Candidate selection by the reach the person picked at opt-in (network | groups | everyone) + trust signals.
import { allAsks, getGroup, getUser, postsInGroup } from "./db";
import type { Ask, GroupPost, MuseReach, User } from "./types";

/** Ask types that should meet each other. Models label housing as "roommate" or "sublet" interchangeably. */
const family = (t: string) => (t === "sublet" ? "roommate" : t);

export const REACH_LABEL: Record<MuseReach, string> = {
  network: "People I'm connected with",
  groups: "People in my Groups",
  everyone: "Everyone nearby",
};
export const reachOf = (ask: Ask): MuseReach => ask.museReach ?? "groups";

/** Friends, or friends of friends. */
export function connected(me: User, other: User): boolean {
  if (me.friends.includes(other.id) || other.friends.includes(me.id)) return true;
  return me.friends.some((f) => getUser(f)?.friends.includes(other.id));
}

/** Is this other person inside the reach the asker chose? (They must have Muse on; for groups, opted in there.) */
function inReach(me: User, other: User, theirAsk: Ask, reach: MuseReach): boolean {
  if (!other.museEnabled) return false;
  if (reach === "network") return connected(me, other);
  if (reach === "everyone") return (!!me.school && me.school === other.school && other.schoolVerified) || me.city === other.city;
  // groups: their ask lives in a Group I'm in, and they turned Muse on there.
  return me.groups.includes(theirAsk.groupId) && other.museGroups.includes(theirAsk.groupId);
}

/** People whose Muse my Muse will check with for this ask, given the reach I picked. */
export function candidateAsks(ask: Ask, reachOverride?: MuseReach): { ask: Ask; user: User }[] {
  const me = getUser(ask.userId);
  if (!me) return [];
  const reach = reachOverride ?? reachOf(ask);
  const latestPerUser = new Map<string, Ask>();
  for (const a of allAsks()) {
    if (a.id === ask.id || a.userId === ask.userId || family(a.type) !== family(ask.type)) continue;
    // Items: someone looking meets someone offering, never another person looking (or two sellers).
    if (ask.type === "item" && (a.side ?? "offering") === (ask.side ?? "offering")) continue;
    const prev = latestPerUser.get(a.userId);
    if (!prev || prev.createdAt < a.createdAt) latestPerUser.set(a.userId, a);
  }
  return [...latestPerUser.values()]
    .map((a) => ({ ask: a, user: getUser(a.userId)! }))
    .filter(({ ask: a, user }) => user && inReach(me, user, a, reach));
}

/** Human posts (by people WITHOUT Muse) my Muse reads for this ask: this Group's posts, or wider for "everyone". */
export function candidatePosts(ask: Ask, reachOverride?: MuseReach): GroupPost[] {
  const me = getUser(ask.userId);
  if (!me) return [];
  const reach = reachOverride ?? reachOf(ask);
  // This Group's posts first, so when one person posted in several Groups we read the most relevant one.
  const posts = reach === "everyone" ? [ask.groupId, ...me.groups.filter((g) => g !== ask.groupId)].flatMap((g) => postsInGroup(g)) : postsInGroup(ask.groupId);
  const seen = new Set<string>();
  return posts.filter((p) => {
    const author = getUser(p.authorId);
    if (!author || author.museEnabled || author.id === me.id || seen.has(author.id)) return false;
    if (reach === "network" && !connected(me, author)) return false;
    seen.add(author.id);
    return true;
  });
}

/** How many people's Muses each reach would check for this ask (shown on the opt-in choice). */
export function reachCounts(ask: Ask): Record<MuseReach, number> {
  return {
    network: candidateAsks(ask, "network").length,
    groups: candidateAsks(ask, "groups").length,
    everyone: candidateAsks(ask, "everyone").length,
  };
}

export function trustSignals(me: User, other: User): string[] {
  const out: string[] = [];
  if (other.schoolVerified && other.school) out.push(`Verified ${other.school}`);
  for (const gid of me.groups.filter((g) => other.groups.includes(g))) {
    const g = getGroup(gid);
    if (g) out.push(`Both in ${g.name}`);
  }
  const mutuals = me.friends.filter((f) => other.friends.includes(f)).length;
  if (mutuals > 0) out.push(`${mutuals} mutual friend${mutuals > 1 ? "s" : ""}`);
  return out;
}
