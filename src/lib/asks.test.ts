import { describe, expect, it } from "vitest";
import { guessSide, homeGroupFor, resolveSide } from "./asks";
import { getUser } from "./db";

describe("guessSide (fallback when the model doesn't say)", () => {
  it("seekers skip the video step", () => {
    expect(guessSide("Looking for a room\n800")).toBe("seeking");
    expect(guessSide("Need a place in SF from September")).toBe("seeking");
    expect(guessSide("ISO a desk under $50")).toBe("seeking");
  });
  it("offerers keep it", () => {
    expect(guessSide("I signed a 2BR in the Mission from Sept 1 and need a roommate for the second bedroom")).toBe("offering");
    expect(guessSide("Selling my desk and mini fridge")).toBe("offering");
    expect(guessSide("Have a spare beabadoobee ticket")).toBe("offering");
  });
});

describe("resolveSide (clear offering phrasing beats the model)", () => {
  it("demo line 1 is offering even if the model says seeking", () => {
    expect(resolveSide("seeking", undefined, "I signed a 2BR in the Mission from Sept 1 and need a roommate for the second bedroom")).toBe("offering");
  });
  it("otherwise trusts the model", () => {
    expect(resolveSide("seeking", undefined, "new dorm for this summer")).toBe("seeking");
    expect(resolveSide("offering", undefined, "Selling some stuff before I move out")).toBe("offering");
  });
});

// The Muse page is one chat across all my Groups; each ask is filed in the Group where people could answer it.
describe("homeGroupFor", () => {
  const alex = getUser("alex")!;
  it("files a plus-one where the people going are", () => {
    expect(homeGroupFor(alex, "plus_one", "seeking")).toBe("g_sfgrads");
  });
  it("files a room in the housing Group", () => {
    expect(homeGroupFor(alex, "roommate", "offering")).toBe("g_housing27");
  });
  it("stays where it is once that Group has people", () => {
    expect(homeGroupFor(alex, "roommate", "offering", "g_housing27")).toBe("g_housing27");
  });
  it("falls back to the current Group when nobody anywhere matches", () => {
    expect(homeGroupFor(alex, "skill_swap", "seeking", "g_ffs")).toBe("g_ffs");
  });
});
