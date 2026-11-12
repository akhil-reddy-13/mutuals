// GET ?askId=... -> { matches }   |   GET (no params) -> { matches } involving the current persona (both sides)
import { NextResponse } from "next/server";
import { matchesForAsk, matchesInvolving } from "@/lib/db";
import { sortMatches } from "@/lib/match";
import { currentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const askId = new URL(req.url).searchParams.get("askId");
  const matches = askId ? matchesForAsk(askId) : matchesInvolving(await currentUserId());
  return NextResponse.json({ matches: sortMatches(matches) });
}
