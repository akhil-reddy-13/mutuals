// POST { askId } -> Match[]  (reach.candidateAsks -> negotiation.runNegotiation; reach.candidatePosts -> one-sided postEvalPrompt + opener draft; then connection judgment)
// OWNER: see CLAUDE.md "Who owns what". Contract documented in docs/PRD.md.
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json({ error: "TODO: match not implemented" }, { status: 501 });
}
