import { describe, expect, it } from "vitest";
import { fitLevel } from "./format";

describe("fitLevel", () => {
  it("maps the referee score to a level, and only a dealbreaker or money makes it 'no'", () => {
    expect(fitLevel({ compatible: true, score: 0.84 })).toBe("fit");
    expect(fitLevel({ compatible: true, score: 0.65 })).toBe("fit");
    expect(fitLevel({ compatible: true, score: 0.58 })).toBe("could_work");
    expect(fitLevel({ compatible: true, score: 0.45 })).toBe("could_work");
    expect(fitLevel({ compatible: true, score: 0.34 })).toBe("long_shot");
    expect(fitLevel({ compatible: false, score: 0.9 })).toBe("no");
  });
});
