// One-off generator for seed v1. Edit seed/*.json directly from now on.
import fs from "fs";
const av = (n) => `https://i.pravatar.cc/150?u=${n}`;
const S = "Stanford";
const U = (id, name, o) => ({ id, name, avatarUrl: av(id), school: S, schoolVerified: true, city: "San Francisco",
  groups: [], friends: [], museEnabled: true, defaultReach: "school", connectionSuggestionsOptIn: true, interests: [], bio: "", ...o });
const I = (...v) => v.map((value) => ({ value, shareForConnection: true }));

const users = [
  U("alex", "Alex Kim", { groups: ["g_housing27", "g_ffs", "g_sfgrads", "g_runners"], friends: ["maya", "dev"],
    interests: [...I("weekend morning runs", "new to SF", "indie music"), { value: "anime", shareForConnection: false }],
    bio: "Stanford '26 → moving to SF in Sept for a job. Night owl." }),
  U("priya", "Priya Shah", { groups: ["g_housing27", "g_sfgrads", "g_runners"], friends: ["maya"],
    interests: I("weekend morning runs", "new to SF", "cooking", "climbing"), bio: "Stanford '26, starting at a startup in SoMa this fall." }),
  U("jordan", "Jordan Lee", { groups: ["g_housing27", "g_sfgrads"], interests: I("dogs", "hiking"), bio: "Moving to SF with my golden retriever, Biscuit." }),
  U("sam", "Sam Rivera", { groups: ["g_housing27"], connectionSuggestionsOptIn: false, interests: I("video games", "basketball"), bio: "Quiet, clean, works hybrid." }),
  U("casey", "Casey Nguyen", { museEnabled: false, groups: ["g_housing27", "g_sfgrads"], interests: [], bio: "" }),
  U("maya", "Maya Patel", { groups: ["g_ffs"], friends: ["alex", "priya"], interests: I("guitar", "songwriting"), bio: "Teaches guitar. Applying to internships." }),
  U("theo", "Theo Park", { groups: ["g_ffs"], interests: I("beabadoobee", "indie music", "vinyl") }),
  U("lena", "Lena Brooks", { school: undefined, schoolVerified: false, interests: I("beabadoobee", "concerts") }),
  U("rosa", "Rosa Diaz", { school: undefined, schoolVerified: false, interests: I("vintage clothes", "thrifting") }),
  U("kai", "Kai Tanaka", { school: undefined, schoolVerified: false, interests: I("vintage clothes", "denim") }),
  U("nina", "Nina Okafor", { interests: I("vintage clothes", "sewing") }),
  U("omar", "Omar Haddad", { school: undefined, schoolVerified: false, interests: I("vintage clothes", "sneakers") }),
  U("june", "June Liu", { interests: I("vintage clothes", "film photography") }),
  U("marcus", "Marcus Bell", { groups: ["g_ffs"], interests: I("road trips") }),
  U("dev", "Dev Mehta", { city: "Stanford", groups: ["g_ffs"], friends: ["alex"], interests: I("algorithms", "chess") }),
];

const groups = [
  { id: "g_housing27", name: "Stanford Housing '27", memberIds: users.filter((u) => u.groups.includes("g_housing27")).map((u) => u.id) },
  { id: "g_ffs", name: "Stanford Free & For Sale", memberIds: users.filter((u) => u.groups.includes("g_ffs")).map((u) => u.id) },
  { id: "g_sfgrads", name: "SF New Grads 2026", memberIds: users.filter((u) => u.groups.includes("g_sfgrads")).map((u) => u.id) },
  { id: "g_runners", name: "Bay Area Runners", memberIds: users.filter((u) => u.groups.includes("g_runners")).map((u) => u.id) },
];

const P = (id, groupId, authorId, text, d) => ({ id, groupId, authorId, text, createdAt: `2026-11-${d}T18:00:00Z` });
const posts = [
  P("post_casey_room", "g_housing27", "casey", "Have a room opening in a 2BR in the Mission starting Sept 1! $1,300/mo, furnished, 10 min walk to BART. I work from home some days and go to bed pretty late. Looking for someone chill and tidy-ish. DM me", "08"),
  P("post_room_2", "g_sfgrads", "casey", "Also open to someone taking over my lease in Inner Sunset if the Mission place fills — just ask.", "09"),
  P("post_iso_desk", "g_ffs", "theo", "ISO a desk + chair before move-out, under $50 ideally. Can pick up on campus.", "09"),
  P("post_guitar", "g_ffs", "maya", "Offering guitar lessons (beginner/intermediate)! Would love to trade for resume help — applying to PM internships.", "07"),
  P("post_sfo", "g_ffs", "marcus", "Driving to SFO Friday ~2pm, have 2 seats. Split gas?", "10"),
  P("post_cs161", "g_ffs", "dev", "Anyone want to form a CS 161 study group for the final? Thinking Tues/Thurs nights in Huang.", "10"),
  P("post_fridge", "g_ffs", "theo", "Looking for a mini fridge for winter quarter. Will pay cash.", "06"),
  P("post_sublet", "g_housing27", "jordan", "Moving to SF in Sept with my dog — looking for a dog-friendly 2BR, roughly $1,300/person.", "05"),
  P("post_runs", "g_runners", "priya", "Anyone doing Saturday morning runs along the Embarcadero once we're in SF?", "04"),
  P("post_lamp", "g_ffs", "nina", "Free IKEA floor lamp, works fine, small scratch on the base. Pickup at EVGR.", "10"),
];

