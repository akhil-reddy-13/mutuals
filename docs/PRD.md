# Mutuals — Product Requirements & Build Context

> *Written at the start of the hackathon to plan the build. Some details changed along the way; the README describes what shipped.*

> **Do things with people you can trust.**
> Your Muse handles the tedious, awkward parts of social life with other people's Muses — finding the right person, screening, logistics — so you only spend time on the conversations you actually want to have.

This document is the single source of truth for the project: the idea, the product spec, the architecture, the demo plan, and the build plan. It is written so that a coding agent (e.g. Claude Code) can read it top to bottom and start building the repo.

---

## 0. Context

### The hackathon
- **Event:** Facebook — Closer Together AI Hackathon 2026, Meta HQ (1 Hacker Way, Menlo Park).
- **Challenge:** Build the AI-powered **Facebook** feature (not Instagram/WhatsApp/etc.) that would make Facebook genuinely valuable for young adults.
- **Hard requirement:** A **Muse model (Spark / Wonder / Ember)** must power the core AI experience. AI must be essential, not decorative.
- **Team:** 4 people — Akhil, Kyle, Luke, Eddy.
- **Credits:** $100 Meta Model API credits per person → **~$400 total** (shows on dev.meta.ai Billing page).

### Timeline
| When | What |
|---|---|
| Wed Nov 11, evening | Idea finalized (this doc) |
| Thu Nov 12, 8:00 AM – overnight | Build day. 3–5 PM: Meta product demos (good time to ask mentors questions) |
| **Fri Nov 13, 10:30 AM PST** | **Devpost submission deadline** (Devpost says 10:30; email said 11:00 — treat 10:30 as the real deadline) |
| Fri Nov 13, 10:45 AM | Live demos: **5 min presentation + 3 min Q&A** |
| Fri Nov 13, ~3:00 PM | Winners announced |

### Submission requirements
- Completed Devpost project page with answers to submission questions
- **Public GitHub repo link**
- Demo video (2–3 min; optional on Devpost, listed as required in the email — do it)
- Short written description

### Judging criteria
| Criterion | Weight | How we win it |
|---|---|---|
| AI Integration | 30% | Multimodal intake (video → structured listing), agent-to-agent negotiation over private preferences, judgment about which connections are real. Remove the AI and there is no product. |
| Product Thinking & User Impact | 25% | Clear problem (young adults need things from people nearby but have no Facebook network; connections die after the exchange). Clear retention loop. |
| Execution & Demo | 25% | Everything shown runs live on Muse. No fake screens for core flows. Seeded personas, real model calls. |
| Originality & Cohesion | 20% | Multiplayer Muse is new. Every piece (intake → match → handoff → connection) serves one thesis. |

---

## 0.5 Positioning & design rules (Nov 12 update; supersedes anything below that conflicts)

### What Mutuals is
A Facebook feature where your Muse talks to other people's Muses to find the people nearby who actually fit what you
need (roommate, sublet, ride, buyer for your desk, study partner, someone to go to a show with). It handles the
tedious screening and logistics so you only have the conversations worth having. It does **not** automate
conversation: the humans always send the real messages.

### Why young people would use it
Instagram is for people you already know. Facebook is for people you need to meet. Young adults already end up in
Facebook Groups and Marketplace for housing and practical needs, and it's miserable. Mutuals makes that one ask
instead of fifty awkward messages. No posting required, no existing Facebook friends required (your school or city
is enough).

### How Muse is portrayed
Muse is **the friend who knows everyone**, not a search engine or a marketplace scraper. First person, warm, brief:
"I found two people who fit. Priya's the better one, but you two should talk about noise." It shows its work lightly:
"Checking with 14 people's Muses at Stanford…"

### Design rules (apply everywhere)
1. **Results are PEOPLE, not listings.** Every result card leads with the person (name, photo, verified school,
   mutuals, shared Groups), then the thing. Never a grid of items or posts as the main output.
2. Every result has a one-line **"why this person"** in human terms, not "matches 4 filters."
3. Every Messenger opener carries **shared context**, so it's never "is this still available?"
4. **One human hook per card, only when real overlap exists.** Otherwise nothing. Most exchanges stay exchanges.
5. Connection suggestions are **activity-based** ("join the New in SF weekend runs"), never "you two should be friends."
6. **Agents never commit.** They return a shortlist; the user decides.

### Key flows
- **Video → items (selling):** output is "3 of these already have a home," each item routed to a specific person and
  why ("Desk + chair → Maya, just moved into her first place in Oakland"), plus what's offered more broadly.
  NOT "posted 8 listings." (Built: §5.2.)
- **"I need X":** Muse may ask one friend-like question ("Is this for a trip? Want people to go with too?") and returns
  people plus a possible plan, not a list of items for sale. (Built: §5.4.)
- **Roommate (hero demo):** ask + room video → Muses talk it through with real conflicts → shortlist with fits,
  disagreements, compromise → Messenger handoff → occasional connection card + open Event invite. (Built: §5.1.)

### Copy
- **Headline:** "Skip the fifty awkward messages."
- **Subhead:** "Your Muse checks with other people's Muses to find who actually fits what you need, so you only talk to the right people."
- **Tagline:** "A marketplace finds you stuff. Your Muse finds you people, and the stuff is just the reason to meet."
- **Footer:** "You might have zero mutuals on Facebook today. Mutuals builds them for you."
- Don't lead user-facing copy with jargon: "multiplayer," "agents," "negotiation," "platform." (Fine in the technical
  sections and in Q&A.)
- The **first screen shows the roommate example**, not a dashboard of every entry point. Breadth (skill swap,
  plus-one, taste circles) shows up later, e.g. in the digest.

---

## 1. The Idea

