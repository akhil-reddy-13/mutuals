// Full shortlist for an ask (reached from the notification or the Group's Muse row). Both sides can open it:
// the asker sees every candidate, a candidate sees only their own match. PRD §11.5 / handoff 4c.
import Link from "next/link";
import { notFound } from "next/navigation";
import MatchCard from "@/components/MatchCard";
import HomesCard from "@/components/muse/HomesCard";
import { buyersFor } from "@/lib/homes";
import { BackIcon, MuseMark } from "@/components/icons";
import { getAsk, getEvent, getGroup, getUser, matchesForAsk, postsInGroup } from "@/lib/db";
import { firstName } from "@/lib/format";
import { sortMatches } from "@/lib/match";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MatchesPage({ params }: { params: Promise<{ id: string; askId: string }> }) {
  const { id, askId } = await params;
  const group = getGroup(id);
  const ask = getAsk(askId);
  if (!group || !ask) notFound();
  const me = await currentUser();
  const asker = getUser(ask.userId)!;
  const iAmAsker = me.id === ask.userId;
  const all = sortMatches(matchesForAsk(askId));
  const matches = iAmAsker ? all : all.filter((m) => m.candidateId === me.id);
  const fits = matches.filter((m) => m.verdict.compatible);
  const agentCount = all.filter((m) => m.mode === "agent_to_agent").length;
  // Selling: results are people who already need the things ("2 of these already have a home").
  const selling = ask.type === "item" && ask.side !== "seeking" && matches.some((m) => m.routedItems?.length);
  if (selling) {
    const people = Object.fromEntries(
      matches.map((m) => {
        const u = getUser(iAmAsker ? m.candidateId : m.userId)!;
        return [m.candidateId, { id: u.id, name: u.name, avatarUrl: u.avatarUrl }];
      }),
    );
    const routed = new Set(all.flatMap((m) => (m.routedItems ?? []).map((i) => i.id)));
    const rest = iAmAsker ? (ask.items ?? []).filter((i) => i.mentioned !== false && !routed.has(i.id)) : [];
    const mine = matches[0];
    return (
      <div className="mx-auto flex max-w-[680px] flex-col gap-3 pb-24 md:gap-4 md:py-4">
        <section className="fb-card rounded-none p-4 md:rounded-[8px]">
          <div className="flex items-center gap-2">
            <Link href={`/groups/${group.id}`} className="fb-icon-btn h-9 w-9 bg-transparent" aria-label="Back">
              <BackIcon size={22} />
            </Link>
            <MuseMark size={28} />
            <div className="text-[15px] font-bold">Muse · {group.name}</div>
          </div>
          {iAmAsker ? (
            <p className="mt-2 text-[14px] text-fb-muted">
              I checked with {buyersFor(ask).length} {buyersFor(ask).length === 1 ? "person's Muse" : "people's Muses"} in {group.name} who are looking for something. I only told them what&apos;s in your list.
            </p>
          ) : (
            <p className="mt-2 text-[14px]">
              <b>{firstName(asker.name)}</b> is selling {(mine?.routedItems ?? []).map((i) => i.name).join(" + ")} and their Muse thought of you.
            </p>
          )}
        </section>
        <div className="px-3 md:px-0">
          <HomesCard viewer={iAmAsker ? "seller" : "buyer"} matches={matches} people={iAmAsker ? people : { [mine.candidateId]: { id: asker.id, name: asker.name, avatarUrl: asker.avatarUrl } }} rest={rest} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-3 pb-24 md:gap-4 md:py-4">
      <section className="fb-card rounded-none md:rounded-[8px]">
        <div className="flex items-center gap-2 px-3 pt-3 md:px-4">
          <Link href={`/groups/${group.id}`} className="fb-icon-btn h-9 w-9 bg-transparent" aria-label="Back">
            <BackIcon size={22} />
          </Link>
          <MuseMark size={28} />
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-tight">Muse</div>
            <div className="truncate text-[12px] text-fb-muted">{group.name}</div>
          </div>
        </div>
        <div className="px-4 pb-4 pt-3">
          {iAmAsker ? (
            <>
              <h1 className="text-[20px] font-bold leading-tight">
                {fits.length} {fits.length === 1 ? "person fits" : "people fit"} your ask
              </h1>
              <p className="mt-1 text-[15px] text-fb-muted">
                &ldquo;{ask.summary}&rdquo;
              </p>
              <p className="mt-2 text-[13px] text-fb-muted">
                I checked with {agentCount} {agentCount === 1 ? "person's Muse" : "people's Muses"} and read {postsInGroup(group.id).length} posts in this group. Nothing you marked private was shown to anyone.
              </p>
              <p className="mt-1 text-[12px] text-fb-muted">
                Muse Spark talked it through with their Muses, Muse Wonder made the call, Muse Ember read the posts{ask.roomDetails ? " and your video" : ""}.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[20px] font-bold leading-tight">{firstName(asker.name)}&apos;s Muse checked with yours</h1>
              <p className="mt-1 text-[15px] text-fb-muted">About: &ldquo;{ask.summary}&rdquo;</p>
              <p className="mt-2 text-[13px] text-fb-muted">Your Muse only used what you said was OK to share. {firstName(asker.name)} sees a summary, never your private numbers.</p>
            </>
          )}
        </div>
      </section>

      {matches.length === 0 && (
        <section className="fb-card p-6 text-center text-fb-muted">Nothing here yet.</section>
      )}
      {matches.map((m) => {
        const other = getUser(iAmAsker ? m.candidateId : m.userId)!;
        const ev = m.connection?.eventId ? getEvent(m.connection.eventId) : undefined;
        return (
          <MatchCard
            key={m.id}
            match={m}
            candidate={{ id: other.id, name: other.name, avatarUrl: other.avatarUrl, school: other.school }}
            viewerId={me.id}
            groupId={group.id}
            event={ev ? { id: ev.id, name: ev.name, when: ev.when, where: ev.where, going: ev.goingIds.length, coverEmoji: ev.coverEmoji } : null}
          />
        );
      })}
    </div>
  );
}
