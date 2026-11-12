// Plays the screenplay (docs/video/mutuals.fountain) as the demo video. See docs/VIDEO.md.
//
// Headless Chrome opens studio.html (a 1920x1080 stage) with the real app inside a phone (an iframe of the running
// app). Each scene of the screenplay becomes a shot: live action -> storyboard frame, MOTION GRAPHICS -> type and
// bubbles, PHONE SCREEN -> the app on the phone, driven by the quoted actions ("taps", "scrolls to", "pops out"...).
// Voices are macOS `say`; ffmpeg mixes them onto the screen recording at the times they started.
//
//   node scripts/video/record.mjs --dry     run every phone action LIVE on Muse once (fills the response cache)
//   node scripts/video/record.mjs           record -> scripts/video/out/mutuals-demo.mp4 (+ out/scenes.json)
//
// Options: --script <file.fountain> (default docs/video/mutuals.fountain), --app <url> (default
// http://127.0.0.1:3001; use 127.0.0.1, not localhost, so the persona cookie doesn't collide with another dev server
// on localhost), --headful, --dry. Every model output on screen is a real Muse response: --dry calls Muse live and
// the app caches each one; recording replays that cache, paced by MUSE_REPLAY_DELAY_MS on the app server.
import { execFileSync } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";
import { parseFountain, toScenes } from "./fountain.mjs";

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
// --preview: the visuals without voices or recording, saving a screenshot after every step to out/preview/
// (optionally --preview 6-9 for a range of scenes; earlier phone scenes still run so the app is in the right state)
const PREVIEW = arg("preview", false);
const HEADFUL = !!arg("headful", false);
const OUT = path.join(HERE, "out");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const STUDIO_PORT = 3101;
const PERSONA = String(arg("persona", "jamie"));

// ---------------------------------------------------------------- the screenplay
const doc = parseFountain(fs.readFileSync(SCRIPT, "utf8"));
const scenes = toScenes(doc);
const firstScene = doc.elements.findIndex((e) => e.type === "scene_heading");
const globalNotes = doc.elements.slice(0, firstScene < 0 ? undefined : firstScene).filter((e) => e.type === "note").map((e) => e.text);
const openingTransition = doc.elements.slice(0, firstScene).find((e) => e.type === "transition")?.text ?? "";

const voices = { NARRATOR: "Samantha" };
const rates = {};
let captionsOn = true;
let music = null;
for (const n of globalNotes) {
  let m;
  if ((m = n.match(/^voice\s+(.+?):\s*(.+)$/i))) voices[m[1].trim().toUpperCase()] = m[2].trim();
  else if ((m = n.match(/^rate\s+(.+?):\s*(\d+)$/i))) rates[m[1].trim().toUpperCase()] = Number(m[2]);
  else if (/^captions\s+off$/i.test(n)) captionsOn = false;
  else if ((m = n.match(/^music\s+(.+)$/i))) music = path.resolve(ROOT, m[1].trim());
}
const SPARE_VOICES = ["Flo (English (US))", "Rocko (English (US))", "Sandy (English (US))", "Shelley (English (US))", "Reed (English (US))", "Eddy (English (US))"];
const voiceFor = (who) => (voices[who] ??= SPARE_VOICES[Object.keys(voices).length % SPARE_VOICES.length]);
const COLORS = ["#ffb020", "#7fb0ff", "#ff7aa8", "#7be0b0", "#c9a0ff"];
const colorOf = {};
const colorFor = (who) => (colorOf[who] ??= COLORS[Object.keys(colorOf).length % COLORS.length]);
const groups = JSON.parse(fs.readFileSync(path.join(ROOT, "seed/groups.json"), "utf8"));

const transitionKind = (t = "") =>
  /BUBBLE|WIPE|IRIS/.test(t) ? "wipe" : /SMASH/.test(t) ? "smash" : /MATCH/.test(t) ? "match" : /DISSOLVE/.test(t) ? "dissolve" : /FADE/.test(t) ? "fade" : "cut";

