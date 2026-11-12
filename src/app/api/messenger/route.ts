// POST { matchId } -> { threadId, draft }  (Spark, prompts.openerPrompt); also handle sending messages into a thread
// OWNER: see CLAUDE.md "Who owns what". Contract documented in docs/PRD.md.
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json({ error: "TODO: messenger not implemented" }, { status: 501 });
}
