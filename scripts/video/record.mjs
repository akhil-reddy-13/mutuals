// Records the Mutuals demo video from the running app. See docs/VIDEO.md.
//
// Headless Chrome opens studio.html (a 1920x1080 stage), puts the real app in a phone frame (iframe), and plays the
// script below: it taps and types in the app like a person would, changes the captions, and logs when each voiceover
// line starts. Then ffmpeg mixes the voiceover (macOS `say`) onto the screen recording.
//
//   cd scripts/video && npm install                          # once (puppeteer-core, uses your installed Chrome)
//   MUSE_REPLAY_DELAY_MS=1300 npx next dev -p 3001            # in the repo root, a separate terminal
//   node scripts/video/record.mjs --dry                      # first time: runs every flow LIVE on Muse, caches it
//   node scripts/video/record.mjs                            # records -> scripts/video/out/mutuals-demo.mp4
//
// Options: --app <url> (default http://127.0.0.1:3001; use 127.0.0.1, not localhost, so the persona cookie doesn't
// collide with another dev server on localhost), --headful (watch it), --dry (no recording, no waiting for voiceover).
// Every model output on screen is a real Muse response: --dry calls Muse live and the app caches each response; the
// recording replays that cache, and MUSE_REPLAY_DELAY_MS on the dev server paces it like the live run.
import { execFileSync } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = require("ffmpeg-static");
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i < 0 ? d : process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true;
};
const APP = String(arg("app", "http://127.0.0.1:3001")).replace(/\/$/, "");
const DRY = !!arg("dry", false);
const HEADFUL = !!arg("headful", false);
const OUT = path.join(HERE, "out");
const ROOM_VIDEO = path.join(HERE, "assets", "room.mp4");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const STUDIO_PORT = 3101;

// ---------------------------------------------------------------- the script (keep in sync with docs/VIDEO.md)
const NARRATOR = "Samantha";
const A_VOICE = "Reed (English (US))"; // A: the friend
const B_VOICE = "Eddy (English (US))"; // B: Jamie, the intern (same voice narrates the room video)

// `show` is the on-screen text; `speak` (optional) is what the voice reads when the two differ.
const SKIT = [
  { who: "a", show: "YOOO there's a new feature on Facebook. Check it out.", speak: "Yo! There's a new feature on Facebook. Check it out." },
  {
    who: "b",
    show: "Bro nobody uses Facebook anymore. I'm on Insta, Snap, Beli, Hinge… not tryna use another app.",
    speak: "Bro, nobody uses Facebook anymore. I'm on Insta, Snap, Beli, Hinge. I'm not trying to use another app.",
  },
  { who: "a", show: "Wait aren't you tryna get housing this summer? Since you got that McDonald's SWE internship ❤️‍🩹", speak: "Wait, aren't you trying to get housing this summer? Since you got that McDonald's S.W.E. internship?" },
  {
    who: "b",
    show: "Yeah I lowkey don't know anyone in Chicago. I was just gonna post on FB Marketplace and pray someone saves me.",
    speak: "Yeah, I low-key don't know anyone in Chicago. I was just gonna post on Facebook Marketplace and pray someone saves me.",
  },
  {
    who: "a",
    show: "See that's so chopped. The ppl who DM me always ghost, or it's someone with no posts and no profile picture.",
    speak: "See, that's so chopped. The people who D.M. me always ghost, or it's someone with no posts and no profile picture.",
  },
  { who: "a", show: "With the new feature you just set your Muse agent on that. Look.", speak: "With the new feature, you just set your Muse agent on that. Look." },
];

