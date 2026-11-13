// Pass 2 of 2: draw the video frame by frame from the timeline capture.mjs wrote.
//
// stage.html renders any moment t on demand (everything is a function of t), so each frame is drawn exactly once,
// at exactly 1/30 s apart: no dropped or repeated frames, no matter how busy the machine is. Several pages render
// ranges of the video in parallel; the pieces are joined without re-encoding.
//
//   node scripts/video/render.mjs                    -> scripts/video/out/mutuals-demo.mp4 (1080p, 60 fps, silent)
//   node scripts/video/render.mjs --stills 12,40.5   -> scripts/video/out/stills/ (PNG frames at those seconds)
//   node scripts/video/render.mjs --from 55 --to 90  -> just that stretch (out/preview.mp4)
//   node scripts/video/render.mjs --audio-only       -> re-mix the sound onto the last render (seconds, no frames)
// Options: --fps 60, --workers 4, --music-volume, --music-from (seconds into the song; defaults below).
//
// Sound: the footage's own audio (skit, selling clip), the effects track (sfx.mjs, timed by stage.html's cues) and,
// if there's a file in scripts/video/assets/music/, that song under the animated part, ducked under the clips.
// The music folder is git-ignored: we don't commit songs we don't have the rights to.
import { execFileSync, spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { once } from "events";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";
import { soundtrack, writeWav } from "./sfx.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const FFMPEG = require("ffmpeg-static");
const OUT = path.join(HERE, "out");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i < 0 ? d : process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true;
};
const FPS = Number(arg("fps", 60));
const WORKERS = Number(arg("workers", 4));
const PORT = 3102;
const tl = JSON.parse(fs.readFileSync(path.join(OUT, "timeline.json"), "utf8"));
const MEDIA = path.join(OUT, "media");
const SILENT = path.join(OUT, "silent.mp4");
const SFX = path.join(OUT, "sfx.wav");
const CUES = path.join(OUT, "cues.json");
// the song we use (Earrings, Malcolm Todd): it comes in after the skit, timed so its first "extra extra" (1:37.2 in
// the song) lands on the Mutuals logo; quiet, as background. It loops back once, 6 of its 5.99 s phrases, so the loop
// stays on the beat.
const MUSIC_ON_LOGO = Number(arg("music-on-logo", 97.2));
const MUSIC_VOLUME = Number(arg("music-volume", 0.05));
const MUSIC_LOOP_BACK = 6 * 5.99;

