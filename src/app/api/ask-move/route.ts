// POST { askId, groupId } -> { ask }   Move an ask to another of my Groups (Muse: "nobody here, want me to ask there?").
import { NextResponse } from "next/server";
import { getAsk, getGroup, saveAsk } from "@/lib/db";

export async function POST(req: Request) {
  const { askId, groupId } = await req.json();
  const ask = getAsk(askId);
  if (!ask || !getGroup(groupId)) return NextResponse.json({ error: "unknown ask or group" }, { status: 400 });
  const moved = { ...ask, groupId, status: "draft" as const };
  saveAsk(moved);
  return NextResponse.json({ ask: moved });
}
