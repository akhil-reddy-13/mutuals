import { describe, expect, it } from "vitest";
import { stateAt, timelineFor, type ConvoView } from "./pace";

const convo = (id: string, running = false): ConvoView => ({
  id,
  running,
  meName: "Alex",
  meAvatar: "",
  otherName: "Priya",
  otherAvatar: "",
  verdict: { compatible: true },
  turns: [
    { side: "me", text: "Alex has the second bedroom from September 1." },
    { side: "other", text: "Priya is looking from early September and needs quiet after 11." },
    { side: "me", text: "Common areas quiet after 11 works." },
    { side: "other", text: "Then it works for Priya." },
    { side: "note", text: "Strong fit on terms." },
  ],
});

// ms (on the page clock) at which this conversation's loop is at position `t` of its cycle.
const at = (c: ConvoView, t: number) => {
  const tl = timelineFor(c);
  return (((t - tl.offset) % tl.cycle) + tl.cycle) % tl.cycle;
};

describe("Muse conversations wall timing (demo)", () => {
  it("each loop starts on the opener, plays every turn in order, holds the finished conversation, then dims", () => {
    const c = convo("neg_a");
    const tl = timelineFor(c);
    expect(stateAt(c, at(c, 0))).toEqual({ visible: 1, typing: null, dim: false });
    let last = 1;
    for (let t = 0; t < tl.holdUntil; t += 50) {
      const s = stateAt(c, at(c, t));
      expect(s.visible).toBeGreaterThanOrEqual(last);
      last = s.visible;
    }
    expect(stateAt(c, at(c, tl.holdUntil - 1))).toEqual({ visible: 5, typing: null, dim: false });
    expect(stateAt(c, at(c, tl.holdUntil + 1)).dim).toBe(true);
  });

  it("does not depend on anything but time: boxes are out of step with each other", () => {
    const states = ["neg_1", "neg_2", "neg_3", "neg_4", "neg_5", "neg_6"].map((id) => JSON.stringify(stateAt(convo(id), 5000)));
    expect(new Set(states).size).toBeGreaterThan(1);
  });

  it("shows a running negotiation as it really is", () => {
    expect(stateAt(convo("neg_live", true), 1234)).toEqual({ visible: 5, typing: "other", dim: false });
  });
});
