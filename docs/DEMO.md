# Demo runbook

The talk itself (who says what, timings, handoffs) is **`docs/PRESENTATION.md`**. This file is the setup, the
fallbacks and the other flows. One laptop drives it; switch people from the avatar menu, top right.

## Before you go on

```bash
npm run warm        # only with a real key: pre-runs every hero call so the cache is hot (also resets state)
npm run warm -- --video room.mov   # also warms the video beat, if you'll upload this exact clip on stage
npm run demo:build  # production build (separate .next-demo folder, safe alongside npm run dev)
npm run demo:start  # http://localhost:3000. ~100x faster pages than dev, and no Next.js "N" dev badge
npm run demo:start:stage  # same, but cached replies pause ~1.5 s so the live selling part looks live (use on stage)
# or, with no key / flaky wifi:
MOCK_MUSE=true npm run demo:start
```
Stop any `npm run dev` on port 3000 first. Re-run `demo:build` after pulling new code.

Then: avatar menu → **Reset demo**. That clears asks, matches, threads and the opt-in.
Restore the saved run (`npm run snapshot -- restore june-room-weekend-runs`), pre-run the selling video once, and leave the app on **Stanford Free & For Sale**.

## The roommate lines (if you run it live instead of playing `recordings/friends.mp4`)

Type them exactly; the cache and the offline mock are keyed to them.

1. `I signed a 2BR in the Mission from Sept 1 and need a roommate for the second bedroom`
2. `Posting it at $1,350 but honestly I'd take $1,200 for the right person, keep that private`
3. `I'm a night owl, my partner stays over some weekends, no dogs please. Don't share my health stuff ever.`

Then **Yes, check** → read Muse's verdict → shortlist → **Message Priya** → Priya's card: **More than a lease** →
**Go together** → the Event. Switch to **Priya**: her Home's first card, "Alex's Muse talked with yours", opens the
whole conversation from her side. She taps **Going**.

## If something breaks

- Stream stalls: close the sheet, tap the **N people fit your ask** row on the Group page. Matches are saved as they finish.
- Wifi dies: restart with `MOCK_MUSE=true npm run dev`. Same lines, same results, no network.
- Wrong persona on a phone: avatar menu → pick the right one.
- Everything: **Reset demo** and start from line 1. The whole hero path takes about 90 seconds.

## Honesty notes for Q&A

- If the negotiation you showed was served from cache or mock, say so: "pre-run on Muse this morning, replayed because of venue wifi."
- The numbers comparison (budgets overlap) is computed in code, not by the model. Say that proudly: it is the privacy guarantee.
- Models: Ember for the chat, both sides of the back-and-forth, the referee verdict, the connection judgment, item routing, openers, post reading and the video (frames and narration); Spark for naming the exact make and model of each item. One role map in `src/lib/muse.ts`; Wonder can take any role with one setting.

## Other live flows (same engine, 20 to 40 seconds each)

- **Selling (Stanford Free & For Sale):** "Selling some stuff before I move out" → upload a video where you talk over
  your stuff. Run the exact demo video once beforehand so the Ember and Spark calls are cached (about 15 s cold).
  Result is people, not listings: "2 of these already have a home." `Selling_catalog_items.MOV` → G7 X to June, Poly earbuds to Theo.
- **"I need X" (Stanford Free & For Sale):** "Need a tent for a camping trip next month" → Muse asks "Is this for a
  trip? Want people to go with too?" → "Yosemite, Dec 6, down to go with people" → Marcus (tent, driving there) + the
  Yosemite carpool Event. `npm run demo -- need` to pre-run it.

Use these as the "and it's not just housing" beat, or as a backup if the room video misbehaves. Reset first or they stack up in Notifications.

**Plus-one.** Groups → **SF New Grads 2026** → Ask Muse.
1. `Going to beabadoobee at the Fox on Dec 12 and nobody I know is going`
2. `No ticket yet, I'd pay up to $70 for a spare but keep that private`
3. `Drinks before would be fun, small group, and I don't have a car so I'd need a ride back to the Mission`

Theo's Muse (has a ticket, driving back) and Lena's Muse (spare ticket) negotiate tickets, meeting point and the ride. Casey posted the same thing without Muse, so a reply is drafted. The connection card suggests Theo's pre-show Event. Line to say: "Same engine. The private part this time is a ticket budget."

**Ride to SFO.** Groups → **Stanford Free & For Sale** → Ask Muse.
1. `Need a ride to SFO Friday afternoon from the Mission`
2. `Flight's at 5:10, one carry-on and a backpack, happy to split gas`

Marcus's Muse settles it in two turns: 24th and Mission at 2pm, $10. Line to say: "Big asks bring people in. This is the kind of ask that brings them back every week."

**Reverse roommate.** Switch to Priya, Stanford Housing '27, ask for a room. Alex's room comes up. Shows the other side of the same match.

Terminal versions, for rehearsing without the UI:

```bash
MOCK_MUSE=true npm run demo              # roommate
MOCK_MUSE=true npm run demo -- plus_one
MOCK_MUSE=true npm run demo -- ride
```

## Saved run: "June room → New in SF weekend runs" (Akhil's favorite, Nov 12)

Full record (inputs, every result, the connection card text, the Muse-to-Muse transcript): **`docs/SAVED_RUN.md`**.

The run where Priya gets **More than a lease → "You're both new to SF and into weekend morning runs" → New in SF:
Weekend Runs**, Sam is "Best match" with the move-in-timing talk, Jordan stops early, and Casey's post doesn't fit.

Recreate it exactly:
1. `npm run snapshot -- restore june-room-weekend-runs` (restores the cached Muse responses + the demo state). Code
   at snapshot time: main `857ce27` + `fix/extension-hydration`. If prompts change later, check that commit out to
   replay it word for word.
2. To record it live from a clean slate instead: avatar menu → **Reset demo**, persona **Alex Kim**, open
   **Stanford Housing '27 → Ask Muse**, then type exactly:
   - tap the chip **Looking for a room**
   - `$1200; first two weeks of June.`
   - `I'm pretty clean and don't want a messy roomate; otherwise idc`  (keep the typo: inputs must match exactly)
   - tap **Yes, check** (reach = People in my Groups, the default in Muse settings)
3. On Priya's card: **More than a lease** → **Go together** → the Event → **Going**.
4. **Prove the Muses talked:** avatar menu → switch to **Priya Shah**. Her Home's first card is **"Alex's Muse talked
   with yours in Stanford Housing '27"** (also in her Notifications). Tap it: both Muses side by side, every message
   (Alex's private budget shows as "a private number" on her side), what they concluded, and which of *her*
   preferences her Muse used. Say: "Nobody messaged Priya. Two separate Muses did this, each knowing only its own
   person." Then **Message Alex** from her side.

