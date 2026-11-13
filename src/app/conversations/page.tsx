// DEMO ONLY, not a product feature: every Muse-to-Muse conversation the current persona's Muse has had, as a grid of
// small chat boxes, so the audience can watch the agents talk. People never see the other side's raw turns in the
// product (they get the shortlist and "What <name>'s Muse saw"). Turns are stored already redacted (negotiation.ts).
import Link from "next/link";
import ConversationGrid, { type ConvoView } from "@/components/muse/ConversationGrid";
import { BackIcon } from "@/components/icons";
import { allNegotiations, getAsk, getGroup, getUser } from "@/lib/db";
import { firstName } from "@/lib/format";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const me = await currentUser();

  // Latest negotiation per ask and other person (a re-run replaces the old one, even when the other person has since
  // made a newer ask), only the ones my Muse was part of. The store keeps the last-saved last.
  const latest = new Map<string, ReturnType<typeof allNegotiations>[number]>();
  for (const n of allNegotiations()) latest.set(`${n.askAId}|${getAsk(n.askBId)?.userId ?? n.askBId}`, n);

  const byAsk = new Map<string, { askId: string; summary: string; group: string; createdAt: string; convos: ConvoView[] }>();
  for (const n of latest.values()) {
    const askA = getAsk(n.askAId);
    const askB = getAsk(n.askBId);
    if (!askA || !askB || (askA.userId !== me.id && askB.userId !== me.id)) continue;
    const meIsA = askA.userId === me.id;
    const other = getUser(meIsA ? askB.userId : askA.userId);
    if (!other) continue;
    // Group under the asker's ask (the one that started matching), so a candidate persona sees it under Alex's ask too.
    const asker = askA;
    const key = asker.id;
    if (!byAsk.has(key))
      byAsk.set(key, { askId: key, summary: asker.summary, group: getGroup(asker.groupId)?.name ?? "", createdAt: asker.createdAt, convos: [] });
    byAsk.get(key)!.convos.push({
      id: n.id,
      running: n.status === "running",
      meName: firstName(me.name),
      meAvatar: me.avatarUrl,
      otherName: firstName(other.name),
      otherAvatar: other.avatarUrl,
      verdict: n.verdict ? { compatible: n.verdict.compatible } : null,
      turns: n.rounds.map((t) => ({
        side: t.speaker === "orchestrator" ? "note" : (t.speaker === "A") === meIsA ? "me" : "other",
        text: t.message,
      })),
    });
  }
  // Newest ask first; inside an ask, a stable order (by name) so boxes don't jump while they update.
  const groups = [...byAsk.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  for (const g of groups) g.convos.sort((a, b) => a.otherName.localeCompare(b.otherName));
  const total = groups.reduce((n, g) => n + g.convos.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 pb-24 pt-4 md:py-5">
      <header className="flex flex-col gap-2">
        <Link href="/" className="inline-flex w-fit items-center gap-1 text-[15px] font-semibold text-fb-muted hover:text-fb-text">
          <BackIcon size={18} />
          Home
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">{firstName(me.name)}&apos;s Muse, talking</h1>
          <span className="rounded-full bg-fb-chip px-2.5 py-0.5 text-[12px] font-bold text-fb-muted">Demo view</span>
        </div>
        <p className="text-[15px] text-fb-muted">
          {total === 0 ? "No Muse conversations yet. Ask Muse in a Group and they show up here live." : `${total} ${total === 1 ? "conversation" : "conversations"} with other people's Muses. Updates live.`}
        </p>
      </header>
      <ConversationGrid groups={groups} />
    </div>
  );
}
