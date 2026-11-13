// Screen-record the demo flows as plain desktop clips (MP4), driving the real app in Chrome.
// Unlike record.mjs (Luke's screenplay film in a phone frame), these are straight recordings of the app at laptop
// size, with a visible cursor, for the parts of the demo video we'd rather record than do live.
//
//   node scripts/video/clips.mjs                         # all clips
//   node scripts/video/clips.mjs roommate proof          # some clips
//   node scripts/video/clips.mjs roommate --room-video ~/Downloads/hotel.MOV
//   node scripts/video/clips.mjs selling --video ~/Downloads/IMG_6396.MOV
//   options: --app http://localhost:3000  --out recordings  --size 1440x900  --headed
//
// Clips:
//   friends        THE centerpiece: Alex's roommate search -> Priya's "More than a lease" -> Go together -> Going ->
//                  Alex messages Priya -> switch to Priya -> "Alex's Muse talked with yours" -> the Muse conversation ->
//                  she replies -> the Event shows Alex going -> she taps Going too.
//   roommate       just Alex's side (ask -> privacy choice -> Muses talk -> shortlist -> run together)
//   proof          just Priya's side (the Muse-to-Muse conversation)
//   selling        video -> Ember heard you -> Spark names models -> "N of these already have a home"
//   selling-proof  June's side of the camera haggle
//   tent           "I need a tent" -> one friend-like question -> Marcus + the Yosemite carpool
// Needs the app running (npm run dev or npm run demo:start). Pre-run inputs with `npm run warm` so Muse replies are
// cached and the clips are fast; anything new runs live (slower, still real).
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FFMPEG = createRequire(path.join(ROOT, "package.json"))("ffmpeg-static");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const flag = (k) => argv.includes(`--${k}`);
const APP = arg("app", "http://localhost:3000");
const OUT = path.resolve(ROOT, arg("out", "recordings"));
const [W, H] = arg("size", "1440x900").split("x").map(Number);
const SPEED = Number(arg("speed", "1")); // e.g. --speed 1.25 for a tighter cut to talk over
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const expand = (p) => (p ? p.replace(/^~/, os.homedir()) : p);
const ROOM_VIDEO = expand(arg("room-video", ""));
const SELL_VIDEO = expand(arg("video", path.join(os.homedir(), "Downloads/IMG_6396.MOV")));
const KNOWN = ["friends", "roommate", "proof", "selling", "selling-proof", "tent"];
const wanted = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const CLIPS = wanted.length ? wanted : KNOWN;

let page;
// --pace 0.75 = 25% less waiting between steps (default). 1 = the original, slower pace.
// --dry: run every step fast with no recording, just to fill the Muse cache so the real recording replays instantly.
const DRY = flag("dry");
const PACE = DRY ? 0.05 : Number(arg("pace", "0.9"));
const pause = (ms) => new Promise((r) => setTimeout(r, ms * PACE));
/** Run a page step; if a navigation tears down the page mid-step, wait for the new page and try again. */
async function steady(fn, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      if (i >= tries || !/context was destroyed|detached|Cannot find context|navigat/i.test(msg)) throw e;
      await page.waitForNetworkIdle({ idleTime: 400, timeout: 15_000 }).catch(() => {});
      await cursor().catch(() => {});
      await pause(400);
    }
  }
}
const api = (p, body) => page.evaluate(async (p, body) => (await fetch(p, { method: "POST", body: JSON.stringify(body ?? {}) })).status, p, body);

