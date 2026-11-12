# Mutuals — agent instructions

Hackathon project (Facebook Closer Together AI Hackathon). **Devpost deadline Fri Nov 13, 10:30 AM PST.**
**Read `docs/PRD.md` first.** It is the source of truth. The hero flow (§5.1) and demo plan (§12) define what must work.

## Run
```
npm install
# Team key is in the committed .env (works out of the box). Personal overrides go in .env.local.
npm run smoke                # 1 call per model; confirms key/base URL
npm run dev                  # http://localhost:3000   (npm run dev:lan to open from phones)
npm test                     # privacy tests (must always pass)
npm run typecheck
```

## Hard rules
1. **All model calls go through `src/lib/muse.ts`** (`museJSON` / `museText`). Never `new OpenAI()` anywhere else. It handles routing, caching (`.cache/muse/`), retry, zod validation, `MOCK_MUSE`.
2. **Every model output is validated** with a schema from `src/lib/schemas.ts`. Add a schema before adding a call.
3. **Privacy is structural:** any prompt containing a user's preferences must build it from `privacy.agentContext(prefs)`. Never pass raw `ask.preferences` to a prompt. `never` prefs must be impossible to leak. Keep `src/lib/privacy.test.ts` green.
4. **Core flows call Muse for real.** No hardcoded AI output in the main path; `mock` values are only the offline fallback.
5. **Models:** Ember = vision/video, bulk post scanning, digest (cheap). Spark = negotiating agents, ask parsing, openers. Wonder = referee verdict + connection judgment only (expensive). ~$400 total credits.
6. **Mobile first (~390px)**, Facebook look: use the `fb-*` Tailwind tokens in `globals.css` and `components/Card.tsx`.
7. Types live in `src/lib/types.ts` (PRD §8). Prompts live in `src/lib/prompts.ts` (PRD §7). Change them deliberately, since everyone imports them.

## Layout
- `src/lib/` — `muse.ts` (client), `schemas.ts`, `prompts.ts`, `privacy.ts`, `reach.ts` (candidates + trust signals), `db.ts` (seed JSON + runtime store in `.cache/runtime.json`), `negotiation.ts` (**stub**), `frames.ts`, `session.ts` (demo persona cookie)
- `src/app/api/*/route.ts` — each stub documents its request/response contract at the top. Implemented: `persona`, `reset`, `negotiate` (SSE wrapper around `runNegotiation`).
- `src/app/mutuals/**`, `src/app/messenger/**` — page stubs, each with a TODO describing the screen.
- `seed/*.json` — personas, groups, posts, circles, asks. `ask_alex_seed` = Alex's hero ask for dev. Alex vs Priya = quiet-hours + budget tension; Jordan = dog dealbreaker; Sam = fits but opted out of connection suggestions; Casey = no Muse (one-sided mode via `post_casey_room`).
- `scripts/` — `muse-smoke.ts`, `warm-cache.ts` (mirrors the sheet; `--video <file>`), `gen-seed.mjs` (one-off; edit seed JSON directly now).

## Build order (PRD §19.2)
muse client ✅ → seed loader ✅ → intake API → ask parsing → `runNegotiation` (terminal first, then SSE) → shortlist UI → Messenger handoff → connection card + circle → agent log → digest → polish → `warm-cache`.

## Working as a team
- Several people (and their agents) work in this repo at once. **Pull before you start, commit small, push often.** Stay inside the files your area owns. Coordinate before changing `types.ts`, `schemas.ts`, `muse.ts`, `db.ts`.
- Work on a branch, or commit straight to `main` with small commits if the team agrees. Never force-push `main`.
- Never commit `.env.local` or API keys.

## Who owns what (PRD §13; fill in names)
| Area | Files | Owner |
|---|---|---|
| Agent engine | `muse.ts`, `negotiation.ts`, `privacy.ts`, `prompts.ts`, `api/negotiate`, `api/connection` | _TBD_ |
| Intake + matching | `frames.ts`, `reach.ts`, `api/intake`, `api/asks`, `api/match`, `api/digest`, `VideoCapture` | _TBD_ |
| Frontend | `components/*`, `app/mutuals/**`, `app/messenger/**`, `api/messenger` | _TBD_ |
| Seed, pitch, video | `seed/*`, `README.md`, Devpost, demo script | _TBD_ |

