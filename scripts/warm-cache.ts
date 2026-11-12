// `npm run warm` — pre-run every hero-demo model call so the responses sit in .cache/muse/ (keyed by input hash).
// On stage: run live; if the network flakes, MOCK_MUSE=true replays exactly these cached responses (PRD §12).
// Needs a real key to be useful. Offline it just exercises the mock path.
import "./env";
import { parseAsk } from "../src/lib/asks";
import { getAsk, getUser, resetRuntime } from "../src/lib/db";
import { runIntake } from "../src/lib/intake";
import { createListing } from "../src/lib/listing";
import { runMatching } from "../src/lib/match";
import { openThreadForMatch } from "../src/lib/messenger";
import { museMode } from "../src/lib/muse";

// The exact lines the demo types into the Muse sheet. Keep in sync with docs/DEMO.md.
export const DEMO_LINES = [
  "I signed a 2BR in the Mission from Sept 1 and need a roommate for the second bedroom",
  "Posting it at $1,350 but honestly I'd take $1,200 for the right person, keep that private",
  "I'm a night owl, my partner stays over some weekends, no dogs please. Don't share my health stuff ever.",
];

const PIXEL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z";

async function main() {
  process.env.MOCK_DELAY_MS ??= "0";
  console.log(`muse mode: ${museMode()}${museMode() === "mock" ? "  (no key: exercising the mock path only)" : ""}`);
  resetRuntime();
  const t0 = Date.now();

  // 1. Ask parsing, turn by turn, exactly as the sheet sends it.
  const convo: { role: "user" | "muse"; text: string }[] = [];
  let askId: string | undefined;
  for (const line of DEMO_LINES) {
    convo.push({ role: "user", text: line });
    const out = await parseAsk({ userId: "alex", groupId: "g_housing27", askId, conversation: convo });
    askId = out.ask.id;
    if (out.followUp) convo.push({ role: "muse", text: out.followUp });
    console.log(`ask turn ${convo.filter((c) => c.role === "user").length}: ready=${out.ready} prefs=${out.ask.preferences.length}`);
  }

  // 2. Intake with sample frames (replace with real hotel-room frames by dropping JPEGs in scripts/frames/).
  const fs = await import("fs");
  const dir = "scripts/frames";
  const frames = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => /\.(jpe?g|png)$/i.test(f))
        .map((f) => `data:image/jpeg;base64,${fs.readFileSync(`${dir}/${f}`).toString("base64")}`)
    : [PIXEL, PIXEL, PIXEL];
  const intake = await runIntake(frames, "the desk can stay");
  console.log(`intake: room=${!!intake.room} items=${intake.items.map((i) => i.name).join(", ")}`);

  // 3. Matching for the seed ask (the live demo creates its own ask, which hashes differently, so also warm
  //    the seed one for `MOCK_MUSE=true` fallback).
  for (const id of [askId!, "ask_alex_seed"]) {
    const ask = getAsk(id)!;
    const matches = await runMatching(ask);
    console.log(`matching ${id}: ${matches.map((m) => `${getUser(m.candidateId)!.name.split(" ")[0]}:${m.verdict.compatible ? "fit" : "no"}`).join(" ")}`);
    for (const m of matches.filter((m) => m.verdict.compatible)) {
      const t = await openThreadForMatch(m.id, "alex");
      console.log(`  opener → ${m.candidateId}: ${t.draft?.text.slice(0, 60)}…`);
    }
    if (ask.items?.length) {
      const l = await createListing("alex", ask.items, ask.id);
      console.log(`  listing: ${l.title} $${l.priceUsd}`);
    }
  }
  const cached = fs.existsSync(".cache/muse") ? fs.readdirSync(".cache/muse").length : 0;
  console.log(`\nwarm in ${Date.now() - t0}ms. Cached responses on disk: ${cached}${cached === 0 ? " (mock mode writes none)" : ""}`);
  console.log("Note: this reset the runtime store (.cache/runtime.json). Run it BEFORE the demo, not during.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