### One-liner
**Skip the fifty awkward messages.** Your Muse checks with other people's Muses to find who actually fits what you
need, matches you on the things you'd never post publicly, and helps the rare great matches turn into real
connections. (Internal shorthand, not user-facing copy: Muse is single-player today; Mutuals makes it multiplayer.)

### The framing (lead with this, not the architecture)
**It does not automate conversation.** It offloads the tedious, boring parts of social interaction — scrolling 200 posts, the same awkward screening questions with 15 strangers, back-and-forth on logistics — so you can talk about what you actually want to talk about, with the people who are actually right for you.

### The problem
1. **Young adults constantly need things from people nearby:** roommates, sublets, rides, furniture, study partners, someone to go to a show with.
2. **Most of us barely have a Facebook network.** Only about a third of 18–24-year-olds actively use Facebook; many have accounts but barely engage. The platform feels empty, so we don't use it.
3. **Public posts force a bad tradeoff.** You either overshare ("I'm kind of messy, my partner stays over most weekends, my real max is $1,350") or leave out exactly what matters.
4. **The process is exhausting.** Scroll, message strangers, repeat the same screening questions, mostly with people who turn out to be wrong.
5. **Connections end with the exchange.** You find your sublet through a Group post and never talk to that person again.

### The thesis
- Practical needs are the easiest icebreaker that exists.
- AI agents can do the screening and logistics, including on **private preferences** people would never post.
- Facebook is the only place with real identity, verified schools, mutual friends, Groups, Marketplace, Events, and Messenger in one product.
- **You might have zero mutuals on Facebook today. Mutuals builds them for you.**

### Before / after story (use in pitch)
> **Before:** You need a roommate. You scroll 200 Group posts, message 15 strangers, and have the same "so are you clean? what's your budget really?" conversation over and over.
>
> **After:** You film your room and tell your Muse what you actually want, including the stuff you'd never post. It quietly checks with other people's Muses. An hour later: *"2 people from Stanford fit. Here's why, and here's the one thing you'd need to talk about."* Then **you** message them. You skip the 15 bad conversations and go straight to the good one.
>
> And when you two have more in common than a lease, Muse suggests doing something together.

---

## 2. Product Overview

### Core loop
1. **Ask** — Tell your Muse what you need or can offer: plain language, a photo, or a 10–15 second video.
2. **Match** — Your Muse checks with other people's Muses (and reads relevant human posts), including on private preferences. You get a shortlist with *why each fits* and *where you'd disagree*.
3. **Handoff** — You pick. A Messenger thread opens with a drafted opener. **From here, humans talk.**
4. **Follow-through** — When there's real overlap and both people opt in, Muse suggests doing something together, usually as a small, open circle.

### Entry points (use cases of the same engine)
| Entry point | Example ask | What Muse does | Why it can become a connection |
|---|---|---|---|
| **Roommates & sublets (HERO)** | "Need a roommate near campus from Sept, real budget up to $1,350" + video of the room | Extracts room details from video; negotiates budget, move-in, sleep schedule, guests, cleanliness with other agents | You're new to the same city, same schedule, shared interests |
| **Items (sell/give)** | Video of your stuff, talking over it | Hears what you're selling, identifies each exact model, routes each item to a person who needs it ("3 of these already have a home") | Shared taste (e.g. both into indie music) |
| **"I need X"** | "Need a tent for a camping trip" | One friend-like question ("Is this for a trip? Want people to go with too?"), then people who have it + a plan to join | The trip itself |
| **Skill swap** | "I want to learn guitar, I can help with resumes" | Finds two-way matches, sets a recurring time | Weekly sessions = repeated contact |
| **Plus-one** | "Going to the beabadoobee show, nobody to go with" | Finds people with the same plan or interest based on what they've shared | Shared activity beats chatting |
| **Taste circles** | (passive) people nearby selling/listing vintage clothes, plants, records | Proposes a small local swap meetup | One-time purchase → recurring community |
| **Small asks** | "Anyone driving to SFO Friday?" / "Study partner for CS 161?" | Quick match within reach setting | Frequent, low-stakes, builds familiarity |

Big asks (roommates) bring people in. Small weekly asks (rides, study partners, running buddies) keep them coming back.

---

## 3. Key Design Decisions

### 3.1 Opt-in and reach

> **As built (Nov 12):** one **Muse settings** page (`/muse/settings`, linked from the Muse chat header, the Muse
> page and Home): **Let my Muse talk to other people's Muses** (on/off), **Who can my Muse talk to?** (People I'm
> connected with · People in my Groups, recommended · Everyone nearby), and **Suggest things to do together** (on/off).
> Set once, used by every ask (`User.museReach`, saved onto each ask as `Ask.museReach`). The chat only asks "Want me
> to check with other people's Muses?" (Yes, check / Not now). If nobody is in reach, Muse offers the next wider
> option. Private preferences stay private in every option. The original design is below.

- **One toggle:** "Let my Muse talk to other Muses."
- **One reach setting**, with a sensible default:
  - `school` — verified .edu only
  - `network` — friends & friends-of-friends
  - `nearby` — your city
  - `anyone` — anyone on Facebook
- **Per-ask overrides, suggested by Muse:** roommate search → `school` (high trust); ride to SFO → `nearby`; "anyone taken CS 161 with this professor?" → `anyone`. User can always change it.
- **Groups are signals, not walls.** Shared Groups and mutual friends boost trust and appear on match cards ("you're both in Stanford Housing '27"). Your Muse also reads human posts in your Groups (cold-start fix).

### 3.2 Private preferences stay private
- Every preference has a **visibility level**:
  - `public` — fine to show on your profile / match card
  - `match_only` — your agent may use it to check compatibility with other agents, but it is never shown to the other human verbatim
  - `never` — never leaves your device / never enters an agent's outgoing context
