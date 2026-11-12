// Video intake (PRD §6.2): frames (data URLs, sampled client-side) -> Ember -> RoomDetails + Item[].
import { newId } from "./db";
import { capFrames } from "./frames";
import { mockIntake } from "./mocks";
import { museJSON, type ContentPart } from "./muse";
import { intakePrompt } from "./prompts";
import { IntakeSchema } from "./schemas";
import type { Item, RoomDetails } from "./types";

export async function runIntake(frames: string[], narration?: string): Promise<{ room: RoomDetails | null; items: Item[] }> {
  const use = capFrames(frames);
  const p = intakePrompt(narration);
  const parts: ContentPart[] = [
    { type: "text", text: `${p.userText}\n${use.length} frames follow, in order.` },
    ...use.map((url) => ({ type: "image_url" as const, image_url: { url } })),
  ];
  const out = await museJSON({ model: "ember", system: p.system, user: parts, schema: IntakeSchema, mock: mockIntake });
  const room: RoomDetails | null = out.room
    ? {
        furnished: out.room.furnished,
        approxSize: out.room.approx_size,
        naturalLight: out.room.natural_light,
        deskSpace: out.room.desk_space,
        closet: out.room.closet,
        notes: out.room.notes,
      }
    : null;
  const items: Item[] = out.items.map((i) => ({
    id: newId("item"),
    name: i.name,
    brandGuess: i.brand_guess ?? undefined,
    condition: i.condition,
    flaws: i.flaws,
    suggestedPriceUsd: i.suggested_price_usd,
    imageDataUrl: use[Math.min(Math.max(i.frame_index, 0), use.length - 1)],
  }));
  return { room, items };
}
