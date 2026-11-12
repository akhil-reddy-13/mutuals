// `npm run demo` — run the hero matching for Alex's seed ask from the terminal and print every event.
// Works offline: MOCK_MUSE=true npm run demo. With a real key it spends credits (and warms the cache).
import "./env";
import { resetRuntime, getAsk, getUser, agentLogFor } from "../src/lib/db";
import { runMatching } from "../src/lib/match";
import { openThreadForMatch } from "../src/lib/messenger";
import { leaks } from "../src/lib/privacy";
import { museMode } from "../src/lib/muse";

async function main() {
  process.env.MOCK_DELAY_MS ??= "0";
  console.log(`muse mode: ${museMode()}`);
  resetRuntime();
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
