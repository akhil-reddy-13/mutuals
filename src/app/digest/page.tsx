// Muse page: today's digest of people in your Groups who need something you can help with (breadth beat, PRD §5.3).
// Ember writes the cards from seeded asks; served from the mock offline.
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { MuseMark } from "@/components/icons";
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
  const groupsWithMuse = me.groups.map((g) => getGroup(g)!).filter(Boolean);

  return (
    <div className="mx-auto max-w-[680px] pb-24 md:py-4">
      <section className="fb-card rounded-none p-4 md:rounded-[8px]">
        <div className="flex items-center gap-3">
          <MuseMark size={44} />
          <div>
            <h1 className="text-[22px] font-bold leading-tight">Muse</h1>
            <div className="text-[13px] text-fb-muted">Your Muse, inside your Groups</div>
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-5">
          Open any Group and tap <b>Ask Muse privately</b>. Your Muse checks with other members&apos; Muses on the things you&apos;d never post, then hands you a shortlist. You decide who to talk to.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {groupsWithMuse.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="fb-btn-secondary h-8 text-[13px]">
              {g.coverEmoji} {g.name}
            </Link>
          ))}
        </div>
      </section>

      <h2 className="px-4 pb-2 pt-4 text-[17px] font-bold md:px-0">Today in your Groups</h2>
      <div className="flex flex-col gap-3">
        {cards.map((c, i) => {
          const people = c.related_user_ids.map((id) => getUser(id)).filter(Boolean);
          const g = getGroup(allAsks().find((a) => c.related_user_ids.includes(a.userId))?.groupId ?? "g_ffs");
          return (
            <section key={i} className="fb-card rounded-none p-4 md:rounded-[8px]">
              <div className="text-[12px] font-semibold uppercase tracking-wide muse-text">{LABEL[c.type] ?? c.type}</div>
              <h3 className="mt-1 text-[17px] font-bold leading-tight">{c.title}</h3>
              <p className="mt-1 text-[15px] text-fb-muted">{c.body}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {people.map((u) => (
                      <Avatar key={u!.id} src={u!.avatarUrl} name={u!.name} size={28} ring />
                    ))}
                  </div>
                  <span className="text-[13px] text-fb-muted">{g?.name}</span>
                </div>
                <Link href={`/groups/${g?.id ?? "g_ffs"}`} className="fb-btn-soft h-8 text-[13px]">
                  Ask Muse
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
