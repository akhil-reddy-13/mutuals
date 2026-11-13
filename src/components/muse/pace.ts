// DEMO ONLY: the timing behind the Muse conversations wall (ConversationGrid.tsx), kept in plain TypeScript so it can
// be tested. Each conversation plays on its own clock, like a short looping video: a pause before each reply, typing
// that takes longer for longer messages, the finished conversation held for a few seconds, then a brief dim and it
// starts again (taste skill: a loop's reset dims and rewrites, never blanks). Every conversation joins its loop at a
// different point, so at any moment some boxes are typing and some sit on a finished exchange. The scroll never
// drives any of this.
export type Side = "me" | "other" | "note";
export interface ConvoView {
  id: string;
  running: boolean;
  meName: string;
  meAvatar: string;
  otherName: string;
  otherAvatar: string;
  verdict: { compatible: boolean } | null;
  turns: { side: Side; text: string }[];
}

export const DIM_MS = 450;
const PACE = 1.15; // stretches every wait, typing and hold: a touch slower, so bubbles can be read while scrolling past

// Same id, same pace on every render (mulberry32 seeded from the negotiation id).
function seeded(id: string) {
  let a = 0;
  for (let i = 0; i < id.length; i++) a = (Math.imul(a ^ id.charCodeAt(i), 2654435761) >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Timeline {
  steps: { typeAt: number; landAt: number }[]; // ms into the loop, one per turn after the opener
  holdUntil: number; // the finished conversation stays until here
  cycle: number; // then a short dim, then the loop starts over
  offset: number; // where this conversation's loop was when the page opened
}
const timelines = new Map<string, Timeline>();

export function timelineFor(c: ConvoView): Timeline {
  const key = `${c.id}:${c.turns.length}`;
  const hit = timelines.get(key);
  if (hit) return hit;
  const r = seeded(c.id);
  let t = 0;
  const steps = c.turns.slice(1).map((turn) => {
    t += (400 + r() * 1400) * PACE; // the reply waits a moment
    const typeAt = t;
    t += (turn.side === "note" ? 1300 : Math.min(2600, 600 + turn.text.length * 9) * (0.8 + r() * 0.45)) * PACE; // longer message, longer typing
    return { typeAt, landAt: t };
  });
  const holdUntil = t + (3500 + r() * 4500) * PACE;
  const cycle = holdUntil + DIM_MS;
  const tl = { steps, holdUntil, cycle, offset: r() * cycle };
  timelines.set(key, tl);
  return tl;
}

/** What a conversation shows `ms` after the page opened. */
export function stateAt(c: ConvoView, ms: number): { visible: number; typing: Side | null; dim: boolean } {
  const n = c.turns.length;
  // A negotiation still running is shown as it really is: every turn so far, the other Muse thinking.
  if (n <= 1 || c.running) return { visible: n, typing: c.running ? "other" : null, dim: false };
  const tl = timelineFor(c);
  const t = (ms + tl.offset) % tl.cycle;
  let visible = 1;
  let typing: Side | null = null;
  for (let i = 0; i < tl.steps.length; i++) {
    const s = tl.steps[i];
    if (t >= s.landAt) visible = i + 2;
    else {
      if (t >= s.typeAt) typing = c.turns[i + 1].side;
      break;
    }
  }
  return { visible, typing, dim: t >= tl.holdUntil };
}