- **Enforced structurally, not just by prompt:** `never` items are not included in the context the negotiating agent receives. The agent literally cannot leak them.
- **"What my agent shared" log:** every outgoing agent message is logged and visible to the user.

### 3.3 Works from day one (one-sided mode)
- If the other person doesn't have Muse on, your Muse **reads existing Group and Marketplace posts**, evaluates them against your preferences, and **drafts a reply for you to send**.
- When both people have Muse on, it upgrades to **full agent-to-agent negotiation**.
- Multiplayer becomes the growth loop, but the product is useful to the very first user.

### 3.4 Agents never commit
- Agents **pre-negotiate** and return a **shortlist**: who fits, why, where you'd disagree, and a proposed compromise.
- The human always makes the decision and sends the first real message.

### 3.5 Most exchanges stay exchanges (selective connection layer)
- A **"connection potential" card** appears only when:
  1. there is real overlap (judged by the model, above a threshold), **and**
  2. both people have opted in to connection suggestions.
- Suggestions are **activity-based**, not "you two should be friends."
- **Default to small, open groups** (e.g. "New in SF — weekend runs") rather than 1:1. As built, these are Facebook
  **Events** (open, anyone in reach who fits can join); inactive ones quietly dissolve. Copy is always "join the …",
  never "you two should be friends."

### 3.6 Safety & trust
- Real identity, verified school, mutual friends, and shared Groups shown on match cards.
- Suggested public first meetups.
- Agents only state facts the user gave or confirmed; inferred facts are flagged and require confirmation before being shared.

---

## 4. Why Muse / Why Facebook / Not Klick

### Why Muse is essential
| Step | What the AI does | Why no algorithm can |
|---|---|---|
| Intake | Video/photo → structured room details + item catalog with condition and price | Input is a shaky phone video |
| Ask parsing | "Real max is $1,350, I'm messy-ish, partner over weekends" → structured, visibility-tagged preferences | Natural language, fuzzy, private |
| Negotiation | Two agents reconcile soft, conflicting preferences and propose a compromise | Tradeoffs like "night owl vs quiet after 11" aren't a filter |
| One-sided mode | Read human Group posts, judge fit, draft a reply | Unstructured posts |
| Connection judgment | Decide which matches have real overlap and when a nudge feels natural vs creepy | Pure judgment |

### Muse model mapping (planner/worker pattern)
| Job | Model |
|---|---|
| Video/photo understanding, item & room extraction | **Muse Ember** (`muse-ember-1.0`, natively multimodal: text/image/audio/video) |
| Bulk scanning of Group/Marketplace posts, digest generation | **Muse Ember** (fan-out, cheap) |
| Negotiating agents (one per persona) | **Muse Spark** (`muse-spark-1.3`) |
| Orchestrator / referee: run rounds, final verdict, connection-potential judgment | **Muse Wonder** (`muse-wonder-1.0`) |
| Opener drafts in Messenger | **Muse Spark** |
| Seller pipeline step 1: watch + listen (frames + narration → transcript + items you mentioned) | **Muse Ember** |
| Seller pipeline step 2: identify each item's exact model + used price range (best frame + neighbors + your words) | **Muse Spark** |
| Seller pipeline step 3: route items to the people who need them ("already has a home") | **Muse Wonder** |
| Demo photos for seeded posts and Marketplace (scripts/gen-images.ts) | **Muse Image** |
| (Stretch) Item crop-outs | **SAM** (Segment Anything, `sam-3.1` is on our key) |

### Why Facebook
- Real identity, verified schools, mutual friends, Groups, Events, Messenger, Marketplace — all in one place. Instagram has none of this structure.
- **Works with zero Facebook friends** — your school/city reach is enough. Mutuals bootstraps your network.
- Safer than Craigslist-style posts.
- It has to live where the people and Groups are; a standalone Muse app can't negotiate with your campus.

### Not Klick (HackMIT 2026, AI-twin networking)
- **Klick** decides *whether two people should meet* (personality compatibility, live, by proximity at an event).
- **Mutuals** starts from a **real reason** people are already meeting (a concrete need), matches on what people **won't say publicly**, runs **persistently** inside Facebook, and **our main job happens after** the match.

---

## 5. Detailed User Flows

### 5.1 Hero flow: roommate / sublet
1. **Toggle on** "Let my Muse talk to other Muses." Reach: `school`.
2. **Create ask:** "Looking for a roommate near campus from Sept." Muse asks 2–3 follow-ups conversationally (budget, schedule, guests, cleanliness, pets, dealbreakers) and tags each answer `public` / `match_only` / `never` (user can edit).
3. **Film the room (10–15 sec).** Muse extracts: furnished?, approx size, natural light, desk space, closet, notable items. Also catalogs **leftover items** the next tenant might want ("desk + mini fridge, $40 for both").
4. **Matching runs:**
   - Agent-to-agent negotiation with each opted-in candidate in reach.
   - One-sided scan of relevant Group posts from people without Muse.
5. **Shortlist** (2–3 matches). Each card shows: why it fits, where you'd disagree, proposed compromise, trust signals (verified Stanford, shared Groups, mutuals), and a **"what my agent shared"** expander.
6. **Pick one →** Messenger thread opens with a drafted opener. User edits/sends.
7. **Connection potential** (only if threshold met + both opted in): "You're both new to SF and both run weekends." → invite to open circle **"New in SF — Weekend Runs"** (4 others from reach).

### 5.2 Items flow (selling) — as built
1. In a Group (e.g. Stanford Free & For Sale): "Selling some stuff before I move out." Film your stuff and **talk over
   it** ("I want to sell this Canon camera, these Poly earbuds…").
