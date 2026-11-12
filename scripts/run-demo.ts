// `npm run demo` — run the hero matching for Alex's seed ask from the terminal and print every event.
// Works offline: MOCK_MUSE=true npm run demo. With a real key it spends credits (and warms the cache).
import "./env";
import { resetRuntime, getAsk, getUser, agentLogFor } from "../src/lib/db";
import { runMatching } from "../src/lib/match";
import { openThreadForMatch } from "../src/lib/messenger";
import { leaks } from "../src/lib/privacy";
import { museMode } from "../src/lib/muse";

// `npm run demo -- plus_one` or `npm run demo -- ride` runs the other live flows through ask parsing first.
const FLOWS: Record<string, { groupId: string; lines: string[]; userId?: string }> = {
  reverse: {
    userId: "priya",
    groupId: "g_housing27",
    lines: ["Looking for a room in SF from early September", "Around $1,200 but I could stretch to $1,300 for the right place, keep that private. I'm up at 7 so I need quiet after 11."],
  },
  need: {
    groupId: "g_ffs",
    lines: ["Need a tent for a camping trip next month", "Yosemite, Dec 6. Yeah honestly down to go with people, none of my friends camp. I'd spend like $40, could do $60 for a good one but keep that private"],
  },
  plus_one: {
    groupId: "g_sfgrads",
    lines: [
      "Going to beabadoobee at the Fox on Dec 12 and nobody I know is going",
      "No ticket yet, I'd pay up to $70 for a spare but keep that private",
      "Drinks before would be fun, small group, and I don't have a car so I'd need a ride back to the Mission",
    ],
  },
  ride: {
    groupId: "g_ffs",
    lines: ["Need a ride to SFO Friday afternoon from the Mission", "Flight's at 5:10, one carry-on and a backpack, happy to split gas"],
  },
};

async function main() {
  process.env.MOCK_DELAY_MS ??= "0";
  console.log(`muse mode: ${museMode()}`);
  const flow = process.argv[2];
  // Reset by default so stale threads/log entries from an earlier run (e.g. a mock run) don't show up. RESET=0 keeps them.
  if (process.env.RESET !== "0") resetRuntime();
  else console.log("(RESET=0: keeping the runtime store from earlier runs)");
  if (flow && FLOWS[flow]) {
    const { parseAsk } = await import("../src/lib/asks");
    const convo: { role: "user" | "muse"; text: string }[] = [];
    let askId: string | undefined;
    for (const line of FLOWS[flow].lines) {
      convo.push({ role: "user", text: line });
      const out = await parseAsk({ userId: FLOWS[flow].userId ?? "alex", groupId: FLOWS[flow].groupId, askId, conversation: convo });
      askId = out.ask.id;
      console.log(`Muse: ${out.followUp ?? "(ready)"}  [${out.ask.type}, ${out.ask.preferences.length} prefs]`);
      if (out.followUp) convo.push({ role: "muse", text: out.followUp });
    }
    const ask = getAsk(askId!)!;
    const matches = await runMatching(ask, (e) => {
      if (e.type === "start") console.log(`→ candidates: ${e.candidates.map((c) => `${c.name} (${c.mode})`).join(", ")}`);
      if (e.type === "turn") console.log(`  [${e.candidateId}] ${e.turn.speaker}: ${e.turn.message.slice(0, 100)}`);
      if (e.type === "verdict") console.log(`  [${e.candidateId}] VERDICT ${e.match.verdict.compatible ? "✅" : "❌"} ${e.match.verdict.summaryForHumans}`);
      if (e.type === "connection") console.log(`  [${e.candidateId}] connection: ${e.connection?.suggest ? `✨ ${e.connection.reason} → ${e.connection.eventId}` : "none"}`);
    });
    for (const m of matches.filter((m) => m.verdict.compatible)) {
      const t = await openThreadForMatch(m.id, FLOWS[flow].userId ?? "alex");
      console.log(`  opener → ${m.candidateId}: ${t.draft?.text}`);
    }
    return;
  }
  const ask = getAsk("ask_alex_seed")!;
  const t0 = Date.now();
  const matches = await runMatching(ask, (e) => {
    if (e.type === "start") console.log(`→ candidates: ${e.candidates.map((c) => `${c.name} (${c.mode})`).join(", ")}`);
    if (e.type === "turn") console.log(`  [${e.candidateId}] ${e.turn.speaker}: ${e.turn.message.slice(0, 110)}${e.turn.disclosed.length ? `  (disclosed ${e.turn.disclosed.join(",")})` : ""}`);
    if (e.type === "verdict") console.log(`  [${e.candidateId}] VERDICT ${e.match.verdict.compatible ? "✅" : "❌"} ${e.match.verdict.summaryForHumans}`);
    if (e.type === "connection") console.log(`  [${e.candidateId}] connection: ${e.connection?.suggest ? `✨ ${e.connection.reason} → ${e.connection.eventId}` : "none"}`);
  });
  console.log(`\n${matches.length} matches in ${Date.now() - t0}ms`);
  for (const m of matches) {
    const u = getUser(m.candidateId)!;
    console.log(`\n${u.name} [${m.mode}] ${m.verdict.compatible ? "fit" : "no fit"}`);
    console.log(`  fits: ${m.verdict.fits.join(" | ")}`);
    console.log(`  disagreements: ${m.verdict.disagreements.join(" | ")}`);
    console.log(`  compromise: ${m.verdict.compromise}`);
    console.log(`  trust: ${m.trustSignals.join(", ")}`);
    if (m.draftReply) console.log(`  draft reply: ${m.draftReply}`);
    // Leak check: nothing shown to a human may contain a private number from either side.
    const other = getAsk(`ask_${m.candidateId}`);
    const prefs = [...ask.preferences, ...(other?.preferences ?? [])];
    const shown = [...m.verdict.fits, ...m.verdict.disagreements, m.verdict.compromise ?? "", m.verdict.summaryForHumans, m.draftReply ?? ""].join("\n");
    const l = leaks(shown, prefs);
    console.log(`  leak check: ${l.length ? `LEAKED ${l.join(", ")}` : "clean"}`);
  }
  const priya = matches.find((m) => m.candidateId === "priya");
  if (priya) {
    const thread = await openThreadForMatch(priya.id, "alex");
    console.log(`\nMessenger draft for Alex → Priya:\n  ${thread.draft?.text}`);
  }
  console.log(`\nWhat Alex's Muse shared (${agentLogFor("alex").length} messages):`);
  for (const e of agentLogFor("alex")) console.log(`  to ${e.counterpartId}: ${e.message.slice(0, 90)}…  [${e.disclosed.join(", ")}]`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
