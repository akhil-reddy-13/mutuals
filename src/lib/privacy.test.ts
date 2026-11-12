import { describe, expect, it } from "vitest";
import { agentContext, publicOnly } from "./privacy";
import type { Preference } from "./types";

const p = (id: string, visibility: Preference["visibility"], extra: Partial<Preference> = {}): Preference => ({
  id,
  topic: id,
  value: `value-${id}`,
  importance: "medium",
  visibility,
  source: "stated",
  confirmed: true,
  ...extra,
});

describe("privacy", () => {
  const prefs = [
    p("pub", "public"),
    p("mo", "match_only"),
    p("secret", "never"),
    p("guess", "match_only", { source: "inferred", confirmed: false }),
    p("guessOk", "public", { source: "inferred", confirmed: true }),
  ];

  it("never prefs never reach agent context", () => {
    const ctx = agentContext(prefs);
    const all = JSON.stringify(ctx);
    expect(all).not.toContain("secret");
  });

  it("unconfirmed inferred prefs are excluded", () => {
    const ids = [...agentContext(prefs).public, ...agentContext(prefs).matchOnly].map((x) => x.id);
    expect(ids).not.toContain("guess");
    expect(ids).toContain("guessOk");
  });

  it("splits public vs match_only", () => {
    const ctx = agentContext(prefs);
    expect(ctx.public.map((x) => x.id)).toEqual(["pub", "guessOk"]);
    expect(ctx.matchOnly.map((x) => x.id)).toEqual(["mo"]);
  });

  it("publicOnly hides match_only from the other human", () => {
    expect(publicOnly(prefs).map((x) => x.id)).toEqual(["pub", "guessOk"]);
  });
});
