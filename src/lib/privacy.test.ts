import { describe, expect, it } from "vitest";
import seedAsks from "../../seed/asks.json";
import { agentContext, budgetsOverlap, formatPrefs, isShareable, leaks, publicOnly, redactPrivateValues } from "./privacy";
import type { Ask, Preference } from "./types";

const asks = seedAsks as Ask[];
const alex = asks.find((a) => a.id === "ask_alex_seed")!;
const priya = asks.find((a) => a.id === "ask_priya")!;
const jordan = asks.find((a) => a.id === "ask_jordan")!;

const p = (over: Partial<Preference>): Preference => ({
  id: "x",
  topic: "t",
  value: "v",
  importance: "low",
  visibility: "public",
  source: "stated",
  confirmed: true,
  ...over,
});

describe("structural privacy", () => {
  it("never prefs cannot enter agent context", () => {
    const ctx = agentContext(alex.preferences);
    const all = [...ctx.public, ...ctx.matchOnly];
    expect(all.some((x) => x.visibility === "never")).toBe(false);
    expect(all.some((x) => x.id === "alex_health")).toBe(false);
    expect(formatPrefs(all)).not.toMatch(/chronic/i);
  });

  it("unconfirmed inferred prefs are not shareable", () => {
    expect(isShareable(p({ source: "inferred", confirmed: false }))).toBe(false);
    expect(isShareable(p({ source: "inferred", confirmed: true }))).toBe(true);
    expect(isShareable(p({ visibility: "never" }))).toBe(false);
  });

  it("match_only prefs reach the agent but never the other human", () => {
    const ctx = agentContext(alex.preferences);
    expect(ctx.matchOnly.map((x) => x.id)).toContain("alex_rent_floor");
    expect(publicOnly(alex.preferences).map((x) => x.id)).not.toContain("alex_rent_floor");
  });

  it("seed: every persona's never prefs are stripped", () => {
    for (const a of asks) {
      const ctx = agentContext(a.preferences);
      expect([...ctx.public, ...ctx.matchOnly].every((x) => x.visibility !== "never")).toBe(true);
    }
  });
});

describe("sealed comparisons", () => {
  it("budgets are compared in code, as a boolean", () => {
    // Publicly Alex asks $1,350 and Priya offers $1,200. Privately Alex goes to $1,200 and Priya to $1,300.
    expect(budgetsOverlap(alex.preferences, priya.preferences)).toBe(true);
    expect(budgetsOverlap(alex.preferences, jordan.preferences)).toBe(true);
    const cheap: Preference[] = [p({ topic: "budget", value: "Up to $900/mo", visibility: "match_only" })];
    expect(budgetsOverlap(alex.preferences, cheap)).toBe(false);
  });

  it("redacts private numbers and times from any string shown to a human", () => {
    const both = [...alex.preferences, ...priya.preferences];
    const leaky = "Budgets overlap ($1,200 to $1,300). Priya wants quiet after 11pm; Alex is up until 1am.";
    expect(leaks(leaky, both).length).toBeGreaterThan(0);
    const clean = redactPrivateValues(leaky, both);
    expect(clean).not.toMatch(/1,300|1,200|11pm|1am/);
    expect(clean).toContain("after a private time");
    expect(clean).not.toMatch(/\wa private/); // whitespace before the token is preserved
    expect(leaks(clean, both)).toEqual([]);
    // Public numbers survive.
    expect(redactPrivateValues("Rent is $1,350/mo", both)).toContain("$1,350");
  });

  it("never values are stripped even if a model echoed them", () => {
    const txt = "Note: Has a chronic condition, doesn't want it shared";
    expect(redactPrivateValues(txt, alex.preferences)).not.toMatch(/chronic/);
  });
});
