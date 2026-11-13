// Step 2 of the seller pipeline (multi-agent):
//   Ember  (perception)     video frames + narration -> transcript + rough items        [lib/intake.ts]
//   Spark  (identification) one item's best frame + what the seller said -> exact model + used price range  [here]
// One Spark call per item, run in parallel by the client so each row updates as it lands.
import { museJSON, type ContentPart, modelFor } from "./muse";
import { framePickPrompt, identifyPrompt } from "./prompts";
import { FramePickSchema, IdentifySchema } from "./schemas";
import type { Item } from "./types";

/**
 * Ember picks the frame where this item is clearest (its first-pass frame can show a different item: the soda's
 * thumbnail was the earbuds). Fast, one call, all frames. Returns the 0-based index or null.
 */
async function pickFrame(item: Item, frames: string[]): Promise<number | null> {
  if (frames.length < 2) return null;
  const p = framePickPrompt({ name: item.name, spokenAs: item.spokenAs, count: frames.length });
  const parts: ContentPart[] = [{ type: "text", text: p.user }, ...frames.map((url) => ({ type: "image_url" as const, image_url: { url } }))];
  try {
    const out = await museJSON({ model: modelFor("intake"), system: p.system, user: parts, schema: FramePickSchema, mock: { frame: 0 } });
    const k = Math.round(out.frame);
    return k >= 1 && k <= frames.length ? k - 1 : null;
  } catch {
    return null;
  }
}

/**
 * `nearby`: frames just before/after the item's best frame, so Spark sees it from more than one angle.
 * `frames`: all sampled frames; when given, the item's photo is re-picked first so the listing shows the right thing.
 */
export async function identifyItem(item: Item, transcript?: string, nearby: string[] = [], frames: string[] = []): Promise<Item> {
  const k = await pickFrame(item, frames);
  if (k !== null) {
    item = { ...item, imageDataUrl: frames[k], frameIndex: k };
    nearby = [frames[k - 1], frames[k + 1]].filter((x): x is string => !!x);
  }
  const p = identifyPrompt({ emberName: item.name, brandGuess: item.brandGuess, spokenAs: item.spokenAs, transcript });
  const imgs = [item.imageDataUrl, ...nearby].filter((x): x is string => !!x).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
  const parts: ContentPart[] = [
    { type: "text", text: `${p.user}\n${imgs.length} photo${imgs.length === 1 ? "" : "s"} of it follow (first is the clearest).` },
    ...imgs.map((url) => ({ type: "image_url" as const, image_url: { url } })),
  ];
  const out = await museJSON({
    model: modelFor("identify"),
    effort: "low", // identification benefits from a little more thinking than chat turns
    system: p.system,
    user: parts,
    schema: IdentifySchema,
    mock: {
      name: item.name,
      brand: item.brandGuess ?? null,
      model: null,
      confidence: "low",
      condition: (["new", "good", "fair", "worn"].includes(item.condition) ? item.condition : "good") as "good",
      flaws: item.flaws,
      price_low_usd: Math.round(item.suggestedPriceUsd * 0.8),
      price_high_usd: Math.round(item.suggestedPriceUsd * 1.2),
      suggested_price_usd: item.suggestedPriceUsd,
      note: "Offline: kept the first pass.",
    },
  });
  const model = [out.brand, out.model].filter(Boolean).join(" ") || undefined;
  return {
    ...item,
    name: out.name || item.name,
    model,
    brandGuess: out.brand ?? item.brandGuess,
    confidence: out.confidence,
    condition: out.condition,
    flaws: out.flaws,
    priceLowUsd: Math.round(out.price_low_usd),
    priceHighUsd: Math.round(out.price_high_usd),
    suggestedPriceUsd: Math.round(out.suggested_price_usd),
    identifyNote: out.note,
    identified: true,
  };
}
