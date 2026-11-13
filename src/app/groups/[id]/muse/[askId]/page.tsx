// Full shortlist for an ask (reached from the notification or the Group's Muse row). Both sides can open it:
// the asker sees every candidate, a candidate sees only their own match. PRD §11.5 / handoff 4c.
import { publicSummary } from "@/lib/privacy";
import Link from "next/link";
import { notFound } from "next/navigation";
import ConnectionCard, { type EventInfo } from "@/components/ConnectionCard";
import MatchCard from "@/components/MatchCard";
import HomesCard from "@/components/muse/HomesCard";
import AskElsewhere from "@/components/muse/AskElsewhere";
import { broaderFor } from "@/lib/match";
import { REACH_LABEL, reachOf } from "@/lib/reach";
import { buyersFor } from "@/lib/homes";
import { BackIcon, MuseMark } from "@/components/icons";
import { getAsk, getEvent, getGroup, getUser, matchesForAsk } from "@/lib/db";
import { firstName, fitLevel } from "@/lib/format";
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
  // Ranked by score (sortMatches): fits, then people who could work, then long shots. The title counts real fits only.
  const shown = matches.filter((m) => m.verdict.compatible);
  const fits = shown.filter((m) => fitLevel(m.verdict) === "fit");
  const maybes = shown.length - fits.length;
  // Same pick as Muse's chat summary: the top fit whose Muse actually checked, else the top fit (a post).
  const best = fits.find((m) => m.mode === "agent_to_agent") ?? fits[0];
  const misses = matches.filter((m) => !m.verdict.compatible);
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
  // One ranked grid of everyone who could work (fits first), then the people who don't.
  // The Best match card leads the grid even when a post (no Muse) scored higher; the rest keep their ranking.
  const ranked = best ? [best, ...shown.filter((m) => m !== best)] : shown;
  const sections = iAmAsker
    ? [
        { title: "", items: ranked }, // the title already says how many fit; chips show each level
        { title: "Not a fit", items: misses },
      ].filter((s) => s.items.length > 0)
    : [{ title: "", items: matches }];
  const otherOf = (m: Match) => getUser(iAmAsker ? m.candidateId : m.userId)!;
  const eventOf = (m: Match): EventInfo | null => {
    const ev = m.connection?.eventId ? getEvent(m.connection.eventId) : undefined;
    return ev ? { id: ev.id, name: ev.name, when: ev.when, where: ev.where, going: ev.goingIds.length, coverEmoji: ev.coverEmoji } : null;
  };
  const askerFirst = firstName(asker.name);

  return (
    <div className={`mx-auto flex ${iAmAsker ? "max-w-[1100px]" : "max-w-[680px]"} flex-col gap-4 pb-24 md:px-4 md:py-5`}>
      {/* Title on the canvas, big and short; the ask is the one boxed thing above the cards. */}
      <header className="flex flex-col gap-3 px-4 pt-4 md:px-1 md:pt-0">
        <Link href={`/groups/${group.id}`} className="inline-flex w-fit items-center gap-1 text-[15px] font-semibold text-fb-muted hover:text-fb-text">
          <BackIcon size={18} />
          {group.name}
        </Link>
        <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-tight md:text-[34px]">
          {!iAmAsker ? (
            <>{askerFirst}&apos;s Muse checked with yours</>
          ) : fits.length === 0 ? (
            "No one fits yet"
          ) : (
            <>
              <span className="rounded-lg bg-fb-accent px-1.5 text-[#050505] [box-decoration-break:clone]">
                {fits.length} {fits.length === 1 ? "person" : "people"}
              </span>{" "}
              {fits.length === 1 ? "fits" : "fit"} your ask
            </>
          )}
        </h1>
        {iAmAsker && maybes > 0 && <p className="-mt-1 text-[15px] font-semibold text-fb-muted">+{maybes} who could work</p>}
      </header>

      <section className="bg-fb-card px-5 py-4 md:rounded-2xl">
        <div className="text-[13px] font-semibold text-fb-blue">
          {iAmAsker ? "Your ask" : `${askerFirst}'s ask`}
          {iAmAsker && <span className="font-normal text-fb-muted"> · checked with {REACH_LABEL[reachOf(ask)].toLowerCase()}</span>}
        </div>
        {/* A candidate only ever sees the public version of someone else's ask. */}
        <p className="mt-1 text-[19px] font-bold leading-[25px] tracking-tight">{iAmAsker ? ask.summary : publicSummary(ask)}</p>
        {!iAmAsker && <p className="mt-2 text-[13px] text-fb-muted">{askerFirst} sees a summary, never your private numbers.</p>}
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
          <section className="bg-fb-card p-6 text-center text-fb-muted md:rounded-2xl">Nothing here yet.</section>
        ))}
      {sections.map((s) => (
        <section key={s.title || "all"} className="flex flex-col gap-3 md:gap-4">
          {s.title && (
            <h2 className="flex items-baseline gap-2 px-4 pt-2 md:px-1">
              <span className="text-[17px] font-bold text-fb-muted">{s.title}</span>
              <span className="text-[15px] text-fb-muted">{s.items.length}</span>
            </h2>
          )}
          {/* Two-up rows; items-start so each card keeps its own height (opening "See why" in one card never stretches its neighbour). A lone last card spans the row. */}
          <div className={`grid items-start gap-3 md:gap-4 ${iAmAsker ? "lg:grid-cols-2" : ""}`}>
            {s.items.map((m) => {
              const other = otherOf(m);
              return (
                <div key={m.id} className="lg:last:odd:col-span-2">
                  <MatchCard
                    match={m}
                    candidate={{ id: other.id, name: other.name, avatarUrl: other.avatarUrl, school: other.school }}
                    event={eventOf(m)}
                    label={iAmAsker && m === best ? "Best match" : undefined}
                    groupName={group.name}
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
                <ConnectionCard connection={m.connection!} event={eventOf(m)} otherFirst={firstName(otherOf(m).name)} title={`New connection with ${firstName(otherOf(m).name)}`} />
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
