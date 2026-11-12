// Offline fallbacks for every Muse call (PRD hard rule 4: these are ONLY served when MOCK_MUSE=true and the
// response cache is empty; the live path always calls the model). Scripted for the demo personas, with generic
// fallbacks for anyone else. Keep shapes in sync with schemas.ts.
import type {
  AgentTurnOutput,
  AskParseOutput,
  ConnectionOutput,
  DigestOutput,
  IntakeOutput,
  ListingOutput,
  PostEvalOutput,
  RefereeOutput,
} from "./schemas";
import type { Item } from "./types";

const pair = (a: string, b: string) => [a, b].sort().join("|");

// ---------- ask parsing (chat sheet) ----------
export function mockAskParse(ownerId: string, conversation: string): AskParseOutput {
  const userTurns = (conversation.match(/^User:/gm) ?? []).length;
  if (ownerId === "alex") {
    const base = {
      ask_type: "roommate" as const,
      summary: "Have a 2BR in the Mission from Sept 1. Looking for a roommate for the second bedroom.",
    };
    if (userTurns <= 1)
      return {
        ...base,
        preferences: [
          { id: "alex_movein", topic: "move_in", value: "September 1, 12-month lease", importance: "high", visibility: "public", source: "stated" },
        ],
        follow_up_question:
          "Nice, a Mission 2BR will go fast. What rent are you posting for the room, and is there a lower number you'd actually take? I'll only use the second one to check fit, nobody sees it.",
        ready: false,
      };
    if (userTurns === 2)
      return {
        ...base,
        preferences: [
          { id: "alex_rent_posted", topic: "rent", value: "$1,350/mo for the second bedroom, utilities split", importance: "high", visibility: "public", source: "stated" },
          { id: "alex_rent_floor", topic: "rent_floor", value: "Would go down to $1,200/mo for the right person", importance: "high", visibility: "match_only", source: "stated" },
          { id: "alex_movein", topic: "move_in", value: "September 1, 12-month lease", importance: "high", visibility: "public", source: "stated" },
        ],
        follow_up_question:
          "Got it, $1,350 posted and $1,200 stays between us. Last one: anything a roommate should know about your schedule, guests, or pets? Tell me what to keep private.",
        ready: false,
      };
    return {
      ...base,
      preferences: [
        { id: "alex_rent_posted", topic: "rent", value: "$1,350/mo for the second bedroom, utilities split", importance: "high", visibility: "public", source: "stated" },
        { id: "alex_rent_floor", topic: "rent_floor", value: "Would go down to $1,200/mo for the right person", importance: "high", visibility: "match_only", source: "stated" },
        { id: "alex_movein", topic: "move_in", value: "September 1, 12-month lease", importance: "high", visibility: "public", source: "stated" },
        { id: "alex_sleep", topic: "sleep_schedule", value: "Night owl, usually up until 1am", importance: "medium", visibility: "match_only", source: "stated" },
        { id: "alex_guests", topic: "guests", value: "Partner visits some weekends", importance: "medium", visibility: "match_only", source: "stated" },
        { id: "alex_pets", topic: "pets", value: "No dogs in the apartment", importance: "dealbreaker", visibility: "match_only", source: "stated" },
        { id: "alex_clean", topic: "cleanliness", value: "Tidy-ish, not spotless", importance: "low", visibility: "public", source: "stated" },
        { id: "alex_health", topic: "health", value: "Has a chronic condition, doesn't want it shared", importance: "low", visibility: "never", source: "stated" },
      ],
      follow_up_question: null,
      ready: true,
    };
  }
  // Generic persona: one follow-up, then ready.
  if (userTurns <= 1)
    return {
      ask_type: "roommate",
      summary: conversation.split("\n").find((l) => l.startsWith("User:"))?.slice(6).trim() ?? "Looking for a roommate",
      preferences: [],
      follow_up_question: "What's your budget, and is there a real ceiling you'd rather I keep private?",
      ready: false,
    };
  return {
    ask_type: "roommate",
    summary: conversation.split("\n").find((l) => l.startsWith("User:"))?.slice(6).trim() ?? "Looking for a roommate",
    preferences: [
      { id: "budget", topic: "budget", value: "Around $1,200/mo", importance: "high", visibility: "public", source: "stated" },
      { id: "budget_max", topic: "budget_max", value: "Could stretch to $1,300/mo", importance: "high", visibility: "match_only", source: "stated" },
      { id: "move_in", topic: "move_in", value: "September", importance: "high", visibility: "public", source: "inferred" },
    ],
    follow_up_question: null,
    ready: true,
  };
}

