// Video -> frames (PRD §6.2). OWNER: intake.
// Recommended: sample frames CLIENT-side (canvas, ~1 fps, 10–15 frames, downscale to ~768px JPEG) and POST
// data URLs to /api/intake. Avoids server ffmpeg. Put the browser helper in components/VideoCapture.tsx.
// Server-side helpers (e.g. size checks, frame cap) go here.
export const MAX_FRAMES = 15;

export function capFrames(frames: string[], max = MAX_FRAMES): string[] {
  if (frames.length <= max) return frames;
  const step = frames.length / max;
  return Array.from({ length: max }, (_, i) => frames[Math.floor(i * step)]);
}
