// Pass 2 of 2: draw the video frame by frame from the timeline capture.mjs wrote.
//
// stage.html renders any moment t on demand (everything is a function of t), so each frame is drawn exactly once,
// at exactly 1/30 s apart: no dropped or repeated frames, no matter how busy the machine is. Several pages render
// ranges of the video in parallel; the pieces are joined without re-encoding.
//
//   node scripts/video/render.mjs                    -> scripts/video/out/mutuals-demo.mp4 (1080p, 30 fps, silent)
//   node scripts/video/render.mjs --stills 12,40.5   -> scripts/video/out/stills/ (PNG frames at those seconds)
//   node scripts/video/render.mjs --from 55 --to 90  -> just that stretch (out/preview.mp4)
// Options: --fps 30, --workers 4.
import { execFileSync, spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { once } from "events";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";

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
const FPS = Number(arg("fps", 30));
const WORKERS = Number(arg("workers", 4));
const PORT = 3102;
const tl = JSON.parse(fs.readFileSync(path.join(OUT, "timeline.json"), "utf8"));

// ---------------------------------------------------------------- files for the stage
const TYPES = { ".html": "text/html; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".json": "application/json" };
function serve() {
  const roots = { "/frames/": path.join(OUT, "frames"), "/pops/": path.join(OUT, "pops"), "/avatars/": path.join(ROOT, "public", "avatars") };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    let file = null;
    if (url === "/stage.html") file = path.join(HERE, "stage.html");
    for (const [prefix, dir] of Object.entries(roots)) if (url.startsWith(prefix)) file = path.join(dir, path.basename(url));
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
    const buf = await page.screenshot({ type: "jpeg", quality: 93, optimizeForSpeed: true });
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
    execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", final]);
    for (const s of segs) fs.rmSync(s.file, { force: true });
    fs.rmSync(list, { force: true });
    console.log(`wrote ${path.relative(process.cwd(), final)} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    if (!partial) scratchVO();
  } finally {
    await browser.close();
    server.close();
  }
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
