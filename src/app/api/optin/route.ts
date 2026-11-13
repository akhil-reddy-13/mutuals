// POST { groupId } -> { ok, museGroups }   "Turn on for this Group" in the chat: switches Muse on there (also clears an
// explicit off from Muse settings).
import { NextResponse } from "next/server";
import { getUser, setMuseGroup } from "@/lib/db";
import { currentUserId } from "@/lib/session";

export async function POST(req: Request) {
  const { groupId } = await req.json();
  const userId = await currentUserId();
  if (getUser(userId)?.groups.includes(groupId)) setMuseGroup(userId, groupId, true);
  return NextResponse.json({ ok: true, museGroups: getUser(userId)?.museGroups ?? [] });
}