// ---------- video intake ----------
export const mockIntake: IntakeOutput = {
  room: {
    furnished: false,
    approx_size: "medium",
    natural_light: "high",
    desk_space: true,
    closet: true,
    notes: ["Corner room with two windows", "Hardwood floors", "Door locks", "Street-facing, some traffic noise"],
  },
  items: [
    { name: "IKEA desk", brand_guess: "IKEA", condition: "good", flaws: ["Small scratch on the top left corner"], suggested_price_usd: 30, frame_index: 2 },
    { name: "Mini fridge", brand_guess: "Insignia", condition: "good", flaws: [], suggested_price_usd: 40, frame_index: 5 },
    { name: "Desk lamp", brand_guess: null, condition: "fair", flaws: ["Loose hinge"], suggested_price_usd: 8, frame_index: 3 },
  ],
};

// ---------- negotiation ----------
type Script = Record<string, { A: AgentTurnOutput[]; B: AgentTurnOutput[]; verdict: RefereeOutput }>;

const ALEX_OPEN: AgentTurnOutput = {
  message:
    "Alex has the second bedroom in a 2BR in the Mission from September 1 on a 12-month lease. Posted at $1,350 with utilities split, unfurnished, and there's a desk and mini fridge available if wanted. Alex keeps late hours and has a partner over some weekends. What matters most on your side?",
  disclosed: ["alex_rent_posted", "alex_movein", "alex_furniture", "alex_sleep", "alex_guests"],
  positions: { rent: "$1,350 posted, some room to move", move_in: "September 1", furniture: "desk and mini fridge available" },
  satisfied: false,
};