// Phone actions: the quoted thing after one of these words, in the order they appear in the action line.
const CMD =
  /\b(opens?|taps?|scrolls? to|waits? for|uploads?|zooms? in on)\s+"([^"]+)"|"([^"]+)"\s+pops?\s+out|\bpops?\s+out\s+"([^"]+)"/gi;
const VERB = (v) => (/^open/i.test(v) ? "open" : /^tap/i.test(v) ? "tap" : /^scroll/i.test(v) ? "scroll" : /^wait/i.test(v) ? "wait" : /^upload/i.test(v) ? "upload" : "zoom");

/** One scene -> a flat list of steps the player runs in order. */
function compile(scene) {
  const steps = [];
  const els = scene.elements;
  for (let i = 0; i < els.length; i++) {
    const e = els[i];
    if (e.type === "note") {
      const [cmd, ...rest] = e.text.split(/\s+/);
      const argText = rest.join(" ");
      const parts = argText.split("|").map((s) => s.trim()).filter(Boolean);
      steps.push({ t: "note", cmd: cmd.toLowerCase(), arg: argText, parts });
    } else if (e.type === "action") {
      for (const line of e.text.split("\n")) {
        const sup = line.match(/^\s*(SUPER|CAPTION)\s*:\s*(.+)$/i);
        if (sup) {
          steps.push({ t: sup[1].toLowerCase(), text: sup[2].trim() });
          continue;
        }
        if (scene.kind === "phone") {
          for (const m of line.matchAll(CMD)) {
            if (m[1]) steps.push({ t: "cmd", verb: VERB(m[1]), target: m[2] });
            else steps.push({ t: "cmd", verb: "pop", target: m[3] ?? m[4] });
          }
        } else if (scene.kind === "live") {
          steps.push({ t: "describe", text: line });
        }
      }
    } else if (e.type === "character") {
      const who = e.name.toUpperCase();
      const ext = (e.extension ?? "").toUpperCase();
      let paren = null;
      let text = "";
      while (els[i + 1] && (els[i + 1].type === "parenthetical" || els[i + 1].type === "dialogue")) {
        const d = els[++i];
        if (d.type === "parenthetical") {
          // a parenthetical between two dialogue lines starts a new line of the same speaker
          if (text) {
            steps.push(lineStep(scene, who, ext, paren, text));
            text = "";
          }
          paren = d.text.replace(/^\(|\)$/g, "");
        } else text = text ? `${text} ${d.text}` : d.text.replace(/\n/g, " ");
      }
      if (text) steps.push(lineStep(scene, who, ext, paren, text));
    }
  }
  return steps;
}
function lineStep(scene, who, ext, paren, text) {
  const typing = scene.kind === "phone" && (/typ/i.test(paren ?? "") || /TYP/.test(ext));
  if (typing) return { t: "type", who, text };
  const vo = /V\.?O|O\.?S|O\.?C/.test(ext) || who === "NARRATOR";
  return { t: vo ? "vo" : "line", who, paren, text };
}
const plan = scenes.map((s) => ({ ...s, steps: compile(s) }));

// ---------------------------------------------------------------- voices
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
/** What the voice reads: markup out, and a few spellings `say` gets wrong. */
const speakable = (s) =>
  s.replace(/[~*_]/g, "").replace(/\bSWE\b/g, "S.W.E.").replace(/\bDMs\b/g, "D.M.s").replace(/\bDM\b/g, "D.M.").replace(/\btryna\b/gi, "trying to").replace(/\bInsta\b/g, "Insta");
