// POST { groupId } -> { ok, museGroups }   The per-Group opt-in Muse asks in chat ("Want me to check with other Muses in X?").
import { NextResponse } from "next/server";
import { getUser, optIntoGroup } from "@/lib/db";
import { currentUserId } from "@/lib/session";

export async function POST(req: Request) {
  const { groupId } = await req.json();
  const userId = await currentUserId();
  optIntoGroup(userId, groupId);
  return NextResponse.json({ ok: true, museGroups: getUser(userId)?.museGroups ?? [] });
}
