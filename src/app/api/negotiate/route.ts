// GET ?askA=...&askB=... -> text/event-stream of NegotiationTurn events, then a final {type:"verdict"} event.
// OWNER: agent engine. Uses negotiation.runNegotiation(askA, askB, onTurn).
import { getAsk } from "@/lib/db";
import { runNegotiation } from "@/lib/negotiation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const askA = getAsk(url.searchParams.get("askA") ?? "");
  const askB = getAsk(url.searchParams.get("askB") ?? "");
  if (!askA || !askB) return new Response("unknown ask", { status: 404 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        const { negotiation, verdict } = await runNegotiation(askA, askB, (turn) => send({ type: "turn", turn }));
        send({ type: "verdict", negotiationId: negotiation.id, verdict });
      } catch (e) {
        send({ type: "error", message: String(e) });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
