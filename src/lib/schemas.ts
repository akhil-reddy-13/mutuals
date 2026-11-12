// zod schemas for EVERY model output (PRD §19.5). Shapes match the prompts in prompts.ts (snake_case,
// as the model returns it). Convert to camelCase domain types at the call site.
import { z } from "zod";

export const IdentifySchema = z.object({
  name: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  condition: z.enum(["new", "good", "fair", "worn"]),
  flaws: z.array(z.string()),
  price_low_usd: z.number(),
  price_high_usd: z.number(),
  suggested_price_usd: z.number(),
  note: z.string(),
});
export type IdentifyOutput = z.infer<typeof IdentifySchema>;

export const HomesSchema = z.object({
  homes: z.array(
    z.object({
      buyer_id: z.string(),
      item_ids: z.array(z.string()),
      why: z.string(),
      hook: z.string().nullable(),
    }),
  ),
});
export type HomesOutput = z.infer<typeof HomesSchema>;

export const IntakeSchema = z.object({
  /** Word-for-word narration, when audio was attached. */
  transcript: z.string().nullable().optional(),
  room: z
    .object({
      furnished: z.boolean(),
      approx_size: z.enum(["small", "medium", "large"]),
      natural_light: z.enum(["low", "medium", "high"]),
      desk_space: z.boolean(),
      closet: z.boolean(),
      notes: z.array(z.string()),
    })
    .nullable(),
  items: z.array(
    z.object({
      name: z.string(),
      brand_guess: z.string().nullable(),
      condition: z.enum(["new", "good", "fair", "worn"]),
      flaws: z.array(z.string()),
      suggested_price_usd: z.number(),
      frame_index: z.number(),
      mentioned: z.boolean().optional(),
      spoken_as: z.string().nullable().optional(),
    }),
  ),
});
export type IntakeOutput = z.infer<typeof IntakeSchema>;

export const AskParseSchema = z.object({
  ask_type: z.enum(["roommate", "sublet", "item", "skill_swap", "plus_one", "ride", "other"]),
  summary: z.string(),
  preferences: z.array(
    z.object({
      id: z.string(),
      topic: z.string(),
      value: z.string(),
      importance: z.enum(["dealbreaker", "high", "medium", "low"]),
      visibility: z.enum(["public", "match_only", "never"]),
      source: z.enum(["stated", "inferred"]),
    }),
  ),
  /** offering = the user HAS the room / items / ticket / ride; seeking = they're looking for one. */
  side: z.enum(["offering", "seeking"]).nullable().optional(),
  /** Muse's next conversational line. Present while key info is still missing. */
  follow_up_question: z.string().nullable().optional(),
  /** True when Muse has enough to search. */
  ready: z.boolean().optional(),
});
export type AskParseOutput = z.infer<typeof AskParseSchema>;

export const AgentTurnSchema = z.object({
  message: z.string(),
  disclosed: z.array(z.string()),
  positions: z.record(z.string(), z.string()),
  satisfied: z.boolean(),
});
export type AgentTurnOutput = z.infer<typeof AgentTurnSchema>;

// Referee is called once at the end (handoff note, fix 5) and must conclude.
export const RefereeSchema = z.object({
  compatible: z.boolean(),
  score: z.number().min(0).max(1),
  fits: z.array(z.string()),
  disagreements: z.array(z.string()),
  compromise: z.string().nullable(),
  summary_for_humans: z.string(),
});
export type RefereeOutput = z.infer<typeof RefereeSchema>;

export const ConnectionSchema = z.object({
  suggest: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().nullable(),
  activity: z.string().nullable(),
  event_id: z.string().nullable(),
});
export type ConnectionOutput = z.infer<typeof ConnectionSchema>;

export const PostEvalSchema = z.object({
  fit: z.boolean(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  concerns: z.array(z.string()),
});
export type PostEvalOutput = z.infer<typeof PostEvalSchema>;

export const ListingSchema = z.object({
  title: z.string(),
  price_usd: z.number(),
  condition: z.enum(["new", "good", "fair", "worn"]),
  description: z.string(),
});
export type ListingOutput = z.infer<typeof ListingSchema>;

export const DigestSchema = z.object({
  cards: z.array(
    z.object({
      type: z.string(),
      title: z.string(),
      body: z.string(),
      related_user_ids: z.array(z.string()),
    }),
  ),
});
export type DigestOutput = z.infer<typeof DigestSchema>;
