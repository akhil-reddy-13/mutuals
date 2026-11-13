// One command: screenplay in, video + screenplay PDF out.
//
//   node scripts/video/make.mjs                 dry run (live Muse for anything new) -> capture -> render -> PDF -> preview
//   node scripts/video/make.mjs --skip-dry      when nothing that reaches Muse changed (wording, SUPERs, order, timing)
//   node scripts/video/make.mjs --render-only   re-render from the last capture (changes to stage.html only)
//   node scripts/video/make.mjs --pdf-only      just re-render docs/video/mutuals-screenplay.pdf
//
// Needs the app running (production build, so pages load instantly):
//   NEXT_DIST_DIR=.next-demo npx next build
//   NEXT_DIST_DIR=.next-demo MUSE_REPLAY_DELAY_MS=900 npx next start -p 3001 -H 127.0.0.1
//
// Outputs: scripts/video/out/mutuals-demo.mp4 (1080p30, silent), docs/video/mutuals-demo.mp4 (720p, committed),
// docs/video/mutuals-screenplay.pdf (each scene's timecode in this cut), scripts/video/out/scratch-vo.wav.
import { execFileSync } from "child_process";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const FFMPEG = require("ffmpeg-static");
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const pass = args.filter((a) => !["--skip-dry", "--pdf-only", "--render-only"].includes(a)); // --app / --script go through
const node = (script, extra = []) => execFileSync(process.execPath, [path.join(HERE, script), ...extra, ...pass], { stdio: "inherit", cwd: ROOT });

if (!has("--pdf-only")) {
  if (!has("--render-only")) {
    const i = args.indexOf("--app");
    const app = i >= 0 ? args[i + 1] : "http://127.0.0.1:3001";
    const ok = await fetch(app).then((r) => r.ok).catch(() => false);
    if (!ok) {
      console.error(`The app isn't running at ${app}. Start it first:\n  NEXT_DIST_DIR=.next-demo npx next build\n  NEXT_DIST_DIR=.next-demo MUSE_REPLAY_DELAY_MS=900 npx next start -p 3001 -H 127.0.0.1`);
      process.exit(1);
    }
    if (!has("--skip-dry")) {
      console.log("1/5  dry run: every app action, live on Muse where the cache doesn't have it yet");
      node("capture.mjs", ["--dry"]);
    }
    console.log("2/5  capture: the app's screen at 3x and every event on the timeline");
    node("capture.mjs");
  }
  console.log("3/5  render: every frame, drawn from the timeline");
  execFileSync(process.execPath, [path.join(HERE, "render.mjs")], { stdio: "inherit", cwd: ROOT });
}
console.log("4/5  screenplay PDF");
node("render-screenplay.mjs");
if (!has("--pdf-only")) {
  console.log("5/5  720p preview for the repo");
  execFileSync(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-y", "-i", path.join(HERE, "out", "mutuals-demo.mp4"),
    "-vf", "scale=1280:-2:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    path.join(ROOT, "docs", "video", "mutuals-demo.mp4"),
  ], { stdio: "inherit" });
  console.log("done: scripts/video/out/mutuals-demo.mp4 (1080p), docs/video/mutuals-demo.mp4 (720p), docs/video/mutuals-screenplay.pdf");
}
