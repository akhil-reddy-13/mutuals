// Candidate selection (handoff note: scoped to one Facebook Group, no reach setting) + trust signals.
import { allAsks, getGroup, getUser, postsInGroup } from "./db";
import type { Ask, GroupPost, User } from "./types";

/** Other members of the ask's Group who have Muse AND opted in for that Group, with an open ask of the same type. */
export function candidateAsks(ask: Ask): { ask: Ask; user: User }[] {
  const me = getUser(ask.userId);
  const group = getGroup(ask.groupId);
  if (!me || !group) return [];
  const latestPerUser = new Map<string, Ask>();
  for (const a of allAsks()) {
    if (a.id === ask.id || a.userId === ask.userId || a.type !== ask.type || a.groupId !== ask.groupId) continue;
    // Items: someone looking meets someone offering, never another person looking (or two sellers).
    if (ask.type === "item" && (a.side ?? "offering") === (ask.side ?? "offering")) continue;
    const prev = latestPerUser.get(a.userId);
    if (!prev || prev.createdAt < a.createdAt) latestPerUser.set(a.userId, a);
  }
  return [...latestPerUser.values()]
    .map((a) => ({ ask: a, user: getUser(a.userId)! }))
    .filter(({ user }) => user && user.museEnabled && user.museGroups.includes(ask.groupId) && group.memberIds.includes(user.id));
}

/** Posts in the Group by members WITHOUT Muse (one-sided mode: we read the human post and draft a reply). */
export function candidatePosts(ask: Ask): GroupPost[] {
  const me = getUser(ask.userId);
  if (!me) return [];
  return postsInGroup(ask.groupId).filter((p) => {
    const author = getUser(p.authorId);
    return author && !author.museEnabled && author.id !== me.id;
  });
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
