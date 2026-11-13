// Pass 1 of 2: play the screenplay against the real app and write down everything that happens.
//
// The app runs in a phone-sized window (390x776 CSS px at 3x). Its screen is captured as timestamped JPEG frames
// (~45 fps, 1170x2328) while PHONE SCREEN and FEATURE scenes run; every tap, typed message, pop-out, zoom and Muse
// network change is logged on one video timeline. Scenes without the app (live action, motion graphics) are timed
// from the screenplay without waiting. Pass 2 (render.mjs) draws the video frame by frame from this log, so nothing
// here has to look smooth in real time.
//
//   node scripts/video/capture.mjs --dry    run every app action LIVE on Muse once (fills the response cache)
//   node scripts/video/capture.mjs          capture -> scripts/video/out/timeline.json + out/frames/ + out/pops/
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";
import { loadPlan } from "./plan.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const FFMPEG = require("ffmpeg-static");
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i < 0 ? d : process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true;
};
const APP = String(arg("app", "http://127.0.0.1:3001")).replace(/\/$/, "");
const SCRIPT = path.resolve(ROOT, String(arg("script", "docs/video/mutuals.fountain")));
const DRY = !!arg("dry", false);
const PERSONA = String(arg("persona", "jamie"));
const OUT = path.join(HERE, "out");
const FRAMES = path.join(OUT, "frames");
const POPS = path.join(OUT, "pops");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PHONE = { w: 390, h: 776, dsf: 3 };

const { plan, globals } = loadPlan(SCRIPT);
const groups = JSON.parse(fs.readFileSync(path.join(ROOT, "seed/groups.json"), "utf8"));
const users = JSON.parse(fs.readFileSync(path.join(ROOT, "seed/users.json"), "utf8"));
/** Who the video is about, for the fun-fact card and the diagrams (from the seed profile, only shared interests). */
function personaCard(id) {
  const u = users.find((x) => x.id === id);
  if (!u) return null;
  const line = (u.bio ?? "").split(/(?<=\.)\s+/).slice(0, 2).map((x) => x.replace(/\s*\(.*?\)/g, "").replace(/\.$/, "")).join(" · ");
  return { name: u.name, avatar: u.avatarUrl, line, interests: u.interests.filter((i) => i.shareForConnection).map((i) => i.value) };
}

// ---------------------------------------------------------------- narration timing (no audio in the video)
// Each line is read by macOS `say` only to know how long it takes; scenes are paced to the narration so a real
// voiceover recorded later fits. The clips also make a scratch track (out/scratch-vo.wav) to record against.
const ttsDir = path.join(OUT, "tts");
const SPARE = ["Flo (English (US))", "Rocko (English (US))", "Sandy (English (US))", "Shelley (English (US))"];
const voiceFor = (who) => (globals.voices[who] ??= SPARE[Object.keys(globals.voices).length % SPARE.length]);
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
const speakable = (s) =>
  s.replace(/[~*_]/g, "").replace(/\bSWE\b/g, "S.W.E.").replace(/\bDMs\b/g, "D.M.s").replace(/\bDM\b/g, "D.M.").replace(/\btryna\b/gi, "trying to");
function tts(who, text) {
  fs.mkdirSync(ttsDir, { recursive: true });
  const voice = voiceFor(who);
  const rate = globals.rates[who] ?? (who === "NARRATOR" ? 182 : 205);
  const sig = `${voice}|${rate}|${speakable(text)}`;
  const file = path.join(ttsDir, `${Buffer.from(sig).toString("base64url").slice(0, 40)}${sig.length}.aiff`);
  if (!fs.existsSync(file)) execFileSync("say", ["-v", voice, "-r", String(rate), "-o", file, speakable(text)]);
  return { file, dur: seconds(file) };
}
// Filmed scenes have their own audio; their dialogue is in the screenplay for readers and captioned from an .srt.
for (const s of plan) if (s.kind !== "film") for (const st of s.steps) if (st.t === "vo" || st.t === "line") Object.assign(st, tts(st.who, st.text));

