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
import { getUser } from "./db";
import type { Item } from "./types";

const pair = (a: string, b: string) => [a, b].sort().join("|");

// ---------- ask parsing (chat sheet) ----------
export function mockAskParse(ownerId: string, conversation: string): AskParseOutput {
  const userTurns = (conversation.match(/^User:/gm) ?? []).length;
  const firstLine = conversation.split("\n").find((l) => l.startsWith("User:"))?.toLowerCase() ?? "";
  if (/show|concert|beabadoobee|ticket|gig/.test(firstLine)) return mockPlusOneParse(userTurns);
  if (/sfo|airport|ride|drive|driving|lift/.test(firstLine)) return mockRideParse(userTurns);
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
  if (ownerId === "priya") {
    const base = { ask_type: "roommate" as const, summary: "Looking for a room in SF from early September" };
    if (userTurns <= 1)
      return {
        ...base,
        preferences: [{ id: "priya_movein", topic: "move_in", value: "Early September", importance: "high", visibility: "public", source: "stated" }],
        follow_up_question: "On it. What's your budget, and is there a real ceiling you'd rather I keep between us? Anything about schedule or noise?",
        ready: false,
      };
    return {
      ...base,
      preferences: [
        { id: "priya_budget", topic: "budget", value: "Around $1,200/mo", importance: "high", visibility: "public", source: "stated" },
        { id: "priya_budget_max", topic: "budget_max", value: "Can stretch to $1,300/mo for the right place", importance: "high", visibility: "match_only", source: "stated" },
        { id: "priya_movein", topic: "move_in", value: "Early September", importance: "high", visibility: "public", source: "stated" },
        { id: "priya_quiet", topic: "quiet_hours", value: "Needs quiet after 11pm on weeknights, starts work at 7am", importance: "high", visibility: "match_only", source: "stated" },
        { id: "priya_clean", topic: "cleanliness", value: "Clean common areas", importance: "medium", visibility: "public", source: "stated" },
        { id: "priya_pets", topic: "pets", value: "No pets of my own, fine either way", importance: "low", visibility: "public", source: "stated" },
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


function mockPlusOneParse(userTurns: number): AskParseOutput {
  const base = { ask_type: "plus_one" as const, summary: "Going to beabadoobee at the Fox on Dec 12, looking for people to go with" };
  const ev = { id: "alex_event", topic: "event", value: "beabadoobee at the Fox Theater, Oakland, Dec 12", importance: "high" as const, visibility: "public" as const, source: "stated" as const };
  if (userTurns <= 1)
    return { ...base, preferences: [ev], follow_up_question: "Fun, that show's going to be good. Do you have a ticket yet, and if someone has a spare, what's your max? I'll keep the number private.", ready: false };
  const t2 = [
    ev,
    { id: "alex_ticket", topic: "ticket", value: "Doesn't have a ticket yet", importance: "high" as const, visibility: "public" as const, source: "stated" as const },
    { id: "alex_ticket_budget", topic: "ticket_budget", value: "Up to $70 for a spare", importance: "high" as const, visibility: "match_only" as const, source: "stated" as const },
  ];
  if (userTurns === 2) return { ...base, preferences: t2, follow_up_question: "Got it, $70 stays between us. Last one: how do you want the night to go? Drinks before, straight to the show, and do you need a ride back?", ready: false };
  return {
    ...base,
    preferences: [
      ...t2,
      { id: "alex_meet", topic: "meeting_plan", value: "Drinks before works, doors at 7:30", importance: "medium" as const, visibility: "public" as const, source: "stated" as const },
      { id: "alex_group", topic: "group_size", value: "Small group, not a date", importance: "medium" as const, visibility: "public" as const, source: "stated" as const },
      { id: "alex_ride", topic: "ride_home", value: "No car, needs a ride or BART back to the Mission", importance: "medium" as const, visibility: "match_only" as const, source: "stated" as const },
    ],
    follow_up_question: null,
    ready: true,
  };
}

function mockRideParse(userTurns: number): AskParseOutput {
  const base = { ask_type: "ride" as const, summary: "Need a ride to SFO on Friday afternoon from the Mission" };
  if (userTurns <= 1)
    return {
      ...base,
      preferences: [{ id: "alex_dest", topic: "destination", value: "SFO, Friday afternoon", importance: "high" as const, visibility: "public" as const, source: "stated" as const }],
      follow_up_question: "Easy one. What time's your flight, and how much are you bringing?",
      ready: false,
    };
  return {
    ...base,
    preferences: [
      { id: "alex_dest", topic: "destination", value: "SFO, Friday afternoon", importance: "high" as const, visibility: "public" as const, source: "stated" as const },
      { id: "alex_flight", topic: "flight", value: "Flight at 5:10pm Friday, wants to be there by 3", importance: "high" as const, visibility: "public" as const, source: "stated" as const },
      { id: "alex_bags", topic: "luggage", value: "One carry-on and a backpack", importance: "low" as const, visibility: "public" as const, source: "stated" as const },
      { id: "alex_gas", topic: "cost", value: "Happy to split gas", importance: "medium" as const, visibility: "public" as const, source: "stated" as const },
      { id: "alex_early", topic: "flexibility", value: "Could leave as early as 1pm", importance: "low" as const, visibility: "match_only" as const, source: "stated" as const },
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
          "Priya is looking from early September, so the 1st works. Her posted budget is a bit under the asking rent. She can go a little higher for the right place but not all the way to $1,350. Clean common areas matter to her. She starts work at 7am and needs quiet after 11pm on weeknights. No pets, and unfurnished is fine.",
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

const ALEX_SHOW_OPEN: AgentTurnOutput = {
  message:
    "Alex is going to beabadoobee at the Fox on the 12th, no ticket yet, and would rather go with a few people than solo. Drinks before works, and Alex doesn't have a car. What's your side's plan?",
  disclosed: ["alex_event", "alex_ticket", "alex_meet", "alex_group"],
  positions: { tickets: "needs one", meeting_plan: "drinks before, doors 7:30", group_size: "small group" },
  satisfied: false,
};
SCRIPTS[pair("alex", "theo")] = {
  A: [
    ALEX_SHOW_OPEN,
    {
      message: "That lines up. Alex would gladly take the ride back and is happy to keep it a small group. Alex still needs a ticket, so if anyone in the group has a spare, that solves it.",
      disclosed: ["alex_ride", "alex_group", "alex_ticket"],
      positions: { ride_home: "takes Theo's ride", tickets: "still needs one" },
      satisfied: true,
    },
  ],
  B: [
    {
      message:
        "Theo already has a GA ticket and wants to meet for a drink before doors at 7:30, small group of three or four. Theo is driving back to SF and can take two people. Theo doesn't drink but is fine with others drinking.",
      disclosed: ["theo_ticket", "theo_meet", "theo_group", "theo_ride", "theo_sober"],
      positions: { tickets: "has one", meeting_plan: "drink before, 6:30", ride_home: "driving, two seats" },
      satisfied: false,
    },
    {
      message: "Theo can hold a seat in the car. Lena in the group has a spare ticket at face value. Theo's Muse can't commit for her, but it's worth asking.",
      disclosed: ["theo_ride"],
      positions: { ride_home: "seat held for Alex" },
      satisfied: true,
    },
  ],
  verdict: {
    compatible: true,
    score: 0.8,
    fits: ["Both going on the 12th", "Both want a drink before doors", "Theo has room in the car back to SF", "Both prefer a small group"],
    disagreements: ["Alex still needs a ticket"],
    compromise: "Meet at Beer Revolution at 6:30 and walk over. Alex sorts a ticket first; Lena's spare is the obvious option.",
    summary_for_humans: "Good match for the night. One thing to sort: Alex's ticket.",
  },
};
SCRIPTS[pair("alex", "lena")] = {
  A: [
    ALEX_SHOW_OPEN,
    {
      message: "Face value works for Alex, that's within budget. No problem on drinks before, Alex can meet Lena at the doors. Alex can't help with the ride since Alex doesn't drive.",
      disclosed: ["alex_ticket_budget", "alex_meet", "alex_ride"],
      positions: { tickets: "takes Lena's spare at face value", meeting_plan: "doors at 7:30" },
      satisfied: true,
    },
  ],
  B: [
    {
      message:
        "Lena has one extra GA ticket at face value and is happy for it to go to someone from the group. She's meeting friends after, so she can do the show itself but not drinks before. Taking BART back.",
      disclosed: ["lena_ticket", "lena_meet", "lena_ride"],
      positions: { tickets: "one spare, face value", meeting_plan: "show only", ride_home: "BART" },
      satisfied: false,
    },
    { message: "Lena will hold the ticket for Alex until Thursday. Meet at will-call at 7:30.", disclosed: ["lena_ticket"], positions: { tickets: "held until Thursday" }, satisfied: true },
  ],
  verdict: {
    compatible: true,
    score: 0.78,
    fits: ["Lena's spare ticket solves Alex's ticket", "Price works for both", "Both fine meeting at the doors"],
    disagreements: ["Lena can't do drinks before"],
    compromise: "Alex buys the spare at face value and meets Lena at the doors at 7:30.",
    summary_for_humans: "Lena's spare ticket fits. Meet at the doors.",
  },
};
SCRIPTS[pair("alex", "marcus")] = {
  A: [
    {
      message: "Alex needs to get to SFO on Friday for a 5:10 flight, ideally there by 3. One carry-on and a backpack, happy to split gas. Does Marcus's 2pm still work?",
      disclosed: ["alex_dest", "alex_flight", "alex_bags", "alex_gas"],
      positions: { departure_time: "by 3 at SFO", luggage: "carry-on + backpack", cost_split: "yes" },
      satisfied: false,
    },
    { message: "2pm works, that's SFO by 2:45. Alex is in the Mission too, and $10 is fine.", disclosed: ["alex_gas"], positions: { departure_time: "2pm", pickup_point: "Mission", cost_split: "$10" }, satisfied: true },
  ],
  B: [
    {
      message: "Marcus is leaving the Mission at 2pm with two seats, split gas at about $10 each, one big bag per person is fine. Marcus can leave a little earlier if a flight is tight.",
      disclosed: ["marcus_time", "marcus_gas", "marcus_bags", "marcus_flex"],
      positions: { departure_time: "2pm, could be earlier", pickup_point: "Mission", cost_split: "$10 each" },
      satisfied: false,
    },
    { message: "Pickup at 24th and Mission at 2. Done.", disclosed: ["marcus_time"], positions: { pickup_point: "24th and Mission", departure_time: "2pm" }, satisfied: true },
  ],
  verdict: {
    compatible: true,
    score: 0.9,
    fits: ["Same neighborhood, same afternoon", "2pm gets Alex there with time to spare", "Gas split works", "Luggage fits"],
    disagreements: [],
    compromise: null,
    summary_for_humans: "Easy. Pickup at 24th and Mission at 2pm.",
  },
};

// The middle of the range for Alex's room: two "could work" and one "long shot" (no dealbreakers, real trade-offs).
SCRIPTS[pair("alex", "june")] = {
  A: [
    ALEX_OPEN,
    {
      message:
        "Rent can meet June's range. The 15th is two weeks into the lease, so the first half of September would need prorating. On the cat: Alex's only firm rule is no dogs, so an indoor cat could work, but it's worth a real conversation before anyone signs.",
      disclosed: ["alex_rent_floor", "alex_movein", "alex_pets"],
      positions: { rent: "can meet June's range", move_in: "Sept 1 lease, open to prorating", pets: "no dogs; a cat is open" },
      satisfied: true,
    },
  ],
  B: [
    {
      message:
        "June is looking from September 15 and prefers the Inner Sunset, but the Mission is fine. She's bringing her indoor cat, Mochi. Her budget is a little under the posted rent. She's a heavy sleeper and keeps things tidy.",
      disclosed: ["june_movein", "june_area", "june_pets", "june_budget", "june_sleep", "june_clean"],
      positions: { move_in: "September 15", pets: "indoor cat", rent: "a little under posted" },
      satisfied: false,
    },
    {
      message: "June could start the 15th with the first half of September prorated, and Mochi stays in her room when guests are over. Rent in the overlap works for her.",
      disclosed: ["june_movein", "june_pets"],
      positions: { move_in: "Sept 15, prorated", pets: "cat stays in her room with guests" },
      satisfied: true,
    },
  ],
  verdict: {
    compatible: true,
    score: 0.58,
    fits: ["Budgets overlap", "Schedules work out", "Both tidy"],
    disagreements: ["June has an indoor cat", "June moves in two weeks after the lease starts"],
    compromise: "Prorate the first half of September, and meet Mochi before deciding.",
    summary_for_humans: "Could work if the cat and the half month are okay. One thing to talk about: June's cat.",
  },
};
SCRIPTS[pair("alex", "kai")] = {
  A: [
    ALEX_OPEN,
    {
      message:
        "Rent only works at the bottom of Alex's range, so there's no room to move on either side. The bigger question is the living room: Alex is happy to share it but not as a full-time office. Daily schedules are pretty different too.",
      disclosed: ["alex_rent_floor", "alex_sleep"],
      positions: { rent: "only at the bottom of the range", living_room: "shared, not a full-time office" },
      satisfied: false,
    },
  ],
  B: [
    {
      message:
        "Kai can start September 1. The budget is firm and a bit under the posted rent. Kai works from home full-time and would want the living room as a daytime office. Up early, quiet at night. Rarely has guests, no pets.",
      disclosed: ["kai_movein", "kai_budget", "kai_wfh", "kai_sleep", "kai_guests", "kai_pets"],
      positions: { move_in: "September 1", rent: "firm, under posted", living_room: "daytime office" },
      satisfied: false,
    },
    {
      message: "Kai could take calls from the bedroom and use the living room on weekday mornings only. The budget can't move.",
      disclosed: ["kai_wfh", "kai_budget"],
      positions: { living_room: "weekday mornings only", rent: "can't move" },
      satisfied: true,
    },
  ],
  verdict: {
    compatible: true,
    score: 0.48,
    fits: ["September 1 works", "Budgets meet, just barely", "No pets, few guests"],
    disagreements: ["Kai wants the living room as a daytime office", "Different daily schedules", "No give on rent"],
    compromise: "Living room as Kai's office on weekday mornings only, and quiet mornings and late nights on both sides.",
    summary_for_humans: "Could work with give on both sides. One thing to talk about: the living room during the day.",
  },
};
SCRIPTS[pair("alex", "rosa")] = {
  A: [
    ALEX_OPEN,
    {
      message:
        "Mid-October means about six weeks of an empty room, and the lease is 12 months, so a 6-month start is hard. Weekends would need a plan, and a second couch is a question for the shared space.",
      disclosed: ["alex_movein", "alex_guests"],
      positions: { move_in: "Sept 1 lease", lease: "12 months", furniture: "living room already set up" },
      satisfied: false,
    },
  ],
  B: [
    {
      message:
        "Rosa is looking from mid-October and wants a 6-month lease to start. Rent as posted is fine. She's bringing a full bedroom set and a couch. Her partner is over a lot of weekends. Relaxed about cleaning, no pets.",
      disclosed: ["rosa_movein", "rosa_lease", "rosa_budget", "rosa_furniture", "rosa_guests", "rosa_clean", "rosa_pets"],
      positions: { move_in: "mid-October", lease: "6 months to start", rent: "fine as posted" },
      satisfied: false,
    },
    {
      message: "Rosa can't move before October. She could sign for the full year if the first month is lower, and the couch can go in storage.",
      disclosed: ["rosa_movein", "rosa_lease", "rosa_furniture"],
      positions: { lease: "full year with a lower first month", furniture: "couch to storage" },
      satisfied: false,
    },
  ],
  verdict: {
    compatible: true,
    score: 0.34,
    fits: ["Rent works as posted", "No pets on either side"],
    disagreements: ["Rosa moves in about six weeks after the lease starts", "Rosa wants a shorter lease", "Weekend guests need a plan", "Where Rosa's couch goes"],
    compromise: "Rosa signs the full lease with a lower first month, and you agree on weekend guests.",
    summary_for_humans: "A long shot on dates and lease length. One thing to talk about: the October move-in.",
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

export function mockAgentTurn(ownerId: string, otherId: string, speaker: "A" | "B", round: number, askerId: string, ctx?: { bothSeeking?: boolean }): AgentTurnOutput {
  const s = SCRIPTS[pair(ownerId, otherId)];
  if (s) {
    // Scripts are written with Alex as A. If Alex is B in this negotiation, swap.
    const alexIsA = askerId === "alex";
    const side = (speaker === "A") === alexIsA ? "A" : "B";
    const turns = s[side];
    return turns[Math.min(round - 1, turns.length - 1)];
  }
  const name = getUser(ownerId)?.name.split(" ")[0] ?? ownerId;
  if (ctx?.bothSeeking)
    return {
      message:
        round === 1
          ? `${name} is also looking for a room from September, not offering one. Unless either of us has a lead on a 2BR, this isn't a match on its own.`
          : `${name} will keep looking. If a 2BR comes up, their Muse can check back.`,
      disclosed: [],
      positions: { rent: "n/a, both seeking" },
      satisfied: round >= 2,
    };
  return GENERIC_TURN(name, round, round >= 2);
}

export function mockReferee(aId: string, bId: string, ctx?: { bothSeeking?: boolean }): RefereeOutput {
  const scripted = SCRIPTS[pair(aId, bId)]?.verdict;
  if (scripted) return scripted;
  if (ctx?.bothSeeking)
    return {
      compatible: false,
      score: 0.2,
      fits: ["Same move-in month"],
      disagreements: ["Both are looking for a room. Neither has one to offer."],
      compromise: null,
      summary_for_humans: "Not a match on its own. Both of you are looking.",
    };
  return {
    compatible: true,
    score: 0.6,
    fits: ["Dates line up", "Budgets overlap"],
    disagreements: ["Not much discussed beyond terms"],
    compromise: null,
    summary_for_humans: "Looks workable. Worth a conversation.",
  };
}

// ---------- connection judgment ----------
export function mockConnection(aId: string, bId: string): ConnectionOutput {
  if (pair(aId, bId) === pair("alex", "theo"))
    return {
      suggest: true,
      confidence: 0.76,
      reason: "You two are new in town and into the same indie shows.",
      activity: "Pre-show drinks before beabadoobee",
      event_id: "evt_bea_preshow",
    };
  if (pair(aId, bId) === pair("alex", "priya"))
    return {
      suggest: true,
      confidence: 0.82,
      reason: "You two are new in SF and run on weekend mornings.",
      activity: "Saturday morning run along the Embarcadero",
      event_id: "evt_weekend_runs",
    };
  return { suggest: false, confidence: 0.15, reason: null, activity: null, event_id: null };
}

// ---------- messenger ----------
export function mockOpener(senderId: string, recipientId: string, recipientFirst: string): string {
  const k = `${senderId}>${recipientId}`;
  const lines: Record<string, string> = {
    "alex>priya": `hey ${recipientFirst}! my Muse said we line up on basically everything for the Mission room except I'm a night owl and you're up early for work. totally fine keeping the living room quiet after 11 on weeknights. want to come see the place this week?`,
    "priya>alex": `hey ${recipientFirst}! my Muse says your Mission room lines up with what I'm looking for. only thing is I'm up at 7 for work, would quiet after 11 on weeknights be ok? would love to see it this week.`,
    "alex>sam": `hey ${recipientFirst}, sounds like the Mission room could work for Sept 1. my Muse flagged that you're very clean and I'm more tidy-ish, so maybe we talk through how we'd split chores? happy to show you the place.`,
    "sam>alex": `hey ${recipientFirst}, my Muse says your room could work for me from Sept 1. I'm pretty particular about shared spaces, happy to set up a cleaning schedule. could I come see it?`,
    "alex>theo": `hey ${recipientFirst}! my Muse says you're going to beabadoobee on the 12th too and might have room in the car back. I'm in for drinks before if that's still the plan, where are you thinking?`,
    "alex>lena": `hey ${recipientFirst}! heard you have a spare ticket for beabadoobee on the 12th, I'd love to take it at face value. can meet you at the doors at 7:30 if that works?`,
    "alex>marcus": `hey ${recipientFirst}, my Muse says you're driving to SFO Friday at 2, could I grab a seat? 24th and Mission works for me, happy to split gas.`,
  };
  return lines[k] ?? `hey ${recipientFirst}! my Muse thinks we might be a good fit on the room. want to talk this week?`;
}

export function mockPostEval(postId: string, askerId = "alex"): PostEvalOutput {
  // Casey is looking for a room. Her post fits someone OFFERING one (Alex), not another seeker.
  if (postId === "post_casey_room" && askerId !== "alex")
    return { fit: false, score: 0.15, reasons: [], concerns: ["Casey is also looking for a room"] };
  if (postId === "post_casey_show")
    return {
      fit: true,
      score: 0.74,
      reasons: ["Going to the same show", "Also looking for a group", "Already has a ticket"],
      concerns: ["Didn't say how she's getting home"],
    };
  if (postId === "post_casey_room")
    return {
      fit: true,
      score: 0.78,
      reasons: ["Wants September 1, same as the lease start", "Budget fits the posted rent", "Quiet and tidy, no pets"],
      concerns: ["Works from home some days, so daytime noise matters"],
    };
  return { fit: false, score: 0.2, reasons: [], concerns: ["Not about a room"] };
}

export function mockReplyDraft(recipientFirst: string, postId?: string): string {
  if (postId === "post_casey_show")
    return `Hey ${recipientFirst}! I'm going to beabadoobee on the 12th too and also going solo-ish. A few of us from the group are meeting for a drink before, want to come?`;
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
