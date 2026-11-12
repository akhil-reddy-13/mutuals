// POST { groupId, askId?, conversation: {role:"user"|"muse", text}[] }
//   -> { ask, followUp: string|null, ready: boolean }          (Spark, prompts.askParsePrompt, schemas.AskParseSchema)
// PATCH { askId, preferences?, roomDetails?, items?, summary? } -> { ask }   (chip edits, intake results)
// GET ?askId -> { ask }
import { NextResponse } from "next/server";
import { parseAsk } from "@/lib/asks";
import { getAsk, saveAsk } from "@/lib/db";
import { currentUserId } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json();
  const userId = await currentUserId();
  try {
    const out = await parseAsk({ userId, groupId: body.groupId, askId: body.askId, conversation: body.conversation ?? [] });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const ask = getAsk(body.askId);
  if (!ask) return NextResponse.json({ error: "unknown ask" }, { status: 404 });
  const next = {
    ...ask,
    ...(body.preferences ? { preferences: body.preferences } : {}),
    ...(body.roomDetails !== undefined ? { roomDetails: body.roomDetails } : {}),
    ...(body.items !== undefined ? { items: body.items } : {}),
    ...(body.summary ? { summary: body.summary } : {}),
  };
  saveAsk(next);
  return NextResponse.json({ ask: next });
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("askId") ?? "";
  const ask = getAsk(id);
  if (!ask) return NextResponse.json({ error: "unknown ask" }, { status: 404 });
  return NextResponse.json({ ask });
}