/** A filmed clip or a [[clip]] slot's file: a path from the repo root, else in scripts/video/assets/clips/ (any video type). */
function findMedia(name) {
  const direct = path.resolve(ROOT, name);
  if (/\.\w+$/.test(name) && fs.existsSync(direct)) return direct;
  const dir = path.join(HERE, "assets", "clips");
  const hit = fs.existsSync(dir) && fs.readdirSync(dir).find((f) => f.replace(/\.\w+$/, "").toLowerCase() === name.replace(/\.\w+$/, "").toLowerCase());
  return hit ? path.join(dir, hit) : null;
}
/** Captions from an .srt file: [{ a, b, text }] in seconds. */
function readSrt(file) {
  if (!file || !fs.existsSync(file)) return [];
  const ts = (x) => {
    const [h, m, rest] = x.split(":");
    return Number(h) * 3600 + Number(m) * 60 + Number(rest.replace(",", "."));
  };
  return fs.readFileSync(file, "utf8").replace(/\r/g, "").split(/\n\n+/).map((b) => {
    const lines = b.trim().split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) return null;
    const [a, z] = lines[i].split("-->").map((x) => ts(x.trim()));
    return { a, b: z, text: lines.slice(i + 1).join("\n").trim() };
  }).filter((c) => c && c.text);
}

// ---------------------------------------------------------------- clock + log
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
let page;
let cdp;
let vcur = 0; // video time while a scene is simulated
let live = false; // inside an app scene, video time follows the wall clock
let OFF = false; // an OFF CAMERA scene: the app steps run, but nothing is logged and no video time passes
let vt0 = 0;
let wall0 = 0;
const vnow = () => (live ? vt0 + (Date.now() - wall0) / 1000 : vcur);
const wait = async (sec) => {
  if (DRY || OFF) return;
  if (live) await sleep(sec * 1000);
  else vcur += sec;
};
let voiceFree = 0;
let clipEnd = 0; // when the current scene's [[clip]] finishes, for [[wait clip]]
let events = [];
const log = (e) => {
  if (OFF) return { ...e };
  const ev = { t: vnow(), ...e };
  events.push(ev);
  return ev;
};

// ---------------------------------------------------------------- screen frames
const frames = []; // { wall, file }
const writes = [];
let frameNo = 0;
// While a card is being screenshotted the page is briefly re-laid out; frames from that moment are thrown away.
let holdFrames = false;
async function startScreen() {
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });
  cdp = await page.createCDPSession();
  cdp.on("Page.screencastFrame", (e) => {
    cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
    if (holdFrames) return;
    const wall = e.metadata.timestamp * 1000;
    const last = frames[frames.length - 1];
    if (last && wall - last.wall < 20) return; // ~50 fps is plenty for a 30 fps render
    const file = `f${String(frameNo++).padStart(6, "0")}.jpg`;
    writes.push(fs.promises.writeFile(path.join(FRAMES, file), Buffer.from(e.data, "base64")));
    frames.push({ wall, file });
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, everyNthFrame: 1 });
}

// ---------------------------------------------------------------- driving the app
/** The element whose text (or aria-label) matches, ignoring case: exact first, then the innermost; on-screen first. */
async function find(text, { timeout = DRY ? 300_000 : 120_000, prefer = "visible" } = {}) {
  const h = await page.waitForFunction(
    (text, prefer) => {
      const want = text.toLowerCase().trim();
      const label = (e) => (e.getAttribute?.("aria-label") ?? "").toLowerCase();
      const own = (e) => (e.textContent ?? "").toLowerCase();
      const has = (e) => own(e).includes(want) || label(e).includes(want);
      const onScreen = (e) => {
        const r = e.getBoundingClientRect();
        return r.bottom > 40 && r.top < innerHeight - 40;
      };
      for (const root of [document.querySelector("[role=dialog]"), document.body].filter(Boolean)) {
        const hits = [...root.querySelectorAll("*")].filter((e) => e.getClientRects().length && has(e));
        if (!hits.length) continue;
        const exact = hits.filter((e) => own(e).trim() === want || label(e).trim() === want);
        const inner = hits.filter((e) => ![...e.children].some(has));
        for (const list of [exact, inner]) if (list.length) return prefer === "visible" ? (list.find(onScreen) ?? list[0]) : list[0];
      }
      return null;
    },
    { timeout, polling: 200 },
    text,
    prefer,
  );
  return h.asElement();
}
const rectOf = (h) =>
  h.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