// ---- a visible cursor (headless Chrome has none) ----
async function cursor() {
  await page.evaluate(() => {
    if (document.getElementById("__cur")) return;
    const c = document.createElement("div");
    c.id = "__cur";
    c.style.cssText =
      "position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(24,119,242,.35);border:2px solid #1877F2;z-index:2147483647;pointer-events:none;transition:transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .2s;transform:translate(720px,450px)";
    document.documentElement.appendChild(c);
    window.__moveCur = (x, y) => (c.style.transform = `translate(${x}px,${y}px)`);
    window.__clickCur = () => {
      c.style.boxShadow = "0 0 0 10px rgba(24,119,242,.18)";
      setTimeout(() => (c.style.boxShadow = "none"), 250);
    };
  });
}
async function go(p) {
  await page.goto(`${APP}${p}`, { waitUntil: "networkidle2", timeout: 120_000 });
  await page.evaluate(() => document.querySelector("nextjs-portal")?.remove()).catch(() => {});
  await cursor();
  await pause(700);
}
async function as(persona) {
  await api("/api/persona", { userId: persona });
}
/** Find a visible button/link/label whose text contains `text` (inside the Muse sheet first, if it's open). */
async function find(text, { timeout = 60_000 } = {}) {
  return steady(() => findOnce(text, timeout));
}
async function findOnce(text, timeout) {
  const h = await page.waitForFunction(
    (t) => {
      const roots = [document.querySelector("[role=dialog]"), document].filter(Boolean);
      for (const r of roots) {
        const els = [...r.querySelectorAll("button,a,[role=button],label")].filter((e) => {
          const b = e.getBoundingClientRect();
          return b.width > 0 && b.height > 0 && !e.disabled && e.innerText.replace(/\s+/g, " ").includes(t);
        });
        if (els.length) return els.sort((a, b) => a.innerText.length - b.innerText.length)[0];
      }
      return null;
    },
    { timeout, polling: 250 },
    text,
  );
  return h.asElement();
}
async function tap(text, opts) {
  const el = await find(text, opts);
  await el.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "smooth" }));
  await pause(500);
  const b = await el.boundingBox();
  await page.evaluate((x, y) => window.__moveCur?.(x, y), b.x + b.width / 2, b.y + b.height / 2);
  await pause(550);
  await page.evaluate(() => window.__clickCur?.());
  const isLink = await el.evaluate((e) => !!e.closest("a[href]"));
  if (isLink) {
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30_000 }).catch(() => {}), el.click()]);
    await page.evaluate(() => document.querySelector("nextjs-portal")?.remove()).catch(() => {});
    await cursor();
  } else {
    await el.click();
  }
  await pause(900);
}
async function tapSel(selector) {
  const el = await page.waitForSelector(selector, { visible: true, timeout: 60_000 });
  const b = await el.boundingBox();
  await page.evaluate((x, y) => window.__moveCur?.(x, y), b.x + b.width / 2, b.y + b.height / 2);
  await pause(550);
  await page.evaluate(() => window.__clickCur?.());
  await el.click();
  await pause(900);
}
/** Messenger: replace whatever is in the composer (e.g. Muse's draft) only if `line` is given, then Send. */
async function sendMessage(line) {
  const input = await page.waitForSelector('input[placeholder="Aa"], textarea[placeholder="Aa"]', { visible: true, timeout: 60_000 });
  const b = await input.boundingBox();
  await page.evaluate((x, y) => window.__moveCur?.(x, y), b.x + 60, b.y + b.height / 2);
  await pause(1600); // let the drafted opener be read
  if (line) {
    await input.click();
    // Clear the drafted opener the way React sees it (keyboard select-all is unreliable headless).
    await input.evaluate((e) => {
      const proto = e.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(e, "");
      e.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await pause(300);
    await input.type(line, { delay: DRY ? 0 : 20 });
    await pause(500);
  }
  await tapSel('[aria-label="Send"]');
  await pause(1800);
}
const museReplies = () =>
  page.$$eval("[role=dialog] .bubble-in", (els) => els.filter((e) => !e.querySelector(".dot") && e.innerText.trim()).length).catch(() => 0);
async function waitReply(before, timeout = 180_000) {
  await page.waitForFunction(
    (n) => [...document.querySelectorAll("[role=dialog] .bubble-in")].filter((e) => !e.querySelector(".dot") && e.innerText.trim()).length > n,
    { timeout, polling: 200 },
    before,
  );
  await pause(900);
}
async function type(line) {
  const before = await museReplies();
  const input = await page.waitForSelector("[role=dialog] form input");
  const b = await input.boundingBox();
  await page.evaluate((x, y) => window.__moveCur?.(x, y), b.x + 40, b.y + b.height / 2);
  await input.focus();
  await input.type(line, { delay: DRY ? 0 : 18 });
  await pause(400);
  await input.press("Enter");
  await waitReply(before);
}
async function waitText(text, timeout = 180_000) {
  await steady(() => page.waitForFunction((t) => document.body.innerText.includes(t), { timeout, polling: 300 }, text));
  await pause(800);
}
async function scrollTo(text) {
  await page.evaluate((t) => {
    const all = [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent?.includes(t));
    all[0]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, text);
  await pause(1600);
}
/** Bring some text into view, rest the cursor on it, and linger like someone reading. */
async function read(text, ms = 3000) {
  await scrollTo(text);
  const b = await page
    .evaluate((t) => {
      const el = [...document.querySelectorAll("body *")].find((e) => e.children.length === 0 && e.textContent?.includes(t));
      const r = el?.getBoundingClientRect();
      return r ? { x: r.x + Math.min(r.width, 260) / 2, y: r.y + r.height / 2 } : null;
    }, text)
    .catch(() => null);
  if (b) await page.evaluate((x, y) => window.__moveCur?.(x, y), b.x, b.y);
  await pause(ms);
}
async function slowScroll(px = 1600, steps = 10) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => {
      const sheet = document.querySelector("[role=dialog] .overflow-y-auto");
      (sheet ?? window).scrollBy({ top: d, behavior: "smooth" });
    }, px / steps);
    await pause(380);
  }
  await pause(800);
}
async function upload(file) {
  const input = await page.waitForSelector('[role=dialog] input[type=file][accept^="video"]', { timeout: 60_000 });
  await input.uploadFile(file);
}

