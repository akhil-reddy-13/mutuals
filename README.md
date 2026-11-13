# Mutuals

### Skip the fifty awkward messages.

Your Muse checks with other people's Muses to find who actually fits what you need, so you only talk to the right people.

> A marketplace finds you stuff. Your Muse finds you people, and the stuff is just the reason to meet.

Built at the Facebook Closer Together AI Hackathon 2026 (Meta HQ) by Akhil, Kyle, Luke and Eddy.

Instagram is for people you already know. Facebook is for people you need to meet. Young adults already end up in Facebook Groups and Marketplace for a roommate, a sublet, a ride, a buyer for the desk, a study partner, someone to go to a show with, and it's miserable. Mutuals turns that into one ask. Inside a Group you tap **Ask Muse privately** and say what you need, including what you'd never post (your real budget, your habits, your dealbreakers). Muse, the friend who knows everyone, quietly checks with other people's Muses and comes back with **people**, not listings: who fits, why, and the one thing you two should talk about. You decide who to message, and you send it. Muse never talks to anyone for you.

No posting required. No Facebook friends required: your school or city is enough.

**In one line:** your Muse talks to other people's Muses (real agent-to-agent conversations, each Muse knowing only
its own person) so the screening and logistics happen before any human says hello.

## Why this, why now

Meta has described a Muse network where your Muse works with your friends' and family's Muses. Young adults have few Facebook friends. We built the part for people you have not met yet, matched on the preferences people keep private, living in the Groups they already use.

- **Public posts force a bad tradeoff.** You either overshare or leave out exactly what matters. Here, private numbers are compared, never shown.
- **The process is exhausting.** Scroll 200 posts, message 15 strangers, repeat the same screening questions. Here, the screening happens between Muses in seconds.
- **It works from day one.** If the other person has no Muse, yours reads their Group post, judges the fit, and drafts a reply you can send.
- **Every output is a Facebook object.** A Messenger thread. A Marketplace listing for the leftover desk. A Facebook Event when two people have more in common than a lease.

## Three flows, one idea: results are people

| You say | Muse comes back with |
|---|---|
| "Need a roommate for my Mission 2BR from Sept" (+ a room video) | "I found two people who fit. Priya's the better one, but you two should talk about weeknight noise." Fits, disagreements, a compromise, then Messenger. |
| "Selling some stuff before I move out" (+ a video where you talk over your stuff) | Ember hears what you're selling, Spark names each exact model ("this Canon camera" → Canon PowerShot G7 X Mark II). Then "2 of these already have a home": the G7 X → June (Japan trip in December), the Poly earbuds → Theo (BART commute), and your Muse and theirs work out price and pickup ("Meet on campus, $425"). The rest is offered to everyone nearby. |
| "Need a tent for a camping trip" | One friend-like question ("Is this for a trip? Want people to go with too?"), then Marcus (has a tent, driving to Yosemite Dec 6) and a carpool to join. |

## The hero flow (what the demo shows)

1. **Group page.** Stanford Housing '27. Casey's ISO post, Jordan's dog post, the usual.
2. **Ask Muse privately.** Three lines of chat. Every preference comes back tagged **Public**, **Kept private** or **Never shared**. Tap a badge to change it.
3. **Film the room.** Ten seconds. Muse Ember returns room facts and the leftover items the next person might want.
4. **"Who can my Muse talk to?"** The opt-in is an explicit choice, with a live count for each option: **People I'm connected with** (friends and friends of friends, most private), **People in my Groups** (recommended), **Everyone nearby** (your school or city). Private preferences stay private in every option; this only decides who Muse checks with.
5. **Watch the negotiation.** Every candidate runs in parallel. Alex's Muse and Priya's Muse settle rent, dates, furniture and quiet hours in two rounds. A referee call writes the verdict. Jordan's Muse brings a dog; Alex's Muse stops early. Casey has no Muse; Ember reads her post and drafts a reply.
6. **Shortlist.** Why it fits, where you'd disagree, the proposed compromise, trust signals (verified school, shared Groups, mutual friends), and **What my Muse shared**.
7. **Message Priya.** The opener is drafted. Alex edits and sends. Priya replies from her own phone.
8. **More than a lease.** Both new to SF, both run weekend mornings. Muse suggests an existing Event: New in SF: Weekend Runs. Sam, who also fit, gets no suggestion. Most exchanges stay exchanges.
9. **Proof the Muses really talked.** Switch to Priya (avatar menu). Her Home's first card: **"Alex's Muse talked with yours in Stanford Housing '27."** It opens the whole Muse-to-Muse conversation from her side: both Muses side by side, every message, Alex's private budget shown as "a private number", what they concluded, and which of *her* preferences her Muse used. Nobody messaged Priya. Then she taps **Message Alex**.

