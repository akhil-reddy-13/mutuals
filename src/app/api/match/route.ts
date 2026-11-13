// GET ?askId=... -> text/event-stream of MatchEvent (start, turn, verdict, failed, connection, done, error).
// POST { askId }  -> { matches: Match[] } (same work, no stream; used by scripts).
// Candidates run in parallel; see lib/match.ts.
import { NextResponse } from "next/server";
import { getAsk, getUser, optIntoGroup, saveAsk, updateUser } from "@/lib/db";
import { runMatching } from "@/lib/match";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const askId = url.searchParams.get("askId") ?? "";
  const reachParam = url.searchParams.get("reach");
  let ask = getAsk(askId);
  // The opt-in choice: who this person's Muse may talk to. Saved on the ask and as their default.
  if (ask && (reachParam === "network" || reachParam === "groups" || reachParam === "everyone")) {
    ask = { ...ask, museReach: reachParam };
    saveAsk(ask);
    updateUser(ask.userId, { museReach: reachParam });
  } else if (ask && !ask.museReach) {
    // No explicit choice on this ask: use the person's Muse settings.
    ask = { ...ask, museReach: getUser(ask.userId)?.museReach ?? "groups" };
    saveAsk(ask);
  }
  const owner = ask ? getUser(ask.userId) : undefined;
  if (ask && owner && !owner.museEnabled) {
    const enc = new TextEncoder();
    return new Response(enc.encode(`data: ${JSON.stringify({ type: "error", message: "MUSE_OFF" })}\n\n`), {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }
  if (!ask) return new Response("unknown ask", { status: 404 });
  optIntoGroup(ask.userId, ask.groupId); // starting a search is the opt-in for this Group

  const enc = new TextEncoder();
  // Matching must finish even if the phone locks or Safari drops the stream: once the client is gone, `send`
  // becomes a no-op and runMatching keeps writing matches to the store (the Group page / notifications pick
  // them up; the sheet recovers by polling).
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };
      try {
        await runMatching(ask, send);
      } catch (e) {
        send({ type: "error", message: String(e) });
      }
      if (!closed) {
        closed = true;
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      closed = true;
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}

export async function POST(req: Request) {
  const { askId, reach } = await req.json();
  let ask = getAsk(askId);
  if (!ask) return NextResponse.json({ error: "unknown ask" }, { status: 404 });
  if (reach === "network" || reach === "groups" || reach === "everyone") {
    ask = { ...ask, museReach: reach };
    saveAsk(ask);
    updateUser(ask.userId, { museReach: reach });
  }
  optIntoGroup(ask.userId, ask.groupId);
  const matches = await runMatching(ask);
  return NextResponse.json({ matches });
}
