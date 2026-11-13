// Muse page: one clean chat with Muse across all your Groups (same chat component as the Group side sheet), with today's digest of
// people in your Groups who need something you can help with alongside it (breadth beat, PRD §5.3).
// Ember writes the digest cards from seeded asks; served from the mock offline.
import MusePage, { type TodayCard } from "@/components/muse/MusePage";
import { allAsks, getGroup, getUser } from "@/lib/db";
import { digestCards } from "@/lib/digest";
import { mockDigest } from "@/lib/mocks";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { skill_swap: "Skill swap", plus_one: "Plus one", small_ask: "Small ask", taste_circle: "Taste circle" };

export default async function DigestPage() {
  const me = await currentUser();
  let cards = mockDigest.cards;
  try {
    cards = await digestCards(me);
  } catch {}
  const groups = me.groups.map((g) => getGroup(g)!).filter(Boolean);
  const asks = allAsks();

  const today: TodayCard[] = cards.map((c) => {
    const g = getGroup(asks.find((a) => c.related_user_ids.includes(a.userId) && me.groups.includes(a.groupId))?.groupId ?? "") ?? groups[0];
    return {
      label: LABEL[c.type] ?? c.type,
      title: c.title,
      body: c.body,
      groupId: g?.id ?? "",
      groupName: g?.name ?? "",
      people: c.related_user_ids
        .map((id) => getUser(id))
        .filter((u): u is NonNullable<typeof u> => !!u)
        .map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl })),
    };
  });

  return (
    <MusePage
      me={{ id: me.id, name: me.name, avatarUrl: me.avatarUrl, museGroups: me.museGroups }}
      groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      today={today.filter((t) => t.groupId)}
    />
  );
}
