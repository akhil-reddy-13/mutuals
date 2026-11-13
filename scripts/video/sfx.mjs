// The sound effects, made in code (no sample files): a received-message ding, a sent swoosh, pops, whooshes, a scroll
// swish, a chime for a fit and a low hit for the logo. stage.html says when each one plays (window.stage.cues()), and
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

const SOUNDS = {
  // a message arrives: two quick bell notes, up a fourth
  recv: (o, at, v, p) => {
    tone(o, at, 1174.7 * p, 0.35, 0.16 * v, 0.12);
    tone(o, at + Math.round(0.085 * SR), 1568 * p, 0.6, 0.16 * v, 0.22);
  },
  // a message goes out: a short rising swoosh
  sent: (o, at, v, p) => {
    noise(o, at, 0.26, 0.5 * v, [600 * p, 2600 * p, 4200 * p], 2, 7);
    sweep(o, at + Math.round(0.05 * SR), 700 * p, 1900 * p, 0.14, 0.05 * v, 0.06);
  },
  // a card lands
  pop: (o, at, v, p) => sweep(o, at, 950 * p, 380 * p, 0.09, 0.26 * v, 0.045),
  // a scene change
  whoosh: (o, at, v, p) => noise(o, at, 0.75, 0.55 * v, [220 * p, 900 * p, 2400 * p, 700 * p], 1.6, 3),
  // the wall starts scrolling: a soft, long swish
  scroll: (o, at, v, p) => noise(o, at, 1.1, 0.35 * v, [1800 * p, 3200 * p, 2400 * p], 2.2, 11),
  // a fit: three notes, rising
  chime: (o, at, v, p) => [1046.5, 1318.5, 1568].forEach((f, k) => tone(o, at + Math.round(k * 0.065 * SR), f * p, 1.0, 0.09 * v, 0.4, [1, 0.18])),
  // the logo: a low hit with a little shimmer
  hit: (o, at, v, p) => {
    sweep(o, at, 120 * p, 46 * p, 0.9, 0.38 * v, 0.32);
    noise(o, at, 0.18, 0.4 * v, [3000, 900], 1, 5);
    tone(o, at + Math.round(0.03 * SR), 2093 * p, 1.4, 0.03 * v, 0.6, [1]);
    tone(o, at + Math.round(0.03 * SR), 3136 * p, 1.4, 0.02 * v, 0.5, [1]);
  },
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
