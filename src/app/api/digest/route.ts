// POST { userId } -> DigestCard[]  (Ember, prompts.digestPrompt over seed asks in reach)
// OWNER: see CLAUDE.md "Who owns what". Contract documented in docs/PRD.md.
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json({ error: "TODO: digest not implemented" }, { status: 501 });
}
