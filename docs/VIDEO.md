# Demo video

- **Watch:** [`docs/video/mutuals-demo.mp4`](video/mutuals-demo.mp4) (draft cut, about 3:00, 720p).
- **Read:** [`docs/video/mutuals-screenplay.pdf`](video/mutuals-screenplay.pdf), the screenplay with each scene's
  timecode in the video.
- **Edit:** [`docs/video/mutuals.fountain`](video/mutuals.fountain). **The screenplay is the video.** Change a line of
  narration, what Jamie types, what pops out of the phone, the order of scenes or a transition, then run
  `node scripts/video/make.mjs`: it re-records the video and re-renders the PDF to match.

Everything on the phone is the real app, and every model output is a real Muse response (recorded from a live run,
replayed from the cache at live pace). Still placeholders: the live-action scenes (storyboard frames until we film
them), the voices (macOS text-to-speech), and the desk video in the selling scene (Muse Image stills with a spoken
narration).

## Screen-recorded clips (laptop size, for the parts we record instead of demoing live)

`npm run clips` drives the real app in Chrome and saves MP4s to `recordings/` (gitignored), with a visible cursor.
Pre-run the inputs first (`npm run warm`, plus `npm run warm -- --video <file>` for any video) so Muse replies
are fast; everything shown is a real Muse response.

| Clip | What it shows |
|---|---|
| `friends` | **The centerpiece.** Alex's roommate search → privacy choice → the Muses talk → Priya's **More than a lease** → Go together → Going → Alex messages Priya → switch to Priya → "Alex's Muse talked with yours" → the conversation → she replies → the Event shows Alex going → she taps Going too |
| `roommate` | Just Alex's side, through Going |
| `proof` | Just Priya's side of the Muse conversation (run after `roommate`) |
| `selling` | Desk video → Ember heard you → Spark names the models → "N of these already have a home" |
| `selling-proof` | June's side of the camera haggle (run after `selling`) |
| `tent` | "I need a tent" → one friend-like question → Marcus + the Yosemite carpool |

```bash
npm run clips                                   # all
npm run clips -- friends --room-video ~/Downloads/hotel.MOV   # with the room video
npm run clips -- selling --video ~/Downloads/IMG_6396.MOV
npm run clips -- friends --headed               # watch it drive the browser
```
When it's done it restores the saved run (`june-room-weekend-runs`), so the app is ready for the live demo.

## The story

The arc follows Standard Response (Cal Hacks 13.0) and DotSight: one real person and one real moment, the problem
in numbers, the reveal, a numbered "How it works", the payoff, and a callback.

