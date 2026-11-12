// POST { askId, items: Item[] } -> { ok }   Save the seller's identified + edited items onto the ask before matching,
// so routing uses exactly what the seller approved (Spark's model names, their prices), not Ember's first pass.
import { NextResponse } from "next/server";
import { getAsk, saveAsk } from "@/lib/db";
import type { Item } from "@/lib/types";

export async function POST(req: Request) {
  const { askId, items } = (await req.json()) as { askId: string; items: Item[] };
  const ask = getAsk(askId);
  if (!ask || !Array.isArray(items)) return NextResponse.json({ error: "askId and items required" }, { status: 400 });
  saveAsk({ ...ask, items });
  return NextResponse.json({ ok: true });
}