## Proof it's really agent-to-agent

Each conversation is stored once and rendered from whichever side opens it (`/muse/talk/[negotiationId]`). Your
Muse's messages appear in full; the other Muse's appear with **their** private values redacted. Only the two
people in the conversation can open it (anyone else gets a 404). The other person learns about it through their
Home feed and Notifications, never through a message from you. The same page exists for selling: switch to June
and watch her Muse and Alex's haggle the camera from $450 to $425.

## Screenshots

| Group feed | Tagged preferences | Live negotiation |
|---|---|---|
| ![Group feed](docs/screenshots/group-feed-phone.jpg) | ![Preferences](docs/screenshots/muse-prefs-phone.jpg) | ![Negotiation](docs/screenshots/live-negotiation-phone.jpg) |

| Shortlist | More than a lease | Messenger handoff |
|---|---|---|
| ![Shortlist](docs/screenshots/shortlist-phone.jpg) | ![Connection](docs/screenshots/connection-card-phone.jpg) | ![Messenger](docs/screenshots/messenger-draft-phone.jpg) |

![Desktop](docs/screenshots/group-desktop-sheet.jpg)

## Privacy, enforced in code

| Level | Meaning | Where it is enforced |
|---|---|---|
| **Public** | Can appear on your match card | |
| **Kept private** | Your Muse uses it to check fit. Never shown to the other person. | Prompts are built only from `privacy.agentContext()`. Money is compared in code (`budgetsOverlap`) and every string a human sees goes through `redactPrivateValues()`, so no private number or time can be printed. The live view shows disclosed facts as locked chips. |
| **Never shared** | Never enters any Muse's context | `agentContext()` drops it before the prompt exists. The model cannot leak what it was never given. |

Two more guards on everything a human sees:
- **Private phrases, not just numbers** (`leakedPrivateFacts`): if a model echoes the words of a kept-private fact ("night owl", "partner stays over") into a match card or an opener, it's swapped for a topic-level line.
- **Ask titles** (`publicSummary`): the one-line summary Muse writes for your ask can't show your private numbers to anyone else (home cards, the other side's shortlist, the digest).

Every outgoing message your Muse sends is logged and visible to you under **What my Muse shared**. `src/lib/privacy.test.ts` covers all of this and must stay green.

## How the AI works

| Step | Model | What it does |
|---|---|---|
| Ask parsing | **Muse Ember** | Chat turns → structured, visibility-tagged preferences; asks one follow-up at a time |
| Video intake | **Muse Ember** | ~10 frames + your narration (server-side ffmpeg reads any phone video, incl. iPhone .MOV) → transcript, room details, the items you said you're selling |
| Item identification | **Muse Spark** | Per item, in parallel: clearest frame + neighbors + your words → exact model ("this Canon camera" → Canon PowerShot G7 X Mark II), confidence, used price range |
| Finding homes | **Muse Ember** | Routes each item to a person in the Group whose Muse says they need it, with a one-line human reason. Budgets compared in code. |
| Negotiation | **Muse Ember** × 2 | One Muse per person, each seeing only what its owner allows. Two rounds, candidates in parallel. |
| Referee | **Muse Ember** | One call per candidate at the end: fits, disagreements, compromise, a 5-second summary |
| One-sided mode | **Muse Ember** | Scores a human Group post against your ask, then drafts the reply |
| Connection judgment | **Muse Ember** | One call per compatible match, only if both opted in. Usually says no. |
| Openers, listings, digest | **Muse Ember** | Messenger opener (always names the item/room and their reason), Marketplace copy, the daily digest |
| Demo photos | **Muse Image** | Every photo in the seeded feed and Marketplace (`scripts/gen-images.ts`), stored locally |

Code does only two things the model does not: sealed comparisons of private numbers, and leak checks on every string shown to a human.

**Why mostly Ember.** One role map in `src/lib/muse.ts` (`modelFor`) decides which model does each job. Measured on Nov 12 with the same inputs side by side, Ember matched Spark and Wonder on verdicts, connection picks and item routing at about 1 s per call, against 10 to 14 s for Spark and about 30 s for Wonder. Checking one candidate is six calls in sequence, so per-call latency decides whether the live view is watchable. Spark keeps the one job where it was clearly better, reading an exact make and model off a photo. Any role moves with `MUSE_ROLE_<ROLE>=spark|wonder`, and Wonder calls are time-boxed at 20 s with a fallback, so the heavier models are a setting, not a rewrite.