// ---------------------------------------------------------------- filmed footage and clip slots
// Each [[film]] and each filled [[clip]] is cut into JPEG frames once (out/media/<key>/), and the stage shows the
// frame for time t like it shows the app. A clip slot whose file isn't there yet is drawn as an empty slot.
const media = () => tl.scenes.flatMap((s) => s.events.filter((e) => (e.type === "film" || e.type === "clip") && e.src));
function probe(file) {
  let out = "";
  try {
    execFileSync(FFMPEG, ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    out = String(e.stderr);
  }
  const fps = Number(out.match(/,\s*([\d.]+)\s*fps/)?.[1] ?? 30);
  const [, hh, mm, ss] = out.match(/Duration: (\d+):(\d+):([\d.]+)/) ?? [0, 0, 0, 0];
  const [, w, h] = out.match(/Video:.*?, (\d+)x(\d+)/) ?? [0, 16, 9];
  const turned = /rotation of -?90/.test(out);
  return { fps: Math.min(60, fps || 30), audio: /Stream #.*Audio:/.test(out), portrait: turned ? +w > +h : +h > +w, dur: +hh * 3600 + +mm * 60 + +ss };
}
function prepareMedia() {
  for (const e of media()) {
    if (!fs.existsSync(e.src)) {
      delete e.src;
      continue;
    }
    const st = fs.statSync(e.src);
    const key = Buffer.from(`${e.src}|${st.size}|${st.mtimeMs}`).toString("base64url").slice(-32);
    const dir = path.join(MEDIA, key);
    const { fps, audio, portrait } = probe(e.src);
    if (!fs.existsSync(path.join(dir, "done"))) {
      console.log(`cutting ${path.basename(e.src)} into frames`);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-i", e.src, "-vf", `scale=${portrait ? "-2:1080" : "1920:1080:force_original_aspect_ratio=increase"}:flags=lanczos`, "-q:v", "3", path.join(dir, "f%05d.jpg")]);
      fs.writeFileSync(path.join(dir, "done"), "");
    }
    const count = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).length;
    Object.assign(e, { media: { dir: key, fps, count, portrait }, audio });
  }
}
prepareMedia();

// ---------------------------------------------------------------- files for the stage
const TYPES = { ".html": "text/html; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".json": "application/json" };
function serve() {
  const roots = { "/frames/": path.join(OUT, "frames"), "/pops/": path.join(OUT, "pops"), "/avatars/": path.join(ROOT, "public", "avatars") };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    let file = null;
    if (url === "/stage.html") file = path.join(HERE, "stage.html");
    for (const [prefix, dir] of Object.entries(roots)) if (url.startsWith(prefix)) file = path.join(dir, path.basename(url));
    const m = url.match(/^\/media\/([\w-]+)\/(f\d+\.jpg)$/);
    if (m) file = path.join(MEDIA, m[1], m[2]);
    if (!file || !fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream", "cache-control": "max-age=3600" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(PORT, "127.0.0.1", () => r(server)));
}

async function openStage(browser) {
  const page = await browser.newPage();
  page.setDefaultTimeout(120_000);
  await page.goto(`http://127.0.0.1:${PORT}/stage.html`, { waitUntil: "load" });
  await page.evaluate((tl, base) => window.stage.load(tl, base), tl, `http://127.0.0.1:${PORT}`);
  return page;
}

async function renderRange(browser, from, to, file, label) {
  const page = await openStage(browser);
  const ff = spawn(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart", file,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let i = from; i < to; i++) {
    await page.evaluate((t) => window.stage.render(t), i / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 97, optimizeForSpeed: true });
    if (!ff.stdin.write(buf)) await once(ff.stdin, "drain");
    if ((i - from) % 300 === 299) console.log(`  ${label}: ${i - from + 1}/${to - from} frames (${((Date.now() - t0) / (i - from + 1)).toFixed(0)} ms/frame)`);
  }
  ff.stdin.end();
  await once(ff, "close");
  await page.close();
}

async function main() {
  const server = await serve();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    protocolTimeout: 600_000,
    args: ["--hide-scrollbars", "--font-render-hinting=none", "--disable-lcd-text"],
  });
  try {
    // the effects track, from stage.html's cues
    const cuePage = await openStage(browser);
    const cues = await cuePage.evaluate(() => window.stage.cues());
    await cuePage.close();
    fs.writeFileSync(CUES, JSON.stringify(cues));
    writeWav(SFX, soundtrack(cues, tl.duration));
    console.log(`${cues.length} sound effects`);
    if (arg("audio-only", false)) {
      if (!fs.existsSync(SILENT)) throw new Error("render the video once first (out/silent.mp4)");
      withAudio(SILENT, path.join(OUT, "mutuals-demo.mp4"), 0, tl.duration);
      return console.log("re-mixed the sound onto scripts/video/out/mutuals-demo.mp4");
    }
    const stills = arg("stills", null);
    if (stills) {
      const dir = path.join(OUT, "stills");
      fs.mkdirSync(dir, { recursive: true });
      const page = await openStage(browser);
      for (const s of String(stills).split(",").map(Number)) {
        await page.evaluate((t) => window.stage.render(t), s);
        await page.screenshot({ path: path.join(dir, `t${s.toFixed(2).padStart(7, "0")}.png`) });
      }
      console.log(`stills -> scripts/video/out/stills/`);
      return;
    }
    const total = Math.round(tl.duration * FPS);
    const a = Math.max(0, Math.round(Number(arg("from", 0)) * FPS));
    const b = Math.min(total, Math.round(Number(arg("to", tl.duration)) * FPS));
    const partial = a > 0 || b < total;
    const n = Math.max(1, Math.min(WORKERS, Math.ceil((b - a) / 150)));
    const per = Math.ceil((b - a) / n);
    const segs = Array.from({ length: n }, (_, k) => ({ from: a + k * per, to: Math.min(b, a + (k + 1) * per), file: path.join(OUT, `seg${k}.mp4`) })).filter((s) => s.to > s.from);
    console.log(`rendering ${b - a} frames (${((b - a) / FPS).toFixed(1)}s at ${FPS} fps) on ${segs.length} pages`);
    const t0 = Date.now();
    await Promise.all(segs.map((s, k) => renderRange(browser, s.from, s.to, s.file, `page ${k + 1}`)));
    const list = path.join(OUT, "segs.txt");
    fs.writeFileSync(list, segs.map((s) => `file '${s.file}'`).join("\n"));
    const final = path.join(OUT, partial ? "preview.mp4" : "mutuals-demo.mp4");
    const silent = partial ? path.join(OUT, "silent-preview.mp4") : SILENT;
    execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", silent]);
    withAudio(silent, final, a / FPS, (b - a) / FPS);
    for (const s of segs) fs.rmSync(s.file, { force: true });
    fs.rmSync(list, { force: true });
    console.log(`wrote ${path.relative(process.cwd(), final)} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    if (!partial) scratchVO();
  } finally {
    await browser.close();
    server.close();
  }
}

/** The song in scripts/video/assets/music/, if there is one. */
function music() {
  const dir = path.join(HERE, "assets", "music");
  const f = fs.existsSync(dir) && fs.readdirSync(dir).find((x) => /\.(mp3|m4a|aac|wav|aiff?|flac|ogg|mp4|mov)$/i.test(x));
  return f ? path.join(dir, f) : null;
}

/** The video's sound: the footage's own audio at its place, the effects, and the song (if any) under the animated
 *  part, ducked to 15% while a clip plays. The silent video is kept for --audio-only. */
function withAudio(video, final, from, dur) {
  const st = (x) => `aresample=48000,aformat=channel_layouts=stereo,${x}`;
  const tracks = media().filter((e) => e.audio && e.src && e.t + (e.dur ?? 0) > from && e.t < from + dur);
  const inputs = [], parts = [];
  tracks.forEach((e, i) => {
    const skip = Math.max(0, from - e.t), delay = Math.round(Math.max(0, e.t - from) * 1000), len = (e.dur ?? 0) - skip;
    inputs.push("-i", e.src);
    parts.push(`[${i + 1}:a]${st(`atrim=start=${skip.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:st=${Math.max(0, len - 0.6).toFixed(3)}:d=0.6,adelay=${delay}|${delay}`)}[a${parts.length}]`);
  });
  if (fs.existsSync(SFX)) {
    inputs.push("-i", SFX);
    parts.push(`[${inputs.length / 2}:a]${st(`atrim=start=${from.toFixed(3)},asetpts=PTS-STARTPTS`)}[a${parts.length}]`);
  }
  const song = music();
  if (song) {
    // from the end of the skit to the end, dipping under the clips (the selling video) so their voices carry
    const S = Math.max(0, (tl.scenes.find((s) => s.kind !== "film")?.start ?? 0) - 0.3), E = tl.duration;
    const logo = tl.scenes.flatMap((sc) => sc.events).find((e) => e.type === "logo");
    const songAt = Math.max(0, MUSIC_ON_LOGO - (logo ? logo.t - S : 0)); // where in the song to start
    const ducks = tl.scenes.flatMap((s) => s.events.filter((e) => e.type === "clip" && e.dur)).map((e) => `(1-0.85*clip(min((t-${(e.t - 0.8).toFixed(2)})/0.8,(${(e.t + e.dur + 0.8).toFixed(2)}-t)/0.8),0,1))`);
    const vol = [`${MUSIC_VOLUME}`, `clip((t-${S.toFixed(2)})/1.2,0,1)`, `clip((${E.toFixed(2)}-t)/2.5,0,1)`, ...ducks].join("*");
    const ms = Math.round(Math.max(0, S) * 1000);
    const total = probe(song).dur, need = E - S, n = inputs.length / 2 + 1;
    inputs.push("-i", song);
    // too short from there: play on until just before the song's own ending, then cross-fade back MUSIC_LOOP_BACK
    const xf = 1.5, cut = total - 8;
    const src = total - songAt >= need
      ? `[${n}:a]aresample=48000,atrim=start=${songAt.toFixed(2)},asetpts=PTS-STARTPTS[mraw]`
      : `[${n}:a]aresample=48000,asplit[m1][m2];[m1]atrim=start=${songAt.toFixed(2)}:end=${cut.toFixed(2)},asetpts=PTS-STARTPTS[p1];[m2]atrim=start=${Math.max(0, cut - xf - MUSIC_LOOP_BACK).toFixed(2)},asetpts=PTS-STARTPTS[p2];[p1][p2]acrossfade=d=${xf}[mraw]`;
    parts.push(`${src};[mraw]${st(`adelay=${ms}|${ms},volume='${vol}':eval=frame,atrim=start=${from.toFixed(3)},asetpts=PTS-STARTPTS`)}[a${parts.length}]`);
    console.log(`music: ${path.basename(song)}`);
  }
  if (!parts.length) return fs.copyFileSync(video, final);
  const filter = `${parts.join(";")};${parts.map((_, i) => `[a${i}]`).join("")}amix=inputs=${parts.length}:normalize=0,alimiter=limit=0.95,apad[out]`;
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-i", video, ...inputs, "-filter_complex", filter, "-map", "0:v", "-map", "[out]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", dur.toFixed(3), "-movflags", "+faststart", final]);
}

/** The narration timing as a scratch track (macOS voices), for whoever records the real voiceover. Not in the video. */
function scratchVO() {
  const vo = tl.scenes.flatMap((s) => s.events.filter((e) => (e.type === "vo" || e.type === "line") && e.file && fs.existsSync(e.file)));
  if (!vo.length) return;
  const inputs = vo.flatMap((e) => ["-i", e.file]);
  const parts = vo.map((e, i) => `[${i}:a]aresample=48000,adelay=${Math.round(e.t * 1000)}|${Math.round(e.t * 1000)}[a${i}]`);
  const filter = `${parts.join(";")};${vo.map((_, i) => `[a${i}]`).join("")}amix=inputs=${vo.length}:normalize=0,apad=whole_dur=${tl.duration.toFixed(2)}[out]`;
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", filter, "-map", "[out]", "-t", tl.duration.toFixed(2), path.join(OUT, "scratch-vo.wav")]);
  console.log("wrote scripts/video/out/scratch-vo.wav (narration timing, not in the video)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