// ---- the clips ----
const DEMO_LINES = [
  "I signed a 2BR in the Mission from Sept 1 and need a roommate for the second bedroom",
  "Posting it at $1,350 but honestly I'd take $1,200 for the right person, keep that private",
  "I'm a night owl, my partner stays over some weekends, no dogs please. Don't share my health stuff ever.",
];
/** Alex's roommate ask through to "Going" on the run (shared by friends + roommate). */
async function alexRoommateToRun() {
  await go("/");
  await pause(1800); // the first screen: "Skip the fifty awkward messages"
  await tap("Try Muse");
  await tap("Stanford Housing '27");
  await tap("Ask Muse");
  for (const line of DEMO_LINES) await type(line);
  if (ROOM_VIDEO && fs.existsSync(ROOM_VIDEO)) {
    await upload(ROOM_VIDEO);
    await tap("Analyze room", { timeout: 120_000 });
    await waitText("the next person might want", 180_000).catch(() => {});
    await slowScroll(700, 5);
  } else {
    await tap("Skip for now", { timeout: 20_000 }).catch(() => {});
  }
  await tap("Yes, check", { timeout: 60_000 }); // uses the reach set in Muse settings
  await waitText("I found", 240_000);
  await pause(1200);
  // Read Muse's verdict in the chat first: "I found N people who fit. Sam's the better one, but…"
  await read("I found", 4200);
  await slowScroll(800, 6); // a glance at the cards under it
  // Then the full shortlist: look into the best match, message him
  await tap("Open the full shortlist");
  await pause(1500);
  await read("Best match", 2600);
  await tap("See why").catch(() => {});
  await pause(2200);
  await tap("Message Priya"); // the best match (sortMatches is deterministic, so this is stable)
  await sendMessage(); // Muse drafted the opener; Alex reads it and sends
  await page.goBack({ waitUntil: "networkidle2" }).catch(() => {});
  await cursor();
  await pause(1200);
  // And the bonus: Priya's "More than a lease"
  await read("More than a lease", 3200);
  await tap("Go together");
  await pause(1600);
  await tap("Going").catch(() => {});
  await pause(2000);
}
const fresh = async (persona) => {
  await api("/api/reset");
  await as(persona);
};
const clips = {
  friends: {
    setup: () => fresh("alex"),
    async run() {
      await alexRoommateToRun();
      // Switch to Priya: her Muse talked with Alex's
      await as("priya");
      await go("/");
      await pause(2000);
      await tap("talked with yours");
      await pause(1500);
      await slowScroll(1500, 14);
      await read("What your Muse knew", 2600);
      // The run: Alex is going; Priya joins
      await go("/events/evt_weekend_runs");
      await pause(2200);
      await tap("Going").catch(() => {});
      await pause(3000);
    },
  },
  roommate: { setup: () => fresh("alex"), run: alexRoommateToRun },
  proof: {
    // Needs a match with Priya: run "roommate" (or "friends") first, or restore the saved run.
    setup: () => as("priya"),
    async run() {
      await go("/");
      await pause(2000);
      await tap("talked with yours");
      await pause(1500);
      await slowScroll(1400, 14);
      await scrollTo("What your Muse knew");
      await pause(2500);
      await tap("Message Alex").catch(() => {});
      await pause(2500);
    },
  },
  selling: {
    setup: async () => {
      if (!fs.existsSync(SELL_VIDEO)) throw new Error(`selling clip needs --video <file> (missing ${SELL_VIDEO})`);
      await fresh("alex");
    },
    async run() {
      await go("/groups/g_ffs");
      await pause(1200);
      await tap("Ask Muse");
      const before = await museReplies();
      await tap("Selling some stuff before I move out");
      await waitReply(before);
      // Muse may ask one or two follow-ups before the video step; answer until the video card shows up.
      for (const answer of ["Whatever's in the video, fair prices, pickup on campus", "Pickup on campus this week, Venmo is fine", "That's everything"]) {
        if (await page.$('[role=dialog] input[type=file][accept^="video"]')) break;
        await type(answer);
      }
      await upload(SELL_VIDEO);
      await tap("Catalog items", { timeout: 120_000 });
      await waitText("identified each item", 180_000).catch(() => {});
      await slowScroll(900, 6);
      await tap("Yes, check", { timeout: 60_000 });
      await waitText("already", 240_000);
      await slowScroll(1800, 12);
      await pause(2500);
    },
  },
  "selling-proof": {
    // Needs the selling clip (or any selling run) first.
    setup: () => as("june"),
    async run() {
      await go("/");
      await pause(2000);
      await tap("talked with yours");
      await slowScroll(1400, 14);
      await pause(2500);
    },
  },
  tent: {
    setup: () => fresh("alex"),
    async run() {
      await go("/groups/g_ffs");
      await pause(1200);
      await tap("Ask Muse");
      const before = await museReplies();
      await tap("Need a tent for a camping trip");
      await waitReply(before);
      await type("Yosemite, Dec 6. Yeah honestly down to go with people. I'd spend like $40, could do $60 for a good one but keep that private");
      await type("pickup anywhere in SF").catch(() => {});
      await tap("Yes, check", { timeout: 60_000 });
      await waitText("I found", 240_000);
      await slowScroll(1800, 12);
      await pause(2500);
    },
  },
};

fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !flag("headed"),
  defaultViewport: { width: W, height: H },
  args: [`--window-size=${W},${H}`, "--autoplay-policy=no-user-gesture-required", "--hide-scrollbars"],
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "mutuals-clips-")),
});
try {
  for (const name of CLIPS) {
    if (!clips[name]) {
      console.log(`skip unknown clip "${name}" (known: ${KNOWN.join(", ")})`);
      continue;
    }
    page = await browser.newPage();
    page.on("load", () => cursor().catch(() => {}));
    await page.goto(`${APP}/`, { waitUntil: "networkidle2", timeout: 120_000 });
    const file = path.join(OUT, `${name}.mp4`);
    const raw = path.join(OUT, `.${name}.webm`); // Chrome records VP9; converted to H.264 below so QuickTime/Keynote play it
    try {
      await clips[name].setup?.(); // persona + clean state, off camera
    } catch (e) {
      console.log(`✗ ${name}: ${e instanceof Error ? e.message : e}`);
      await page.close();
      continue;
    }
    await go("/");
    const rec = DRY ? { stop: async () => {} } : await page.screencast({ path: raw, ffmpegPath: FFMPEG, fps: 30 });
    const t0 = Date.now();
    try {
      await clips[name].run();
      console.log(DRY ? `✓ ${name} cached (${((Date.now() - t0) / 1000).toFixed(0)} s)` : `✓ ${name}  ${((Date.now() - t0) / 1000).toFixed(0)} s  ->  ${path.relative(ROOT, file)}`);
    } catch (e) {
      const shot = path.join(OUT, `${name}-error.png`);
      await page.screenshot({ path: shot }).catch(() => {});
      console.log(`✗ ${name}: ${e instanceof Error ? e.message.split("\n")[0] : e}  (screenshot: ${path.relative(ROOT, shot)}${DRY ? "" : `, partial clip kept: ${path.relative(ROOT, file)}`})`);
    } finally {
      await rec.stop();
      await page.close();
      if (!DRY) try {
        const vf = SPEED !== 1 ? ["-filter:v", `setpts=PTS/${SPEED}`] : [];
        execFileSync(FFMPEG, ["-loglevel", "error", "-y", "-i", raw, ...vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "20", "-movflags", "+faststart", file]);
        fs.unlinkSync(raw);
      } catch (e) {
        console.log(`  (couldn't convert ${name} to H.264: ${e instanceof Error ? e.message.split("\n")[0] : e}; raw kept at ${raw})`);
      }
    }
  }
} finally {
  await browser.close();
}
// Leave the app on the saved run, ready for the live demo.
try {
  execFileSync("node", [path.join(ROOT, "scripts/snapshot.mjs"), "restore", "june-room-weekend-runs"], { cwd: ROOT, stdio: "ignore" });
} catch {}
