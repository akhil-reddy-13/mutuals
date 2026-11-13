# Demo video

- **Watch:** [`docs/video/mutuals-demo-1080p60.mp4`](video/mutuals-demo-1080p60.mp4) (v5, 2:20, 1080p at 60fps; the
  skit has its own sound, the rest is silent until we record the voiceover), or the 720p preview
  [`docs/video/mutuals-demo.mp4`](video/mutuals-demo.mp4).
- **Read:** [`docs/video/mutuals-screenplay.pdf`](video/mutuals-screenplay.pdf), the screenplay with each scene's
  timecode in the video.
- **Edit:** [`docs/video/mutuals.fountain`](video/mutuals.fountain). **The screenplay is the video.** Change what Jamie
  types, what pops out, what the camera zooms in on, the order of scenes, the on-screen text or a transition, then run
  `node scripts/video/make.mjs`: it re-captures the app, re-renders every frame and re-renders the PDF to match.

Everything shown from the app is the real app, and every model output is a real Muse response (run live once, replayed
from the cache). There's no narration in the video yet: the narration lines in the screenplay set how long each shot holds, and
`scripts/video/out/scratch-vo.wav` is a text-to-speech scratch track at those timings for whoever records the real
voiceover. The skit and the selling clip keep their own sound.

## Sound