2. **Ember** (server-side ffmpeg pulls ~10 frames + the narration from any phone video, incl. iPhone .MOV) returns a
   word-for-word transcript and the items you mentioned; things it saw but you didn't mention are offered, off by default.
3. **Spark** identifies each item in parallel from its clearest frame + neighbors + your words: exact model
   ("this Canon camera" → Canon PowerShot G7 X Mark II), confidence, used price range. Every field is editable.
4. **Wonder** checks with the Muses of people in the Group who are looking for something and routes each item to a
   person with a one-line human reason. Budgets are compared in code, never shown.
5. Result: **"2 of these already have a home"**: person-first cards (June, Japan trip in December → G7 X; Theo, BART
   commute → earbuds, plus a hook only because you share indie music). Whatever has no home is "offered to everyone
   nearby" (Marketplace). Message buttons open Messenger with an opener that names the item and their reason.

### 5.4 "I need X" — as built
1. "Need a tent for a camping trip next month."
2. Muse asks ONE friend-like question: "Is this for a trip? Want people to go with too?"
3. Muse checks with people offering that kind of thing (seekers only meet offerers), runs the same private
   pre-negotiation as roommates (price, pickup), and returns people + a possible plan: "Marcus has a tent and is
   driving to Yosemite Dec 6" → join the Yosemite carpool Event.

### 5.3 Daily digest
- "3 people near you need something you can help with."
- Cards: skill swap ("Maya can teach guitar, wants resume help"), plus-one ("2 people near you are going to the beabadoobee show"), taste circle ("5 people nearby list vintage clothes — swap meetup Sunday?").
- For the demo, the digest can be shallow (generated by Ember from seeded asks) — it shows breadth.

---

## 6. System Architecture

```
┌──────────────────────── Frontend (Next.js, Facebook-styled UI) ────────────────────────┐
│  Toggle & reach  │  New Ask (chat + video upload)  │  Shortlist / Match cards  │        │
│  Negotiation view (live stream, "behind the scenes")  │  Messenger handoff  │  Digest │
│  Agent-shared log  │  Connection card + Circle invite  │  Persona switcher (demo)     │
└──────────────────────────────────────┬──────────────────────────────────────────────────┘
                                       │ REST + SSE (streaming negotiation)
┌──────────────────────────────────────▼──────────────────────────────────────────────────┐
│ Backend (Next.js API routes / Node)                                                     │
│                                                                                         │
│  intake/        video → frames → Ember → RoomDetails + Item[]                           │
│  asks/          chat → Spark → Preference[] (with visibility)                           │
│  match/         candidate selection by reach → for each candidate:                      │
│                    if candidate.museEnabled → negotiate()  else → oneSidedEval()        │
│  negotiate/     Wonder orchestrator ↔ Spark agent A ↔ Spark agent B (max N rounds)      │
│  connection/    Wonder judges overlap → ConnectionSuggestion | null                     │
│  digest/        Ember fan-out over seeded asks → DigestCard[]                           │
│  messenger/     Spark drafts opener                                                     │
│  log/           every outgoing agent message persisted per user                         │
│                                                                                         │
│  muse.ts        thin client over Meta Model API (OpenAI-SDK compatible)                 │
└──────────────────────────────────────┬──────────────────────────────────────────────────┘
                                       │
                          SQLite (or JSON files) + seed data
```

### 6.1 Muse API client
- Meta Model API is **drop-in compatible with the OpenAI SDK and Anthropic SDK** — set the base URL and API key.
- Env vars:
  ```
  MUSE_API_KEY=...
  MUSE_BASE_URL=...        # get exact value from dev.meta.ai docs quickstart
  MODEL_WONDER=muse-wonder-1.0
  MODEL_SPARK=muse-spark-1.3
  MODEL_EMBER=muse-ember-1.0
  MOCK_MUSE=false          # true = use cached responses for offline dev / demo fallback
  ```
- Wrap all calls in `lib/muse.ts` with: model selection, JSON-mode parsing (strip code fences, validate with zod), retries, response caching keyed by input hash (saves credits during dev), and a `MOCK_MUSE` fallback.

### 6.2 Video intake
- Client records or uploads a 10–15 sec video.
- Server samples frames (~1 fps → 10–15 frames) with ffmpeg (or client-side canvas sampling to avoid server ffmpeg).
- Send frames as images to Ember (cheaper and more predictable than raw video). Optionally try native video input if it works smoothly.
- Output: `RoomDetails` + `Item[]` (validated JSON).

### 6.3 Negotiation protocol
- **Participants:** Agent A (user's Muse, Spark), Agent B (candidate's Muse, Spark), Orchestrator (Wonder).
- **Agent context:** each agent receives only its owner's `public` + `match_only` preferences, the ask, and the room/item details. `never` preferences are excluded at the code level.
- **Rounds:** Orchestrator opens with the topics to resolve (budget, move-in date, schedule, guests, cleanliness, dealbreakers). Agents exchange messages for **max 4 rounds**. Orchestrator can end early.
- **Message format (each agent turn):**
  ```json
  {
    "message": "natural-language message to the other agent",
    "disclosed": ["pref_id_1", "pref_id_2"],
    "positions": { "budget": "flexible up to target", "quiet_hours": "prefers after midnight" },
    "satisfied": false
  }
  ```
- **Final verdict (Orchestrator):**
  ```json
  {
    "compatible": true,
    "score": 0.82,
    "fits": ["Budgets overlap ($1,250–$1,350)", "Both move in Sept 1"],
    "disagreements": ["A is a night owl, B wants quiet after 11"],
    "compromise": "Quiet hours after midnight on weeknights; headphones after 11",
    "summary_for_humans": "Strong fit. One thing to talk about: weeknight noise."
  }
  ```
