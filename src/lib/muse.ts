// Thin client over the Meta Model API (OpenAI-SDK compatible). PRD §6.1.
// ALL model calls go through here: model routing, JSON parsing + zod validation, retry, cache, mock mode.
//
//   const out = await museJSON({ model: "spark", system, user, schema: AgentTurnSchema });
//   const txt = await museText({ model: "spark", system, user });
//
// Cache: responses are stored in .cache/muse/<hash>.json keyed by (model, messages). Same input => no credits spent.
// Server-side only (reads env + filesystem). Never import from a "use client" component.
// MOCK_MUSE=true: never hits the network. Serves cache if present, else `mock` (if given), else throws.
import OpenAI from "openai";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import type { z } from "zod";

export type MuseModel = "wonder" | "spark" | "ember";

/**
 * Which Muse model does each job. One place to trade speed vs depth. Override any role with MUSE_ROLE_<ROLE>
 * (e.g. MUSE_ROLE_REFEREE=wonder). Defaults are tuned for a fast live demo: each matching candidate is ~6 sequential
 * calls, so per-call latency dominates (Nov 12 under load: Ember ~1 s, Spark ~10 s, Wonder ~30 s).
 */
export type MuseRole = "ask" | "agent" | "referee" | "connection" | "homes" | "opener" | "identify" | "intake" | "posteval" | "listing" | "digest";
// Measured Nov 12 (same inputs, side by side): Ember matched Spark/Wonder on verdicts, connection picks and item
// routing at ~1 s vs ~14 s (Spark) / ~30 s (Wonder). Spark keeps the one job where it was clearly better: reading an
// exact make/model off a photo (it read "G7X" off the camera; Ember misnamed a MacBook). That step runs in parallel
// and fills rows in as it lands, so nobody waits on it. Wonder is available per role when the API is healthy.
const ROLE_DEFAULTS: Record<MuseRole, MuseModel> = {
  ask: "ember", // chat turns: structured extraction
  agent: "ember", // negotiation turns, 4 per candidate in sequence
  referee: "ember", // the verdict (dealbreakers are also enforced in code via budgetsOverlap)
  connection: "ember", // "more than a lease" judgment
  homes: "ember", // routing items to people
  opener: "ember", // Messenger first message
  identify: "spark", // exact make/model from a frame
  intake: "ember", // video frames + narration
  posteval: "ember", // reading a human post
  listing: "ember", // Marketplace copy
  digest: "ember",
};
export function modelFor(role: MuseRole): MuseModel {
  const v = process.env[`MUSE_ROLE_${role.toUpperCase()}`];
  return v === "ember" || v === "spark" || v === "wonder" ? v : ROLE_DEFAULTS[role];
}

const MODEL_IDS: Record<MuseModel, string> = {
  wonder: process.env.MODEL_WONDER ?? "muse-wonder-1.0",
  spark: process.env.MODEL_SPARK ?? "muse-spark-1.3",
  ember: process.env.MODEL_EMBER ?? "muse-ember-1.0",
};

// Reasoning effort per model. Muse models reason before answering; "minimal" is ~3x faster than the default for
// Spark (measured: ~4s vs ~12s per negotiation turn), which keeps the live demo watchable. The referee keeps more.
// Override with MUSE_EFFORT_SPARK / _EMBER / _WONDER (minimal|low|medium|high), or "default" to send nothing.
const EFFORT: Record<MuseModel, string> = {
  wonder: process.env.MUSE_EFFORT_WONDER ?? "low",
  spark: process.env.MUSE_EFFORT_SPARK ?? "minimal",
  ember: process.env.MUSE_EFFORT_EMBER ?? "minimal",
};
const effortUnsupported = new Set<MuseModel>();
/** Wonder (referee, homes, connection) is time-boxed; past this it falls back to Spark. */
const WONDER_TIMEOUT_MS = Number(process.env.MUSE_WONDER_TIMEOUT_MS ?? 20000);

const MOCK = process.env.MOCK_MUSE === "true";
/** Small pause per mocked call so streamed negotiations read as live during offline dev/demo. */
const MOCK_DELAY_MS = Number(process.env.MOCK_DELAY_MS ?? 600);
const CACHE_DIR = path.join(process.cwd(), ".cache", "muse");

/** "mock" = never hits the network. "live" = real key configured. Shown as a small badge in the UI (handoff fix 9). */
export function museMode(): "mock" | "live" {
  return MOCK || !process.env.MUSE_API_KEY ? "mock" : "live";
}