const VO = {
  title: "Meet Mutuals.",
  problem:
    "Young adults already use Facebook to get real things done. Twenty-three percent of users eighteen to thirty-four are on Marketplace every day. The worst part is the first conversation. Budgets, dates, dealbreakers, with strangers who ghost.",
  ask: "Jamie opens the Chicago interns Group and asks their Muse privately.",
  lines: "Dates and budget, and the stuff you'd never post. Like a real ceiling of thirteen hundred, a five-thirty alarm, and a cat allergy.",
  lines2: "Muse asks one thing at a time, like a friend would, and says what it will keep private.",
  tags: "Every fact gets a tag. Public goes on the card. Match only is used to check fit and never shown. Never shared never even reaches the model.",
  match:
    "Instead of giving the same spiel in twenty different threads, Jamie's Muse takes the intro card to the Muse network, and has that messy first conversation with every Muse in the Group, at once. Two Muse Spark agents talk it through. Muse Wonder referees.",
  private: "Jamie's ceiling never leaves the comparison. Nora's private numbers are hidden from Jamie the same way.",
  shortlist: "Nora fits, with one thing to talk about. Dana doesn't have Muse, so Jamie's Muse read her post and drafted a reply. Diego has a cat, so the Muses stopped early, and nobody wasted a week finding that out.",
  connect: "And when there's real overlap, Muse nudges them a little closer. Jamie and Nora both run on Saturdays and bake sourdough, so Muse points them to a run club that already exists.",
  event: "One tap, and they're both going.",
  messenger: "The Muses never message anyone. Jamie gets a draft, edits it, and sends it.",
  sell: "Moving out works the same way. Jamie tells Muse what's for sale, then films the desk and just talks.",
  ember: "Muse Ember watches the frames and listens. It writes a transcript, and finds what Jamie is selling, and what Jamie wants to keep.",
  spark: "Then Muse Spark takes each item in parallel, studies its clearest frame and the frames around it, and works out the exact model, a fair price range, and how sure it is.",
  list: "One tap, and it's on Marketplace.",
  digest: "And every day, Muse surfaces the small asks worth answering. Sourdough lessons for interview prep. Cubs tickets. A study partner.",
  close: "You might have zero mutuals on Facebook today. Mutuals builds them for you.",
};

// What Jamie types (the cached Muse replies are keyed to these exact strings).
const HOUSING_LINES = [
  "I got a summer internship in Chicago and need a room near the West Loop from June 15 to Aug 21",
  "I can do $1,100 a month, honestly up to $1,300 if I can walk to work, keep that private",
  "I'm up at 5:30 for the gym before work, I'm allergic to cats so that's a dealbreaker, no smoking. Never share anything about my visa status.",
];
const SELL_LINES = [
  "Moving out of my dorm before Chicago, I want to sell my camera, my desk lamp and my mini fridge",
  "Honestly no idea what they're worth, you figure it out. Everything has to be gone by June 10",
  "Whatever's fair, I'd rather it sells fast. Venmo, pickup at my dorm",
];

