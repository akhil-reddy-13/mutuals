# Demo video

- **Watch:** [`docs/video/mutuals-demo.mp4`](video/mutuals-demo.mp4) (draft cut, about 3:00, 720p, no audio yet).
- **Read:** [`docs/video/mutuals-screenplay.pdf`](video/mutuals-screenplay.pdf), the screenplay with each scene's
  timecode in the video.
- **Edit:** [`docs/video/mutuals.fountain`](video/mutuals.fountain). **The screenplay is the video.** Change what Jamie
  types, what pops out, what the camera zooms in on, the order of scenes, the on-screen text or a transition, then run
  `node scripts/video/make.mjs`: it re-captures the app, re-renders every frame and re-renders the PDF to match.

Everything shown from the app is the real app, and every model output is a real Muse response (run live once, replayed
from the cache). The video has no audio: the narration lines in the screenplay set how long each shot holds, and
`scripts/video/out/scratch-vo.wav` is a text-to-speech scratch track at those timings for whoever records the real
voiceover. Still placeholders: the live-action scenes (storyboard frames until we film them) and the desk video in the
selling scene (Muse Image stills with a spoken narration).

## The story

The arc follows Standard Response (Cal Hacks 13.0) and DotSight: one real person and one real moment, the problem in
numbers, the reveal, a numbered "How it works", the payoff, and a callback.

| Act | Scenes | What happens |
|---|---|---|
| One: Jamie | 1 | The skit. Jamie (B) got a summer SWE internship in Chicago and knows nobody there. Riley (A) shows them the new feature. |
| Two: The problem | 2 to 4 | 23% of 18 to 34 year olds on Facebook use Marketplace every day. The first conversation is the worst part. The things that decide it are the things nobody posts. |
| Three: Mutuals | 5 | Soft circular reveal to the logo. |
| Four: How it works | 6 to 11 | **1 Tell:** Jamie types in the box beside the phone, each message flies into the chat; zoom into the privacy tags. **2 Match:** "Yes, check", the phone slides away and the Muse network takes the stage, live. Then the shortlist as cards (Nora, Dana, Diego). **3 Meet:** the run-club nudge next to the Event, then Messenger with a close-up of Muse's draft. |
| Five: Moving out | 12 to 13 | Jamie types and films the desk, close-up of what Ember heard; then the Canon G7 X Spark identified, next to the Marketplace listing. |
| Six: Under the hood | 14 | Spark, Wonder, Ember. Privacy in code, not prompts. |
| Seven: Saturday | 15 to 16 | Jamie and Nora at the Lakefront Run Club. "You might have zero mutuals on Facebook today. Mutuals builds them for you." |

**Look:** the product parts take after Apple's iPhone films and its Liquid Glass keynote: a seamless off-white
background with soft glass bubbles, one statement at a time in big type, the phone as the hero until the story moves
past it, close-ups instead of small UI, and pieces of the app lifting out as cards.

## How it's made (and why it's smooth)

Two passes, so nothing has to be smooth in real time:

1. **`capture.mjs`** plays the screenplay against the real app in a phone-sized window at 3x. It saves the app's screen
   as timestamped frames and logs every event (each typed message, tap, pop-out card, zoom, Muse network change) on
   one video timeline. Scenes without the app are timed from the screenplay.
2. **`render.mjs`** draws the video frame by frame from that log with `stage.html`. Every position, opacity and blur
   is a function of time with ease-in-out curves (no springs, no overshoot), and each of the ~5,500 frames is drawn
   exactly once, 1/30 s apart, so there are no dropped or doubled frames however busy the machine is.

```bash
cd scripts/video && npm install && cd ../..          # once: puppeteer-core (uses your Chrome), pdf-lib
NEXT_DIST_DIR=.next-demo npx next build               # production build of the app
NEXT_DIST_DIR=.next-demo MUSE_REPLAY_DELAY_MS=700 npx next start -p 3001 -H 127.0.0.1
node scripts/video/make.mjs                           # dry run -> capture -> render -> PDF -> 720p preview
```

