// One command: screenplay in, video + screenplay PDF out.
//
//   node scripts/video/make.mjs                 dry run (live Muse calls for anything new) -> record -> PDF -> preview
//   node scripts/video/make.mjs --skip-dry      when nothing that reaches Muse changed (only narration/SUPER/timing)
//   node scripts/video/make.mjs --pdf-only      just re-render docs/video/mutuals-screenplay.pdf
//
// Needs the app running (production build, so pages are instant and there is no dev badge):
//   NEXT_DIST_DIR=.next-demo npx next build
//   NEXT_DIST_DIR=.next-demo MUSE_REPLAY_DELAY_MS=900 npx next start -p 3001 -H 127.0.0.1
//
// Outputs: scripts/video/out/mutuals-demo.mp4 (1080p master), docs/video/mutuals-demo.mp4 (720p, committed),
// docs/video/mutuals-screenplay.pdf (with each scene's timecode from this recording).
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
const pass = args.filter((a) => !["--skip-dry", "--pdf-only"].includes(a)); // --app / --script go through
const node = (script, extra = []) => execFileSync(process.execPath, [path.join(HERE, script), ...extra, ...pass], { stdio: "inherit", cwd: ROOT });

if (!has("--pdf-only")) {
  const app = (() => {
    const i = args.indexOf("--app");
    return i >= 0 ? args[i + 1] : "http://127.0.0.1:3001";
  })();
  const ok = await fetch(app).then((r) => r.ok).catch(() => false);
  if (!ok) {
    console.error(`The app isn't running at ${app}. Start it first:\n  NEXT_DIST_DIR=.next-demo npx next build\n  NEXT_DIST_DIR=.next-demo MUSE_REPLAY_DELAY_MS=900 npx next start -p 3001 -H 127.0.0.1`);
    process.exit(1);
  }
  if (!has("--skip-dry")) {
    console.log("1/4  dry run: every phone action, live on Muse where the cache doesn't have it yet");
    node("record.mjs", ["--dry"]);
  }
  console.log("2/4  recording");
  node("record.mjs");
}
console.log("3/4  screenplay PDF");
node("render-screenplay.mjs");
if (!has("--pdf-only")) {
  console.log("4/4  720p preview for the repo");
  execFileSync(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-y", "-i", path.join(HERE, "out", "mutuals-demo.mp4"),
    "-vf", "scale=1280:-2", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "96k", path.join(ROOT, "docs", "video", "mutuals-demo.mp4"),
  ], { stdio: "inherit" });
  console.log("done: scripts/video/out/mutuals-demo.mp4 (1080p), docs/video/mutuals-demo.mp4 (720p), docs/video/mutuals-screenplay.pdf");
}