// ---------------------------------------------------------------- voiceover clips
const ttsDir = path.join(OUT, "tts");
function seconds(file) {
  let out = "";
  try {
    execFileSync(FFMPEG, ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    out = String(e.stderr);
  }
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}
function tts(id, voice, text, rate = 182) {
  fs.mkdirSync(ttsDir, { recursive: true });
  const file = path.join(ttsDir, `${id}.aiff`);
  const meta = `${file}.txt`;
  const sig = `${voice}|${rate}|${text}`;
  if (!fs.existsSync(file) || !fs.existsSync(meta) || fs.readFileSync(meta, "utf8") !== sig) {
    execFileSync("say", ["-v", voice, "-r", String(rate), "-o", file, text]);
    fs.writeFileSync(meta, sig);
  }
  return { file, dur: seconds(file) };
}
const clips = {};
for (const [i, l] of SKIT.entries()) clips[`skit${i}`] = { ...tts(`skit${i}`, l.who === "a" ? A_VOICE : B_VOICE, l.speak ?? l.show, 208), text: l.show };
for (const [id, text] of Object.entries(VO)) clips[id] = { ...tts(id, NARRATOR, text), text };

// ---------------------------------------------------------------- stage
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page;
let frame;
let t0 = Date.now();
const timeline = [];
const now = () => (Date.now() - t0) / 1000;

/** Start a voiceover line now (and show it as the subtitle). Returns the time it ends. */
async function vo(id, { subtitle = true } = {}) {
  const c = clips[id];
  timeline.push({ id, file: c.file, at: now() });
  if (subtitle) await page.evaluate((t) => window.studio.sub(t), c.text);
  return now() + c.dur;
}
/** Wait until a time on the recording clock (no-op in --dry). */
async function until(t, pad = 0.35) {
  if (DRY) return;
  const ms = (t + pad - now()) * 1000;
  if (ms > 0) await sleep(ms);
}
const side = (o) => page.evaluate((o) => window.studio.side(o), o);
const models = (l) => page.evaluate((l) => window.studio.models(l), l);

// ---------------------------------------------------------------- driving the app inside the phone
/** The innermost visible element in the app whose text includes `text`, ignoring case (CSS uppercases labels). */
async function find(text, { scope = "body", timeout = DRY ? 300_000 : 90_000 } = {}) {
  const h = await frame.waitForFunction(
    (text, scope) => {
      const root = document.querySelector(scope);
      if (!root) return null;
      const want = text.toLowerCase();
      const has = (e) => (e.textContent ?? "").toLowerCase().includes(want);
      const hits = [...root.querySelectorAll("*")].filter((e) => e.getClientRects().length && has(e));
      return hits.find((e) => ![...e.children].some(has)) ?? null;
    },
    { timeout, polling: 250 },
    text,
    scope,
  );
  return h.asElement();
}
async function scrollTo(handle, block = "center") {
  await handle.evaluate((e, block) => e.scrollIntoView({ block, behavior: "smooth" }), block);
  await sleep(DRY ? 100 : 750);
}
/** Show a ripple where a finger would tap, then click (the closest button or link). */
async function tap(handle, { click = true } = {}) {
  await scrollTo(handle);
  const p = await handle.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const fb = await page.evaluate(() => window.studio.frameBox());
  await page.evaluate((x, y) => window.studio.tap(x, y), fb.left + p.x * fb.scale, fb.top + p.y * fb.scale);
  await sleep(DRY ? 50 : 220);
  if (click) await handle.evaluate((e) => (e.closest("button,a,[role=button],label") ?? e).click());
}
const tapText = async (text, o) => tap(await find(text, o));
const museReplies = () =>
  frame.$$eval("[role=dialog] .bubble-in", (els) => els.filter((e) => !e.querySelector(".dot") && e.innerText.trim()).length).catch(() => 0);
/** Type one line into the Muse sheet and wait for Muse's next message. */
async function chat(line) {
  const before = await museReplies();
  const input = await frame.waitForSelector("[role=dialog] form input");
  await tap(input, { click: false });
  await input.focus();
  await input.type(line, { delay: DRY ? 0 : 20 });
  await sleep(DRY ? 0 : 250);
  await input.press("Enter");
  await frame.waitForFunction((n) => [...document.querySelectorAll("[role=dialog] .bubble-in")].filter((e) => !e.querySelector(".dot") && e.innerText.trim()).length > n, { timeout: 120_000, polling: 200 }, before);
  await sleep(DRY ? 0 : 500);
}
async function go(urlPath) {
  await frame.goto(`${APP}${urlPath}`, { waitUntil: "networkidle2", timeout: 120_000 });
  await sleep(DRY ? 0 : 400);
}
const api = (p, body) =>
  frame.evaluate(async (p, body) => (await fetch(p, { method: "POST", body: JSON.stringify(body ?? {}) })).status, p, body);

// ---------------------------------------------------------------- beats
async function coldOpen() {
  await page.evaluate(() => window.studio.skit("Storyboard · filmed live in the final cut"));
  await sleep(DRY ? 0 : 700);
  for (const [i, l] of SKIT.entries()) {
    await page.evaluate((who, text) => window.studio.skitLine(who, text), l.who, l.show);
    await until(await vo(`skit${i}`, { subtitle: false }), 0.25);
  }
  await until(now(), 0.4);
}

async function titleAndProblem() {
  await page.evaluate(() =>
    window.studio.full(`<div class="ring"></div><div class="word">Mutuals</div><div class="tag">Your Muse talks to their Muse, so you only have the conversations worth having.</div>`),
  );
  await until(await vo("title", { subtitle: false }), 1.6);
  await page.evaluate(() =>
    window.studio.full(
      `<div class="big">23%</div><div class="stat">of Facebook users aged 18 to 34 use Marketplace every day, more than any other age group.</div>
       <div class="src">Capital One Shopping Research, Facebook Marketplace statistics</div>
       <div class="pills"><span class="pill">“what's your budget?”</span><span class="pill">“when can you move in?”</span><span class="pill">“any pets?”</span><span class="pill">“are you even real?”</span><span class="pill">seen 3 days ago</span></div>`,
      "light",
    ),
  );
  const end = await vo("problem", { subtitle: false });
  await sleep(DRY ? 0 : 5200);
  await page.evaluate(() => window.studio.pillsIn());
  await until(end, 0.5);
}

async function housing() {
  await side({ kicker: "Step 1 · Ask privately", headline: "Tell your Muse what you'd never post.", sub: "" });
  await go("/groups/g_chi_interns");
  await page.evaluate(() => window.studio.hideFull());
  let end = await vo("ask");
  await sleep(DRY ? 0 : 1800);
  await tapText("Ask Muse privately");
  await until(end, 0.2);
  end = await vo("lines");
  models(["spark"]);
  for (const [i, l] of HOUSING_LINES.entries()) {
    await chat(l);
    if (i === 1) {
      await until(end, 0.1);
      end = await vo("lines2");
    }
  }
  await until(end, 0.2);

  // The tagged preferences card
  await side({ kicker: "Step 1 · Ask privately", headline: "Public. Match only. Never shared." });
  end = await vo("tags");
  await scrollTo(await find("Budget ceiling", { scope: "[role=dialog]" }), "center");
  await sleep(DRY ? 0 : 3500);
  await scrollTo(await find("Visa status", { scope: "[role=dialog]" }), "center");
  await until(end, 0.2);

  // Muse to Muse
  await side({ kicker: "Step 2 · Muse to Muse", headline: "Your Muse has the awkward first conversation." });
  models(["spark", "wonder"]);
  end = await vo("match");
  await tapText("Yes, check");
  await find("Nora's Muse", { scope: "[role=dialog]" });
  // Follow the stream: keep the newest turn in view until the shortlist arrives.
  const follow = (async () => {
    for (let i = 0; i < 200; i++) {
      const done = await frame.$$eval("[role=dialog] *", (els) => els.some((e) => /people fit|person fits/.test(e.innerText ?? "") && !e.children.length)).catch(() => false);
      if (done) return;
      await frame.evaluate(() => {
        const body = document.querySelector("[role=dialog] .overflow-y-auto");
        if (body) body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
      });
      await sleep(600);
    }
  })();
  await until(end, 0.1);
  end = await vo("private");
  await follow;
  await until(end, 0.3);

  // Shortlist
  await side({ kicker: "Step 3 · Shortlist", headline: "Only the conversations worth having." });
  models([]);
  end = await vo("shortlist");
  // Cards in shortlist order: fits first (Nora, Sofia, Dana from her post), then Diego.
  await scrollTo(await find("Why it fits", { scope: "[role=dialog]" }), "start");
  await sleep(DRY ? 0 : 3000);
  await scrollTo(await find("From their post in the Group", { scope: "[role=dialog]" }), "start");
  await sleep(DRY ? 0 : 3400);
  await scrollTo(await find("Your Muse stopped early", { scope: "[role=dialog]" }), "end");
  await until(end, 0.2);
  const shortlistHref = await frame.$eval("[role=dialog] a[href*='/muse/']", (a) => a.getAttribute("href")).catch(() => null);

  // More than a lease -> Event
  await side({ kicker: "More than a lease", headline: "Then Muse nudges you a little closer." });
  models(["wonder"]);
  end = await vo("connect");
  await scrollTo(await find("More than a lease", { scope: "[role=dialog]" }), "center");
  await sleep(DRY ? 0 : 4200);
  await until(end, -1.2);
  await tapText("Go together", { scope: "[role=dialog]" });
  await frame.waitForFunction(() => location.pathname.startsWith("/events/"), { timeout: 30_000 });
  await sleep(DRY ? 0 : 900);
  await until(end, 0.1);
  end = await vo("event");
  await tapText("Going", { scope: "main" });
  await until(end, 0.8);

  // Messenger
  await side({ kicker: "Step 4 · You talk", headline: "The agents never message anyone." });
  models(["spark"]);
  if (shortlistHref) await go(shortlistHref);
  end = await vo("messenger");
  await tapText("Message Nora");
  await frame.waitForFunction(() => location.pathname.startsWith("/messenger/"), { timeout: 60_000 });
  await frame.waitForSelector("textarea", { timeout: 60_000 });
  await sleep(DRY ? 0 : 2600);
  await tap(await frame.$("button[aria-label='Send']").then((h) => h ?? find("Send")));
  await until(end, 0.8);
}

async function selling() {
  await side({ kicker: "Moving out", headline: "Film it. Say what's for sale.", sub: "" });
  models(["spark"]);
  await go("/groups/g_ffs");
  let end = await vo("sell");
  await tapText("Ask Muse privately");
  await chat(SELL_LINES[0]);
  // Muse wants to talk prices; Jamie skips ahead to the video (the camera button in the composer).
  await tap(await frame.waitForSelector("[role=dialog] button[aria-label='Video']:not([disabled])"));
  await until(end, 0.1);

  // Upload the room video (same bytes every run, so Ember's answer comes from the cache)
  models(["ember"]);
  const vid = await find("Video of your stuff", { scope: "[role=dialog]" });
  await tap(vid, { click: false });
  const input = await frame.waitForSelector("[role=dialog] input[type=file][accept='video/*']");
  await input.uploadFile(ROOM_VIDEO);
  await find("Catalog items", { scope: "[role=dialog]" });
  end = await vo("ember");
  await sleep(DRY ? 0 : 1200);
  await tapText("Catalog items", { scope: "[role=dialog]" });
  await find("What I heard", { scope: "[role=dialog]" });
  await scrollTo(await find("What I heard", { scope: "[role=dialog]" }), "start");
  await until(end, 0.1);

  models(["spark"]);
  await side({ kicker: "Moving out", headline: "Ember sees and listens. Spark identifies." });
  end = await vo("spark");
  await find("identified each item", { scope: "[role=dialog]" });
  await scrollTo(await find("confidence", { scope: "[role=dialog]" }).catch(() => find("What you're selling", { scope: "[role=dialog]" })), "center");
  await until(end, 0.1);
  end = await vo("list");
  await tapText("on Marketplace ·", { scope: "[role=dialog]" });
  await find("Listed on Marketplace", { scope: "[role=dialog]" });
  await until(end, 1.2);
}

async function digest() {
  await side({ kicker: "Every day", headline: "Small asks bring you back.", sub: "" });
  models(["ember"]);
  await go("/digest");
  await find("Today in your Groups");
  const end = await vo("digest");
  await scrollTo(await find("Today in your Groups"), "start");
  await until(end, 0.8);
}

async function close() {
  models([]);
  await page.evaluate(() =>
    window.studio.full(
      `<div class="ring"></div><div class="closer" style="margin-top:40px">You might have zero mutuals on Facebook today.<br><em>Mutuals builds them for you.</em></div>
       <div class="credits">Muse Spark · Muse Wonder · Muse Ember &nbsp;·&nbsp; Groups · Marketplace · Events · Messenger</div>`,
    ),
  );
  await until(await vo("close", { subtitle: false }), 1.6);
}

// ---------------------------------------------------------------- run
function serveStudio() {
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith("/studio.html") || req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(path.join(HERE, "studio.html")));
    } else {
      res.writeHead(404).end();
    }
  });
  return new Promise((r) => server.listen(STUDIO_PORT, "127.0.0.1", () => r(server)));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveStudio();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: !HEADFUL,
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    protocolTimeout: 600_000, // live --dry runs wait minutes for Muse inside a single waitForFunction
    args: ["--window-size=1920,1080", "--hide-scrollbars", "--font-render-hinting=none", "--autoplay-policy=no-user-gesture-required"],
  });
  page = await browser.newPage();
  page.setDefaultTimeout(120_000);
  await page.goto(`http://127.0.0.1:${STUDIO_PORT}/studio.html`);
  // Same site as the app (127.0.0.1), so the app's persona cookie works inside the frame.
  await page.evaluate((u) => window.studio.load(u), `${APP}/`);
  frame = page.frames().find((f) => f.url().startsWith(APP));
  if (!frame) throw new Error(`app did not load in the studio frame: ${APP}`);
  await api("/api/reset");
  await api("/api/persona", { userId: "jamie" });
  await go("/groups/g_chi_interns");
  await frame.evaluate(() => document.querySelector("nextjs-portal")?.remove()); // dev-mode badge

  let recorder = null;
  if (!DRY) recorder = await page.screencast({ path: path.join(OUT, "screen.webm"), ffmpegPath: FFMPEG, fps: 30, quality: 16 });
  t0 = Date.now();
  const steps = { coldOpen, titleAndProblem, housing, selling, digest, close };
  const only = arg("only", null); // e.g. --only selling (debugging; the result isn't a full video)
  for (const [name, fn] of Object.entries(steps)) {
    if (only && only !== name) continue;
    const s = now();
    try {
      await fn();
    } catch (e) {
      await page.screenshot({ path: path.join(OUT, "failed.png") }).catch(() => {});
      fs.writeFileSync(path.join(OUT, "failed.txt"), await frame.evaluate(() => document.body.innerText).catch(() => ""));
      console.error(`${name} failed at ${now().toFixed(1)}s (screenshot: scripts/video/out/failed.png)`);
      throw e;
    }
    console.log(`${name.padEnd(16)} ${s.toFixed(1)}s -> ${now().toFixed(1)}s`);
  }
  if (recorder) await recorder.stop();
  await browser.close();
  server.close();
  if (DRY) {
    console.log("dry run done: every Muse response is now cached. Record with: node scripts/video/record.mjs");
    return;
  }
  fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify(timeline, null, 2));
  mix();
}

/** Voiceover clips at their logged times, mixed under the screen recording. */
function mix() {
  const screen = path.join(OUT, "screen.webm");
  const final = path.join(OUT, "mutuals-demo.mp4");
  const inputs = [];
  const parts = [];
  timeline.forEach((c, i) => {
    inputs.push("-i", c.file);
    const ms = Math.max(0, Math.round(c.at * 1000));
    parts.push(`[${i + 1}:a]aresample=48000,adelay=${ms}|${ms}[v${i}]`);
  });
  const filter = `${parts.join(";")};${timeline.map((_, i) => `[v${i}]`).join("")}amix=inputs=${timeline.length}:normalize=0,alimiter=limit=0.95[aout]`;
  execFileSync(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-y", "-i", screen, ...inputs,
    "-filter_complex", filter, "-map", "0:v", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "160k", final,
  ], { stdio: "inherit" });
  console.log(`\nwrote ${path.relative(process.cwd(), final)} (${seconds(final).toFixed(1)}s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
