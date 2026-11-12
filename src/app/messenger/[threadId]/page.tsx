// Messenger thread with the Muse-drafted opener. The human edits and sends. PRD §11.8 / handoff 4d.
import { notFound } from "next/navigation";
import ThreadView from "@/components/ThreadView";
import { getAsk, getMatch, getThread, getUser } from "@/lib/db";
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
  return (
    <ThreadView
      thread={thread}
      me={{ id: me.id, name: me.name, avatarUrl: me.avatarUrl }}
      other={{ id: other.id, name: other.name, avatarUrl: other.avatarUrl, museOn: other.museEnabled }}
      context={match ? { summary: match.verdict.summaryForHumans, askSummary: ask?.summary ?? "", mode: match.mode, groupId: ask?.groupId ?? "", askId: ask?.id ?? "" } : undefined}
    />
  );
}
