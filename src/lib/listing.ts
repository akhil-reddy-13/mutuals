// Leftover items -> a Facebook Marketplace listing (handoff decision 5). Spark writes the copy.
import { getUser, newId, saveListing } from "./db";
import { mockListing } from "./mocks";
import { museJSON } from "./muse";
import { listingPrompt } from "./prompts";
import { ListingSchema } from "./schemas";
import type { Item, MarketplaceListing } from "./types";

export async function createListing(sellerId: string, items: Item[], askId?: string): Promise<MarketplaceListing> {
  const seller = getUser(sellerId)!;
  const p = listingPrompt({
    items: items.map((i) => `${i.name}${i.brandGuess ? ` (${i.brandGuess})` : ""}, ${i.condition}, flaws: ${i.flaws.join("; ") || "none"}, ~$${i.suggestedPriceUsd}`).join("\n"),
    neighborhood: seller.city === "San Francisco" ? "the Mission" : seller.city,
  });
  const out = await museJSON({ model: "spark", system: p.system, user: p.user, schema: ListingSchema, mock: mockListing(items) });
  const listing: MarketplaceListing = {
    id: newId("listing"),
    sellerId,
    askId,
    title: out.title,
    priceUsd: out.price_usd,
    condition: out.condition,
    description: out.description,
    items,
    imageDataUrl: items.find((i) => i.imageDataUrl)?.imageDataUrl,
    createdAt: new Date().toISOString(),
  };
  saveListing(listing);
  return listing;
}
