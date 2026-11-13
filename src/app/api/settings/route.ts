// POST { museEnabled?, museReach?, connectionSuggestionsOptIn? } -> { ok }   Muse settings for the current persona.
import { NextResponse } from "next/server";
import { updateUser } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import type { User } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json();
  const patch: Partial<User> = {};
  if (typeof body.museEnabled === "boolean") patch.museEnabled = body.museEnabled;
  if (typeof body.connectionSuggestionsOptIn === "boolean") patch.connectionSuggestionsOptIn = body.connectionSuggestionsOptIn;
  if (body.museReach === "network" || body.museReach === "groups" || body.museReach === "everyone") patch.museReach = body.museReach;
  updateUser(await currentUserId(), patch);
  return NextResponse.json({ ok: true });
}
