// POST { askId, items?: Item[] (the seller's edited items), itemIds?: string[] } -> { listing }
// Spark writes the Marketplace listing. Edited items (names, models, prices) win over what intake found, and are
// saved back onto the ask so matching sees the same items the seller approved.
import { NextResponse } from "next/server";
import { getAsk, saveAsk } from "@/lib/db";
import { createListing } from "@/lib/listing";
import { currentUserId } from "@/lib/session";
import type { Item } from "@/lib/types";

export async function POST(req: Request) {
  const { askId, itemIds, items: edited } = (await req.json()) as { askId: string; itemIds?: string[]; items?: Item[] };
  const ask = getAsk(askId);
  let items: Item[] = [];
  if (Array.isArray(edited) && edited.length) {
    items = edited;
    if (ask) saveAsk({ ...ask, items: edited });
  } else if (ask?.items?.length) {
    items = itemIds?.length ? ask.items.filter((i) => itemIds.includes(i.id)) : ask.items;
  }
  if (!items.length) return NextResponse.json({ error: "no items to list" }, { status: 400 });
  const listing = await createListing(await currentUserId(), items, askId);
  return NextResponse.json({ listing });
}