function tts(who, text) {
  fs.mkdirSync(ttsDir, { recursive: true });
  const voice = voiceFor(who);
  const rate = rates[who] ?? (who === "NARRATOR" ? 182 : 205);
  const sig = `${voice}|${rate}|${speakable(text)}`;
  const key = Buffer.from(sig).toString("base64url").slice(0, 40) + sig.length;
  const file = path.join(ttsDir, `${key}.aiff`);
  if (!fs.existsSync(file)) execFileSync("say", ["-v", voice, "-r", String(rate), "-o", file, speakable(text)]);
  return { file, dur: seconds(file) };
}
if (!DRY) for (const s of plan) for (const st of s.steps) if (st.t === "vo" || st.t === "line") Object.assign(st, tts(st.who, st.text));
if (PREVIEW) for (const s of plan) for (const st of s.steps) if (st.dur) st.dur = Math.min(st.dur, 1.2);

// ---------------------------------------------------------------- stage helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page;
let frame;
let t0 = Date.now();
const timeline = [];
const sceneLog = [];
const now = () => (Date.now() - t0) / 1000;
const S = (fn, ...a) => page.evaluate(fn, ...a);
let voiceFree = 0;
let capToken = 0;
// What's already written big on screen: a line the narrator reads word for word doesn't need a caption too.
const onScreen = new Set();
const norm = (t) => t.replace(/[~*_]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const pause = (ms) => (DRY ? Promise.resolve() : sleep(ms));

async function startVoice(st, { caption }) {
  if (!DRY) {
    const w = voiceFree - now();
    if (w > 0) await sleep(w * 1000);
  }
  timeline.push({ file: st.file, at: now(), who: st.who });
  if (!DRY && !PREVIEW) await S(() => window.studio.sync());
  voiceFree = now() + (st.dur ?? 0) + 0.18;
  if (caption && captionsOn && !DRY && !onScreen.has(norm(st.text))) {
    const tok = ++capToken;
    await S((t) => window.studio.cap(t), st.text.replace(/[~*]/g, ""));
    setTimeout(() => tok === capToken && S(() => window.studio.cap("")).catch(() => {}), (st.dur ?? 0) * 1000 + 150);
  }
}

// ---------------------------------------------------------------- driving the app inside the phone
/**
 * The element in the app whose text (or aria-label) matches, ignoring case. Exact matches win; otherwise the
 * innermost element that contains the text. While the Muse sheet is open, it looks there first.
 */
async function find(text, { timeout = DRY ? 300_000 : 90_000, prefer = "visible" } = {}) {
  const h = await frame.waitForFunction(
    (text, prefer) => {
      const want = text.toLowerCase().trim();
      const label = (e) => (e.getAttribute?.("aria-label") ?? "").toLowerCase();
      const own = (e) => (e.textContent ?? "").toLowerCase();
      const has = (e) => own(e).includes(want) || label(e).includes(want);
      const onScreen = (e) => {
        const r = e.getBoundingClientRect();
        return r.bottom > 40 && r.top < innerHeight - 40;
      };
      const roots = [document.querySelector("[role=dialog]"), document.body].filter(Boolean);
      for (const root of roots) {
        const hits = [...root.querySelectorAll("*")].filter((e) => e.getClientRects().length && has(e));
        if (!hits.length) continue;
        const exact = hits.filter((e) => own(e).trim() === want || label(e).trim() === want);
        const inner = hits.filter((e) => ![...e.children].some(has));
        for (const list of [exact, inner]) {
          if (!list.length) continue;
          if (prefer === "visible") return list.find(onScreen) ?? list[0];
          return list[0];
        }
      }
      return null;
    },
    { timeout, polling: 250 },
    text,
    prefer,
  );
  return h.asElement();
}
async function scrollTo(handle, block = "center") {
  await handle.evaluate((e, block) => e.scrollIntoView({ block, behavior: "smooth" }), block);
  await pause(800);
}
/** Where an element of the app sits on the 1920x1080 page. */
async function pageBox(handle) {
  const r = await handle.evaluate((e) => {
    const b = e.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  });
  const fb = await S(() => window.studio.frameBox());
  return { x: fb.left + r.x * fb.scale, y: fb.top + r.y * fb.scale, width: r.width * fb.scale, height: r.height * fb.scale };
}
async function tap(handle, { click = true } = {}) {
  await scrollTo(handle);
  const b = await pageBox(handle);
  if (!DRY) await S((x, y) => window.studio.tap(x, y), b.x + b.width / 2, b.y + b.height / 2);
  await pause(230);
  if (click) await handle.evaluate((e) => (e.closest("button,a,[role=button],label") ?? e).click());
  await pause(350);
}
const museReplies = () =>
  frame.$$eval("[role=dialog] .bubble-in", (els) => els.filter((e) => !e.querySelector(".dot") && e.innerText.trim()).length).catch(() => 0);
async function typeLine(line) {
  const before = await museReplies();
  const input = await frame.waitForSelector("[role=dialog] form input");
  await tap(input, { click: false });
  await input.focus();
  await input.type(line, { delay: DRY ? 0 : 13 });
  await pause(250);
  await input.press("Enter");
  await frame.waitForFunction(
    (n) => [...document.querySelectorAll("[role=dialog] .bubble-in")].filter((e) => !e.querySelector(".dot") && e.innerText.trim()).length > n,
    { timeout: 180_000, polling: 200 },
    before,
  );
  await pause(450);
}
async function go(urlPath) {
  await frame.goto(`${APP}${urlPath}`, { waitUntil: "networkidle2", timeout: 120_000 });
  await frame.evaluate(() => document.querySelector("nextjs-portal")?.remove()).catch(() => {});
  await pause(300);
}
const api = (p, body) => frame.evaluate(async (p, body) => (await fetch(p, { method: "POST", body: JSON.stringify(body ?? {}) })).status, p, body);
let shortlistHref = null;
const rememberShortlist = async () => {
  const h = await frame.$eval("a[href*='/muse/']", (a) => a.getAttribute("href")).catch(() => null);
  if (h) shortlistHref = h;
};

async function open(target) {
  if (target.startsWith("/")) return go(target);
  if (/shortlist/i.test(target)) {
    if (!shortlistHref) throw new Error('opens "the full shortlist": no shortlist yet (run the matching scene first)');
    return go(shortlistHref);
  }
  const g = groups.find((g) => g.name.toLowerCase() === target.toLowerCase()) ?? groups.find((g) => g.name.toLowerCase().includes(target.toLowerCase()));
  if (!g) throw new Error(`opens "${target}": not a Group name, "the full shortlist" or a /path`);
  return go(`/groups/${g.id}`);
}

/** Lift a piece of the app out of the phone: the nearest card-like box around the text, shot at 2x. */
async function popOut(text) {
  const inner = await find(text);
  const card = await inner.evaluateHandle((e) => {
    // the nearest box that is big enough to read and small enough to lift: a row, a card, a paragraph
    let c = e;
    for (let k = 0; k < 10 && c?.parentElement; k++) {
      const r = c.getBoundingClientRect();
      if (r.height > 420) break;
      if (r.width >= 250 && r.height >= 40 && (/rounded|fb-card|muse-gradient/.test(c.className) || c.tagName === "P" || c.tagName === "LI")) return c;
      c = c.parentElement;
    }
    let d = e;
    while (d.parentElement && d.getBoundingClientRect().width < 250 && d.parentElement.getBoundingClientRect().height <= 420) d = d.parentElement;
    return d;
  });
  await scrollTo(card.asElement());
  if (DRY) return;
  const b = await pageBox(card.asElement());
  const clip = { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height), scale: 2 };
  const shot = await page.screenshot({ clip, encoding: "base64", type: "png" });
  await S((src, box) => window.studio.popOut(src, box, box.width, box.height), `data:image/png;base64,${shot}`, clip);
  await sleep(1100);
}

