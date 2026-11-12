// POST { eventId } -> { event }   current persona taps "Going" on the suggested Facebook Event
import { NextResponse } from "next/server";
import { getEvent, joinEvent } from "@/lib/db";
import { currentUserId } from "@/lib/session";

export async function POST(req: Request) {
  const { eventId } = await req.json();
  joinEvent(eventId, await currentUserId());
  return NextResponse.json({ event: getEvent(eventId) });
}
