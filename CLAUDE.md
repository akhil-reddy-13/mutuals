# Mutuals: agent instructions

Facebook Closer Together AI Hackathon 2026. **Devpost deadline Fri Nov 13, 10:30 AM PST.**
Positioning and design rules: `docs/PRD.md` §0.5 (read first). The talk: `docs/PRESENTATION.md`. Q&A: `docs/QA.md`.

## Run
```
npm install
npm run smoke          # 1 call per model; confirms key/base URL (https://api.meta.ai/v1)
npm run dev            # http://localhost:3000   (dev:lan to open from phones)
npm test               # privacy tests (must always pass)
npm run typecheck && npm run lint
```
Key: `MUSE_API_KEY` in `.env.local` (see `.env.example`). `MOCK_MUSE=true` runs everything offline.

## Hard rules
1. **All model calls go through `src/lib/muse.ts`** (`museJSON` / `museText`). Never `new OpenAI()` elsewhere. It
   handles routing, caching (`.cache/muse/`, keyed by model + messages), retry, zod validation and `MOCK_MUSE`.
2. **Every model output is validated** with a schema from `src/lib/schemas.ts`. Add the schema before the call.
3. **Privacy is structural.** Any prompt with a user's preferences is built from `privacy.agentContext(prefs)`; never
   pass raw `ask.preferences`. `never` prefs must be impossible to leak. Strings a human sees go through
   `redactPrivateValues` (numbers/times), `leakedPrivateFacts` (private wording) and `publicSummary` (ask titles
   shown to others). Keep `src/lib/privacy.test.ts` green.
4. **Core flows call Muse for real.** `mock` values are only the offline fallback.
5. **Models:** one role map, `modelFor(role)` in `muse.ts`. Ember for every role except item identification
   (Spark). Override per role with `MUSE_ROLE_<ROLE>`. Keep docs and on-screen copy consistent with the map.
6. **Copy:** results are people, not listings; Muse speaks first person; no jargon in the UI (agents, negotiation,
   multiplayer, platform). No em dashes. **Mobile first (~390px)**, Facebook look via the `fb-*` tokens.
7. Types in `src/lib/types.ts`, prompts in `src/lib/prompts.ts`. Everyone imports them; change deliberately.

## Layout
- `src/lib/`: `muse.ts` · `privacy.ts` · `negotiation.ts` (2 rounds Muse ⇄ Muse + one referee; money and move-in
  dates compared in code) · `match.ts` (all candidates in parallel, SSE events, `sortMatches`) · `connection.ts` ·
  `reach.ts` (who a Muse may talk to: `network | groups | everyone`, per-Group switches) · `homes.ts` (selling: route
  items to buyers, then a short per-buyer negotiation) · `intake.ts` / `media.ts` / `identify.ts` (video → frames +
  audio → items → exact model) · `messenger.ts` · `asks.ts` · `db.ts` (seed JSON + runtime store) · `sheetCopy.ts`.
- `src/app/`: `groups/[id]` (Group + Muse chat) · `groups/[id]/muse/[askId]` (shortlist) · `muse/talk/[id]` (one
  Muse conversation from either side; 404 for anyone else) · `muse/settings` · `digest` (full-page Muse chat) ·
  `conversations` (demo-only wall of Muse conversations) · `messenger`, `events`, `marketplace`, `notifications`, `api/*`.
- `seed/*.json`: people, Groups, posts, events, asks. Hero: Alex (owns the Mission 2BR) vs Priya (best fit,
  quiet-hours + budget tension, weekend runs), Sam (fits, connection suggestions off), Jordan (dog dealbreaker),
  Casey (no Muse: one-sided via her post), June/Kai/Rosa (could work / long shot). Selling buyers in Stanford
  Free & For Sale: Maya, Dev, June (camera), Theo (earbuds). Tent: Marcus + Yosemite carpool.
- `scripts/`: `muse-smoke.ts`, `run-demo.ts` (`npm run demo [-- need|plus_one|ride]`), `warm-cache.ts` (mirrors the
  chat byte for byte), `snapshot.mjs` (`npm run snapshot -- save|restore|list`), `gen-images.ts`, `video/clips.mjs`
  (`npm run clips`, records the demo clips from the real app; `--dry` only fills the cache).

## Things that bite
- The runtime store is a JSON file (`.cache/runtime.json`), re-read on mtime change so scripts and the server share
  state. Local only (no Vercel). `npm run warm`, `npm run clips` and **Reset demo** reset it: don't run them while
  someone else is clicking through the same server.
- Cached runs replay only for identical inputs. The chat's fixed lines live in `lib/sheetCopy.ts`; a prompt change
  makes live re-runs differ, but `npm run snapshot -- restore june-room-weekend-runs` reproduces the saved run.
- Present from the production build: `npm run demo:build`, stop the dev server, `npm run demo:start` (or
  `demo:start:stage`, which paces cached replies like live ones).
- Git remote is SSH (`git@github.com:akhil-reddy-13/mutuals.git`); HTTPS pushes hang when the keychain is locked.

## Working as a team
Several people (and their agents) work here at once. **Pull before you start**, work on a branch, commit small,
push often, and merge to `main` only when the team says so (pull `main` again right before merging). Never
force-push `main`. Coordinate before changing `types.ts`, `schemas.ts`, `muse.ts`, `db.ts`, `prompts.ts`.
Never commit `.env.local` or keys.

## Before submitting
Rotate the key, remove `.env` from the repo, make the repo public. Test `MOCK_MUSE=true npm run demo:start` once on
the demo Mac.