## Status / handoff (update as you go)
- ✅ **Live Muse API verified (Nov 12).** Base URL `https://api.meta.ai/v1`; team key in committed `.env` (private repo only; rotate before going public). Hero, plus-one and ride flows all run live; reasoning effort per model in `muse.ts` (Spark minimal) keeps a full hero match ~60 s live, instant when cached (`npm run warm`).
- ✅ Video intake sends the video's **audio narration** to Ember with the frames (browser extracts 16 kHz WAV). What the user says decides what gets listed.
- ✅ All demo photos are local (`public/img`, generated with Muse Image via `scripts/gen-images.ts`; avatars in `public/avatars`). No outside image hosts.
- ✅ Demo on the Mac with `npm run demo:build && npm run demo:start` (separate `.next-demo` dir, ~100x faster than dev).
- ✅ Privacy: referee and opener prompts receive each side's match_only facts as do-not-state, on top of the number/time redaction.
- ✅ **Full hero path runs end to end offline** (`MOCK_MUSE=true`): Group page → Ask Muse sheet (3 chat turns → visibility-tagged prefs → video/photos → opt-in question) → live parallel matching streamed over SSE → shortlist cards → Messenger with drafted opener → second persona sees notification, match, replies → connection card → Event. Marketplace listing from leftover items. Digest page. `npm run demo` prints the terminal run with a leak check. `npm run warm` pre-runs every hero call. `docs/DEMO.md` is the timed script with the exact lines to type, `docs/PITCH.md` the talk track and Q&A, `docs/DEVPOST.md` the submission draft.
- ✅ Handoff note (Nov 12) applied over the PRD: no Mutuals page/settings/reach; the opt-in is a chat question scoped to the Group (`User.museGroups`); Events replace circles; 2 rounds + one referee call; candidates in parallel; no numeric score in UI; budgets compared in code (`privacy.budgetsOverlap`) and every human-facing string redacted (`privacy.redactPrivateValues`); match-only facts shown as locked chips; Alex owns the room; Jordan rejected on a match-only "no dogs" dealbreaker, health stays `never`.
- ✅ `npm run warm` mirrors the sheet byte for byte (the sheet's fixed lines live in `lib/sheetCopy.ts`; `parseAsk` ignores the greeting), so the on-stage chat, matching, both openers and the digest come from cache. Video: `npm run warm -- --video <file>` with the exact clip you'll upload on stage; a fresh recording always runs intake and matching live. Tapping a privacy badge and not tapping it back also re-runs matching live.
- ✅ Match card + opener guard: `privacy.leakedPrivateFacts` catches match_only wording ("night owl", "partner stays over") echoed into strings both people see and swaps in a topic-level line. Agents talk about their person in the third person and only state listed facts. One failed candidate no longer sinks matching (`failed` event, "Couldn't reach X's Muse").
- ⚠️ Runtime store is a JSON file (`.cache/runtime.json`), re-read on mtime change so scripts and the dev server share state. Fine for local demo; not for Vercel (no writable FS). Run the demo locally with `npm run dev:lan`.
- ✅ Reviewed by a second agent; fixed: SSE keeps matching after a dropped connection (sheet recovers by polling), matches dedupe by latest run, agent turns redacted against the other side before store/log/stream, number/time redaction covers rewrites ($1300, 1.3k, 11 pm, 11:00pm), iOS-safe video capture (no `capture`, play/pause, seek timeouts), Not now re-offers Check now, opener drafted for whichever side opens Messenger first. `next build`, lint, typecheck, tests all green.
- ✅ Realism pass: Home feed (stories, Group posts), Groups index, illustrated covers, post photos/comments/reactions/pinned/admin, 22 seeded posts across 4 Groups. Two more live flows with scripted fallbacks: **plus-one** (SF New Grads: Theo, Lena, Casey's post, pre-show Event) and **ride to SFO** (Free & For Sale: Marcus). `npm run demo -- plus_one|ride`. Negotiation topics vary by ask type (`negotiation.topicsFor`). Money ranges read ceilings ("up to") and floors ("down to").
- ℹ️ The git remote is SSH (`git@github.com:akhil-reddy-13/mutuals.git`). HTTPS pushes hang when the macOS keychain is locked.
- ⏭️ Next: (1) run `npm run warm` before the demo; (2) record the backup video from `docs/DEMO.md`; (3) Devpost page from README; (4) nice-to-have: persist chips edits before `ready`, "Not now" on the opt-in should keep the ask row visible on the Group page, real cover photo for the Group.
