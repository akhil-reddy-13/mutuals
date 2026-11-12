// POST { matchId } -> ConnectionSuggestion  (Wonder, prompts.connectionPrompt; show only if suggest && confidence>=0.7 && both opted in)
// OWNER: see CLAUDE.md "Who owns what". Contract documented in docs/PRD.md.
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json({ error: "TODO: connection not implemented" }, { status: 501 });
}