const SCRIPTS: Script = {
  [pair("alex", "priya")]: {
    A: [
      ALEX_OPEN,
      {
        message:
          "Alex can meet in the middle on rent for the right person, so the numbers work. Weeknight noise is the real question: Alex is usually up until 1am but is fine keeping the living room and kitchen quiet after 11 and using headphones. The desk is Priya's if she wants it.",
        disclosed: ["alex_rent_floor", "alex_sleep", "alex_furniture"],
        positions: { rent: "can meet Priya's range", quiet_hours: "common areas quiet after 11, headphones in room", furniture: "desk included" },
        satisfied: true,
      },
    ],
    B: [
      {
        message:
          "Priya is looking from early September, so the 1st works. Her posted budget is around $1,200. She can go a little higher for the right place but not all the way to $1,350. Clean common areas matter to her. She starts work at 7am and needs quiet after 11pm on weeknights. No pets, and unfurnished is fine.",
        disclosed: ["priya_movein", "priya_budget", "priya_budget_max", "priya_clean", "priya_quiet", "priya_pets", "priya_furniture"],
        positions: { rent: "around $1,200, can stretch some", quiet_hours: "quiet after 11pm weeknights", move_in: "early September" },
        satisfied: false,
      },
      {
        message:
          "That works for Priya if quiet after 11 covers the living room and kitchen, not only headphones. Rent in the overlap is fine on her side. She'd take the desk. Nothing else is a blocker.",
        disclosed: ["priya_quiet", "priya_budget_max", "priya_furniture"],
        positions: { rent: "settled in the overlap", quiet_hours: "common areas quiet after 11", furniture: "takes the desk" },
        satisfied: true,
      },
    ],
    verdict: {
      compatible: true,
      score: 0.84,
      fits: [
        "Budgets overlap once both private numbers are counted",
        "Both want September 1",
        "Priya would take the desk, so the room comes partly set up",
        "Both fine with occasional guests",
      ],
      disagreements: ["Alex is a night owl, Priya needs weeknight quiet"],
      compromise: "Living room and kitchen quiet after 11 on weeknights. Alex uses headphones in their room.",
      summary_for_humans: "Strong fit on terms. One thing to talk about: weeknight noise.",
    },
  },
  [pair("alex", "jordan")]: {
    A: [
      ALEX_OPEN,
      {
        message:
          "That's a dealbreaker on Alex's side: no dogs in the apartment. The rent and dates line up, but I don't think we can get past the dog, so I'll stop here rather than keep going.",
        disclosed: ["alex_pets"],
        positions: { rent: "would have worked", move_in: "would have worked", pets: "no dogs, dealbreaker" },
        satisfied: false,
      },
    ],
    B: [
      {
        message:
          "Jordan needs September 1 and is budgeting $1,250 to $1,350, so the rent works as posted. Pretty tidy. One thing that is not negotiable: Jordan is bringing Biscuit, a golden retriever.",
        disclosed: ["jordan_movein", "jordan_budget", "jordan_clean", "jordan_dog"],
        positions: { rent: "fine as posted", move_in: "September 1", pets: "bringing a dog, non-negotiable" },
        satisfied: false,
      },
      {
        message: "Understood. Jordan won't give up the dog. Best for both of them to keep looking.",
        disclosed: ["jordan_dog"],
        positions: { pets: "keeping the dog" },
        satisfied: false,
      },
    ],
    verdict: {
      compatible: false,
      score: 0.2,
      fits: ["Rent and move-in date line up"],
      disagreements: ["Jordan is bringing a dog. Alex's apartment is no dogs."],
      compromise: null,
      summary_for_humans: "Not a fit. Jordan's dog is a dealbreaker for Alex.",
    },
  },
  [pair("alex", "sam")]: {
    A: [
      ALEX_OPEN,
      {
        message:
          "Rent works. September 1 is firm since the lease starts then. Alex is tidy-ish rather than spotless, so cleaning expectations are worth a real conversation between the two of them. Both are night owls, so late hours shouldn't be an issue.",
        disclosed: ["alex_movein", "alex_clean", "alex_sleep"],
        positions: { rent: "works", move_in: "September 1 firm", cleanliness: "tidy-ish, open to a schedule" },
        satisfied: true,
      },
    ],
    B: [
      {
        message:
          "Sam is flexible on dates, mid-September ideal but could do the 1st. A number close to the posted rent is doable with a little flexibility. Very clean, night owl with headphones, no pets. Would the desk and fridge stay?",
        disclosed: ["sam_movein", "sam_budget", "sam_clean", "sam_sleep", "sam_pets"],
        positions: { rent: "close to posted, some flexibility", move_in: "flexible, can do Sept 1", cleanliness: "very clean" },
        satisfied: false,
      },
      {
        message: "Sam can start September 1 and would split a simple cleaning schedule for shared spaces. Nothing blocking on Sam's side.",
        disclosed: ["sam_movein", "sam_clean"],
        positions: { move_in: "September 1", cleanliness: "cleaning schedule" },
        satisfied: true,
      },
    ],
    verdict: {
      compatible: true,
      score: 0.76,
      fits: ["Rent works for both", "Sam can start September 1", "Both night owls, both use headphones", "No pets on either side"],
      disagreements: ["Sam is very clean, Alex is tidy-ish"],
      compromise: "Agree a simple cleaning schedule for shared spaces before move-in.",
      summary_for_humans: "Good fit. Worth talking about how clean is clean.",
    },
  },
};

const GENERIC_TURN = (name: string, round: number, satisfied: boolean): AgentTurnOutput => ({
  message:
    round === 1
      ? `${name} is looking from September and is flexible on most things. Budget is in the normal range for a room in the city. What are the terms on your side?`
      : `${name} can work with those terms. Nothing blocking from this side.`,
  disclosed: [],
  positions: { move_in: "September", rent: "in range" },
  satisfied,
});

export function mockAgentTurn(ownerId: string, otherId: string, speaker: "A" | "B", round: number, askerId: string): AgentTurnOutput {
  const s = SCRIPTS[pair(ownerId, otherId)];
  if (s) {
    // Scripts are written with Alex as A. If Alex is B in this negotiation, swap.
    const alexIsA = askerId === "alex";
    const side = (speaker === "A") === alexIsA ? "A" : "B";
    const turns = s[side];
    return turns[Math.min(round - 1, turns.length - 1)];
  }
  return GENERIC_TURN(ownerId, round, round >= 2);
}

