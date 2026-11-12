// `npm run warm` — pre-run every hero-demo model call so the responses sit in .cache/muse/ (keyed by the exact
// prompt). On stage the same calls then return instantly, and MOCK_MUSE=true replays them if the network flakes.
//
// The cache only hits if this script sends byte-identical prompts, so it mirrors the app step by step:
//   chat     the 3 DEMO_LINES through parseAsk, with the same Muse lines the sheet keeps in its history (sheetCopy)
//   path A   skip the video -> Yes, check (matching) -> Alex opens Messenger -> Priya opens Messenger
//   path B   (--video <file>) the same file the presenter uploads on stage: ffmpeg frames + narration (lib/media)
//            -> Ember intake -> Spark identifies each item -> List on Marketplace -> matching -> openers
//   seed     ask_alex_seed, for the offline fallback
//   digest   Alex's Muse page
// The runtime store is reset before each path (an existing Messenger thread would skip the opener call) and at
// the end, so the demo starts clean.
//
//   npm run warm
//   npm run warm -- --video ~/Desktop/room.mov [--narration "the desk can stay"]
//
// A video only hits the cache on stage if the phone uploads the SAME file (record it once, then pick it from
// Photos). A fresh recording gives Ember new frames, so intake and everything after it run live (~60 s).
import "./env";
import fs from "fs";
import path from "path";
import { parseAsk, type ChatMsg } from "../src/lib/asks";
import { getAsk, getGroup, getUser, optIntoGroup, resetRuntime, saveAsk } from "../src/lib/db";
import { buildDigest } from "../src/lib/digest";
import { identifyItem } from "../src/lib/identify";
import { runIntake } from "../src/lib/intake";
import { createListing } from "../src/lib/listing";
import { runMatching } from "../src/lib/match";
import { prepVideo } from "../src/lib/media";
import { openThreadForMatch } from "../src/lib/messenger";
import { museMode } from "../src/lib/muse";
import { canShowVideo, sheetCopy } from "../src/lib/sheetCopy";
import type { Ask, Item } from "../src/lib/types";

// The exact lines the demo types into the Muse sheet. Keep in sync with docs/DEMO.md.
export const DEMO_LINES = [
  "I signed a 2BR in the Mission from Sept 1 and need a roommate for the second bedroom",
  "Posting it at $1,350 but honestly I'd take $1,200 for the right person, keep that private",
  "I'm a night owl, my partner stays over some weekends, no dogs please. Don't share my health stuff ever.",
];
const USER = "alex";
const GROUP = "g_housing27";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const cacheDir = path.join(process.cwd(), ".cache", "muse");
const cached = () => (fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir).length : 0);

/** Run a step and say how long it took and how many new responses it cached (0 new = it was already warm). */
async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  const before = cached();
  const out = await fn();
  const fresh = cached() - before;
  console.log(`  ${label}: ${((Date.now() - t0) / 1000).toFixed(1)}s, ${fresh ? `${fresh} new` : "all cached"}`);
  return out;
}

/** The chat, exactly as MuseSheet.send() builds its history (messages with a card are not sent). */
async function chat(): Promise<Ask> {
  const group = getGroup(GROUP)!;
  const convo: ChatMsg[] = [{ role: "muse", text: sheetCopy.greeting(getUser(USER)!.name.split(" ")[0], group.name) }];
  let askId: string | undefined;
  let ready = false;
  for (const [i, line] of DEMO_LINES.entries()) {
    convo.push({ role: "user", text: line });
    const out = await step(`chat line ${i + 1}`, () => parseAsk({ userId: USER, groupId: GROUP, askId, conversation: convo }));
    askId = out.ask.id;
    if (!out.ready) {
      convo.push({ role: "muse", text: out.followUp ?? sheetCopy.moreDetail });
    } else if (!ready) {
      ready = true;
      convo.push({ role: "muse", text: sheetCopy.prefsIntro });
      // With a video step the sheet shows the video card (not sent); without one it asks the opt-in right away.
      if (!canShowVideo(out.ask)) convo.push({ role: "muse", text: sheetCopy.optIn(group.name) });
    } else {
      convo.push({ role: "muse", text: out.followUp ?? sheetCopy.updated });
    }
  }
  const ask = getAsk(askId!)!;
  console.log(`  ask: "${ask.summary}" (${ask.type}, ${ask.side}), ${ask.preferences.length} prefs, ready=${ready}`);
  if (!ready) console.warn("  ⚠ Muse is not ready after the 3 demo lines: on stage it will ask another question. Check the prompt or the lines.");
  return ask;
}

