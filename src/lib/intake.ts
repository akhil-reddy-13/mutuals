// Video intake (PRD §6.2): frames (data URLs, sampled client-side) -> Ember -> RoomDetails + Item[].
import { newId } from "./db";
import { capFrames } from "./frames";
import { mockIntake } from "./mocks";
import { museJSON, type ContentPart } from "./muse";
import { intakePrompt } from "./prompts";
import { IntakeSchema } from "./schemas";
import type { Item, RoomDetails } from "./types";

export async function runIntake(
  frames: string[],
  narration?: string,
  audioWavB64?: string,
): Promise<{ room: RoomDetails | null; items: Item[]; transcript: string | null }> {
  const use = capFrames(frames);
  const p = intakePrompt(narration, !!audioWavB64);
  // Ember is natively multimodal: the video's audio track goes in alongside the frames, so what the user SAYS
  // while filming ("selling this camera, it's the X100V; this table but not that one") drives the catalog.
  const parts: ContentPart[] = [
    { type: "text", text: `${p.userText}\n${use.length} frames follow, in order.${audioWavB64 ? " Then the audio recorded with the video." : ""}` },
    ...use.map((url) => ({ type: "image_url" as const, image_url: { url } })),
    ...(audioWavB64 ? [{ type: "input_audio" as const, input_audio: { data: audioWavB64, format: "wav" as const } }] : []),
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
    frameIndex: Math.min(Math.max(i.frame_index, 0), use.length - 1),
    // No narration: everything Ember saw counts as offered. With narration: only what they said.
    mentioned: audioWavB64 ? (i.mentioned ?? true) : true,
    spokenAs: i.spoken_as ?? undefined,
  }));
  return { room, items, transcript: out.transcript ?? null };
}
