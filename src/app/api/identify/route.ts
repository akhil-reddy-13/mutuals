// POST { item: Item, transcript?: string, nearby?: string[] (≤2 neighboring frames) } -> { item }   (Spark identifies the exact model + used price range)
import { NextResponse } from "next/server";
import { identifyItem } from "@/lib/identify";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { item, transcript, nearby, frames } = await req.json();
    if (!item?.name) return NextResponse.json({ error: "item required" }, { status: 400 });
    return NextResponse.json({ item: await identifyItem(item, transcript, Array.isArray(nearby) ? nearby.slice(0, 2) : [], Array.isArray(frames) ? frames.slice(0, 12) : []) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
