// Messenger thread with the Muse-drafted opener. The human edits and sends. PRD §11.8 / handoff 4d.
import { notFound } from "next/navigation";
import ThreadView from "@/components/ThreadView";
import { getAsk, getGroup, getMatch, getThread, getUser } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const thread = getThread(threadId);
  if (!thread) notFound();
  const me = await currentUser();
  const otherId = thread.participantIds.find((p) => p !== me.id) ?? thread.participantIds[0];
  const other = getUser(otherId)!;
  const match = thread.matchId ? getMatch(thread.matchId) : undefined;
  const ask = match ? getAsk(match.askId) : undefined;
  // Header line under their name: their school (or city), then the Group the match came from.
  const groupId = ask?.groupId ?? me.groups.find((g) => other.groups.includes(g));
  const group = groupId ? getGroup(groupId) : undefined;
  const bothIn = !!group && me.groups.includes(group.id) && other.groups.includes(group.id);
  const subtitle = [other.school ?? other.city, group && (bothIn ? `You're both in ${group.name}` : group.name)].filter(Boolean).join(" · ");
  return (
    <ThreadView
      thread={thread}
      me={{ id: me.id, name: me.name, avatarUrl: me.avatarUrl }}
      other={{ id: other.id, name: other.name, avatarUrl: other.avatarUrl, museOn: other.museEnabled, subtitle }}
      context={match ? { summary: match.verdict.summaryForHumans, askSummary: ask?.summary ?? "", mode: match.mode, groupId: ask?.groupId ?? "", askId: ask?.id ?? "" } : undefined}
    />
  );
}
