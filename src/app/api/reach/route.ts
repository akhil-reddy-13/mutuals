// GET ?askId=... -> { counts: { network, groups, everyone }, current }  How many people's Muses each reach would check.
import { NextResponse } from "next/server";
import { getAsk, getUser } from "@/lib/db";
import { reachCounts } from "@/lib/reach";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ask = getAsk(new URL(req.url).searchParams.get("askId") ?? "");
  if (!ask) return NextResponse.json({ error: "unknown ask" }, { status: 404 });
  return NextResponse.json({ counts: reachCounts(ask), current: ask.museReach ?? getUser(ask.userId)?.museReach ?? "groups" });
}