/** "Yes, check" (GET /api/match), then Messenger from both sides. */
async function matchAndOpen(ask: Ask) {
  optIntoGroup(ask.userId, ask.groupId);
  const matches = await step("matching", () => runMatching(ask));
  console.log(`  results: ${matches.map((m) => `${getUser(m.candidateId)!.name.split(" ")[0]}:${m.verdict.compatible ? "fit" : "no"}`).join(" ")}`);
  for (const m of matches.filter((m) => m.verdict.compatible)) {
    const who = getUser(m.candidateId)!.name.split(" ")[0];
    await step(`Alex opens Messenger with ${who}`, () => openThreadForMatch(m.id, ask.userId));
    // The other person opens it from their notification (Phone B) and gets their own drafted opener.
    if (m.mode === "agent_to_agent") await step(`${who} opens Messenger`, () => openThreadForMatch(m.id, m.candidateId));
  }
}

/** The video step, as VideoCapture -> /api/media -> /api/intake -> /api/identify -> /api/listing do it. */
async function video(ask: Ask, file: string, narration: string): Promise<Ask> {
  const ext = file.split(".").pop() ?? "mov";
  const { frames, audio } = await step("ffmpeg frames + narration", () => prepVideo(fs.readFileSync(file), ext));
  // /api/intake drops audio over 4,000,000 base64 chars
  const sendAudio = audio && audio.length < 4_000_000 ? audio : undefined;
  const intake = await step("Ember intake", () => runIntake(frames, narration, sendAudio));
  saveAsk({ ...ask, roomDetails: intake.room ?? ask.roomDetails, items: intake.items });
  // The sheet identifies every item the seller mentioned, in parallel, with the frames on either side.
  const active = intake.items.filter((i) => i.mentioned !== false);
  const identified: Item[] = await step(`Spark identifies ${active.length} items`, () =>
    Promise.all(
      active.map((it) => {
        const k = it.frameIndex ?? -1;
        const nearby = k >= 0 ? [frames[k - 1], frames[k + 1]].filter(Boolean).slice(0, 2) : [];
        return identifyItem(it, intake.transcript ?? undefined, nearby);
      }),
    ),
  );
  console.log(`  items: ${identified.map((i) => `${i.name} $${i.suggestedPriceUsd}`).join(", ") || "(none)"}`);
  if (identified.length) {
    // List on Marketplace: the edited items are saved back onto the ask, so matching sees them.
    saveAsk({ ...getAsk(ask.id)!, items: identified });
    await step("Marketplace listing", () => createListing(USER, identified, ask.id));
  }
  return getAsk(ask.id)!;
}

async function main() {
  process.env.MOCK_DELAY_MS ??= "0";
  const file = arg("video");
  const narration = arg("narration") ?? "";
  console.log(`muse mode: ${museMode()}${museMode() === "mock" ? "  (no key: exercising the mock path only)" : ""}`);
  if (file && !fs.existsSync(file)) throw new Error(`no such video: ${file}`);
  const t0 = Date.now();
  const failed: string[] = [];
  const run = async (name: string, fn: () => Promise<void>) => {
    console.log(`\n${name}`);
    resetRuntime();
    try {
      await fn();
    } catch (e) {
      failed.push(name);
      console.error(`  ✗ ${name} failed:`, e instanceof Error ? e.message : e);
    }
  };

  await run("A. chat, skip the video, match, Messenger", async () => matchAndOpen(await chat()));
  if (file) await run(`B. chat, video (${path.basename(file)}), list, match, Messenger`, async () => matchAndOpen(await video(await chat(), file, narration)));
  else console.log("\nB. video path skipped (pass --video <file> with the clip you'll upload on stage)");
  await run("Seed ask (offline fallback)", async () => matchAndOpen(getAsk("ask_alex_seed")!));
  await run("Digest (Alex's Muse page)", async () => {
    const cards = await step("digest", () => buildDigest(getUser(USER)!));
    console.log(`  cards: ${cards.map((c) => c.title).join(" | ")}`);
  });

  resetRuntime();
  console.log(`\nwarm in ${((Date.now() - t0) / 1000).toFixed(0)}s. Cached responses on disk: ${cached()}${cached() === 0 ? " (mock mode writes none)" : ""}`);
  console.log("The runtime store was reset, so the demo starts clean. Don't run this during the demo.");
  console.log("On stage: type the 3 lines exactly, and if you tap a privacy badge, tap it back before Yes, check (any change re-runs matching live).");
  if (failed.length) {
    console.error(`\nFailed: ${failed.join("; ")}`);
    process.exit(1);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
