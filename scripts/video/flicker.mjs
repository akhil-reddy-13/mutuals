// Finds flicker in a rendered video: pixels that brighten then darken (or the reverse) on consecutive frames.
// Smooth motion moves one way for many frames; flicker reverses every frame or two.
//
//   node scripts/video/flicker.mjs [scripts/video/out/mutuals-demo.mp4] [fps]
// Prints the worst moments (time, how much of the frame flickered, where).
import { spawn } from "child_process";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = require("ffmpeg-static");
const file = process.argv[2] ?? path.join(HERE, "out", "mutuals-demo.mp4");
const FPS = Number(process.argv[3] ?? 60); // the video's frame rate (render.mjs default: 60)
const W = 320, H = 180, T = 6; // T: brightness steps (0-255) that count as a real change

const ff = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-i", file, "-vf", `scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"]);
const size = W * H;
let buf = Buffer.alloc(0);
const frames = [];
let a = null, b = null;
const grid = 8; // 8x8 regions, to say where
const perFrame = [];
ff.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= size) {
    const c = buf.subarray(0, size);
    buf = buf.subarray(size);
    if (a && b) {
      let n = 0;
      const cells = new Array(grid * grid).fill(0);
      for (let i = 0; i < size; i++) {
        const d1 = b[i] - a[i], d2 = c[i] - b[i];
        if ((d1 > T && d2 < -T) || (d1 < -T && d2 > T)) {
          n++;
          const x = i % W, y = (i / W) | 0;
          cells[Math.floor((y / H) * grid) * grid + Math.floor((x / W) * grid)]++;
        }
      }
      const worst = cells.indexOf(Math.max(...cells));
      perFrame.push({ t: (frames.length - 1) / FPS, n, where: worst, cells });
    }
    a = b;
    b = Buffer.from(c);
    frames.push(1);
  }
});
ff.on("close", () => {
  const pct = (n) => ((100 * n) / size).toFixed(2);
  const sorted = [...perFrame].sort((x, y) => y.n - x.n);
  const total = perFrame.filter((f) => f.n > size * 0.0005).length;
  console.log(`${frames.length} frames; ${total} frames with flicker over 0.05% of the picture`);
  const area = (k) => `${["left", "left", "left-mid", "center", "center", "right-mid", "right", "right"][k % grid]} ${["top", "top", "upper", "middle", "middle", "lower", "bottom", "bottom"][Math.floor(k / grid)]}`;
  for (const f of sorted.slice(0, 25)) console.log(`  t=${f.t.toFixed(2)}s  ${pct(f.n)}% of pixels  mostly ${area(f.where)}`);
  // runs: stretches where flicker keeps happening (the kind you notice)
  const runs = [];
  let cur = null;
  for (const f of perFrame) {
    if (f.n > size * 0.0004) {
      if (cur && f.t - cur.end < 0.15) {
        cur.end = f.t;
        cur.sum += f.n;
        cur.k++;
      } else runs.push((cur = { start: f.t, end: f.t, sum: f.n, k: 1, where: f.where }));
    }
  }
  console.log("longest flickering stretches:");
  for (const r of runs.sort((x, y) => y.k - x.k).slice(0, 15)) console.log(`  ${r.start.toFixed(2)}-${r.end.toFixed(2)}s  ${r.k} frames  mostly ${area(r.where)}`);
});