- Only the verdict (`fits`, `disagreements`, `compromise`, `summary_for_humans`) is shown to the humans. Raw transcript is visible only in the "behind the scenes" demo view and in each user's own "what my agent shared" log (their side only).

### 6.4 One-sided evaluation
- Ember reads seeded Group/Marketplace posts within reach, scores fit against the user's preferences, and Spark drafts a reply the user can send.

### 6.5 Connection judgment
- Input: both users' `public` profile info + interests they've opted to share for connection, the negotiation verdict.
- Wonder returns:
  ```json
  {
    "suggest": true,
    "confidence": 0.78,
    "reason": "Both new to SF this fall, both run on weekend mornings",
    "activity": "Weekend morning run",
    "circle_id": "circle_new_in_sf_runs"
  }
  ```
- Threshold: only show if `suggest && confidence >= 0.7` and both opted in. Most matches should return `suggest: false` — demonstrate this with at least one non-suggested match in the shortlist.

---

## 7. Prompts (starting drafts)

### 7.1 Video/frame intake (Ember)
```
You are analyzing frames from a short phone video of a room or a storage area.
Return ONLY JSON, no prose, matching this schema:
{
  "room": { "furnished": bool, "approx_size": "small|medium|large", "natural_light": "low|medium|high",
            "desk_space": bool, "closet": bool, "notes": [string] } | null,
  "items": [ { "name": string, "brand_guess": string|null, "condition": "new|good|fair|worn",
               "flaws": [string], "suggested_price_usd": number, "frame_index": number } ]
}
Rules: list each distinct physical item once (dedupe across frames). Do not invent items you cannot see.
If the user narrated, prefer their stated facts. Prices are for a used-item sale between students nearby.
```

### 7.2 Ask → preferences (Spark)
```
You are the user's personal Muse helping them create an ask on Facebook Mutuals.
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
If key info is missing, include a "follow_up_question" string field instead of guessing.
```

### 7.3 Negotiating agent (Spark) — one instance per side
```
You are {owner_name}'s Muse, negotiating with another person's Muse about: {ask_summary}.
You represent {owner_name}'s interests honestly. You may ONLY use the facts below.
Never claim something not listed. Never reveal preferences beyond what is needed to check compatibility.
Never agree to a final commitment — you are pre-negotiating so the humans can decide.

Owner facts (public): {public_prefs}
Owner facts (match_only, use to check compatibility, do not quote verbatim if not needed): {match_only_prefs}
Context: {room_details_or_items}

Topics to resolve: {topics}
Conversation so far: {transcript}

Return ONLY JSON:
{ "message": string, "disclosed": [pref_id], "positions": {topic: string}, "satisfied": bool }
Be concise and friendly. Look for compromises on non-dealbreakers. Flag dealbreakers clearly.
```

### 7.4 Orchestrator / referee (Wonder)
```
You are the referee for a pre-negotiation between two people's Muses on Facebook Mutuals.
Given both agents' latest positions and the transcript, decide whether to continue (max {max_rounds} rounds)
or conclude. When concluding, return ONLY JSON:
{ "compatible": bool, "score": 0-1, "fits": [string], "disagreements": [string],
  "compromise": string|null, "summary_for_humans": string }
Be honest: if a dealbreaker conflicts, compatible = false. Write summaries a human can read in 5 seconds.
```

### 7.5 Connection judgment (Wonder)
```
Two people just matched on Facebook Mutuals for a practical reason: {ask_summary}.
Most exchanges should stay exchanges. Only suggest a further connection if there is real,
specific overlap that would make doing something together natural, not forced.
Inputs: Person A shared interests: {a_interests}. Person B shared interests: {b_interests}.
Match verdict: {verdict}. Open circles in reach: {circles}.
Return ONLY JSON:
{ "suggest": bool, "confidence": 0-1, "reason": string|null, "activity": string|null, "circle_id": string|null }
Suggest an activity (never "be friends"). Prefer an existing open circle when it fits.
```

### 7.6 Messenger opener (Spark)
```
Draft a short, natural first message from {sender} to {recipient} on Messenger about {ask_summary}.
Reference the match summary: {summary_for_humans}. Mention the one thing to talk about.
Sound like a college student, not a bot. 1–3 sentences. No emojis unless the sender uses them.
Return ONLY the message text.
```

### 7.7 One-sided post evaluation (Ember)
```
Evaluate whether this Facebook Group post is a fit for the user's ask.
User ask: {ask_summary}. User preferences (public + match_only): {prefs}.
Post: {post_text}
Return ONLY JSON: { "fit": bool, "score": 0-1, "reasons": [string], "concerns": [string] }
```

---

## 8. Data Model

