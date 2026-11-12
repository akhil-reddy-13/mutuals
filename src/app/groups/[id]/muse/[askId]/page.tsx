// Full shortlist for an ask (reached from the notification or the Group's Muse row). Both sides can open it:
// the asker sees every candidate, a candidate sees only their own match. PRD §11.5 / handoff 4c.
import { publicSummary } from "@/lib/privacy";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import ConnectionCard, { type EventInfo } from "@/components/ConnectionCard";
import MatchCard from "@/components/MatchCard";
import HomesCard from "@/components/muse/HomesCard";
import AskElsewhere from "@/components/muse/AskElsewhere";
import { broaderFor } from "@/lib/match";
import { REACH_LABEL, reachOf } from "@/lib/reach";
import { buyersFor } from "@/lib/homes";
import { BackIcon, FeedIcon, MuseMark } from "@/components/icons";
import { getAsk, getEvent, getGroup, getUser, matchesForAsk } from "@/lib/db";
import { firstName } from "@/lib/format";
import { sortMatches } from "@/lib/match";
import { currentUser } from "@/lib/session";
import type { Match } from "@/lib/types";

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
  const misses = matches.filter((m) => !m.verdict.compatible);
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
  // Already sorted (fits first, best first). The asker sees two two-up grids so fits sit side by side.
  const sections = iAmAsker
    ? [
        { title: "Fits", items: fits },
        { title: "Not a fit", items: misses },
      ].filter((s) => s.items.length > 0)
    : [{ title: "", items: matches }];
  const otherOf = (m: Match) => getUser(iAmAsker ? m.candidateId : m.userId)!;
  const eventOf = (m: Match): EventInfo | null => {
    const ev = m.connection?.eventId ? getEvent(m.connection.eventId) : undefined;
    return ev ? { id: ev.id, name: ev.name, when: ev.when, where: ev.where, going: ev.goingIds.length, coverEmoji: ev.coverEmoji } : null;
  };

  return (
    <div className={`mx-auto flex ${iAmAsker ? "max-w-[1100px]" : "max-w-[680px]"} flex-col gap-3 pb-24 md:gap-4 md:px-4 md:py-4`}>
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
        <div className={`px-4 pb-4 pt-3 ${iAmAsker && matches.length > 1 ? "lg:grid lg:grid-cols-2 lg:items-start lg:gap-6" : ""}`}>
          {iAmAsker ? (
            <>
              <div>
              <h1 className="text-[20px] font-bold leading-tight">
                {fits.length} {fits.length === 1 ? "person fits" : "people fit"} your ask
              </h1>
              {/* The ask is what every card below is measured against, so it reads as content, not a caption. */}
              <div className="mt-3 rounded-lg border-l-4 border-fb-blue bg-fb-bg px-3.5 py-2.5">
                <div className="text-[13px] font-semibold text-fb-muted">Your ask in {group.name}</div>
                <p className="mt-0.5 text-[17px] font-semibold leading-[22px] text-fb-text">{ask.summary}</p>
              </div>
              {/* What Muse did, as scannable facts instead of a paragraph. */}
              <ul className="mt-3 flex flex-wrap gap-2 text-[13px] font-semibold">
                <li className="inline-flex items-center gap-1.5 rounded-full bg-fb-blue-soft px-2.5 py-1 text-fb-blue">Checked with: {REACH_LABEL[reachOf(ask)]}</li>
                <li className="inline-flex items-center gap-1.5 rounded-full bg-fb-bg px-2.5 py-1">
                  <MuseMark size={14} /> {agentCount} {agentCount === 1 ? "Muse" : "Muses"} checked
                </li>
                <li className="inline-flex items-center gap-1.5 rounded-full bg-fb-bg px-2.5 py-1">
                  <FeedIcon size={14} /> {all.filter((m) => m.mode === "one_sided").length} {all.filter((m) => m.mode === "one_sided").length === 1 ? "post" : "posts"} read
                </li>
              </ul>
              </div>
              {/* Ranked overview, like Facebook's people lists: compare at a glance, tap to jump to the card. */}
              {matches.length > 1 && (
                <ol className="mt-3 overflow-hidden rounded-lg border border-fb-divider lg:mt-0">
                  {matches.map((m) => {
                    const u = getUser(m.candidateId)!;
                    const fit = m.verdict.compatible;
                    return (
                      <li key={m.id} className="border-b border-fb-divider last:border-b-0">
                        <a href={`#${m.id}`} className={`flex items-center gap-3 px-3 py-2 hover:bg-fb-bg ${fit ? "" : "opacity-70"}`}>
                          <span className="w-4 shrink-0 text-center text-[13px] font-semibold text-fb-muted">{fit ? fits.indexOf(m) + 1 : ""}</span>
                          <Avatar src={u.avatarUrl} name={u.name} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold leading-5">{u.name}</span>
                            <span className="block truncate text-[13px] text-fb-muted">{m.verdict.summaryForHumans}</span>
                          </span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${m === fits[0] ? "bg-fb-blue-soft text-fb-blue" : fit ? "bg-[#e6f4ea] text-fb-green" : "bg-fb-chip text-fb-muted"}`}>
                            {m === fits[0] ? "Best match" : fit ? "Fits" : "Not a fit"}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              )}
            </>
          ) : (
            <>
              <h1 className="text-[20px] font-bold leading-tight">{firstName(asker.name)}&apos;s Muse checked with yours</h1>
              <div className="mt-3 rounded-lg border-l-4 border-fb-blue bg-fb-bg px-3.5 py-2.5">
                <div className="text-[13px] font-semibold text-fb-muted">{firstName(asker.name)}&apos;s ask in {group.name}</div>
                <p className="mt-0.5 text-[17px] font-semibold leading-[22px] text-fb-text">{publicSummary(ask)}</p>
              </div>
              <p className="mt-2 text-[13px] text-fb-muted">Your Muse only used what you said was OK to share. {firstName(asker.name)} sees a summary, never your private numbers.</p>
            </>
          )}
        </div>
      </section>

      {matches.length === 0 &&
        (iAmAsker ? (
          <AskElsewhere
            askId={ask.id}
            hereLabel={REACH_LABEL[reachOf(ask)]}
            what={ask.type === "roommate" || ask.type === "sublet" ? "a room" : "this"}
            best={broaderFor(ask)}
          />
        ) : (
          <section className="fb-card p-6 text-center text-fb-muted">Nothing here yet.</section>
        ))}
      {sections.map((s) => (
        <section key={s.title || "all"} className="flex flex-col gap-3 md:gap-4">
          {s.title && (
            <h2 className="flex items-baseline gap-2 px-4 pt-1 md:px-1">
              <span className="text-[17px] font-bold">{s.title}</span>
              <span className="text-[15px] text-fb-muted">{s.items.length}</span>
            </h2>
          )}
          {/* Two-up rows, one height per row; a lone last card spans the row so every row is full. */}
          <div className={`grid gap-3 md:gap-4 ${iAmAsker ? "lg:grid-cols-2" : ""}`}>
            {s.items.map((m) => {
              const other = otherOf(m);
              return (
                <div key={m.id} className="lg:last:odd:col-span-2">
                  <MatchCard
                    match={m}
                    candidate={{ id: other.id, name: other.name, avatarUrl: other.avatarUrl, school: other.school }}
                    viewerId={me.id}
                    event={eventOf(m)}
                    label={iAmAsker && m === fits[0] ? "Best match" : undefined}
                    showConnection={false}
                  />
                </div>
              );
            })}
          </div>
          {/* Connection suggestions as their own beat under the grid ("most exchanges stay exchanges"), not inside one card. */}
          {s.items
            .filter((m) => m.verdict.compatible && m.connection?.suggest)
            .map((m) => (
              <div key={`c_${m.id}`} className="px-3 md:px-0">
                <ConnectionCard connection={m.connection!} event={eventOf(m)} otherFirst={firstName(otherOf(m).name)} title={`More than a lease with ${firstName(otherOf(m).name)}`} />
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
