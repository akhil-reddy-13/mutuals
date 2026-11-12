// POST { frames: string[] (data URLs), narration?: string } -> { room: RoomDetails|null, items: Item[] }  (Ember, prompts.intakePrompt, schemas.IntakeSchema)
// OWNER: see CLAUDE.md "Who owns what". Contract documented in docs/PRD.md.
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json({ error: "TODO: intake not implemented" }, { status: 501 });
}
