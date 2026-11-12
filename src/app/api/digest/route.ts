// GET -> { cards: DigestCard[] }   Ember writes a short digest of open asks in the persona's Groups (breadth beat).
// The prompt is built in lib/digest.ts (shared with scripts/warm-cache.ts).
import { NextResponse } from "next/server";
import { buildDigest } from "@/lib/digest";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ cards: [] });
  return NextResponse.json({ cards: await buildDigest(me) });
}