// ---------------------------------------------------------------- the Muse network, read live from the app
async function readNetwork() {
  return frame
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
function networkPoller(meName, meAvatar) {
  let on = true;
  const loop = (async () => {
    while (on) {
      const rows = await readNetwork();
      if (rows.length) {
        const first = (n) => n.split(" ")[0];
        const nodes = [
          { id: "me", me: true, label: `${first(meName)}'s Muse`, avatar: meAvatar },
          ...rows.map((r) => ({
            id: r.name.replace(/\W/g, ""),
            label: first(r.name),
            avatar: r.img.startsWith("/") ? `${APP}${r.img}` : r.img,
            phase: r.phase,
            speaker: r.speaker,
            status:
              r.phase === "fit" ? (r.oneSided ? "Fits · from her post" : "Fits") : r.phase === "nofit" ? "Not a fit" : r.phase === "reaching" ? "Reaching…" : r.oneSided ? "Reading her post" : "Talking",
          })),
        ];
        await S((n) => window.studio.network(n), nodes).catch(() => {});
      }
      await sleep(450);
    }
  })();
  return async () => {
    on = false;
    await loop;
  };
}

// ---------------------------------------------------------------- playing a scene
let steps = [];
let active = 0;
function kicker(heading) {
  const loc = heading.replace(/^(INT\.?\/EXT|INT|EXT|EST|I\/E)[.\s]+/i, "");
  const parts = loc.split(/\s+-\s+/);
  return parts.length > 1 ? `${parts.slice(0, -1).join(" · ")} · ${parts[parts.length - 1]}` : loc;
}

async function playScene(scene, transition) {
  const t = transitionKind(transition);
  const st = scene.steps;
  const sideContent = st.some((s) => s.t === "super" || s.t === "caption" || (s.t === "cmd" && s.verb === "pop") || (s.t === "note" && s.cmd === "network"));
  // Things that should happen before the shot is revealed: leading navigation, the stepper, the phone's position.
  let k = 0;
  if (scene.kind === "phone") {
    while (st[k] && ((st[k].t === "cmd" && st[k].verb === "open") || st[k].t === "note")) {
      const s = st[k];
      if (s.t === "cmd") await open(s.target);
      else if (s.cmd === "steps") steps = s.parts;
      else if (s.cmd === "step") active = Number(s.arg);
      else break;
      k++;
    }
    await S((steps, active) => window.studio.steps(steps, active), active ? steps : [], active);
    await S((pos) => window.studio.phone(pos), sideContent ? "left" : "center");
  }
  if (!DRY) {
    const prep = {
      gfxClear: scene.kind === "graphics",
      clearSide: scene.kind === "phone",
      live: scene.kind === "live" ? [kicker(scene.heading), ""] : null,
    };
    await S((kind, t, prep) => window.studio.enter(kind, t, prep), scene.kind, t, prep);
  }
  const start = now();
  onScreen.clear();
  let stopNet = null;
  const range = typeof PREVIEW === "string" ? PREVIEW.split("-").map(Number) : null;
  const shoot = PREVIEW && (!range || (Number(scene.number) >= range[0] && Number(scene.number) <= (range[1] ?? range[0])));
  let shot = 0;
  const snap = async (label) => {
    if (!shoot) return;
    fs.mkdirSync(path.join(OUT, "preview"), { recursive: true });
    await sleep(700);
    await page.screenshot({ path: path.join(OUT, "preview", `${String(scene.number).padStart(2, "0")}-${String(shot++).padStart(2, "0")}-${label}.jpg`), type: "jpeg", quality: 70 });
  };
  await snap("enter");
  for (; k < st.length; k++) {
    const s = st[k];
    if (k > 0) await snap(st[k - 1].t === "cmd" ? `${st[k - 1].verb}` : st[k - 1].t === "note" ? st[k - 1].cmd : st[k - 1].t);
    if (s.t === "note") {
      if (s.cmd === "steps") steps = s.parts;
      else if (s.cmd === "step") {
        active = Number(s.arg);
        await S((steps, active) => window.studio.steps(steps, active), steps, active);
      } else if (s.cmd === "hold") {
        // let the line that's playing finish, then hold
        if (!DRY) await sleep(Math.max(0, voiceFree - now()) * 1000);
        await pause(Number(s.arg || 1) * 1000);
      }
      else if (s.cmd === "network") {
        const me = await frame.evaluate(() => {
          const a = document.querySelector("header [aria-label] img, [aria-label='Account menu'] img");
          return a?.getAttribute("src") ?? null;
        }).catch(() => null);
        stopNet = networkPoller(PERSONA.replace(/^./, (c) => c.toUpperCase()), me ? `${APP}${me}` : `${APP}/avatars/${PERSONA}.jpg`);
      } else if (!DRY) {
        if (s.cmd === "stat") await S((p) => window.studio.stat(p[0], p[1] ?? "", p[2] ?? ""), s.parts);
        else if (s.cmd === "bubbles") {
          await S((p) => window.studio.bubbles(p), s.parts);
        } else if (s.cmd === "secrets") await S((p) => window.studio.secrets(p), s.parts);
        else if (s.cmd === "logo") await S(() => window.studio.logo());
        else if (s.cmd === "models")
          await S(() =>
            window.studio.models([
              ["Muse Spark", "Each person's agent. Parses the ask, negotiates, drafts openers and listings."],
              ["Muse Wonder", "The referee, once per conversation. Spots the rare real connection."],
              ["Muse Ember", "Watches and listens to video, reads posts, writes the digest."],
            ]),
          );
        else if (s.cmd === "zoom" && /out/i.test(s.arg)) await S(() => window.studio.unzoom());
        else if (s.cmd === "phone") await S((p) => window.studio.phone(p), s.arg.trim());
      }
    } else if (s.t === "super") {
      onScreen.add(norm(s.text));
      if (DRY) continue;
      if (scene.kind === "phone") await S((t) => window.studio.headline(t), s.text);
      else await S((t) => window.studio.statement(t), s.text);
      await sleep(250);
    } else if (s.t === "caption") {
      onScreen.add(norm(s.text));
      if (DRY) continue;
      if (scene.kind === "phone") await S((t) => window.studio.caption(t), s.text);
      else await S((t) => window.studio.gcaption(t), s.text);
    } else if (s.t === "describe") {
      if (!DRY) await S((k, a) => window.studio.live(k, a), kicker(scene.heading), s.text);
    } else if (s.t === "vo") {
      await startVoice(s, { caption: true });
    } else if (s.t === "line") {
      if (DRY) continue;
      await startVoice(s, { caption: false });
      await S((who, c, text, paren) => window.studio.liveLine(who, c, text, paren), s.who, colorFor(s.who), s.text, s.paren);
      await sleep(Math.max(0, voiceFree - now()) * 1000);
    } else if (s.t === "type") {
      await typeLine(s.text);
    } else if (s.t === "cmd") {
      if (s.verb === "open") await open(s.target);
      else if (s.verb === "tap") await tap(await find(s.target));
      else if (s.verb === "scroll") await scrollTo(await find(s.target, { prefer: "first" }));
      else if (s.verb === "wait") await find(s.target);
      else if (s.verb === "pop") await popOut(s.target);
      else if (s.verb === "zoom") {
        const b = await pageBox(await find(s.target));
        if (!DRY) await S((x, y) => window.studio.zoom(x, y, 1.55), b.x + b.width / 2, b.y + b.height / 2);
        await pause(1000);
      } else if (s.verb === "upload") {
        const input = await frame.waitForSelector("[role=dialog] input[type=file][accept='video/*']");
        const file = path.resolve(HERE, "assets", s.target);
        if (!fs.existsSync(file)) throw new Error(`uploads "${s.target}": no such file in scripts/video/assets/`);
        await input.uploadFile(file);
      }
    }
  }
  await snap("end");
  if (scene.kind === "phone") await rememberShortlist();
  if (!DRY) await sleep(Math.max(0, voiceFree - now()) * 1000 + 450);
  if (stopNet) await stopNet();
  if (!DRY && scene.kind === "phone") await S(() => window.studio.unzoom());
  if (!DRY && scene.kind === "graphics") await S(() => window.studio.popBubbles());
  sceneLog.push({ number: scene.number, heading: scene.heading, kind: scene.kind, act: scene.act, start, end: now() });
}

// ---------------------------------------------------------------- run
function serveStudio() {
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith("/studio.html") || req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(path.join(HERE, "studio.html")));
    } else res.writeHead(404).end();
  });
  return new Promise((r) => server.listen(STUDIO_PORT, "127.0.0.1", () => r(server)));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (arg("mix-only", false)) {
    // Redo just the audio mix for the last recording (out/screen.webm + out/timeline.json).
    timeline.push(...JSON.parse(fs.readFileSync(path.join(OUT, "timeline.json"), "utf8")));
    return mix();
  }
  const server = await serveStudio();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: !HEADFUL,
    defaultViewport: { width: 1920, height: 1088, deviceScaleFactor: 1 }, // 1080p frame + an 8px sync strip
    protocolTimeout: 600_000, // live --dry runs wait minutes for Muse inside a single waitForFunction
    args: ["--window-size=1920,1088", "--hide-scrollbars", "--font-render-hinting=none"],
  });
  page = await browser.newPage();
  page.setDefaultTimeout(180_000);
  await page.goto(`http://127.0.0.1:${STUDIO_PORT}/studio.html`);
  // Same site as the app (127.0.0.1), so the app's persona cookie works inside the frame.
  await S((u) => window.studio.load(u), `${APP}/`);
  frame = page.frames().find((f) => f.url().startsWith(APP));
  if (!frame) throw new Error(`app did not load in the studio frame: ${APP}`);
  await api("/api/reset");
  await api("/api/persona", { userId: PERSONA });
  await go("/");

  let recorder = null;
  if (!DRY && !PREVIEW) recorder = await page.screencast({ path: path.join(OUT, "screen.webm"), ffmpegPath: FFMPEG, fps: 30, quality: 14 });
  t0 = Date.now();
  let transition = openingTransition;
  for (const scene of plan) {
    const s = now();
    try {
      await playScene(scene, transition);
    } catch (e) {
      await page.screenshot({ path: path.join(OUT, "failed.png") }).catch(() => {});
      fs.writeFileSync(path.join(OUT, "failed.txt"), await frame.evaluate(() => document.body.innerText).catch(() => ""));
      console.error(`scene ${scene.number} (${scene.heading}) failed at ${now().toFixed(1)}s, screenshot: scripts/video/out/failed.png`);
      throw e;
    }
    console.log(`#${String(scene.number).padEnd(3)} ${scene.kind.padEnd(8)} ${s.toFixed(1).padStart(6)}s -> ${now().toFixed(1).padStart(6)}s  ${scene.heading}`);
    transition = scene.transition ?? "CUT TO:";
  }
  if (!DRY && /FADE/.test(transition)) {
    await S(() => window.studio.fadeOut());
    await sleep(1300);
  }
  if (recorder) await recorder.stop();
  await browser.close();
  server.close();
  if (PREVIEW) {
    console.log("preview done: scripts/video/out/preview/");
    return;
  }
  if (DRY) {
    console.log("dry run done: every Muse response is now cached. Record with: node scripts/video/record.mjs");
    return;
  }
  fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify(timeline, null, 2));
  fs.writeFileSync(path.join(OUT, "scenes.json"), JSON.stringify({ script: path.relative(ROOT, SCRIPT), recordedAt: new Date().toISOString(), scenes: sceneLog }, null, 2));
  mix();
}