```
Group composer ─► Muse sheet ─► POST /api/asks (Ember)  ─► POST /api/intake (Ember) ─► /api/identify (Spark, per item)
                                       │
                                       ▼  "Who can my Muse talk to?"  (connected · my Groups · everyone nearby)
                              GET /api/match?askId&reach  (SSE)
                 ┌─────────────────────┼─────────────────────┐
         agent-to-agent         agent-to-agent          one-sided
   Ember A ⇄ Ember B ×2    Ember A ⇄ Ember B ×2     Ember reads post
         Ember referee           Ember referee       Ember drafts reply
                 └─────────────────────┼─────────────────────┘
                           Ember connection judgment (compatible + both opted in)
                                       ▼
          Notification ─► Match cards ─► POST /api/messenger (Ember opener) ─► Messenger thread
                                                 └─► Facebook Event  ·  Marketplace listing
```

## Run it

```bash
npm install
cp .env.example .env.local      # add your MUSE_API_KEY (base URL: https://api.meta.ai/v1)
npm run smoke                   # one tiny call per model: confirms key, base URL, model ids
npm run dev                     # http://localhost:3000  (npm run dev:lan to open from phones)
```

No key yet? Everything runs offline:

```bash
echo "MOCK_MUSE=true" > .env.local
npm run dev
```

Other commands:

```bash
npm run demo        # hero matching from the terminal, with a leak check on every string shown to a human
npm run demo -- need        # "I need a tent": friend-like question, people + a plan (also: plus_one, ride)
npm run demo:build && npm run demo:start   # production build for the demo Mac (~100x faster pages)
npm run warm        # pre-run every hero call so the response cache is hot before going on stage
npm run warm -- --video <file>             # also pre-run the exact video you'll upload on stage
npm run snapshot -- save|restore|list <name>  # save a run you like and bring it back word for word
npm test            # privacy tests
npm run typecheck
```

| Doc | What's in it |
|---|---|
| `docs/DEMO.md` | Timed live-demo script and the exact lines to type |
| `docs/SAVED_RUN.md` | The saved "June room → run together" run: inputs, results, connection card, Muse transcript, how to restore |
| `docs/QA.md` | Q&A decisions (does Muse keep searching? privacy, fake asks, models, speed), built vs. decided |
| `docs/VIDEO.md` | The demo video: screenplay, personas, how it's recorded |
| `docs/PITCH.md` | Talk track |
| `docs/PRD.md` | Full spec; §0.5 is the positioning and design rules |

## Honesty about what is live

Every core call goes through `src/lib/muse.ts` and hits the Meta Model API when a key is configured. Responses are cached by input hash, so a rehearsed negotiation replays instantly, and `MOCK_MUSE=true` serves scripted fallbacks with no network. The avatar menu shows which mode you are in. We do not claim a run was live when it was replayed.

## Repo layout

```
src/lib/        muse.ts (client, role map, cache, mock) · privacy.ts · negotiation.ts · match.ts · connection.ts
                reach.ts (who Muse may talk to) · homes.ts (items → people) · identify.ts · intake.ts · media.ts (ffmpeg)
                asks.ts · messenger.ts · listing.ts · digest.ts · sheetCopy.ts · db.ts · prompts.ts · schemas.ts · mocks.ts
src/app/        groups/[id] (the Group + Muse sheet) · groups/[id]/muse/[askId] (shortlist) · muse/talk/[id] (Muse ⇄ Muse) · notifications
                messenger/[threadId] · events/[id] · marketplace/[id] · digest · api/*
src/components/ FbShell, LeftSidebar, NavTabs (Facebook chrome) · muse/* (sheet, live matching, video capture)
                MatchCard, ConnectionCard, PostCard, ThreadView
seed/           users, groups, posts, events, asks (Alex, Priya, Jordan, Sam, Casey + background personas)
scripts/        muse-smoke.ts · run-demo.ts · warm-cache.ts · snapshot.mjs · gen-images.ts · video/ (demo video recorder)
snapshots/      saved runs (cached responses + demo state), e.g. june-room-weekend-runs
```

## Team

Akhil, Kyle, Luke, Eddy. Stanford.

---

*You might have zero mutuals on Facebook today. Mutuals builds them for you.*