async function scrollTo(h, block = "center") {
  await h.evaluate((e, block) => e.scrollIntoView({ block, behavior: "smooth" }), block);
  await wait(0.8);
}
async function tap(h) {
  await scrollTo(h);
  const r = await rectOf(h);
  log({ type: "tap", x: r.x + r.width / 2, y: r.y + r.height / 2 });
  await wait(0.22);
  await h.evaluate((e) => (e.closest("button,a,[role=button],label") ?? e).click());
  await wait(0.45);
}
const museReplies = () =>
  page.$$eval("[role=dialog] .bubble-in", (els) => els.filter((e) => !e.querySelector(".dot") && e.innerText.trim()).length).catch(() => 0);
/** Jamie types in the big message box on the right (pass 2 draws it); the message flies into the phone and is sent. */
async function compose(text) {
  const typeDur = 0.35 + text.length * 0.017;
  const flight = 0.6;
  const ev = log({ type: "compose", text, typeDur, flight });
  await wait(typeDur + flight - 0.15);
  const before = await museReplies();
  await page.evaluate((text) => {
    const i = document.querySelector("[role=dialog] form input");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, text);
    i.dispatchEvent(new Event("input", { bubbles: true }));
  }, text);
  await page.focus("[role=dialog] form input");
  await page.keyboard.press("Enter");
  ev.tSubmit = vnow();
  await wait(0.6);
  ev.target = await page.evaluate(() => {
    const b = [...document.querySelectorAll("[role=dialog] .bubble-out")].pop();
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
  await page.waitForFunction(
    (n) => [...document.querySelectorAll("[role=dialog] .bubble-in")].filter((e) => !e.querySelector(".dot") && e.innerText.trim()).length > n,
    { timeout: 180_000, polling: 150 },
    before,
  );
  await wait(0.5);
}
async function go(urlPath) {
  await page.goto(`${APP}${urlPath}`, { waitUntil: "networkidle2", timeout: 120_000 });
  await page.evaluate(() => document.querySelector("nextjs-portal")?.remove()).catch(() => {});
}
const api = (p, body) => page.evaluate(async (p, body) => (await fetch(p, { method: "POST", body: JSON.stringify(body ?? {}) })).status, p, body);
let shortlistHref = null;
async function open(target) {
  if (target.startsWith("/")) return go(target);
  if (/shortlist/i.test(target)) {
    if (!shortlistHref) throw new Error('opens "the full shortlist": no shortlist yet (run the matching scene first)');
    return go(shortlistHref);
  }
  if (/listing/i.test(target)) {
    // the "Listed on Marketplace" link appears once Spark has written the listing
    const a = await page.waitForSelector("[role=dialog] a[href*='/marketplace/']", { timeout: 180_000 });
    return go(await a.evaluate((a) => a.getAttribute("href")));
  }
  const g = groups.find((g) => g.name.toLowerCase() === target.toLowerCase()) ?? groups.find((g) => g.name.toLowerCase().includes(target.toLowerCase()));
  if (!g) throw new Error(`opens "${target}": not a Group name, "the full shortlist", "the listing" or a /path`);
  return go(`/groups/${g.id}`);
}
/** The card around the text: a match card, an Event, a listing, the connection card, else the nearest rounded row. */
const cardOf = async (inner) =>
  (
    await inner.evaluateHandle((e) => {
      const ok = (c) => {
        const r = c.getBoundingClientRect();
        return r.width >= 250 && r.height >= 40 && r.height <= 2400;
      };
      // a card that contains the text, inside the Muse sheet if the text is (the page behind it has cards too)
      const dialog = e.closest("[role=dialog]");
      let card = e.closest("article, .fb-card, .muse-gradient") ?? e.closest("section");
      if (card && dialog && !dialog.contains(card)) card = null;
      if (card && ok(card)) return card;
      let c = e;
      for (let k = 0; k < 10 && c?.parentElement; k++) {
        const r = c.getBoundingClientRect();
        if (r.height > 900) break;
        if (r.width >= 250 && r.height >= 40 && (/rounded/.test(c.className) || ["P", "LI"].includes(c.tagName))) return c;
        c = c.parentElement;
      }
      let d = e;
      while (d.parentElement && d.getBoundingClientRect().width < 250 && d.parentElement.getBoundingClientRect().height <= 900) d = d.parentElement;
      return d;
    })
  ).asElement();
/** What a zoom should frame: the row or block around the text (wide enough to read, not the whole screen). */
const blockOf = async (inner) =>
  (
    await inner.evaluateHandle((e) => {
      let c = e;
      for (let k = 0; k < 12 && c?.parentElement; k++) {
        const r = c.getBoundingClientRect();
        if (r.width >= 250 && r.height >= 40) return r.height <= 420 ? c : e;
        c = c.parentElement;
      }
      return e;
    })
  ).asElement();
/** Scroll it into view and make sure it stayed there (the sheet scrolls itself when new content arrives). */
async function settleInView(h) {
  await scrollTo(h);
  await wait(0.35);
  const r = await rectOf(h);
  if (r.y < 0 || r.y + Math.min(r.height, 700) > PHONE.h) {
    await h.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "smooth" }));
    await wait(0.7);
  }
  return rectOf(h);
}