let _client: OpenAI | null = null;
function client() {
  if (!_client) {
    if (!process.env.MUSE_API_KEY || !process.env.MUSE_BASE_URL) {
      throw new Error("MUSE_API_KEY / MUSE_BASE_URL not set. Copy .env.example to .env.local, or set MOCK_MUSE=true.");
    }
    _client = new OpenAI({ apiKey: process.env.MUSE_API_KEY, baseURL: process.env.MUSE_BASE_URL });
  }
  return _client;
}

/** Content part for multimodal (Ember) calls. Images as data URLs or https URLs. */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "input_audio"; input_audio: { data: string; format: "wav" | "mp3" } };

export interface MuseCall {
  model: MuseModel;
  system: string;
  user: string | ContentPart[];
  temperature?: number;
  /** Skip cache read (still writes). Use for live demo moments where you want a fresh call. */
  fresh?: boolean;
  /** Override the model's default reasoning effort for this call (minimal|low|medium|high). */
  effort?: string;
}

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

function cacheKey(model: string, messages: ChatMessage[]) {
  return createHash("sha256").update(JSON.stringify({ model, messages })).digest("hex").slice(0, 24);
}
function readCache(key: string): string | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, `${key}.json`), "utf8")).text;
  } catch {
    return null;
  }
}
function writeCache(key: string, model: string, text: string) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify({ model, text, at: new Date().toISOString() }));
}

async function rawCall(model: MuseModel, messages: ChatMessage[], temperature: number, fresh: boolean, mock?: string, effortOverride?: string) {
  const id = MODEL_IDS[model];
  const key = cacheKey(id, messages);
  if (!fresh || MOCK) {
    const hit = readCache(key);
    if (hit !== null) return hit;
  }
  if (MOCK) {
    if (mock !== undefined) {
      if (MOCK_DELAY_MS > 0) await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
      return mock;
    }
    throw new Error(`MOCK_MUSE=true and no cache for ${model} call ${key}`);
  }
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const effort = effortOverride ?? EFFORT[model];
      const extra = effort !== "default" && !effortUnsupported.has(model) ? { reasoning_effort: effort } : {};
      const res = await client().chat.completions.create(
        {
          model: id,
          messages,
          temperature,
          ...(extra as object),
        } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
        model === "wonder" ? { timeout: WONDER_TIMEOUT_MS, maxRetries: 0 } : undefined,
      );
      const text = res.choices[0]?.message?.content ?? "";
      writeCache(key, id, text);
      return text;
    } catch (e) {
      lastErr = e;
      // Wonder stalled: answer with Ember instead of hanging the chat.
      if (model === "wonder" && /timed? ?out|timeout/i.test(String((e as Error)?.message ?? e))) {
        console.warn(`[muse] wonder timed out after ${WONDER_TIMEOUT_MS} ms, falling back to ember`);
        return rawCall("ember", messages, temperature, fresh, mock);
      }
      // A model that rejects the effort value: stop sending it and retry immediately.
      if (/reasoning_effort/i.test(String((e as Error)?.message)) && !effortUnsupported.has(model)) {
        effortUnsupported.add(model);
        continue;
      }
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw lastErr;
}

function buildMessages(c: MuseCall): ChatMessage[] {
  return [
    { role: "system", content: c.system },
    // ContentPart[] is structurally compatible with the SDK's multimodal user content.
    { role: "user", content: c.user as unknown as OpenAI.Chat.Completions.ChatCompletionUserMessageParam["content"] },
  ];
}

export async function museText(c: MuseCall & { mock?: string }): Promise<string> {
  return (await rawCall(c.model, buildMessages(c), c.temperature ?? 0.7, !!c.fresh, c.mock, c.effort)).trim();
}

/** Strip ```json fences / leading prose and parse the first JSON object or array. */
export function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[{[]/);
  const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("No JSON found in model output");
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * Call a model and get validated JSON. On parse/validation failure, retries once with the error appended
 * (PRD §19.5). `mock` is returned only when MOCK_MUSE=true and there's no cache.
 */
export async function museJSON<S extends z.ZodTypeAny>(
  c: MuseCall & { schema: S; mock?: z.infer<S> },
): Promise<z.infer<S>> {
  const messages = buildMessages(c);
  const temp = c.temperature ?? 0.4;
  const mock = c.mock !== undefined ? JSON.stringify(c.mock) : undefined;
  const text = await rawCall(c.model, messages, temp, !!c.fresh, mock, c.effort);
  try {
    return c.schema.parse(extractJSON(text));
  } catch (err) {
    const retry: ChatMessage[] = [
      ...messages,
      { role: "assistant", content: text },
      {
        role: "user",
        content: `Your output failed validation: ${String(err).slice(0, 800)}\nReturn ONLY corrected JSON.`,
      },
    ];
    const text2 = await rawCall(c.model, retry, temp, false, mock, c.effort);
    return c.schema.parse(extractJSON(text2));
  }
}
