// POST { matchId }           -> { thread }  opens (or returns) the thread with a Spark-drafted opener for the current persona
// GET  ?threadId=...         -> { thread }  (polled every 2s so two phones see each other)
// PUT  { threadId, text }    -> { thread }  the human sends a message
import { NextResponse } from "next/server";
import { getThread } from "@/lib/db";
import { openThreadForMatch, sendMessage } from "@/lib/messenger";
import { currentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { matchId } = await req.json();
  try {
    const thread = await openThreadForMatch(matchId, await currentUserId());
    return NextResponse.json({ thread });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("threadId") ?? "";
  const thread = getThread(id);
  if (!thread) return NextResponse.json({ error: "unknown thread" }, { status: 404 });
  return NextResponse.json({ thread });
}

export async function PUT(req: Request) {
  const { threadId, text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });
  const thread = sendMessage(threadId, await currentUserId(), String(text).trim());
  return NextResponse.json({ thread });
}