let popNo = 0;
/** A piece of the app, shot on its own at 3x: the nearest box around the text that's big enough to read. */
async function popOut(text) {
  const card = await cardOf(await find(text));
  let rect = await rectOf(card);
  if (rect.height > PHONE.h - 90) {
    // taller than the screen: bring its top up (clear of a sticky top bar) and take what fits;
    // the stage fades the cut edge
    await card.evaluate((e) => e.scrollIntoView({ block: "start", behavior: "smooth" }));
    await wait(0.9);
    await card.evaluate((e) => {
      if (e.closest("[role=dialog]")) return;
      const bars = [...document.querySelectorAll("body *")].filter((b) => {
        const cs = getComputedStyle(b);
        const r = b.getBoundingClientRect();
        return (cs.position === "fixed" || cs.position === "sticky") && r.top <= 1 && r.height < 200 && r.width > 300;
      });
      const h = Math.max(0, ...bars.map((b) => b.getBoundingClientRect().bottom));
      if (h > e.getBoundingClientRect().top) window.scrollBy(0, e.getBoundingClientRect().top - h - 8);
    });
    await wait(0.4);
    rect = await rectOf(card);
  } else rect = await settleInView(card);
  // inside the Muse sheet, stop above its message bar
  const floor = await card.evaluate((e, h) => {
    const d = e.closest("[role=dialog]");
    const bar = d?.querySelector("form");
    return bar ? bar.getBoundingClientRect().top - 4 : h - 6;
  }, PHONE.h);
  const top = Math.max(0, rect.y);
  const clip = { x: rect.x, y: top, width: rect.width, height: Math.min(rect.y + rect.height, floor) - top };
  const radius = await card.evaluate((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0);
  let file = null;
  if (!DRY && !OFF) {
    fs.mkdirSync(POPS, { recursive: true });
    file = `pop${popNo++}.png`;
    // The clip is in document coordinates (the page behind the sheet may be scrolled); captureBeyondViewport would
    // resize the page for the shot and the sheet would re-lay out under the clip.
    const [sx, sy] = await page.evaluate(() => [window.scrollX, window.scrollY]);
    holdFrames = true;
    try {
      await page.screenshot({ path: path.join(POPS, file), type: "png", clip: { ...clip, x: clip.x + sx, y: clip.y + sy }, captureBeyondViewport: false });
      await sleep(150);
    } finally {
      holdFrames = false;
    }
  }
  log({ type: "pop", file, rect: clip, radius, text, clipped: clip.height < rect.height - 2 });
  await wait(1.1);
}

// ---------------------------------------------------------------- the Muse network, read from the app
async function readNetwork() {
  return page
    .evaluate(() => {
      const d = document.querySelector("[role=dialog]");
      if (!d) return [];
      return [...d.querySelectorAll("button")]
        .filter((b) => /muse to muse|from their post/i.test(b.textContent) && b.querySelector("[aria-label]"))
        .map((b) => {
          const name = b.querySelector("[aria-label]").getAttribute("aria-label");
          const img = b.querySelector("img")?.getAttribute("src") ?? "";
          const status = b.querySelector(".truncate")?.textContent ?? "";
          const oneSided = /from their post/i.test(b.textContent);
          const done = !!b.querySelector(".truncate svg") && !/replying|reaching/i.test(status);
          const fit = done && !!b.querySelector(".truncate .text-fb-green");
          return { name, img, oneSided, phase: done ? (fit ? "fit" : "nofit") : /reaching/i.test(status) ? "reaching" : "talking", speaker: /your muse/i.test(status) ? "me" : "them" };
        });
    })
    .catch(() => []);
}
function networkPoller() {
  let on = true;
  let last = "";
  const loop = (async () => {
    while (on) {
      const rows = await readNetwork();
      const key = JSON.stringify(rows);
      if (rows.length && key !== last) {
        last = key;
        log({
          type: "net",
          me: { label: `${PERSONA[0].toUpperCase()}${PERSONA.slice(1)}'s Muse`, avatar: `/avatars/${PERSONA}.jpg` },
          nodes: rows.map((r) => ({ id: r.name.replace(/\W/g, ""), label: r.name.split(" ")[0], avatar: r.img, phase: r.phase, speaker: r.speaker, oneSided: r.oneSided })),
        });
      }
      await sleep(150);
    }
  })();
  return async () => {
    on = false;
    await loop;
  };
}

// ---------------------------------------------------------------- scenes
async function runScene(scene, transitionIn) {
  const setup = scene.kind === "setup";
  const app = scene.kind === "phone" || scene.kind === "feature" || setup;
  OFF = setup;
  const st = scene.steps;
  events = [];
  let k = 0;
  const pre = [];
  if (app) {
    // Leading navigation and layout notes happen before the shot starts, so it opens on the right screen.
    // In a FEATURE scene the phone isn't on screen, so waiting and scrolling before the first card happen off camera.
    const offCamera = (x) => x.t === "cmd" && (x.verb === "open" || (scene.kind === "feature" && (x.verb === "wait" || x.verb === "scroll")));
    while (st[k] && (offCamera(st[k]) || (st[k].t === "note" && ["steps", "step", "phone"].includes(st[k].cmd)) || (scene.kind === "feature" && (st[k].t === "super" || st[k].t === "caption")))) {
      const x = st[k];
      if (x.t === "cmd" && x.verb === "open") await open(x.target);
      else if (x.t === "cmd" && x.verb === "wait") await find(x.target);
      else if (x.t === "cmd" && x.verb === "scroll") {
        const h = await find(x.target, { prefer: "first" });
        await h.evaluate((e) => e.scrollIntoView({ block: "center" }));
        await sleep(DRY ? 0 : 500);
      } else pre.push(x);
      k++;
    }
    await sleep(DRY ? 0 : 400);
    if (!setup) {
      live = true;
      vt0 = vcur;
      wall0 = Date.now();
    }
  }
  const start = vnow();
  voiceFree = Math.max(voiceFree, start);
  for (const s of pre) {
    if (s.t === "super" || s.t === "caption") log({ type: s.t, text: s.text });
    else if (s.cmd === "steps") log({ type: "steps", list: s.parts });
    else if (s.cmd === "step") log({ type: "step", n: Number(s.arg) });
    else if (s.cmd === "phone") log({ type: "phone", pos: s.arg.trim().toLowerCase() });
  }
  let stopNet = null;
  for (; k < st.length; k++) {
    const s = st[k];
    if (s.t === "note") {
      if (s.cmd === "steps") log({ type: "steps", list: s.parts });
      else if (s.cmd === "step") log({ type: "step", n: Number(s.arg) });
      else if (s.cmd === "hold") {
        // let the narration that's playing finish, then hold
        if (!DRY) await wait(Math.max(0, voiceFree - vnow()));
        await wait(Number(s.arg || 1));
      } else if (s.cmd === "network") {
        if (app) stopNet = networkPoller();
      } else if (s.cmd === "zoom" && /out/i.test(s.arg)) {
        log({ type: "unzoom" });
        await wait(1.0);
      } else if (s.cmd === "phone") {
        log({ type: "phone", pos: s.arg.trim().toLowerCase() });
        await wait(0.2);
      } else if (s.cmd === "film") {
        // filmed footage plays at its own length, with captions from an .srt next to it
        const src = findMedia(s.parts[0]);
        if (!src) throw new Error(`[[film ${s.parts[0]}]]: no such file`);
        log({ type: "film", src, dur: seconds(src), captions: readSrt(s.parts[1] && path.resolve(ROOT, s.parts[1])) });
        await wait(seconds(src));
      } else if (s.cmd === "clip") {
        // a slot for a video we'll drop in later: plays it if scripts/video/assets/clips/<name>.* exists
        const src = findMedia(s.parts[0]);
        const dur = src ? seconds(src) : null;
        log({ type: "clip", name: s.parts[0], label: s.parts[1] ?? s.parts[0], src, dur, captions: readSrt(s.parts[2] && path.resolve(ROOT, s.parts[2])) });
        clipEnd = vnow() + (dur ?? 0);
      } else if (s.cmd === "chat") {
        // one message in the overlay's Muse chat: "me: ...", "muse: ...", "ember: ...", "video: ..."
        const m = s.arg.match(/^(\w+)\s*:\s*([\s\S]*)$/);
        const text = m ? m[2].trim() : s.arg;
        log({ type: "chat", who: m ? m[1].toLowerCase() : "muse", text });
        await wait(Math.min(2.8, 0.9 + text.length * 0.024));
      } else if (s.cmd === "item") {
        log({ type: "item", parts: s.parts });
        await wait(1.6);
      } else if (s.cmd === "wait") await wait(s.arg.trim() === "clip" ? Math.max(0, clipEnd - vnow()) : Number(s.arg || 1));
      else if (!["voice", "rate", "music", "captions"].includes(s.cmd)) log({ type: s.cmd, parts: s.parts, arg: s.arg });
    } else if (s.t === "super" || s.t === "caption") {
      log({ type: s.t, text: s.text });
      await wait(0.25);
    } else if (s.t === "describe") log({ type: "describe", text: s.text });
    else if (s.t === "vo" || s.t === "line") {
      if (scene.kind === "film") continue; // the footage has the real voices
      if (!DRY) await wait(Math.max(0, voiceFree - vnow()));
      log({ type: s.t, who: s.who, text: s.text, paren: s.paren, dur: s.dur, file: s.file });
      voiceFree = vnow() + s.dur + 0.2;
      if (s.t === "line") await wait(s.dur + 0.2); // live dialogue: one line after another
    } else if (s.t === "type") await compose(s.text);
    else if (s.t === "cmd") {
      if (s.verb === "open") await open(s.target);
      else if (s.verb === "tap") await tap(await find(s.target));
      else if (s.verb === "scroll") await scrollTo(await find(s.target, { prefer: "first" }));
      else if (s.verb === "wait") await find(s.target);
      else if (s.verb === "pop") await popOut(s.target);
      else if (s.verb === "zoom") {
        const h = await blockOf(await find(s.target));
        log({ type: "zoom", rect: await settleInView(h), text: s.target });
        await wait(1.3);
      } else if (s.verb === "upload") {
        const input = await page.waitForSelector("[role=dialog] input[type=file][accept='video/*']");
        const file = path.resolve(HERE, "assets", s.target);
        if (!fs.existsSync(file)) throw new Error(`uploads "${s.target}": no such file in scripts/video/assets/`);
        await input.uploadFile(file);
      }
    }
  }
  if (app) shortlistHref = (await page.$eval("a[href*='/muse/']", (a) => a.getAttribute("href")).catch(() => null)) ?? shortlistHref;
  if (!DRY) await wait(Math.max(0, voiceFree - vnow()) + (scene.kind === "film" ? 0 : 0.5));
  if (stopNet) await stopNet();
  if (setup) {
    OFF = false;
    return null;
  }
  const end = vnow();
  const wallEnd = Date.now();
  if (app) {
    live = false;
    vcur = end;
  }
  return { number: scene.number, heading: scene.heading, kind: scene.kind, act: scene.act, transitionIn, start, end, wallStart: app ? wall0 : null, wallEnd: app ? wallEnd : null, events };
}

/** Every Muse-to-Muse conversation the persona's Muse had in this run, grouped by ask (like the app's /conversations). */
function conversations() {
  const file = path.join(ROOT, ".cache", "runtime.json");
  if (!fs.existsSync(file)) return [];
  const rt = JSON.parse(fs.readFileSync(file, "utf8"));
  const asks = [...JSON.parse(fs.readFileSync(path.join(ROOT, "seed/asks.json"), "utf8")), ...(rt.asks ?? [])];
  const askOf = (id) => [...asks].reverse().find((a) => a.id === id);
  const latest = new Map();
  for (const n of rt.negotiations ?? []) latest.set(`${n.askAId}|${askOf(n.askBId)?.userId ?? n.askBId}`, n);
  const byAsk = new Map();
  for (const n of latest.values()) {
    const a = askOf(n.askAId), b = askOf(n.askBId);
    if (!a || !b || (a.userId !== PERSONA && b.userId !== PERSONA) || !n.rounds?.length) continue;
    const meIsA = a.userId === PERSONA;
    const mine = meIsA ? a : b;
    const other = users.find((u) => u.id === (meIsA ? b.userId : a.userId));
    if (!other) continue;
    if (!byAsk.has(a.id)) {
      // what this ask keeps out of every conversation: its match-only and never-shared facts, by topic
      const kept = (mine.preferences ?? []).filter((p) => p.visibility === "match_only" || p.visibility === "never").map((p) => String(p.topic ?? "").replace(/_/g, " ")).filter(Boolean);
      byAsk.set(a.id, { summary: a.summary, group: groups.find((g) => g.id === a.groupId)?.name ?? "", kept: [...new Set(kept)], convos: [] });
    }
    byAsk.get(a.id).convos.push({
      other: other.name.split(" ")[0], avatar: other.avatarUrl, fit: n.verdict ? !!n.verdict.compatible : null,
      turns: n.rounds.map((t) => ({ side: t.speaker === "orchestrator" ? "note" : (t.speaker === "A") === meIsA ? "me" : "other", text: t.message })),
    });
  }
  // newest ask first, like the app
  return [...byAsk.values()].reverse().map((g) => ({ ...g, convos: g.convos.sort((x, y) => x.other.localeCompare(y.other)) }));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: PHONE.w, height: PHONE.h, deviceScaleFactor: PHONE.dsf },
    protocolTimeout: 600_000,
    // The screencast only delivers device-pixel (3x) frames when the scale is forced at launch.
    args: [`--force-device-scale-factor=${PHONE.dsf}`, "--window-size=600,900", "--hide-scrollbars"],
  });
  page = await browser.newPage();
  page.setDefaultTimeout(180_000);
  await page.goto(`${APP}/`, { waitUntil: "networkidle2" });
  await api("/api/reset");
  await api("/api/persona", { userId: PERSONA });
  await go("/");
  if (!DRY) {
    fs.rmSync(POPS, { recursive: true, force: true });
    await startScreen();
  }
  const out = [];
  let transition = globals.opening;
  for (const scene of plan) {
    let done;
    try {
      done = await runScene(scene, transition);
    } catch (e) {
      await page.screenshot({ path: path.join(OUT, "failed.png") }).catch(() => {});
      console.error(`scene ${scene.number} (${scene.heading}) failed, screenshot: scripts/video/out/failed.png`);
      throw e;
    }
    if (!done) {
      console.log(`     setup             (off camera)  ${scene.heading}`);
      continue;
    }
    out.push(done);
    const s = out[out.length - 1];
    console.log(`#${String(s.number).padEnd(3)} ${s.kind.padEnd(8)} ${s.start.toFixed(1).padStart(6)}s -> ${s.end.toFixed(1).padStart(6)}s  ${s.heading}`);
    transition = scene.transition ?? "CUT TO:";
  }
  if (cdp) await cdp.send("Page.stopScreencast").catch(() => {});
  await Promise.all(writes);
  await browser.close();
  if (DRY) {
    console.log("dry run done: every Muse response is now cached");
    return;
  }

  // Frames on the video timeline: each app scene's frames, plus the frame on screen when it started.
  const timelineFrames = [];
  const used = new Set();
  for (const s of out.filter((s) => s.wallStart)) {
    const before = frames.filter((f) => f.wall <= s.wallStart).pop();
    if (before) {
      timelineFrames.push({ t: s.start, file: before.file });
      used.add(before.file);
    }
    for (const f of frames) {
      if (f.wall <= s.wallStart || f.wall > s.wallEnd) continue;
      timelineFrames.push({ t: s.start + (f.wall - s.wallStart) / 1000, file: f.file });
      used.add(f.file);
    }
  }
  for (const f of frames) if (!used.has(f.file)) fs.rmSync(path.join(FRAMES, f.file), { force: true });
  const duration = out[out.length - 1].end;
  fs.writeFileSync(
    path.join(OUT, "timeline.json"),
    JSON.stringify({ version: 2, script: path.relative(ROOT, SCRIPT), capturedAt: new Date().toISOString(), app: APP, phone: PHONE, duration, outro: transition,
      persona: personaCard(PERSONA), convos: conversations(), people: users.filter((u) => u.id !== PERSONA).map((u) => ({ name: u.name, avatar: u.avatarUrl })), scenes: out.map((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== "wallStart" && k !== "wallEnd"))), frames: timelineFrames }, null, 1),
  );
  console.log(`\ncaptured ${timelineFrames.length} app frames, ${duration.toFixed(1)}s of video -> scripts/video/out/timeline.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
