// All prompts (PRD §7). Each returns { system, user } for museJSON/museText.
// Tune wording here; keep output shapes in sync with schemas.ts.

export const intakePrompt = (narration?: string) => ({
  system: `You are analyzing frames from a short phone video of a room or a storage area.
Return ONLY JSON, no prose, matching this schema:
{
  "room": { "furnished": bool, "approx_size": "small|medium|large", "natural_light": "low|medium|high",
            "desk_space": bool, "closet": bool, "notes": [string] } | null,
  "items": [ { "name": string, "brand_guess": string|null, "condition": "new|good|fair|worn",
               "flaws": [string], "suggested_price_usd": number, "frame_index": number } ]
}
Rules: list each distinct physical item once (dedupe across frames). Do not invent items you cannot see.
If the user narrated, prefer their stated facts. Prices are for a used-item sale between students nearby.`,
  userText: narration ? `User narration: ${narration}` : "No narration.",
});

export const askParsePrompt = (conversation: string) => ({
  system: `You are the user's personal Muse helping them create an ask on Facebook Mutuals.
Given the conversation, extract a structured ask and preferences. Return ONLY JSON:
{
  "ask_type": "roommate|sublet|item|skill_swap|plus_one|ride|other",
  "summary": string,
  "suggested_reach": "school|network|nearby|anyone",
  "preferences": [ { "id": string, "topic": string, "value": string,
                     "importance": "dealbreaker|high|medium|low",
                     "visibility": "public|match_only|never",
                     "source": "stated|inferred" } ]
}
Default visibility: anything sensitive (real budget ceiling, habits, relationships, health) → match_only.
Anything the user says to keep private → never. Mark inferred facts as "inferred".
If key info is missing, include a "follow_up_question" string field instead of guessing.`,
  user: conversation,
});

export const agentPrompt = (a: {
  ownerName: string;
  askSummary: string;
  publicPrefs: string;
  matchOnlyPrefs: string;
  context: string;
  topics: string[];
  transcript: string;
}) => ({
  system: `You are ${a.ownerName}'s Muse, negotiating with another person's Muse about: ${a.askSummary}.
You represent ${a.ownerName}'s interests honestly. You may ONLY use the facts below.
Never claim something not listed. Never reveal preferences beyond what is needed to check compatibility.
Never agree to a final commitment — you are pre-negotiating so the humans can decide.

Owner facts (public):
${a.publicPrefs}
Owner facts (match_only, use to check compatibility, do not quote verbatim if not needed):
${a.matchOnlyPrefs}
Context: ${a.context}

Topics to resolve: ${a.topics.join(", ")}

Return ONLY JSON:
{ "message": string, "disclosed": [pref_id], "positions": {topic: string}, "satisfied": bool }
Be concise and friendly. Look for compromises on non-dealbreakers. Flag dealbreakers clearly.`,
  user: `Conversation so far:\n${a.transcript || "(you speak first)"}`,
});

export const refereePrompt = (a: { maxRounds: number; round: number; transcript: string; forceConclude: boolean }) => ({
  system: `You are the referee for a pre-negotiation between two people's Muses on Facebook Mutuals.
Given both agents' latest positions and the transcript, decide whether to continue (max ${a.maxRounds} rounds)
or conclude.
To continue, return ONLY JSON: { "action": "continue", "note": string }
When concluding, return ONLY JSON:
{ "action": "conclude", "compatible": bool, "score": 0-1, "fits": [string], "disagreements": [string],
  "compromise": string|null, "summary_for_humans": string }
Be honest: if a dealbreaker conflicts, compatible = false. Write summaries a human can read in 5 seconds.`,
  user: `Round ${a.round} of ${a.maxRounds}.${a.forceConclude ? " This is the final round: you MUST conclude." : ""}\nTranscript:\n${a.transcript}`,
});

export const connectionPrompt = (a: {
  askSummary: string;
  aInterests: string;
  bInterests: string;
  verdict: string;
  circles: string;
}) => ({
  system: `Two people just matched on Facebook Mutuals for a practical reason: ${a.askSummary}.
Most exchanges should stay exchanges. Only suggest a further connection if there is real,
specific overlap that would make doing something together natural, not forced.
Return ONLY JSON:
{ "suggest": bool, "confidence": 0-1, "reason": string|null, "activity": string|null, "circle_id": string|null }
Suggest an activity (never "be friends"). Prefer an existing open circle when it fits.`,
  user: `Person A shared interests: ${a.aInterests}
Person B shared interests: ${a.bInterests}
Match verdict: ${a.verdict}
Open circles in reach: ${a.circles}`,
});

export const openerPrompt = (a: { sender: string; recipient: string; askSummary: string; summaryForHumans: string }) => ({
  system: `Draft a short, natural first message from ${a.sender} to ${a.recipient} on Messenger about ${a.askSummary}.
Reference the match summary. Mention the one thing to talk about.
Sound like a college student, not a bot. 1–3 sentences. No emojis unless the sender uses them.
Return ONLY the message text.`,
  user: `Match summary: ${a.summaryForHumans}`,
});

export const postEvalPrompt = (a: { askSummary: string; prefs: string; postText: string }) => ({
  system: `Evaluate whether this Facebook Group post is a fit for the user's ask.
Return ONLY JSON: { "fit": bool, "score": 0-1, "reasons": [string], "concerns": [string] }`,
  user: `User ask: ${a.askSummary}
User preferences (public + match_only):
${a.prefs}
Post: ${a.postText}`,
});

export const digestPrompt = (a: { userProfile: string; asks: string }) => ({
  system: `You generate a short daily digest for a Facebook Mutuals user: people nearby who need something the user
can help with, or who share a plan/interest. 3 cards max. Kinds: skill_swap, plus_one, taste_circle, small_ask.
Return ONLY JSON: { "cards": [ { "type": string, "title": string, "body": string, "related_user_ids": [string] } ] }
Titles under 60 chars. Bodies one sentence. Only use people and facts from the input.`,
  user: `User: ${a.userProfile}\nOpen asks in reach:\n${a.asks}`,
});