/**
 * When each voice line actually starts in the video: the white flashes in the sync strip below the frame, in order.
 * (Wall-clock times drift from the screen recording's timeline by a second or more over three minutes.)
 */
function syncMarks(screen) {
  let out = "";
  try {
    out = execFileSync(FFMPEG, ["-hide_banner", "-i", screen, "-vf", "crop=1920:8:0:1080,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"], {
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    }).toString();
  } catch (e) {
    out = String(e.stdout ?? "");
  }
  const marks = [];
  let t = null;
  let prev = 0;
  let end = 0;
  for (const line of out.split("\n")) {
    const pt = line.match(/pts_time:([\d.]+)/);
    if (pt) {
      t = Number(pt[1]);
      end = Math.max(end, t);
    }
    const y = line.match(/YAVG=([\d.]+)/);
    if (y && t !== null) {
      const v = Number(y[1]);
      if (v > 128 && prev <= 128) marks.push(t);
      prev = v;
    }
  }
  // The streamed WebM has no duration in its header; the last frame's time + one frame is the length.
  return { marks, end: end + 1 / 30 };
}

/** Voices at the moments they started in the video (and optional [[music file]] ducked under them), mixed in. */
function mix() {
  const screen = path.join(OUT, "screen.webm");
  const final = path.join(OUT, "mutuals-demo.mp4");
  const { marks, end } = syncMarks(screen);
  const dur = end.toFixed(3);
  let at;
  if (marks.length === timeline.length) at = marks;
  else {
    // Fall back to the wall clock, shifted so the first line lands on the first marker.
    const shift = marks.length ? marks[0] - timeline[0].at : 0;
    console.warn(`sync: found ${marks.length} markers for ${timeline.length} voice lines; using the wall clock (shift ${shift.toFixed(2)}s)`);
    at = timeline.map((c) => c.at + shift);
  }
  const drift = timeline.map((c, i) => at[i] - c.at);
  console.log(`sync: ${marks.length}/${timeline.length} voice lines placed from markers (clock drift ${Math.min(...drift).toFixed(2)}s to ${Math.max(...drift).toFixed(2)}s)`);
  timeline.forEach((c, i) => (c.video = at[i]));
  fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify(timeline, null, 2));
  const inputs = [];
  const parts = [];
  timeline.forEach((c, i) => {
    inputs.push("-i", c.file);
    const ms = Math.max(0, Math.round(at[i] * 1000));
    parts.push(`[${i + 1}:a]aresample=48000,adelay=${ms}|${ms}[v${i}]`);
  });
  let filter = `${parts.join(";")};${timeline.map((_, i) => `[v${i}]`).join("")}amix=inputs=${timeline.length}:normalize=0[vo]`;
  if (music && fs.existsSync(music)) {
    inputs.push("-stream_loop", "-1", "-i", music);
    const m = timeline.length + 1;
    filter += `;[vo]asplit[vo1][vo2];[${m}:a]aresample=48000,volume=0.35[mu];[mu][vo1]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=400[duck];[duck][vo2]amix=inputs=2:normalize=0,alimiter=limit=0.95,apad=whole_dur=${dur}[aout]`;
  } else filter += `;[vo]alimiter=limit=0.95,apad=whole_dur=${dur}[aout]`; // as long as the picture, no longer
  execFileSync(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-y", "-i", screen, ...inputs,
    "-filter_complex", `[0:v]crop=1920:1080:0:0[vid];${filter}`, "-map", "[vid]", "-map", "[aout]", "-t", dur,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "160k", final,
  ], { stdio: "inherit" });
  // Scene times in the video's own timeline (for the screenplay PDF): shift each scene by the drift of the nearest line.
  const scenesFile = path.join(OUT, "scenes.json");
  const sj = JSON.parse(fs.readFileSync(scenesFile, "utf8"));
  const driftAt = (t) => {
    let best = drift[0] ?? 0;
    let bestD = Infinity;
    timeline.forEach((c, i) => {
      const d = Math.abs(c.at - t);
      if (d < bestD) {
        bestD = d;
        best = drift[i];
      }
    });
    return best;
  };
  for (const sc of sj.scenes) {
    sc.start = Math.max(0, sc.start + driftAt(sc.start));
    sc.end = sc.end + driftAt(sc.end);
  }
  fs.writeFileSync(scenesFile, JSON.stringify(sj, null, 2));
  console.log(`\nwrote ${path.relative(process.cwd(), final)} (${seconds(final).toFixed(1)}s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
