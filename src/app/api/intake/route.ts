// POST { frames: string[] (data URLs), narration?: string, askId?: string }
//   -> { room: RoomDetails|null, items: Item[] }   (Ember, prompts.intakePrompt, schemas.IntakeSchema)
// If askId is given, the result is saved onto the ask.
import { NextResponse } from "next/server";
import { getAsk, saveAsk } from "@/lib/db";
import { runIntake } from "@/lib/intake";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();
  const frames: string[] = Array.isArray(body.frames) ? body.frames : [];
  try {
    const out = await runIntake(frames, body.narration);
    if (body.askId) {
      const ask = getAsk(body.askId);
      if (ask) saveAsk({ ...ask, roomDetails: out.room ?? ask.roomDetails, items: out.items });
    }
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
