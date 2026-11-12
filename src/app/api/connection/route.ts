// POST { matchId } -> { connection }   re-run the Wonder connection judgment for one match (normally done inside /api/match)
import { NextResponse } from "next/server";
import { judgeConnection } from "@/lib/connection";
import { getAsk, getMatch, getUser, saveMatch } from "@/lib/db";

export async function POST(req: Request) {
  const { matchId } = await req.json();
  const m = getMatch(matchId);
  if (!m) return NextResponse.json({ error: "unknown match" }, { status: 404 });
  const connection = await judgeConnection(getUser(m.userId)!, getUser(m.candidateId)!, getAsk(m.askId)!, m.verdict);
  saveMatch({ ...m, connection });
  return NextResponse.json({ connection });
}
