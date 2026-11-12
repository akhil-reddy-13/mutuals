// POST { askId, itemIds?: string[] } -> { listing }   (Spark writes the Marketplace listing for leftover items)
import { NextResponse } from "next/server";
import { getAsk } from "@/lib/db";
import { createListing } from "@/lib/listing";
import { currentUserId } from "@/lib/session";

export async function POST(req: Request) {
  const { askId, itemIds } = await req.json();
  const ask = getAsk(askId);
  if (!ask?.items?.length) return NextResponse.json({ error: "no items on ask" }, { status: 400 });
  const items = itemIds?.length ? ask.items.filter((i) => itemIds.includes(i.id)) : ask.items;
  const listing = await createListing(await currentUserId(), items, askId);
  return NextResponse.json({ listing });
}