```ts
type Reach = "school" | "network" | "nearby" | "anyone";
type Visibility = "public" | "match_only" | "never";

interface User {
  id: string;
  name: string;
  avatarUrl: string;
  school?: string;          // e.g. "Stanford"
  schoolVerified: boolean;
  city: string;
  groups: string[];         // group ids
  friends: string[];        // user ids
  museEnabled: boolean;     // the toggle
  defaultReach: Reach;
  connectionSuggestionsOptIn: boolean;
  interests: { value: string; shareForConnection: boolean }[];
  bio?: string;
}

interface Preference {
  id: string;
  topic: string;
  value: string;
  importance: "dealbreaker" | "high" | "medium" | "low";
  visibility: Visibility;
  source: "stated" | "inferred";
  confirmed: boolean;        // inferred prefs must be confirmed before sharing
}

interface Ask {
  id: string;
  userId: string;
  type: "roommate" | "sublet" | "item" | "skill_swap" | "plus_one" | "ride" | "other";
  summary: string;
  reach: Reach;
  preferences: Preference[];
  roomDetails?: RoomDetails;
  items?: Item[];
  createdAt: string;
}

interface RoomDetails {
  furnished: boolean; approxSize: string; naturalLight: string;
  deskSpace: boolean; closet: boolean; notes: string[];
}

interface Item {
  id: string; name: string; brandGuess?: string; condition: string;
  flaws: string[]; suggestedPriceUsd: number; imageDataUrl?: string;
}

interface Negotiation {
  id: string;
  askAId: string; askBId: string;
  rounds: { speaker: "A" | "B" | "orchestrator"; message: string; disclosed: string[]; positions: Record<string,string> }[];
  verdict?: Verdict;
  status: "running" | "done";
}

interface Verdict {
  compatible: boolean; score: number; fits: string[]; disagreements: string[];
  compromise: string | null; summaryForHumans: string;
}

interface Match {
  id: string; userId: string; candidateId: string; askId: string;
  mode: "agent_to_agent" | "one_sided";
  verdict: Verdict;
  trustSignals: string[];   // "Verified Stanford", "Both in Stanford Housing '27", "2 mutual friends"
  connection?: ConnectionSuggestion | null;
}

interface ConnectionSuggestion {
  suggest: boolean; confidence: number; reason: string | null;
  activity: string | null; circleId: string | null;
}

interface Circle {
  id: string; name: string; description: string; city: string;
  memberIds: string[]; open: boolean; lastActiveAt: string;
}

interface GroupPost { id: string; groupId: string; authorId: string; text: string; createdAt: string; }

interface AgentLogEntry {
  id: string; userId: string; negotiationId: string; message: string;
  disclosed: string[]; at: string;
}

interface DigestCard { id: string; userId: string; type: string; title: string; body: string; relatedUserIds: string[]; }
```

---

## 9. Seed Data Plan

Seed data carries the demo. Make it realistic, specific, and full of real tensions.

### Personas (~15 total; 2 are "live demo" personas)
- **Demo user A — "Alex"** (us; persona we control live): Stanford, moving to SF in Sept for a job. Night owl. Real budget max $1,350 (`match_only`), posted budget $1,200. Runs weekend mornings. Has a partner who visits some weekends (`match_only`). Doesn't want to share health info (`never`).
- **Demo user B — "Priya"** (teammate plays her on a second laptop/phone): Stanford, also moving to SF in Sept. Wants quiet after 11 on weeknights (conflict with Alex). Budget $1,250–$1,400 (overlap with Alex is ~$100). Runs weekends. Muse enabled. Connection suggestions on.
- **Candidate C — "Jordan":** compatible on budget but a **dealbreaker** conflict (has a dog, Alex is allergic). Shows that the system says no.
- **Candidate D — "Sam":** good roommate fit but **no connection suggestion** (shows most exchanges stay exchanges).
- **Candidate E (no Muse):** only appears via a human Group post → one-sided mode drafts a reply.
- **~10 background personas** for the digest and circles: someone who teaches guitar and needs resume help, two people going to a beabadoobee show, five people who list vintage clothes nearby, someone driving to SFO Friday, a CS 161 study partner.

### Groups
- "Stanford Housing '27", "Stanford Free & For Sale", "SF New Grads 2026", "Bay Area Runners".
- 10–20 realistic human posts across them (some ISO posts, roommate posts, item posts).

### Circles
- "New in SF — Weekend Runs" (4 members), "Vintage Swap — Mission" (3 members), "CS 161 Study Group".

Store as JSON in `/seed/*.json` and load into SQLite on boot (or use JSON directly for speed).

---

## 10. Tech Stack & Repo Structure

### Stack
- **Frontend + backend:** Next.js (App Router) + TypeScript + Tailwind. Facebook-like styling (blue `#1877F2`, light gray backgrounds, cards).
- **Streaming:** Server-Sent Events for the live negotiation view.
- **Storage:** SQLite via `better-sqlite3` or plain JSON files (whatever's fastest).
- **Validation:** zod for every model output.
- **Video:** browser MediaRecorder / file upload; frame sampling via ffmpeg (`fluent-ffmpeg`) or client-side canvas.
- **Deploy (optional):** Vercel, or run locally for the demo. Mobile view must look good (two phones on stage).

### Repo layout
```
mutuals/
├── README.md                  # pitch, screenshots, how to run, architecture diagram
├── docs/
│   └── PRD.md                 # this file
├── .env.example
├── seed/
│   ├── users.json
│   ├── groups.json
│   ├── posts.json
│   ├── circles.json
│   └── asks.json
├── src/
│   ├── app/
│   │   ├── page.tsx                   # Facebook-style home with Mutuals entry
│   │   ├── mutuals/
│   │   │   ├── settings/page.tsx      # toggle + reach
│   │   │   ├── ask/new/page.tsx       # chat + video upload
│   │   │   ├── ask/[id]/page.tsx      # shortlist / match cards
│   │   │   ├── negotiation/[id]/page.tsx  # live "behind the scenes"
│   │   │   ├── log/page.tsx           # what my agent shared
│   │   │   ├── digest/page.tsx
│   │   │   └── circles/[id]/page.tsx
│   │   ├── messenger/[threadId]/page.tsx
│   │   └── api/
│   │       ├── intake/route.ts        # video/frames → room + items
│   │       ├── asks/route.ts          # create ask from chat
│   │       ├── match/route.ts         # run matching for an ask
│   │       ├── negotiate/route.ts     # SSE stream of a negotiation
│   │       ├── connection/route.ts
│   │       ├── digest/route.ts
│   │       └── messenger/route.ts     # opener draft
│   ├── lib/
│   │   ├── muse.ts                    # API client, model routing, caching, mock mode
│   │   ├── prompts.ts                 # all prompts from section 7
│   │   ├── schemas.ts                 # zod schemas
│   │   ├── reach.ts                   # candidate selection by reach
│   │   ├── privacy.ts                 # strips `never` prefs before agent context
│   │   ├── negotiation.ts             # orchestrator loop
│   │   ├── frames.ts                  # video → frames
│   │   └── db.ts
│   └── components/
│       ├── FbShell.tsx                # top bar, left nav, Facebook look
│       ├── ReachSelector.tsx
│       ├── VideoCapture.tsx
│       ├── MatchCard.tsx
│       ├── NegotiationStream.tsx
│       ├── AgentLog.tsx
│       ├── ConnectionCard.tsx
│       ├── CircleInvite.tsx
│       ├── DigestCard.tsx
│       └── PersonaSwitcher.tsx        # demo-only: switch logged-in persona
└── scripts/
    ├── seed.ts
    └── warm-cache.ts                  # pre-run key model calls before the demo
```

---

## 11. Screens (MVP)

1. **Facebook shell.** Home's first screen is the Mutuals card with the roommate example (headline, subhead, a tiny
   chat in Muse's voice, CTA into Stanford Housing '27). Muse lives inside Groups ("Ask Muse").
