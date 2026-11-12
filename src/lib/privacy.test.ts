import { describe, expect, it } from "vitest";
import seedAsks from "../../seed/asks.json";
import { agentContext, budgetsOverlap, formatPrefs, isShareable, leakedPrivateFacts, leaks, publicOnly, redactPrivateValues } from "./privacy";
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
    // "up to" is a ceiling, not an exact number: a $70 ceiling overlaps a $50 to $62 ticket.
    const buyer: Preference[] = [p({ topic: "ticket_budget", value: "Up to $70 for a spare", visibility: "match_only" })];
    const seller: Preference[] = [p({ topic: "ticket_price", value: "$62, would take $50 to not deal with resale", visibility: "match_only" })];
    expect(budgetsOverlap(buyer, seller)).toBe(true);
    const pricey: Preference[] = [p({ topic: "ticket_price", value: "$120 firm", visibility: "public" })];
    expect(budgetsOverlap(buyer, pricey)).toBe(false);
  });

  it("redacts private numbers and times from any string shown to a human", () => {
    const both = [...alex.preferences, ...priya.preferences];
    const leaky = "Budgets overlap ($1,200 to $1,300). Priya starts work at 7am; Alex is up until 1am.";
    expect(leaks(leaky, both).length).toBeGreaterThan(0);
    const clean = redactPrivateValues(leaky, both);
    expect(clean).not.toMatch(/1,300|1,200|7am|1am/);
    expect(clean).toContain("at a private time");
    expect(clean).not.toMatch(/\wa private/); // whitespace before the token is preserved
    expect(leaks(clean, both)).toEqual([]);
    // Public numbers survive.
    expect(redactPrivateValues("Rent is $1,350/mo", both)).toContain("$1,350");
    // Priya's quiet hours are public (the compromise needs them), so they survive.
    expect(redactPrivateValues("Quiet after 11pm on weeknights", both)).toBe("Quiet after 11pm on weeknights");
  });

  it("catches the ways a model rewrites a number or time", () => {
    const both = [...alex.preferences, ...priya.preferences];
    for (const t of ["$1300", "1300", "1,300", "$1.3k", "1.3k", "$1,300/mo", "1 am", "1:00am", "1 a.m.", "1AM", "7 am", "7:00am"]) {
      expect(leaks(`x ${t} y`, both), t).not.toEqual([]);
      expect(redactPrivateValues(`x ${t} y`, both), t).toMatch(/x a private (number|time) y/);
    }
    // Bare hours after a time word are caught too ("you're up at 7", "up until 1").
    expect(redactPrivateValues("you're up at 7 for work", both)).toBe("you're up at a private time for work");
    expect(redactPrivateValues("I'm up until 1 most nights", both)).toBe("I'm up until a private time most nights");
    // Unrelated numbers survive.
    expect(redactPrivateValues("CS 161 at 5pm, lease 12 months, $40 desk, after 7 months", both)).toBe("CS 161 at 5pm, lease 12 months, $40 desk, after 7 months");
  });

  it("never values are stripped even if a model echoed them", () => {
    const txt = "Note: Has a chronic condition, doesn't want it shared";
    expect(redactPrivateValues(txt, alex.preferences)).not.toMatch(/chronic/);
  });
});

describe("private phrases (match_only wording on shared surfaces)", () => {
  const alexLive = [
    p({ id: "a_sched", topic: "schedule", value: "night owl", visibility: "match_only" }),
    p({ id: "a_guests", topic: "guests", value: "partner stays over some weekends", visibility: "match_only" }),
  ];
  const theo = asks.find((a) => a.id === "ask_theo_show")!;
  const ids = (text: string, prefs: Preference[]) => leakedPrivateFacts(text, prefs).map((x) => x.id);

  it("catches a private fact echoed into a match card", () => {
    expect(ids("wants earlier quiet hours vs night owl", alexLive)).toEqual(["a_sched"]);
    expect(ids("weekend partner guests to confirm", alexLive)).toEqual(["a_guests"]);
    expect(ids("Theo doesn't drink, so plan the pre-show around that", theo.preferences)).toEqual(["theo_sober"]);
    // Seed wording too: "Night owl, usually up until 1am" and "Starts work at 7am, up early on weekdays".
    expect(ids("Alex is a night owl", alex.preferences)).toEqual(["alex_sleep"]);
    expect(ids("Priya is up early on weekdays", priya.preferences)).toEqual(["priya_wake"]);
  });

  it("lets topic-level wording through", () => {
    const both = [...alex.preferences, ...priya.preferences, ...alexLive];
    expect(ids("Strong fit on timing, budget, and no dogs; just confirm the weeknight quiet-hours compromise works day to day.", priya.preferences)).toEqual([]);
    expect(ids("One thing to talk about: weeknight noise.", both)).toEqual([]);
    expect(ids("Different sleep schedules; agree on weeknight quiet hours", both)).toEqual([]);
    expect(ids("different plans for drinks", theo.preferences)).toEqual([]);
    expect(ids("Occasional weekend guests agreed", alexLive)).toEqual([]);
  });

  it("only checks non-public prefs", () => {
    const pub = [p({ topic: "pets", value: "no dogs please", visibility: "public" })];
    expect(ids("no dogs please", pub)).toEqual([]);
  });
});
