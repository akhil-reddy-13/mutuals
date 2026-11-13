// POST { museEnabled?, museReach?, connectionSuggestionsOptIn?, museGroup?: { id, on } } -> { ok }   Muse settings for the current persona.
import { NextResponse } from "next/server";
import { getUser, setMuseGroup, updateUser } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import type { User } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json();
  const patch: Partial<User> = {};
  if (typeof body.museEnabled === "boolean") patch.museEnabled = body.museEnabled;
  if (typeof body.connectionSuggestionsOptIn === "boolean") patch.connectionSuggestionsOptIn = body.connectionSuggestionsOptIn;
  if (body.museReach === "network" || body.museReach === "groups" || body.museReach === "everyone") patch.museReach = body.museReach;
  const userId = await currentUserId();
  updateUser(userId, patch);
  // One Group's switch. Only for Groups I'm actually in.
  const g = body.museGroup;
  if (g && typeof g.id === "string" && typeof g.on === "boolean" && getUser(userId)?.groups.includes(g.id)) setMuseGroup(userId, g.id, g.on);
  return NextResponse.json({ ok: true });
}