const circles = [
  { id: "circle_new_in_sf_runs", name: "New in SF — Weekend Runs", description: "Saturday 8am easy runs along the Embarcadero for people new to the city.", city: "San Francisco", memberIds: ["maya", "theo", "june", "kai"], open: true, lastActiveAt: "2026-11-09T16:00:00Z" },
  { id: "circle_vintage_mission", name: "Vintage Swap — Mission", description: "Monthly clothing swap at Dolores Park.", city: "San Francisco", memberIds: ["rosa", "kai", "omar"], open: true, lastActiveAt: "2026-11-02T20:00:00Z" },
  { id: "circle_cs161", name: "CS 161 Study Group", description: "Tues/Thurs nights in Huang before the final.", city: "Stanford", memberIds: ["dev"], open: true, lastActiveAt: "2026-11-10T03:00:00Z" },
];

const pref = (id, topic, value, importance, visibility) => ({ id, topic, value, importance, visibility, source: "stated", confirmed: true });
const room = (userId, id, summary, prefs) => ({ id, userId, type: "roommate", summary, reach: "school", preferences: prefs, createdAt: "2026-11-10T20:00:00Z" });
const asks = [
  // Alex's hero ask is created LIVE in the demo; this seeded copy is for dev/testing (id: ask_alex_seed).
  room("alex", "ask_alex_seed", "Looking for a roommate in SF starting September", [
    pref("alex_budget_posted", "budget", "$1,200/mo", "high", "public"),
    pref("alex_budget_max", "budget_max", "Real max $1,350/mo", "high", "match_only"),
    pref("alex_movein", "move_in", "September 1", "high", "public"),
    pref("alex_sleep", "sleep_schedule", "Night owl, usually up until 1am", "medium", "match_only"),
    pref("alex_guests", "guests", "Partner visits some weekends", "medium", "match_only"),
    pref("alex_pets", "pets", "Allergic to dogs — no dogs", "dealbreaker", "match_only"),
    pref("alex_clean", "cleanliness", "Tidy-ish, not spotless", "low", "public"),
    pref("alex_health", "health", "Has a chronic condition, doesn't want it shared", "low", "never"),
  ]),
  room("priya", "ask_priya", "Looking for a roommate in SF from September", [
    pref("priya_budget", "budget", "$1,250–$1,400/mo", "high", "match_only"),
    pref("priya_movein", "move_in", "Early September", "high", "public"),
    pref("priya_quiet", "quiet_hours", "Needs quiet after 11pm on weeknights (early job)", "high", "match_only"),
    pref("priya_clean", "cleanliness", "Clean common areas", "medium", "public"),
    pref("priya_guests", "guests", "Occasional guests fine", "low", "public"),
  ]),
  room("jordan", "ask_jordan", "Need a dog-friendly roommate in SF, Sept", [
    pref("jordan_budget", "budget", "$1,250–$1,350/mo", "high", "public"),
    pref("jordan_movein", "move_in", "September 1", "high", "public"),
    pref("jordan_dog", "pets", "Bringing my golden retriever — non-negotiable", "dealbreaker", "public"),
  ]),
  room("sam", "ask_sam", "Roommate for SF apartment, fall", [
    pref("sam_budget", "budget", "Up to $1,300/mo", "high", "match_only"),
    pref("sam_movein", "move_in", "Mid-September, flexible", "medium", "public"),
    pref("sam_sleep", "sleep_schedule", "Night owl, games late with headphones", "low", "public"),
    pref("sam_clean", "cleanliness", "Very clean", "medium", "public"),
  ]),
  { id: "ask_maya_swap", userId: "maya", type: "skill_swap", summary: "Teach guitar in exchange for resume help", reach: "nearby", preferences: [], createdAt: "2026-11-07T20:00:00Z" },
  { id: "ask_theo_show", userId: "theo", type: "plus_one", summary: "Going to the beabadoobee show at the Fox in Dec, looking for people to go with", reach: "anyone", preferences: [], createdAt: "2026-11-08T20:00:00Z" },
  { id: "ask_lena_show", userId: "lena", type: "plus_one", summary: "Have an extra beabadoobee ticket", reach: "anyone", preferences: [], createdAt: "2026-11-09T20:00:00Z" },
  { id: "ask_marcus_sfo", userId: "marcus", type: "ride", summary: "Driving to SFO Friday 2pm, 2 seats", reach: "nearby", preferences: [], createdAt: "2026-11-10T20:00:00Z" },
  { id: "ask_dev_161", userId: "dev", type: "other", summary: "CS 161 study partners for the final", reach: "school", preferences: [], createdAt: "2026-11-10T20:00:00Z" },
];

for (const [f, d] of Object.entries({ users, groups, posts, circles, asks }))
  fs.writeFileSync(`seed/${f}.json`, JSON.stringify(d, null, 2) + "\n");
console.log("seed written");
