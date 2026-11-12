// GET ?negotiationId=... -> { entries, prefs }  "What my Muse shared": the current persona's OWN outgoing agent messages only.
import { NextResponse } from "next/server";
import { agentLogFor, getAsk, getNegotiation } from "@/lib/db";
import { currentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const negotiationId = new URL(req.url).searchParams.get("negotiationId") ?? undefined;
  const me = await currentUserId();
  const entries = agentLogFor(me, negotiationId);
  const neg = negotiationId ? getNegotiation(negotiationId) : undefined;
  const myAsk = neg ? [getAsk(neg.askAId), getAsk(neg.askBId)].find((a) => a?.userId === me) : undefined;
  const prefs = Object.fromEntries((myAsk?.preferences ?? []).map((p) => [p.id, { topic: p.topic, visibility: p.visibility, value: p.value }]));
  return NextResponse.json({ entries, prefs });
}
