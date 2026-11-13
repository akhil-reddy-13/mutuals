// The sound effects, made in code (no sample files): a bubble when a message comes in or goes out, one whoosh out of
// the skit, and a chime for a fit. stage.html says when each one plays (window.stage.cues()), and
// render.mjs lays this track under the video.
//
//   node scripts/video/sfx.mjs   -> scripts/video/out/sfx-sampler.wav (every sound once, to listen to)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const SR = 48000;
const TAU = Math.PI * 2;

// Each sound writes into `o` starting at sample `at`, scaled by `v`, pitched by `p`.
function tone(o, at, f, dur, amp, decay, harm = [1, 0.3, 0.1], attack = 0.004) {
  const n = Math.round(dur * SR);
  for (let i = 0; i < n && at + i < o.length; i++) {
    const t = i / SR;
    const e = t < attack ? t / attack : Math.exp(-(t - attack) / decay);
    let x = 0;
    harm.forEach((h, k) => (x += h * Math.sin(TAU * f * (k + 1) * t)));
    if (at + i >= 0) o[at + i] += amp * e * x;
  }
}
function sweep(o, at, f0, f1, dur, amp, decay) {
  let ph = 0;
  for (let i = 0; i < Math.round(dur * SR) && at + i < o.length; i++) {
    const t = i / SR;
    ph += (TAU * f0 * Math.pow(f1 / f0, Math.min(1, t / dur))) / SR;
    const e = t < 0.002 ? t / 0.002 : Math.exp(-t / decay);
    if (at + i >= 0) o[at + i] += amp * e * Math.sin(ph);
  }
}
/** Noise through a band-pass whose centre moves along `path` (Hz at even steps), shaped by sin^k. */
function noise(o, at, dur, amp, path, k = 1.5, seed = 1) {
  let low = 0, band = 0, r = seed;
  const n = Math.round(dur * SR);
  for (let i = 0; i < n && at + i < o.length; i++) {
    const u = i / n;
    const seg = Math.min(path.length - 2, Math.floor(u * (path.length - 1)));
    const fc = path[seg] + (path[seg + 1] - path[seg]) * (u * (path.length - 1) - seg);
    const f = 2 * Math.sin((Math.PI * fc) / SR);
    r = (r * 16807) % 2147483647;
    const x = (r / 2147483647) * 2 - 1;
    low += f * band;
    const high = x - low - 0.9 * band;
    band += f * high;
    if (at + i >= 0) o[at + i] += amp * Math.pow(Math.sin(Math.PI * u), k) * band;
  }
}

// A bubble: a sine whose pitch rises fast as it dies away, the way a drop or a message bubble "bloops".
const bloop = (o, at, f0, f1, dur, amp, decay) => sweep(o, at, f0, f1, dur, amp, decay);

const SOUNDS = {
  // a message comes in: a round bubble, then a smaller one just after
  recv: (o, at, v, p) => {
    bloop(o, at, 520 * p, 1250 * p, 0.07, 0.45 * v, 0.045);
    bloop(o, at + Math.round(0.05 * SR), 820 * p, 1700 * p, 0.05, 0.12 * v, 0.03);
  },
  // a message goes out: a quicker, brighter bubble with a breath of air
  sent: (o, at, v, p) => {
    bloop(o, at, 700 * p, 1900 * p, 0.05, 0.4 * v, 0.035);
    noise(o, at, 0.12, 0.12 * v, [2500, 5000], 2, 7);
  },
  // out of the skit: one soft whoosh
  whoosh: (o, at, v, p) => noise(o, at, 0.75, 0.55 * v, [220 * p, 900 * p, 2400 * p, 700 * p], 1.6, 3),
  // a fit: three notes, rising
  chime: (o, at, v, p) => [1046.5, 1318.5, 1568].forEach((f, k) => tone(o, at + Math.round(k * 0.065 * SR), f * p, 1.0, 0.09 * v, 0.4, [1, 0.18])),
};

/** The whole effects track: mono samples, `duration` seconds long. */
export function soundtrack(cues, duration) {
  const o = new Float32Array(Math.ceil(duration * SR));
  for (const c of cues) {
    const fn = SOUNDS[c.s];
    if (!fn) throw new Error(`no sound called "${c.s}"`);
    fn(o, Math.round(c.t * SR), c.v ?? 1, c.p ?? 1);
  }
  for (let i = 0; i < o.length; i++) o[i] = Math.tanh(o[i]); // soft limit where sounds stack up
  return o;
}

export function writeWav(file, o) {
  const b = Buffer.alloc(44 + o.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + o.length * 2, 4); b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(o.length * 2, 40);
  for (let i = 0; i < o.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, o[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const names = Object.keys(SOUNDS);
  const o = soundtrack(names.map((s, k) => ({ t: 0.3 + k * 1.6, s })), 0.3 + names.length * 1.6 + 1);
  const peak = o.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  console.assert(peak > 0.05 && peak < 1, `peak ${peak}`);
  names.forEach((s, k) => {
    const a = Math.round((0.3 + k * 1.6) * SR), e = o.subarray(a, a + SR).reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    console.assert(e > 0.02, `${s} is silent`);
  });
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "out", "sfx-sampler.wav");
  writeWav(file, o);
  console.log(`${names.join(", ")} -> ${path.relative(process.cwd(), file)} (peak ${peak.toFixed(2)})`);
}