- `--skip-dry` when nothing that reaches Muse changed; `--render-only` after editing only `stage.html` (looks, timing
  of animations); `--pdf-only` for just the PDF.
- Check moments without a full render: `node scripts/video/render.mjs --stills 12,58.5,96` (PNGs in
  `scripts/video/out/stills/`), or a stretch: `--from 55 --to 90` (`out/preview.mp4`).
- A full render takes about 10 minutes on 5 pages; a capture about 3.
- `MUSE_REPLAY_DELAY_MS` (in `src/lib/muse.ts`, default 0) paces cached replies so the negotiation streams in turn by
  turn. If anyone asks: "run live on Muse, replayed for the video".

Files in `scripts/video/`: `fountain.mjs` (parser), `plan.mjs` (screenplay to steps), `capture.mjs`, `render.mjs`,
`stage.html`, `render-screenplay.mjs` (PDF), `make.mjs` (all of it), `gen-assets.mjs` (desk stills and `room.mp4`).

## Editing the screenplay

The `.fountain` file is a normal screenplay in [Fountain](https://fountain.io) format: plain text, and a formatted
script in free editors like Beat (Mac), Highland 2, or VS Code with "Better Fountain". The comment block at the top of
the file is the full cheat sheet. The short version:

| You write | You get |
|---|---|
| `INT. JAMIE'S DORM ROOM, STANFORD - NIGHT` | A live-action shot (storyboard frame until filmed). |
| `INT. PHONE SCREEN - ...` | The app on the phone. |
| `INT. FEATURE - ...` | No phone; the cards that pop out sit big on screen, side by side. |
| `INT. MOTION GRAPHICS - ...` | Type, numbers, bubbles. |
| `JAMIE` + `(typing)` in a phone scene | Typed in the box beside the phone, then flies into the chat. |
| `taps "..."`, `scrolls to "..."`, `"..." pops out`, `zooms in on "..."` | Happens in the app, in that order. |
| `SUPER:` / `CAPTION:` | Big statement / smaller line. `~words~` get the gradient. |
| `[[phone away]]`, `[[zoom out]]`, `[[network]]`, `[[stat ...]]`, `[[logo]]` ... | Camera moves and graphics. |
| `CUT TO:`, `DISSOLVE TO:`, `BUBBLE WIPE TO:`, `FADE OUT.` | Transitions (all soft). |
| `NARRATOR (V.O.)` | No audio; sets how long the shot holds. |

## Personas

| Persona | Role | What makes the scene work |
|---|---|---|
| **Jamie Reyes** (`jamie`) | The intern, B in the skit | Public budget $1,100, match-only ceiling $1,300 if walkable, up at 5:30 (match-only), allergic to cats (dealbreaker), visa status never shared. Runs Saturdays, bakes sourdough. |
| **Nora Whitfield** (`nora`) | The match | West Loop 2BR, $1,250, match-only floor $1,150. A night owl vs Jamie's 5:30 alarm. Also runs Saturdays and bakes. |
| **Diego Alvarez** (`diego`) | The dealbreaker | His cat Miso lives there. The Muses stop early. |
| **Sofia Marino** (`sofia`) | Fits, nothing more | Opted out of connection suggestions. |
| **Dana Kowalski** (`dana`) | No Muse, a sublet post | Jamie's Muse reads her post and drafts a reply. |
| **Ava Thompson** (`ava`) | Group admin, run-club host | Hosts the Lakefront Run Club and the Sourdough Starter Swap. |

## Before the final cut

- **Film the live-action scenes** (1 and 15) and lay the footage over the storyboard frames.
- **Record the voiceover** against `scripts/video/out/scratch-vo.wav` (same timings), and add music.
- **Replace `scripts/video/assets/room.mp4`** with a real phone video of a desk, narrated, then run `make.mjs`.
- **Re-capture after `fix/demo-blockers` merges**, so the agents speak as Muse in the third person.
- **Check the 23% stat** (Capital One Shopping Research, from our notes) before publishing.
