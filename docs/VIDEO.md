# Demo video

- **Watch:** [`docs/video/mutuals-demo-1080p60.mp4`](video/mutuals-demo-1080p60.mp4) (draft cut, 2:28, 1080p at 60fps,
  no audio yet), or the smaller 720p preview [`docs/video/mutuals-demo.mp4`](video/mutuals-demo.mp4).
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

The cut follows our demo outline: we don't try to change how people see Facebook, we lean into why young adults already
open it (a couch, a lamp, a roommate), show where it hurts, then show Muse doing the first conversation for you, once for
buying and selling and once for finding people.

| Part | Scenes | What happens |
|---|---|---|
| Cold open | 1 | Riley: "Posting your budget to three thousand strangers?" Jamie doesn't know anyone in Chicago and has to sell all this. |
| The problem | 2 to 5 | We still open Facebook to get things done (couch, lamp, roommate). 23% of 18 to 34 year olds use Marketplace every day. Then come the messages ("is this still available?" eleven times). For people it's worse: the post that shares your budget, habits and dealbreakers with 3,120 members. |
| Mutuals | 6 | Soft circular reveal to the logo. "Your Muse has the first conversation": Jamie's Muse reaches a crowd, most fall away, a few fit. |
| 01 Buying and selling | 7 to 11 | Jamie says what's for sale and films the desk. Ember writes down what it heard; Spark names the Canon PowerShot G7 X Mark III from its clearest frame, with a used price range and how sure it is, and notes what Jamie didn't mention (a laptop, a desk). One tap lists it. Then "Yes, check": the phone slides away and Jamie's Muse talks to the buyers' Muses (Theo, Maya, Dev), live. Fifty identical DMs become one small detail: Theo's card is down to the price, Dev's to where to meet. |
| 02 Finding people | 12 to 17 | The fun-fact card Muse makes from Jamie's profile (opt in). Where Muse looks: this Group, followers, nearby, your school. Jamie tells Muse what they'd never post (zoom on Public / Match only / Never shared). The Muse network, then the shortlist (Nora fits, Diego has a cat so the Muses stopped early), then a reason to meet: the Lakefront Run Club. |
| Saturday | 18 to 19 | Jamie and Nora at the run club. "You might have zero mutuals on Facebook today. Mutuals builds them for you." |

**Look:** the product parts take after Apple's iPhone films and its Liquid Glass keynote: a seamless off-white
background with soft glass bubbles, one statement at a time in big type, the phone as the hero until the story moves
past it, close-ups instead of small UI, and pieces of the app lifting out as cards.

## How it's made (and why it's smooth)

Two passes, so nothing has to be smooth in real time:

1. **`capture.mjs`** plays the screenplay against the real app in a phone-sized window at 3x. It saves the app's screen
   as timestamped frames and logs every event (each typed message, tap, pop-out card, zoom, Muse network change) on
   one video timeline. Scenes without the app are timed from the screenplay.
2. **`render.mjs`** draws the video frame by frame from that log with `stage.html`. Every position, opacity and blur
   is a function of time with ease-in-out curves (no springs, no overshoot), and each of the ~8,900 frames is drawn
   exactly once, 1/60 s apart, so there are no dropped or doubled frames however busy the machine is. Nothing blinks:
   the network's lines carry slow moving dashes, carets pulse softly, cards never rescale once they're up.

```bash
cd scripts/video && npm install && cd ../..          # once: puppeteer-core (uses your Chrome), pdf-lib
NEXT_DIST_DIR=.next-demo npx next build               # production build of the app
NEXT_DIST_DIR=.next-demo MUSE_REPLAY_DELAY_MS=700 npx next start -p 3001 -H 127.0.0.1
node scripts/video/make.mjs                           # dry run -> capture -> render -> PDF -> 720p preview
```

- `--skip-dry` when nothing that reaches Muse changed; `--render-only` after editing only `stage.html` (looks, timing
  of animations); `--pdf-only` for just the PDF; `--finish` for the PDF and the 720p preview after running
  `render.mjs` on its own.
- Check moments without a full render: `node scripts/video/render.mjs --stills 12,58.5,96` (PNGs in
  `scripts/video/out/stills/`), or a stretch: `--from 55 --to 90` (`out/preview.mp4`).
- A full render takes about 15 minutes on 5 pages (`--workers 5`); a capture about 3.
- Check for flicker: `node scripts/video/flicker.mjs` lists the moments where pixels brighten and darken on
  alternating frames. Big smooth moves (the phone sliding away, cards gliding) also show up there; anything else is a
  bug.
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
| `[[activities ...]]`, `[[post ...]]`, `[[agents]]`, `[[chapter 01 \| ...]]`, `[[funcard]]`, `[[reach ...]]` | The diagrams for the problem, the reveal and the two chapters. |
| `CUT TO:`, `DISSOLVE TO:`, `BUBBLE WIPE TO:`, `FADE OUT.` | Transitions (all soft). |
| `NARRATOR (V.O.)` | No audio; sets how long the shot holds. |

## Personas

| Persona | Role | What makes the scene work |
|---|---|---|
| **Jamie Reyes** (`jamie`) | The intern, B in the skit | Public budget $1,100, match-only ceiling $1,300 if walkable, up at 5:30 (match-only), allergic to cats (dealbreaker), visa status never shared. Runs Saturdays, bakes sourdough. Selling a Canon G7 X, a desk lamp and a mini fridge. |
| **Nora Whitfield** (`nora`) | The match | West Loop 2BR, $1,250, match-only floor $1,150. A night owl vs Jamie's 5:30 alarm. Also runs Saturdays and bakes. |
| **Diego Alvarez** (`diego`) | The dealbreaker | His cat Miso lives there. The Muses stop early. |
| **Sofia Marino** (`sofia`) | Fits, nothing more | Opted out of connection suggestions. |
| **Dana Kowalski** (`dana`) | No Muse, a sublet post | Jamie's Muse reads her post and drafts a reply. |
| **Ava Thompson** (`ava`) | Group admin, run-club host | Hosts the Lakefront Run Club and the Sourdough Starter Swap. |
| **Theo, Maya, Dev** (`theo`, `maya`, `dev`) | Buyers in Stanford Free & For Sale | Theo wants a compact camera (up to $600, match-only $650 for a G7 X), Maya a mini fridge (~$70), Dev a cheap desk lamp. |

## Before the final cut

- **Film the live-action scenes** (1 and 18) and lay the footage over the storyboard frames.
- **Record the voiceover** against `scripts/video/out/scratch-vo.wav` (same timings), and add music.
- **Replace `scripts/video/assets/room.mp4`** with a real phone video of a desk, narrated, then run `make.mjs`.
- **Re-capture after `fix/demo-blockers` merges**, so the agents speak as Muse in the third person.
- **Check the 23% stat** (Capital One Shopping Research, from our notes) before publishing.
- **"Where Muse looks"** (followers, nearby, your school) is where we're going; the app searches the Group today.
