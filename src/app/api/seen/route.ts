// POST { kind: "notifications" | "thread", threadId? } -> { ok }   The current persona looked: clear that badge.
import { NextResponse } from "next/server";
import { markThreadRead, updateUser } from "@/lib/db";
import { currentUserId } from "@/lib/session";

export async function POST(req: Request) {
  const { kind, threadId } = await req.json();
  const me = await currentUserId();
  if (kind === "thread" && threadId) markThreadRead(threadId, me);
  if (kind === "notifications") updateUser(me, { notificationsSeenAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