export function mockReferee(aId: string, bId: string): RefereeOutput {
  return (
    SCRIPTS[pair(aId, bId)]?.verdict ?? {
      compatible: true,
      score: 0.6,
      fits: ["Dates line up", "Budgets overlap"],
      disagreements: ["Not much discussed beyond terms"],
      compromise: null,
      summary_for_humans: "Looks workable. Worth a conversation.",
    }
  );
}

// ---------- connection judgment ----------
export function mockConnection(aId: string, bId: string): ConnectionOutput {
  if (pair(aId, bId) === pair("alex", "priya"))
    return {
      suggest: true,
      confidence: 0.82,
      reason: "You're both new to SF this fall and both run weekend mornings.",
      activity: "Saturday morning run along the Embarcadero",
      event_id: "evt_weekend_runs",
    };
  return { suggest: false, confidence: 0.15, reason: null, activity: null, event_id: null };
}

// ---------- messenger ----------
export function mockOpener(senderId: string, recipientId: string, recipientFirst: string): string {
  const k = `${senderId}>${recipientId}`;
  const lines: Record<string, string> = {
    "alex>priya": `hey ${recipientFirst}! my Muse said we line up on basically everything for the Mission room except I'm a night owl and you're up at 7. totally fine keeping the living room quiet after 11 on weeknights. want to come see the place this week?`,
    "priya>alex": `hey ${recipientFirst}! my Muse says your Mission room lines up with what I'm looking for. only thing is I'm up at 7 for work, would quiet after 11 on weeknights be ok? would love to see it this week.`,
    "alex>sam": `hey ${recipientFirst}, sounds like the Mission room could work for Sept 1. my Muse flagged that you're very clean and I'm more tidy-ish, so maybe we talk through how we'd split chores? happy to show you the place.`,
    "sam>alex": `hey ${recipientFirst}, my Muse says your room could work for me from Sept 1. I'm pretty particular about shared spaces, happy to set up a cleaning schedule. could I come see it?`,
  };
  return lines[k] ?? `hey ${recipientFirst}! my Muse thinks we might be a good fit on the room. want to talk this week?`;
}

export function mockPostEval(postId: string): PostEvalOutput {
  if (postId === "post_casey_room")
    return {
      fit: true,
      score: 0.78,
      reasons: ["Wants September 1, same as the lease start", "Budget fits the posted rent", "Quiet and tidy, no pets"],
      concerns: ["Works from home some days, so daytime noise matters"],
    };
  return { fit: false, score: 0.2, reasons: [], concerns: ["Not about a room"] };
}

export function mockReplyDraft(recipientFirst: string): string {
  return `Hi ${recipientFirst}! I have the second bedroom in a 2BR in the Mission opening Sept 1, about 10 min to BART. Unfurnished, but there's a desk if you want it. Want to come see it this week?`;
}

// ---------- marketplace + digest ----------
export function mockListing(items: Item[]): ListingOutput {
  const total = items.reduce((s, i) => s + i.suggestedPriceUsd, 0);
  return {
    title: `${items.map((i) => i.name).join(" + ")} (Mission, pickup)`,
    price_usd: total,
    condition: "good",
    description: `Leftover from my second bedroom before my roommate moves in. ${items
      .flatMap((i) => i.flaws)
      .join(". ") || "Everything works."} Pickup in the Mission, near 24th St BART.`,
  };
}

export const mockDigest: DigestOutput = {
  cards: [
    { type: "skill_swap", title: "Maya teaches guitar, needs resume help", body: "You've reviewed resumes before. She's applying to PM internships.", related_user_ids: ["maya"] },
    { type: "plus_one", title: "2 people are going to beabadoobee at the Fox", body: "Theo is looking for people to go with and Lena has a spare ticket.", related_user_ids: ["theo", "lena"] },
    { type: "small_ask", title: "Marcus is driving to SFO Friday at 2pm", body: "Two seats open, split gas.", related_user_ids: ["marcus"] },
  ],
};
