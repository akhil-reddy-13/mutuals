// Facebook notifications. Muse results arrive here like any other notification (handoff 4c), on both phones.
import MarkSeen from "@/components/MarkSeen";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { CalendarIcon, FriendsIcon, GroupsIcon, MuseMark } from "@/components/icons";
import { getAsk, getGroup, getUser, matchesInvolving } from "@/lib/db";
import { firstName, timeAgo } from "@/lib/format";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

interface Notif {
  id: string;
  href: string;
  avatar: { src?: string; name: string } | "muse";
  badge?: "muse" | "group" | "event" | "friends";
  text: React.ReactNode;
  at: string;
  unread?: boolean;
}

export default async function NotificationsPage() {
  const me = await currentUser();
  // Unread = arrived since I last opened this page (MarkSeen below updates it after render).
  const seenAt = me.notificationsSeenAt ?? "";
  const mine = matchesInvolving(me.id);
  const items: Notif[] = [];

  // As the asker: one notification per ask.
  const byAsk = new Map<string, typeof mine>();
  for (const m of mine.filter((m) => m.userId === me.id)) byAsk.set(m.askId, [...(byAsk.get(m.askId) ?? []), m]);
  for (const [askId, ms] of byAsk) {
    const ask = getAsk(askId);
    const group = ask && getGroup(ask.groupId);
    if (!ask || !group) continue;
    const fits = ms.filter((m) => m.verdict.compatible);
    const names = fits.map((m) => firstName(getUser(m.candidateId)!.name));
    items.push({
      id: `ask_${askId}`,
      href: `/groups/${group.id}/muse/${askId}`,
      avatar: "muse",
      text: (
        <>
          Your Muse found <b>{fits.length} {fits.length === 1 ? "person" : "people"}</b> in <b>{group.name}</b> who fit your ask{names.length ? `: ${names.join(", ")}` : ""}. {ms.length - fits.length > 0 && `${ms.length - fits.length} didn't.`}
        </>
      ),
      at: ms.map((m) => m.createdAt).sort().at(-1)!,
      unread: true,
    });
  }
  // As a candidate: the other person's Muse talked to mine (latest per asker).
  const latestByAsker = new Map<string, (typeof mine)[number]>();
  for (const m of mine.filter((m) => m.candidateId === me.id && m.mode === "agent_to_agent")) {
    const prev = latestByAsker.get(m.userId);
    if (!prev || prev.createdAt < m.createdAt) latestByAsker.set(m.userId, m);
  }
  for (const m of latestByAsker.values()) {
    const ask = getAsk(m.askId);
    const asker = getUser(m.userId);
    const group = ask && getGroup(ask.groupId);
    if (!ask || !asker || !group) continue;
    items.push({
      id: `cand_${m.id}`,
      href: m.negotiationId ? `/muse/talk/${m.negotiationId}` : `/groups/${group.id}/muse/${m.askId}`,
      avatar: { src: asker.avatarUrl, name: asker.name },
      badge: "muse",
      text: (
        <>
          {m.routedItems?.length ? (
            <>
              <b>{asker.name}</b> is selling <b>{m.routedItems.map((i) => i.name).join(" + ")}</b> in {group.name}, and their Muse thought of you.
            </>
          ) : (
            <>
              <b>{asker.name}</b>&apos;s Muse checked with yours in <b>{group.name}</b>. {m.verdict.compatible ? <>Looks like a fit: {m.verdict.summaryForHumans}</> : "Not a fit, so nothing to do."}
            </>
          )}
        </>
      ),
      at: m.createdAt,
      unread: true,
    });
  }
  // Ambient Facebook notifications so the page reads as real.
  const nina = getUser("nina")!;
  const june = getUser("june")!;
  const maya = getUser("maya")!;
  items.push(
    { id: "n1", href: "/groups/g_housing27", avatar: { src: nina.avatarUrl, name: nina.name }, badge: "group", text: <><b>Nina Okafor</b> posted in <b>Stanford Housing &apos;27</b>: &ldquo;PSA: if you&apos;re signing a lease in SF, ask about the security deposit cap.&rdquo;</>, at: "2026-11-11T18:00:00Z" },
    { id: "n2", href: "/events/evt_weekend_runs", avatar: { src: maya.avatarUrl, name: maya.name }, badge: "event", text: <><b>Maya Patel</b> invited you to <b>New in SF: Weekend Runs</b>.</>, at: "2026-11-11T02:00:00Z" },
    { id: "n3", href: "/groups/g_housing27", avatar: { src: june.avatarUrl, name: june.name }, badge: "group", text: <><b>June Liu</b> asked a question in <b>Stanford Housing &apos;27</b>: &ldquo;Anyone lived in Inner Sunset?&rdquo;</>, at: "2026-11-10T20:00:00Z" },
    { id: "n4", href: "#", avatar: { name: "Friends" }, badge: "friends", text: <>You have <b>3 new friend suggestions</b> from Stanford.</>, at: "2026-11-10T01:00:00Z" },
  );
  items.sort((a, b) => (a.at < b.at ? 1 : -1));

  const Badge = ({ kind }: { kind?: Notif["badge"] }) => {
    if (!kind) return null;
    const common = "absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-white";
    if (kind === "muse") return <span className={`${common} bg-white`}><MuseMark size={20} /></span>;
    if (kind === "group") return <span className={`${common} bg-fb-blue`}><GroupsIcon size={13} /></span>;
    if (kind === "event") return <span className={`${common} bg-fb-red`}><CalendarIcon size={13} /></span>;
    return <span className={`${common} bg-fb-blue`}><FriendsIcon size={13} /></span>;
  };

  for (const it of items) if (it.unread) it.unread = it.at > seenAt;

  return (
    <div className="mx-auto max-w-[680px] pb-24 md:py-4">
      <MarkSeen kind="notifications" />
      <section className="fb-card rounded-none md:rounded-[8px]">
        <div className="flex items-center justify-between px-4 pt-4">
          <h1 className="text-[24px] font-bold">Notifications</h1>
        </div>
        <div className="flex gap-2 px-4 pb-2 pt-3">
          <button className="rounded-full bg-fb-blue-soft px-3 py-1.5 text-[15px] font-semibold text-fb-blue">All</button>
          <button className="rounded-full px-3 py-1.5 text-[15px] font-semibold hover:bg-fb-hover">Unread</button>
        </div>
        <div className="px-4 pb-1 pt-1 text-[17px] font-bold">New</div>
        <ul className="pb-2">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.href} className="flex items-start gap-3 px-2 py-2 hover:bg-fb-hover md:rounded-lg md:mx-2">
                <span className="relative shrink-0">
                  {n.avatar === "muse" ? (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-fb-bg">
                      <MuseMark size={40} />
                    </span>
                  ) : (
                    <Avatar src={n.avatar.src} name={n.avatar.name} size={56} />
                  )}
                  <Badge kind={n.badge} />
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="block text-[15px] leading-5">{n.text}</span>
                  <span className={`mt-0.5 block text-[13px] ${n.unread ? "font-semibold text-fb-blue" : "text-fb-muted"}`}>{timeAgo(n.at)}</span>
                </span>
                {n.unread && <span className="mt-5 h-3 w-3 shrink-0 rounded-full bg-fb-blue" />}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
