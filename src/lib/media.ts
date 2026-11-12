// Server-side video prep: phone video -> ~10 frames (640px JPEG data URLs) + narration (16 kHz mono WAV, base64).
// Why server-side: iPhone .MOV files (HEVC video, AAC + a 4-channel spatial-audio track) often can't be decoded by
// Chrome's in-browser APIs, so client-side extraction silently dropped the narration. ffmpeg (bundled via
// ffmpeg-static, so no system install needed) reads anything a phone records. The client falls back to in-browser
// extraction if this fails.
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const FFMPEG = (ffmpegPath as unknown as string) || "ffmpeg";

export const MAX_FRAMES = 10;
export const MAX_AUDIO_SECONDS = 30;

async function duration(file: string): Promise<number> {
  // `ffmpeg -i` with no output exits non-zero but prints "Duration: HH:MM:SS.xx" to stderr.
  const out = await run(FFMPEG, ["-hide_banner", "-i", file]).catch((e: { stderr?: string }) => ({ stderr: e.stderr ?? "" }));
  const m = String(out.stderr).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

export async function prepVideo(bytes: Buffer, ext = "mov"): Promise<{ frames: string[]; audio: string | null; seconds: number }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mutuals-vid-"));
  try {
    const src = path.join(dir, `in.${ext.replace(/[^a-z0-9]/gi, "") || "mov"}`);
    fs.writeFileSync(src, bytes);
    const seconds = await duration(src);
    // Evenly spaced frames across the whole clip (skip the very first/last 3% where phones are still moving).
    const n = Math.max(1, Math.min(MAX_FRAMES, Math.round(seconds) || MAX_FRAMES));
    const fps = seconds > 0 ? n / (seconds * 0.94) : 1;
    const start = (seconds * 0.03).toFixed(2);
    await run(FFMPEG, ["-hide_banner", "-loglevel", "error", "-ss", start, "-i", src, "-vf", `fps=${fps.toFixed(4)},scale=640:-2`, "-frames:v", String(n), "-q:v", "5", path.join(dir, "f%02d.jpg")]);
    const frames = fs
      .readdirSync(dir)
      .filter((f) => /^f\d+\.jpg$/.test(f))
      .sort()
      .map((f) => `data:image/jpeg;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}`);
    // First audio track only (iPhones add a 4-channel spatial track ffmpeg can't decode), mono 16 kHz.
    let audio: string | null = null;
    try {
      const wav = path.join(dir, "a.wav");
      await run(FFMPEG, ["-hide_banner", "-loglevel", "error", "-i", src, "-map", "0:a:0", "-ac", "1", "-ar", "16000", "-t", String(MAX_AUDIO_SECONDS), wav]);
      const buf = fs.readFileSync(wav);
      audio = buf.length > 16000 ? buf.toString("base64") : null; // < ~0.5 s of audio: treat as none
    } catch {
      audio = null; // silent video
    }
    return { frames, audio, seconds };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
