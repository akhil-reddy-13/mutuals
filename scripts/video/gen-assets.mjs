// Assets for the demo video's selling beat (Jamie moving out of the dorm):
//   1. Muse Image stills of a dorm desk: the Canon camera, a lamp, a mini fridge, a plant that is NOT for sale.
//   2. room.mp4: a 14-second vertical "phone video" panning across them, with Jamie's narration (macOS `say`).
// The app reads room.mp4 exactly like a real upload: server-side ffmpeg frames + audio -> Ember -> Spark.
// A stand-in until someone films a real desk. Skips any file that already exists; delete one to redo it.
//
//   node scripts/video/gen-assets.mjs
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
require("@next/env").loadEnvConfig(root);
const FFMPEG = require("ffmpeg-static");
const dir = path.join(root, "scripts/video/assets");
fs.mkdirSync(dir, { recursive: true });

const STYLE = "Candid smartphone photo, natural window light, realistic, slightly imperfect framing, no people.";
const SHOTS = [
  {
    name: "desk_wide",
    prompt:
      "A dorm room desk by a window during move-out week: a compact silver Canon point-and-shoot camera with a flip screen, a white adjustable LED desk lamp, a small potted pothos plant, a closed laptop, and a black mini fridge on the floor next to the desk. Two moving boxes in the corner.",
    say: "Okay, moving out.",
  },
  {
    name: "camera",
    prompt:
      "Close-up of a compact silver Canon PowerShot G7 X Mark III camera on a wooden dorm desk, lens retracted, the Canon logo and G7 X lettering on the front, flip screen folded.",
    say: "I'm selling this Canon camera, it's the G7 X.",
  },
  { name: "lamp", prompt: "A white adjustable LED desk lamp with a round base on a dorm desk, switched on, small scuff on the base.", say: "The desk lamp too, it works fine." },
  { name: "fridge", prompt: "A small black mini fridge on a dorm room floor next to a desk, door closed, a couple of magnets on it.", say: "And the mini fridge." },
  { name: "plant", prompt: "A small pothos plant in a terracotta pot on a dorm room windowsill.", say: "Not the plant though. That one's coming with me to Chicago." },
];
const NARRATOR_VOICE = "Eddy (English (US))";

async function image(name, prompt) {
  const out = path.join(dir, `${name}.jpg`);
  if (fs.existsSync(out)) return `skip ${name}`;
  const res = await fetch(`${process.env.MUSE_BASE_URL}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MUSE_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "muse-image-1.0", prompt: `${prompt} ${STYLE}`, size: "1024x1024", n: 1 }),
  });
  const j = await res.json();
  if (!j.data?.[0]?.b64_json) throw new Error(`${name}: ${JSON.stringify(j).slice(0, 200)}`);
  const png = out.replace(/\.jpg$/, ".png");
  fs.writeFileSync(png, Buffer.from(j.data[0].b64_json, "base64"));
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "85", png, "--out", out], { stdio: "ignore" });
  fs.unlinkSync(png);
  return `made ${name}`;
}

function seconds(file) {
  const out = (() => {
    try {
      return execFileSync(FFMPEG, ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] }).toString();
    } catch (e) {
      return String(e.stderr);
    }
  })();
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

function roomVideo() {
  const out = path.join(dir, "room.mp4");
  if (fs.existsSync(out)) return "skip room.mp4";
  const tmp = fs.mkdtempSync(path.join(dir, ".tmp-"));
  try {
    // One narration clip per shot; each shot lasts as long as its line plus a beat.
    const clips = SHOTS.map((s, i) => {
      const aiff = path.join(tmp, `n${i}.aiff`);
      execFileSync("say", ["-v", NARRATOR_VOICE, "-r", "185", "-o", aiff, s.say]);
      return { aiff, dur: Math.max(2.4, seconds(aiff) + 0.5) };
    });
    // Video: each still becomes a slow push-in, cropped to 9:16 like a phone held upright.
    const fps = 30;
    const parts = [];
    SHOTS.forEach((s, i) => {
      const frames = Math.round(clips[i].dur * fps);
      const seg = path.join(tmp, `v${i}.mp4`);
      execFileSync(FFMPEG, [
        "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-i", path.join(dir, `${s.name}.jpg`),
        "-vf", `crop=576:1024,scale=1080:1920,zoompan=z='min(zoom+0.0009,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=720x1280:fps=${fps}`,
        "-frames:v", String(frames), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", seg,
      ]);
      parts.push(seg);
    });
    const list = path.join(tmp, "list.txt");
    fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
    const silent = path.join(tmp, "silent.mp4");
    execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);
    // Audio: each line starts 0.2 s into its shot.
    let t = 0;
    const inputs = [];
    const delays = [];
    clips.forEach((c, i) => {
      inputs.push("-i", c.aiff);
      const ms = Math.round((t + 0.2) * 1000);
      delays.push(`[${i + 1}:a]adelay=${ms}|${ms},aresample=44100[a${i}]`);
      t += c.dur;
    });
    const mix = `${delays.join(";")};${clips.map((_, i) => `[a${i}]`).join("")}amix=inputs=${clips.length}:normalize=0[aout]`;
    execFileSync(FFMPEG, [
      "-hide_banner", "-loglevel", "error", "-y", "-i", silent, ...inputs,
      "-filter_complex", mix, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", out,
    ]);
    return `made room.mp4 (${t.toFixed(1)}s)`;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const results = await Promise.allSettled(SHOTS.map((s) => image(s.name, s.prompt)));
for (const r of results) console.log(r.status === "fulfilled" ? r.value : `ERR ${r.reason}`);
console.log(roomVideo());
