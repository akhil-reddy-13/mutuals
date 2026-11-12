# Mutuals

> **Do things with people you can trust.**
> Muse is single-player today. Mutuals makes it multiplayer: your Muse talks to other people's Muses to handle the practical stuff (finding the right person, screening, logistics), matches you on the things you'd never post publicly, and helps the rare great matches turn into real connections.

Built for the **Facebook Closer Together AI Hackathon 2026** by Akhil, Kyle, Luke, and Eddy.

- 📄 Full spec: [`docs/PRD.md`](docs/PRD.md)
- 🤖 Agent / contributor instructions: [`CLAUDE.md`](CLAUDE.md)

## How it works
1. **Ask:** tell your Muse what you need, in plain language or with a 10–15s video.
2. **Match:** your Muse pre-negotiates with other people's Muses, including on private preferences. You get a shortlist covering why each person fits and where you'd disagree.
3. **Handoff:** pick one, and Messenger opens with a drafted opener. From there, humans talk.
4. **Follow-through:** when there's real overlap and both people opt in, Muse suggests doing something together.

## Muse models
| Job | Model |
|---|---|
| Video/photo → room details + item catalog, post scanning, digest | Muse Ember |
| Negotiating agents, ask parsing, Messenger openers | Muse Spark |
| Referee verdict, connection judgment | Muse Wonder |

## Run locally
```bash
npm install
cp .env.example .env.local   # add MUSE_API_KEY and MUSE_BASE_URL
npm run smoke                # verify each model responds
npm run dev                  # http://localhost:3000
```
Use the persona dropdown in the top bar to switch between demo users (Alex, Priya, …). `npm run dev:lan` exposes the app on your network so phones can open it.

Set `MOCK_MUSE=true` to replay cached responses without network.

## Stack
Next.js (App Router) · TypeScript · Tailwind · zod · OpenAI-compatible SDK pointed at the Meta Model API · SSE for live negotiation.