2. ~~Settings~~ (removed: the opt-in is a chat question per Group).
3. **New Ask:** chat with Muse + "Show me" video capture. Preferences appear as chips with visibility badges (Public / Kept private / Never shared), editable.
4. **Intake result:** room details + item catalog extracted from the video.
5. **Shortlist:** 2–3 match cards with fits, disagreements, compromise, trust signals, mode badge (agent-to-agent / from a Group post).
6. **Behind the scenes:** live streamed negotiation between two agents with the referee.
7. **What my agent shared:** log of outgoing messages and disclosed prefs.
8. **Messenger:** thread with drafted opener.
9. **Connection card + circle invite.**
10. **Digest:** cards for other entry points.

---

## 12. Demo Plan

### Live presentation (5 min)
| Time | Beat | What's on screen |
|---|---|---|
| 0:00–0:45 | **Problem.** Before/after roommate story. "Our generation barely has a Facebook network. Public posts make you overshare or hide what matters. And every connection ends at the exchange." | Title slide → a real-looking cluttered Group feed |
| 0:45–1:15 | **The idea.** "Skip the fifty awkward messages. Your Muse checks with other people's Muses to find who actually fits, so you only talk to the right people." | Home: the Mutuals card with the roommate example |
| 1:15–2:00 | **Ask + video.** Alex asks for a roommate, Muse asks follow-ups, preferences get visibility badges. Film/upload the hotel room video live → room details + leftover items appear. | New Ask → intake result |
| 2:00–3:00 | **Behind the scenes.** Agents negotiate with real conflicts (night owl vs quiet after 11, $100 budget overlap) → compromise. Show Jordan rejected for a dealbreaker. Show one match from a human Group post (one-sided mode). | Negotiation stream → shortlist |
| 3:00–3:30 | **Handoff.** Match card lands on both phones. "What my agent shared" log. Alex sends the drafted opener; Priya (teammate, live) replies. | Two phones / two windows |
| 3:30–4:20 | **The payoff.** Connection card: "You're both new to SF and both run weekend mornings" → invite to "New in SF — Weekend Runs." Note Sam got no suggestion: most exchanges stay exchanges. | Connection card → circle |
| 4:20–5:00 | **Breadth + vision.** Flash digest (skill swap, plus-one, taste circle). "You might have zero mutuals on Facebook today. Mutuals builds them for you." | Digest → closing slide |

### Demo video (2–3 min, for Devpost)
Same arc, compressed: problem (20s) → ask + video (30s) → negotiation (40s) → handoff (20s) → connection + circle (30s) → digest + tagline (20s). Record Thursday night as a backup, re-record Friday morning if the build improved.

### Demo safety
- Pre-run the hero negotiation and cache it (`scripts/warm-cache.ts`). Run live, but have `MOCK_MUSE=true` as an instant fallback if the network or API flakes.
- Cap negotiation rounds at 4; seed personas so it converges.
- Test video intake on the actual hotel room the night before.
- Have two devices logged into different personas, plus a persona switcher as backup.

---

## 13. Team Split (4 people)

| Person | Owns | Key deliverables |
|---|---|---|
| **Person 1 — Agent engine** | `lib/muse.ts`, `negotiation.ts`, `privacy.ts`, prompts, SSE stream | Negotiation converges with real conflicts; verdict JSON; connection judgment; caching + mock mode |
| **Person 2 — Intake + matching** | video → frames → Ember, ask parsing, reach filtering, one-sided Group post evaluation, digest | Hotel room video reliably → room details + items; shortlist generation |
| **Person 3 — Frontend** | Facebook shell, all screens, mobile layout, Messenger view, negotiation visualization | Polished, Facebook-looking UI on two phones |
| **Person 4 — Seed data, pitch, video** | personas, Groups, posts, circles; slides; demo script; Devpost page; README; demo video | Seed data with real tensions; rehearsed 5-min pitch; Q&A prep; submitted Devpost |

Assign names once roles are agreed (Akhil / Kyle / Luke / Eddy). Person 4 should also be the integration tester who runs the full demo path every couple of hours.

---

## 14. Build Timeline