| Act | Scenes | What happens |
|---|---|---|
| One: Jamie | 1 | The skit. Jamie (B) got a summer SWE internship in Chicago and knows nobody there. Riley (A) shows them the new feature. |
| Two: The problem | 2 to 4 | 23% of 18 to 34 year olds on Facebook use Marketplace every day. The first conversation is the worst part. The things that decide it are the things nobody posts. |
| Three: Mutuals | 5 | Bubble wipe to the logo. "Your Muse talks to their Muse." |
| Four: How it works | 6 to 11 | **1 Tell** (Jamie's private ask, the privacy tags), **2 Match** (the Muse network live, the shortlist), **3 Meet** (the run-club nudge, the Event, Messenger). |
| Five: Moving out | 12 | Film the desk, Ember transcribes and finds the items, Spark identifies the Canon G7 X, one tap lists it. |
| Six: Under the hood | 13 | Spark, Wonder, Ember. Privacy in code, not prompts. |
| Seven: Saturday | 14 to 15 | Jamie and Nora at the Lakefront Run Club. "You might have zero mutuals on Facebook today. Mutuals builds them for you." |

**Look:** the product parts take after Apple's iPhone films and its Liquid Glass keynote: a seamless off-white
background with soft glass bubbles, the phone as the only hero, one statement at a time in big type, and pieces of
the app lifting out of the phone. The Muse network is drawn from the live app: each person's bubble shows "Talking"
while their Muse is replying and turns into Fits or Not a fit when the referee decides.

## Editing the screenplay

The `.fountain` file is a normal screenplay in [Fountain](https://fountain.io) format. It reads fine as plain text,
and opens as a formatted script in free editors like Beat (Mac), Highland 2, or VS Code with the "Better Fountain"
extension. The comment block at the top of the file has the full cheat sheet. The short version:

**Scene headings pick the kind of shot**

| Heading | Shot |
|---|---|
| `INT. JAMIE'S DORM ROOM, STANFORD - NIGHT` | Live action. A storyboard frame (place, time, action, dialogue as subtitles) until we film it. |
| `INT. PHONE SCREEN - <anything>` | The real app on the phone. |
| `INT. MOTION GRAPHICS - <anything>` | Type, numbers and bubbles. No phone. |

**Dialogue**

| You write | You get |
|---|---|
| `NARRATOR (V.O.)` | Voiceover, captioned at the bottom. |
| `RILEY` / `JAMIE` in a live-action scene | The line spoken by that character (placeholder voice) and shown as a subtitle. |
| `JAMIE` + `(typing)` in a PHONE SCREEN scene | Jamie types the line into Muse; Muse's reply is real. |

**Action lines in phone scenes.** The quoted thing after these words happens on the phone, in order:
`opens "Chicago Summer Interns 2027"` (a Group name, `"the full shortlist"` or a `/path`), `taps "Yes, check"`,
`scrolls to "Why it fits"`, `"More than a lease" pops out`, `zooms in on "..."`, `uploads "room.mp4"`,
`waits for "people fit"`. Everything else is description for us.

**On screen:** `SUPER: big statement` and `CAPTION: smaller line`. `~words~` get the Muse gradient.

**Notes** (`[[...]]`): `[[steps Tell | Match | Meet]]` and `[[step 2]]` for the stepper, `[[network]]`, `[[stat 23% |
text | source]]`, `[[bubbles a | b | c]]`, `[[secrets a | b]]`, `[[logo]]`, `[[models]]`, `[[hold 1.5]]` (let the
current line finish, then hold), `[[voice JAMIE: Eddy (English (US))]]`, `[[rate JAMIE: 215]]`,
`[[music path/to/track.mp3]]` (ducked under the voices), `[[captions off]]`.

**Transitions:** `CUT TO:`, `DISSOLVE TO:`, `SMASH CUT TO:`, `MATCH CUT TO:`, `BUBBLE WIPE TO:`, `FADE OUT.`

**Timing is script order.** Narration plays over whatever comes after it, and the next narration line waits for the
previous one. Put a scene's `SUPER:` and narration before the actions they should play over (see scene 8: the
narration starts, then "Yes, check", then the Muses talk while the second line plays).

## Making the video

```bash
cd scripts/video && npm install && cd ../..          # once: puppeteer-core (uses your Chrome), pdf-lib
NEXT_DIST_DIR=.next-demo npx next build               # production build: instant pages, no dev badge
NEXT_DIST_DIR=.next-demo MUSE_REPLAY_DELAY_MS=900 npx next start -p 3001 -H 127.0.0.1
node scripts/video/make.mjs                           # dry run -> record -> screenplay PDF -> 720p preview
```

- `make.mjs` first runs every phone action live on Muse (`--dry`), so anything new you wrote (a different line for
  Jamie to type, a different Group) gets a real answer, then records the take from the cache. Use `--skip-dry` when
  you only changed narration, on-screen text, order or transitions. `--pdf-only` just re-renders the PDF.
- Debug a scene without recording: `node scripts/video/record.mjs --preview 8-9` saves a screenshot after every step
  of scenes 8 to 9 in `scripts/video/out/preview/`. A failed run saves `scripts/video/out/failed.png`.
- Use `127.0.0.1`, not `localhost`: cookies ignore ports, so a dev server on `localhost:3000` would share the persona
  cookie with the recording.
- `MUSE_REPLAY_DELAY_MS` (in `src/lib/muse.ts`, default 0) pauses on each cache hit so the negotiation streams in
  turn by turn. If anyone asks: "recorded from a live run on Muse, replayed for the video".

Files: `scripts/video/fountain.mjs` (parser), `record.mjs` (plays the screenplay), `studio.html` (the 1920x1080
stage), `render-screenplay.mjs` (PDF), `make.mjs` (all of it), `gen-assets.mjs` (the desk stills and `room.mp4`).

## Personas

| Persona | Role | What makes the scene work |
|---|---|---|
| **Jamie Reyes** (`jamie`) | The intern, B in the skit | Public budget $1,100, match-only ceiling $1,300 if walkable, up at 5:30 (match-only), allergic to cats (dealbreaker), visa status never shared. Runs Saturdays, bakes sourdough. |
| **Nora Whitfield** (`nora`) | The match. West Loop 2BR, $1,250 | Match-only floor $1,150, a night owl vs Jamie's 5:30 alarm ("One thing to talk about: weeknight noise"). Also runs Saturdays and bakes, so Muse suggests the Lakefront Run Club. |
| **Diego Alvarez** (`diego`) | The dealbreaker | His cat Miso lives there. The Muses stop early. |
| **Sofia Marino** (`sofia`) | Fits, nothing more | Opted out of connection suggestions. |
| **Dana Kowalski** (`dana`) | No Muse, a sublet post | One-sided mode: Jamie's Muse reads her post and drafts a reply. |
| **Ava Thompson** (`ava`) | Group admin, run-club host | Hosts the Lakefront Run Club and the Sourdough Starter Swap. |

Group: **Chicago Summer Interns 2027** (`g_chi_interns`). Riley, Jamie's roommate in the skit, isn't in the app.

## Before the final cut

- **Film the live-action scenes** (1 and 14) and drop the footage over the storyboard frames, or film both phones for
  the whole thing and use this as the shot list.
- **Record a human narrator**, or keep text-to-speech for the screen parts. Add music with `[[music file.mp3]]`.
- **Replace `scripts/video/assets/room.mp4`** with a real 10 to 15 second phone video of a desk, narrated, then
  `make.mjs` (not `--skip-dry`) so Ember and Spark run on it.
- **Re-record after `fix/demo-blockers` merges.** In this cut the agents still write as their humans ("I'm allergic to
  cats") and Sofia's card says "both tidy", which Jamie never said.
- **Check the 23% stat** before publishing. It comes from our notes (Capital One Shopping Research) and hasn't been
  re-verified.
- Running time is about 3:00 with the storyboard skit at about 30 seconds. Trim narration in the screenplay to tighten.
