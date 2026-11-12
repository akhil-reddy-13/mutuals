# Mutuals

**Do things with people you can trust.**

Muse is single-player today. Mutuals makes it multiplayer. Your Muse talks to other people's Muses to handle the tedious parts of finding the right person: searching, screening, logistics. You only spend time on the conversations worth having.

Built at the Facebook Closer Together AI Hackathon 2026 (Meta HQ) by Akhil, Kyle, Luke, and Eddy.

---

## The problem

Young adults constantly need things from people nearby: a roommate, a sublet, a ride to SFO, a study partner, someone to go to a show with. Facebook has the right pieces for this (real identity, verified schools, Groups, Marketplace, Messenger), but it doesn't work well for us today:

- **Most of us barely have a Facebook network**, so the platform feels empty.
- **Public posts force a bad tradeoff.** You either overshare ("my real max is $1,350, my partner stays over most weekends") or leave out exactly what matters.
- **The process is exhausting.** You scroll 200 Group posts, message 15 strangers and repeat the same screening questions, mostly with people who turn out to be wrong.
- **Connections end with the exchange.** You find your sublet and never talk to that person again.

## What Mutuals does

> You film your room and tell your Muse what you actually want, including the stuff you'd never post. It quietly checks with other people's Muses. An hour later: *"2 people from Stanford fit. Here's why, and here's the one thing you'd need to talk about."* Then **you** message them.

1. **Ask.** Describe what you need in plain language, or show it in a 10–15 second video. Muse turns this into structured preferences. Each preference gets a visibility level, and you can edit it.
2. **Match.** Your Muse pre-negotiates with the Muses of candidates in your reach (your school, your network, nearby, or anyone). You get a shortlist that says why each person fits, where you'd disagree, and a proposed compromise.
3. **Handoff.** You pick one, and a Messenger thread opens with a drafted opener. **Agents never commit and never message the other human.** From here, the two of you talk.
4. **Follow-through.** Mutuals suggests doing something together only when there is real overlap and both people have opted in. The suggestion is a shared activity, usually a small open circle such as "New in SF: Weekend Runs." Most exchanges stay exchanges.

It also **works from day one**. If the other person doesn't have Muse turned on, your Muse reads their existing Group and Marketplace posts, judges the fit, and drafts a reply for you to send.

## Private preferences stay private

Every preference has a visibility level:

| Level | Meaning |
|---|---|
| `public` | Can appear on your match card |
| `match_only` | Your agent uses it to check compatibility, but it is never shown to the other person |
| `never` | Never enters any agent's context |

This is enforced in code, not by asking the model to behave. `src/lib/privacy.ts` removes `never` preferences, and inferred preferences you haven't confirmed, before any prompt is built. The test in `src/lib/privacy.test.ts` checks this. Every message your agent sends is logged on the **What my Muse shared** page.

## How the AI works

| Step | Model | What it does |
|---|---|---|
| Video intake | **Muse Ember** | Phone video frames → room details plus a catalog of leftover items (condition, flaws, price) |
| Ask parsing | **Muse Spark** | Conversation → structured preferences with visibility tags; asks follow-up questions if something is missing |
| Negotiation | **Muse Spark** × 2 | One agent per person, each seeing only what its owner allows; up to 4 rounds |
| Referee | **Muse Wonder** | Ends the negotiation; returns a verdict with fits, disagreements, a compromise and a 5-second summary |
| One-sided mode | **Muse Ember** | Scores human Group posts against your preferences |
| Connection judgment | **Muse Wonder** | Decides whether the overlap is real enough to suggest an activity (usually no) |
| Openers and digest | **Spark** / **Ember** | Drafts the first Messenger message; writes a daily digest of nearby asks |

```
 New Ask (chat + video) ──► /api/intake (Ember)  /api/asks (Spark)
                                         │
                                         ▼
                                    /api/match
                    ┌────────────────────┴────────────────────┐
           candidate has Muse                       candidate has no Muse
                    │                                         │
   /api/negotiate (SSE stream)                Group post evaluation (Ember)
   Spark A ⇄ Spark B, refereed by Wonder               + drafted reply
                    └────────────────────┬────────────────────┘
                                         ▼
          Shortlist ──► Messenger opener (Spark) ──► Connection check (Wonder)
```

All model calls go through `src/lib/muse.ts`, which uses the OpenAI-compatible Meta Model API. It caches responses, retries failed calls, checks outputs against zod schemas (and retries once if they fail), and has a mock mode (`MOCK_MUSE`) for working offline.

## Running locally

Requires Node 20+.

```bash
npm install
cp .env.example .env.local     # add MUSE_API_KEY and MUSE_BASE_URL from dev.meta.ai
npm run smoke                  # makes one call to Ember, Spark and Wonder to check your setup
npm run dev                    # http://localhost:3000
```

| Command | Purpose |
|---|---|
| `npm run dev:lan` | Serves on your local network so phones can open the app |
| `npm test` | Privacy tests |
| `npm run typecheck` | TypeScript check |
| `npm run warm` | Pre-runs the demo's model calls to fill the cache |
| `MOCK_MUSE=true npm run dev` | Replays cached responses without any network calls |
| `POST /api/reset` | Clears demo state (asks, matches, threads, agent log) |

Use the persona dropdown in the top bar to switch between demo users. For the live demo, each phone is signed in as a different persona.

## Demo personas

The seed data in `seed/` is set up so the matching has real tensions to resolve:

- **Alex:** moving to SF in September; a night owl. Posted budget $1,200, real max $1,350 (`match_only`). Partner visits some weekends. Health info is marked `never`.
- **Priya:** a strong match with two tensions. She needs quiet after 11pm on weeknights, and her budget overlaps Alex's by only about $100. You both run on weekend mornings, so a connection suggestion makes sense.
- **Jordan:** budget fits, but Jordan has a dog and Alex is allergic. The system says no.
- **Sam:** a good roommate fit who has opted out of connection suggestions, so the match stays a roommate match.
- **Casey:** doesn't use Muse and only appears through a Group post, which exercises one-sided mode.
- About ten background personas for the digest: a guitar-for-resume-help swap, people going to a beabadoobee show, a vintage-clothes circle, a ride to SFO, a CS 161 study group.

## Project layout

```
docs/PRD.md          Full product spec, architecture, prompts, demo plan
CLAUDE.md            Conventions for contributors and coding agents
seed/                Personas, Groups, posts, circles, asks
src/lib/             muse.ts · schemas.ts · prompts.ts · privacy.ts · reach.ts · negotiation.ts · db.ts
src/app/api/         intake · asks · match · negotiate (SSE) · connection · messenger · digest
src/app/mutuals/     settings · ask/new · ask/[id] · negotiation/[id] · log · digest · circles/[id]
src/app/messenger/   Messenger handoff
scripts/             smoke test, cache warmer
```

## Status

Work in progress during the hackathon. The foundation is in place: the Muse client, privacy enforcement, prompts, seed data and the Facebook-style app shell. The negotiation engine, API routes and screens are being built now. See the "Status / handoff" section of `CLAUDE.md` for current progress.