- **The footage's own sound:** the skit and the selling clip.
- **Effects** (`scripts/video/sfx.mjs`, made in code, no sample files): a bubble when a message comes in or goes
  out (the Muse chat, the overload flurry, Spark's item cards), one whoosh out of the skit, and chimes for fits.
  `stage.html` places them (`cue(...)`), so they move with the picture. `node scripts/video/sfx.mjs` writes
  `out/sfx-sampler.wav` to hear each one.
- **Music:** Earrings (Malcolm Todd). Put the mp3 in `scripts/video/assets/music/` (git-ignored: the song never goes in
  the repo). It comes in after the skit, timed so the song's first "extra extra" (1:37.2) lands on the Mutuals logo at
  1:01, at 5% as background; it dips further under the selling clip and loops back once, on the beat, to reach the end
  card. The settings are at the top of `render.mjs` (`--music-on-logo`, `--music-volume` override them).
- **Sound-only changes** (effects, music) need no re-render:
  `node scripts/video/render.mjs --audio-only && node scripts/video/make.mjs --finish` (about 30 seconds).

## Clips (scene 8 and any new slot)

Scene 8 plays `docs/video/selling-hackathon.mp4`, our selling video from the hackathon, with captions from
`docs/video/selling-hackathon.srt`. It's upright, so it sits in a card on the left over a blurred copy of itself, with
the headline in the middle and the Muse chat on the right. `[[wait clip]]` holds the chat until it finishes. It's cut
from the phone original `docs/video/Selling_catalog_items.mov`: 0.5 s to 15.0 s (the Owala bottle at the end is
dropped), sped up 1.2x with the voice's pitch kept:

    ffmpeg -ss 0.5 -to 15.0 -i docs/video/Selling_catalog_items.mov -map 0:v:0 -map 0:a:0 \
      -vf "setpts=PTS/1.2,fps=30,scale=720:1280" -af atempo=1.2 -c:v libx264 -crf 18 -c:a aac docs/video/selling-hackathon.mp4

Add a slot anywhere with `[[clip name | label | captions.srt]]` in a `VIDEO OVERLAY` scene: until
`scripts/video/assets/clips/<name>.mov` (or `.mp4`) exists it's drawn as an empty, labelled frame. Then run
`node scripts/video/make.mjs --skip-dry`.

## The skit

`docs/video/metaCloserTogetherHackathonSkit.mov` plays first, whole, with its sound. Captions come from
`docs/video/skit.srt` (transcribed with Whisper, corrected by hand; edit the text or timings there).

## The story

The cut follows our demo outline: we don't try to change how people see Facebook, we lean into why young adults already
open it (a couch, a lamp, a roommate), show where it hurts, then show Muse doing the first conversation for you, once for
buying and selling and once for finding people.

| Part | Scenes | What happens |
|---|---|---|
| Cold open | 1 | The filmed skit, captioned. Riley shows Jamie the new feature; Jamie doesn't know anyone in Chicago and was going to post on Marketplace and pray. |
| The problem | 2 to 5 | We still open Facebook to get things done: buy a couch, sell a lamp, find a roommate (each card with its line). 75% of Gen Z Facebook users bought something on Marketplace in the past year. "But it's always an overload": a pile-up of "is this still available?", then a beat of nothing. "Finding roommates, posting, messaging. It's all a headache": the post that shares your budget, habits and dealbreakers with 3,120 members. |
| Mutuals | 6 | The logo: "Your Muse talks to their Muse, then points you to the people who fit." Jamie's Muse reaches a crowd, most fall away, a few fit. |
| 01 Buying and selling | 7, 8 | Our selling video from the hackathon, captioned, with the Muse chat beside it: say what's for sale, Ember writes down what it heard, Spark names each item down to the model (the Canon PowerShot G7 X Mark II), "2 of these already have a home". |
| 02 Finding people | 9 to 13 | The fun-fact card (opt in). The radar of where Muse looks, with Muse agents flying out, talking to each person's Muse, and a few coming back as fits. The wall of Muse conversations (like the app's `/conversations`), each box at a different stage, each saying what's never shown. Then the phone: "Your Muse has the awkward first conversation", the live Muse network. |
| Strangers | 14 | Dark: Facebook is a sea of faceless profiles ("No profile picture", "0 mutual friends"). Jamie's Muse reaches out to dozens, most fade, five real faces stay. |
| End | 15 | "You might have zero mutuals on Facebook today. Mutuals builds them for you." |

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
| `INT. FILM - ...` | Filmed footage with its own sound: `[[film path \| captions.srt]]`. |
| `INT. VIDEO OVERLAY - ...` | A `[[clip]]` slot full frame, with `[[chat]]` and `[[item]]` lines as the Muse chat over it. |
| `INT. OFF CAMERA - ...` | App steps that run so later scenes have their data (the roommate ask, the selling run behind the wall); not filmed. |
| `JAMIE` + `(typing)` in a phone scene | Typed in the box beside the phone, then flies into the chat. |
| `taps "..."`, `scrolls to "..."`, `"..." pops out`, `zooms in on "..."` | Happens in the app, in that order. |
| `SUPER:` / `CAPTION:` | Big statement / smaller line. `~words~` get the gradient. |
| `[[phone away]]`, `[[zoom out]]`, `[[network]]`, `[[stat ...]]`, `[[logo]]` ... | Camera moves and graphics. |
| `[[activities ...]]`, `[[post ...]]`, `[[agents]]`, `[[chapter 01 \| ...]]`, `[[funcard]]`, `[[reach ...]]` | The diagrams for the problem, the reveal and the two chapters. |
| `[[flurry ...]]`, `[[clear]]`, `[[convos]]`, `[[crowd ...]]` + `[[narrow]]` | The message pile-up, a clean fade, the wall of Muse conversations, the sea of strangers. |
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

- **Scene 8's item names** (Canon PowerShot G7 X Mark II, Poly Voyager Free 60+, Hawaiian Soda) are read off the
  clip, not from a Spark run on it. Spark's real run is on `assets/room.mp4` (scene 8A).
- **Record the voiceover** against `scripts/video/out/scratch-vo.wav` (same timings), and add music.
- **Re-capture after `fix/demo-blockers` merges**, so the agents speak as Muse in the third person.
- **Check the 75% stat** before publishing. The source we found is an eMarketer chart (US Facebook shoppers who bought
  on Marketplace in the past 12 months, by generation, March 2024); its numbers are paywalled, so confirm the 75% and
  that it's "Facebook shoppers", not all Facebook users.
- **"Where Muse looks"** (followers, nearby, your school) is where we're going; the app searches the Group today.
- The wall's selling boxes come from the off-camera run on `assets/room.mp4` (camera, lamp, mini fridge with Theo, Maya,
  Dev), not the hackathon clip.
