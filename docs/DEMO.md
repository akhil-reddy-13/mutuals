# Mutuals demo script (5 min live + 3 min Q&A)

Two phones (or two browser windows), both on the dev server (`npm run dev:lan`, open the Network URL on each phone).
Phone A is **Alex** (presenter). Phone B is **Priya** (teammate). Switch persona from the avatar menu, top right.

## Before you go on

```bash
npm run warm        # only with a real key: pre-runs every hero call so the cache is hot (also resets state)
npm run demo:build  # production build (separate .next-demo folder, safe alongside npm run dev)
npm run demo:start  # http://localhost:3000. ~100x faster pages than dev, and no Next.js "N" dev badge
# or, with no key / flaky wifi:
MOCK_MUSE=true npm run demo:start
```
Stop any `npm run dev` on port 3000 first. Re-run `demo:build` after pulling new code.

Then on Phone A: avatar menu → **Reset demo**. That clears asks, matches, threads and the opt-in.
Both phones start on **Home** (a normal-looking feed). Phone A goes **Groups → Stanford Housing '27** when the problem beat ends. Phone B goes to Notifications later.

## The lines Alex types (keep them exactly, the offline mock is scripted to them)

1. `I signed a 2BR in the Mission from Sept 1 and need a roommate for the second bedroom`
2. `Posting it at $1,350 but honestly I'd take $1,200 for the right person, keep that private`
3. `I'm a night owl, my partner stays over some weekends, no dogs please. Don't share my health stuff ever.`

## Beats

| Time | Say | Do (Phone A unless noted) |
|---|---|---|
| 0:00 | Problem. Young adults need roommates, rides, sublets. Public posts make you overshare or hide what matters. Most of us barely have a Facebook network. | Start on Home. Tap Groups → Stanford Housing '27. Show Casey's ISO post, Jordan's dog post. Scroll. |
| 0:45 | "Meta described a Muse network for friends and family. We built the part for people you haven't met yet, inside the Groups you're already in." | Tap **Ask Muse privately** in the composer. |
| 1:00 | "You tell your Muse the stuff you'd never post." | Type line 1, 2, 3. Point at the badges: **Public**, **Match only**, **Never shared**. Tap one badge to show it cycles. |
| 1:45 | "Film the room. Ten seconds." | Record video (or Use photos). Room facts + leftover items appear. Tap **List on Marketplace**. |
| 2:15 | "Now the part no search box can do." | Tap **Yes, check**. Watch Priya's negotiation stream. Point at the lock chips: match-only facts are used, never shown. Point at Priya's Muse saying "a private number". |
| 2:50 | "Jordan: dealbreaker, the Muses stopped early. Casey has no Muse, so mine read her post and drafted a reply. Sam fits, nothing more." | Scroll the shortlist. Open **What my Muse shared with Priya**. |
| 3:15 | "Then you talk. The agents never message anyone." | Tap **Message Priya**. The opener is pre-drafted. Send. |
| 3:30 | **Phone B:** "Priya got a notification. Her view shows the same summary, never Alex's numbers." | Phone B: Notifications → the match → Messenger. Reply by hand. Phone A sees it (2s poll). |
| 4:00 | "Most exchanges stay exchanges. Sam got no suggestion. Priya did." | Back on A: Priya's card → **More than a lease** → **Go together** → the Event. Tap **Going**. |
| 4:30 | "Same engine, every small ask." | Open **Muse** (left rail or home tab) → digest: skill swap, plus one, SFO ride. |
| 4:50 | "You might have zero mutuals on Facebook today. Mutuals builds them for you." | Closing slide. |

## If something breaks

- Stream stalls: close the sheet, tap the **N people fit your ask** row on the Group page. Matches are saved as they finish.
- Wifi dies: restart with `MOCK_MUSE=true npm run dev`. Same lines, same results, no network.
- Wrong persona on a phone: avatar menu → pick the right one.
- Everything: **Reset demo** and start from line 1. The whole hero path takes about 90 seconds.

## Honesty notes for Q&A

- If the negotiation you showed was served from cache or mock, say so: "pre-run on Muse this morning, replayed because of venue wifi."
- The numbers comparison (budgets overlap) is computed in code, not by the model. Say that proudly: it is the privacy guarantee.
- Models: Spark for the two agents, openers and ask parsing; Wonder once per candidate as referee and once for the connection judgment; Ember for video frames, post reading and the digest.

## Other live flows (same engine, 20 to 40 seconds each)

Use these as the "and it's not just housing" beat, or as a backup if the room video misbehaves. Reset first or they stack up in Notifications.

**Plus-one.** Groups → **SF New Grads 2026** → Ask Muse privately.
1. `Going to beabadoobee at the Fox on Dec 12 and nobody I know is going`
2. `No ticket yet, I'd pay up to $70 for a spare but keep that private`
3. `Drinks before would be fun, small group, and I don't have a car so I'd need a ride back to the Mission`

Theo's Muse (has a ticket, driving back) and Lena's Muse (spare ticket) negotiate tickets, meeting point and the ride. Casey posted the same thing without Muse, so a reply is drafted. The connection card suggests Theo's pre-show Event. Line to say: "Same engine. The private part this time is a ticket budget."

**Ride to SFO.** Groups → **Stanford Free & For Sale** → Ask Muse privately.
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
