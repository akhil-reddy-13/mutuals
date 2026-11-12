// zod schemas for EVERY model output (PRD §19.5). Shapes match the prompts in prompts.ts (snake_case,
// as the model returns it). Convert to camelCase domain types at the call site.
import { z } from "zod";

export const IntakeSchema = z.object({
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
    }),
  ),
});
export type IntakeOutput = z.infer<typeof IntakeSchema>;

export const AskParseSchema = z.object({
  ask_type: z.enum(["roommate", "sublet", "item", "skill_swap", "plus_one", "ride", "other"]),
  summary: z.string(),
  suggested_reach: z.enum(["school", "network", "nearby", "anyone"]),
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
  follow_up_question: z.string().optional(),
});
export type AskParseOutput = z.infer<typeof AskParseSchema>;

export const AgentTurnSchema = z.object({
  message: z.string(),
  disclosed: z.array(z.string()),
  positions: z.record(z.string(), z.string()),
  satisfied: z.boolean(),
});
export type AgentTurnOutput = z.infer<typeof AgentTurnSchema>;

// Referee either continues or concludes.
export const RefereeSchema = z.union([
  z.object({ action: z.literal("continue"), note: z.string().optional() }),
  z.object({
    action: z.literal("conclude"),
    compatible: z.boolean(),
    score: z.number().min(0).max(1),
    fits: z.array(z.string()),
    disagreements: z.array(z.string()),
    compromise: z.string().nullable(),
    summary_for_humans: z.string(),
  }),
]);
export type RefereeOutput = z.infer<typeof RefereeSchema>;

export const ConnectionSchema = z.object({
  suggest: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().nullable(),
  activity: z.string().nullable(),
  circle_id: z.string().nullable(),
});
export type ConnectionOutput = z.infer<typeof ConnectionSchema>;

export const PostEvalSchema = z.object({
  fit: z.boolean(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  concerns: z.array(z.string()),
});
export type PostEvalOutput = z.infer<typeof PostEvalSchema>;

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
