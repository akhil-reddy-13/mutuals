// Full shortlist for an ask (reached from the notification or the Group's Muse row). Both sides can open it:
// the asker sees every candidate, a candidate sees only their own match. PRD §11.5 / handoff 4c.
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import MatchCard from "@/components/MatchCard";
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
  const misses = matches.filter((m) => !m.verdict.compatible);
  const agentCount = all.filter((m) => m.mode === "agent_to_agent").length;
  // Already sorted (fits first, best first); the asker sees that order as labeled sections.
  const sections = iAmAsker
    ? [
        { title: "Best match", items: fits.slice(0, 1) },
        { title: "Also a fit", items: fits.slice(1) },
        { title: "Not a fit", items: misses },
      ].filter((s) => s.items.length > 0)
    : [{ title: "", items: matches }];

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
                Your Muse checked with {agentCount} {agentCount === 1 ? "Muse" : "Muses"} and read {postsInGroup(group.id).length} posts in this group. Nothing you marked private was shown to anyone.
              </p>
              <p className="mt-1 text-[12px] text-fb-muted">
                Muse Spark negotiated, Muse Wonder refereed and judged the connection, Muse Ember read the posts{ask.roomDetails ? " and your video" : ""}.
              </p>
              {/* Ranked overview, like Facebook's people lists: compare at a glance, tap to jump to the card. */}
              {matches.length > 1 && (
                <ol className="mt-3 overflow-hidden rounded-lg border border-fb-divider">
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
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${fit ? "bg-[#e6f4ea] text-fb-green" : "bg-fb-chip text-fb-muted"}`}>
                            {fit ? "Fits" : "Not a fit"}
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
              <p className="mt-1 text-[15px] text-fb-muted">About: &ldquo;{ask.summary}&rdquo;</p>
              <p className="mt-2 text-[13px] text-fb-muted">Your Muse only used what you marked public or match-only. {firstName(asker.name)} sees a summary, never your private numbers.</p>
            </>
          )}
        </div>
      </section>

      {matches.length === 0 && (
        <section className="fb-card p-6 text-center text-fb-muted">Nothing here yet.</section>
      )}
      {sections.map((s) => (
        <section key={s.title || "all"} className="flex flex-col gap-3 md:gap-4">
          {s.title && (
            <h2 className="flex items-baseline gap-2 px-4 pt-1 md:px-1">
              <span className="text-[17px] font-bold">{s.title}</span>
              {s.items.length > 1 && <span className="text-[15px] text-fb-muted">{s.items.length}</span>}
            </h2>
          )}
          {s.items.map((m) => {
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
        </section>
      ))}
    </div>
  );
}
