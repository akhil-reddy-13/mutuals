// POST { conversation: string, userId } -> Ask (saved) | { follow_up_question }  (Spark, prompts.askParsePrompt)
// OWNER: see CLAUDE.md "Who owns what". Contract documented in docs/PRD.md.
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json({ error: "TODO: asks not implemented" }, { status: 501 });
}
