// Candidate selection by reach (PRD §3.1) + trust signals for match cards.
import { allAsks, getUser, seed } from "./db";
import type { Ask, Reach, User } from "./types";

export function inReach(me: User, other: User, reach: Reach): boolean {
  if (me.id === other.id) return false;
  switch (reach) {
    case "school":
      return !!me.school && me.school === other.school && other.schoolVerified;
    case "network": {
      if (me.friends.includes(other.id)) return true;
      return me.friends.some((f) => getUser(f)?.friends.includes(other.id));
    }
    case "nearby":
      return me.city === other.city;
    case "anyone":
      return true;
  }
}

/** Open asks from other Muse-enabled users in reach, of a compatible type. */
export function candidateAsks(ask: Ask): { ask: Ask; user: User }[] {
  const me = getUser(ask.userId);
  if (!me) return [];
  return allAsks()
    .filter((a) => a.id !== ask.id && a.type === ask.type)
    .map((a) => ({ ask: a, user: getUser(a.userId)! }))
    .filter(({ user }) => user && user.museEnabled && inReach(me, user, ask.reach));
}

/** Group posts from users WITHOUT Muse, in my groups, for one-sided mode. */
export function candidatePosts(ask: Ask) {
  const me = getUser(ask.userId);
  if (!me) return [];
  return seed.posts.filter((p) => {
    const author = getUser(p.authorId);
    return author && !author.museEnabled && author.id !== me.id && me.groups.includes(p.groupId);
  });
}

export function trustSignals(me: User, other: User): string[] {
  const out: string[] = [];
  if (other.schoolVerified && other.school) out.push(`Verified ${other.school}`);
  for (const gid of me.groups.filter((g) => other.groups.includes(g))) {
    const g = seed.groups.find((x) => x.id === gid);
    if (g) out.push(`Both in ${g.name}`);
  }
  const mutuals = me.friends.filter((f) => other.friends.includes(f)).length;
  if (mutuals > 0) out.push(`${mutuals} mutual friend${mutuals > 1 ? "s" : ""}`);
  return out;
}