### Thursday Nov 12
| Time | Milestone |
|---|---|
| 8:30–10:00 | Repo scaffolded, env + Muse client working (first successful call to each model), seed data v1, UI shell |
| 10:00–13:00 | Intake (video → JSON) working end to end; ask parsing; negotiation loop running in terminal |
| 13:00–15:00 | Shortlist + match cards wired to real results; SSE negotiation view |
| 15:00–17:00 | Meta demos — **ask a mentor:** does Muse already have consumer agent-to-agent? Any judging tips? Any SAM / Muse Image availability on our credits? |
| 17:00–20:00 | Connection judgment + circle invite; Messenger handoff; agent log |
| 20:00–23:00 | **Full demo path works end to end.** Digest. Polish. |
| 23:00–late | Record backup demo video; write README; stretch goals only if core is solid |

### Friday Nov 13
| Time | Milestone |
|---|---|
| 8:00–9:30 | Final polish, bug fixes, rehearse pitch 3+ times with timer |
| 9:30–10:00 | Final demo video, push repo, verify it's public |
| **By 10:15** | **Devpost submitted** (deadline 10:30 PST) |
| 10:45 | Present |

### Stretch goals (only after the full path works)
- SAM crop-outs for item images
- Muse Image cleanup of item photos
- Native video input to Ember instead of frames
- Skill swap or plus-one as a second fully live flow

---

## 15. Budget & Cost Guardrails
- ~$400 total credits. Rough pricing (per million tokens, input/output): Wonder $4/$20, Spark 1.3 $1.25/$4.25, Ember $0.10/$0.50.
- Use **Ember** for anything high-volume (frames, post scanning, digest).
- Use **Wonder** only for the orchestrator verdict and connection judgment (few calls per demo).
- **Cache every response** by input hash during development.
- Send sampled frames, not full video, during development.
- Check the Billing page on dev.meta.ai at lunch and dinner.

---

## 16. Q&A Prep

**"Isn't this just automating conversation?"**
No. It offloads the tedious parts — searching, screening, logistics — so the humans only have the conversations worth having. Agents never message the other human; they hand you a shortlist and a drafted opener you choose to send.

**"Why agents instead of better search?"**
Private preferences. Nobody posts "I'm messy and my real max is $1,350." Your agent can check that against someone else's agent and return "compatible" without either person exposing it.

**"What if nobody else has Muse on?"**
One-sided mode: your Muse reads existing Group and Marketplace posts and drafts replies. Multiplayer is the upgrade and the growth loop.

**"Isn't the connection part forced or creepy?"**
It's selective (most exchanges stay exchanges — we showed one with no suggestion), double opt-in, activity-based, and defaults to open groups rather than 1:1.

**"Privacy?"**
Per-topic visibility. `Never` items are excluded from the agent's context at the code level, not just by prompt. Full log of what your agent shared.

**"Why Facebook and not Instagram or a standalone app?"**
Real identity, verified schools, mutual friends, Groups, Marketplace, Events, Messenger — all needed, all only on Facebook. Works with zero Facebook friends.

**"How is this different from Klick?"**
Klick decides whether two people should meet based on personality at a live event. We start from a real need, match on private preferences, run persistently inside Facebook, and focus on what happens after.

**"Retention?"**
Big asks bring people in; frequent small asks (rides, study partners, running buddies) and the digest bring them back; circles create recurring contact.

**"What if the agent misrepresents me?"**
Agents only state facts you gave or confirmed. Inferred facts are flagged and need your confirmation before they're shared.

**"Safety?"**
Verified school, real identity, mutuals and shared Groups on every card, public first meetups suggested. Safer than today's Craigslist-style posts.

---

## 17. Risks & Fallbacks
| Risk | Fallback |
|---|---|
| Negotiation loops or is boring | Seed real conflicts; cap at 4 rounds; referee can conclude early; cached run |
| Video intake misses or duplicates items | Film a simple, well-lit area; dedupe prompt; allow manual edit; pre-tested hotel room video |
| API latency on stage | Warm cache; stream partial output; `MOCK_MUSE` fallback |
| Running out of credits | Ember for volume; cache; monitor billing |
| Scope creep | One hero flow fully live; others only as digest cards |
| Muse already has consumer agent-to-agent | Ask mentor Thursday; if yes, emphasize Facebook-native reach, private-preference matching, and the connection layer |

---

## 18. Open Questions
- Final name: "Mutuals" (current favorite).
- Exact `MUSE_BASE_URL` and whether SAM / Muse Image are on our credits (check dev.meta.ai docs Thursday morning).
- Who plays which persona live.
- Whether to deploy (Vercel) or run locally for the demo.

---

## 19. Instructions for the Coding Agent (Claude Code)

1. **Read this whole file first.** The hero flow (section 5.1) and demo plan (section 12) define what must work.
2. **Build in this order:** Muse client + mock mode → seed data loader → intake API → ask parsing → negotiation loop (terminal first, then SSE) → shortlist UI → Messenger handoff → connection card + circle → agent log → digest → polish.
3. **Core flows must call Muse for real.** No hardcoded AI output in the main path. Mock mode exists only as a fallback and for offline dev.
4. **Privacy is structural:** `privacy.ts` must strip `never` preferences before any agent prompt is built. Write a quick test for this.
5. **Validate every model response with zod**; on failure, retry once with the validation error appended, then fall back to cache.
6. **Make the AI reasoning visible:** match reasons, disagreements, compromise, and the live negotiation stream are product features, not debug output.
7. **Mobile first:** the demo runs on two phones. Every screen must look good at ~390px wide.
8. **Facebook look:** blue `#1877F2`, rounded cards, top bar, left nav on desktop. It should feel like a real Facebook feature.
9. **Keep it shippable at every step:** the full demo path should run end to end as early as possible, then improve.
10. **README:** pitch, one-liner, architecture diagram, model mapping table, how to run, screenshots/GIF, team.
