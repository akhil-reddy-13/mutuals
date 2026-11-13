# Saved run: "June room → run together" (the connection moment to recreate)

Recorded Nov 12, 2026 by Akhil. This is the run where the **friendship layer** landed perfectly: a practical room
search turned into a low-pressure plan to *do something together*. Keep it as the reference for the demo and video.

## How to get it back

1. **Exact replay (always works):** `npm run snapshot -- restore june-room-weekend-runs`, then reload. Restores the
   demo state (Alex's ask, the four matches, the Muse-to-Muse conversations, Priya's "More than a lease" card)
   and the cached Muse responses.
2. **Typing it live:** the inputs below reproduce this run word for word **only on the prompts it was recorded
   with** (main `857ce27` + `fix/extension-hydration`, through `feat/selling-muse-talk`). Later prompt changes (e.g.
   Luke's `fix/demo-blockers` agent-voice rules) make a live re-run come out differently. That's expected; the
   snapshot still restores this exact one. To re-record on newer prompts, run it again and
   `npm run snapshot -- save <new-name>`.

## Inputs (as Alex Kim, Stanford Housing '27 → Ask Muse)

1. Tap the chip **Looking for a room**
2. Type `$1200; first two weeks of June.`
3. Type `I'm pretty clean and don't want a messy roomate; otherwise idc` (keep the typo)
4. Pick **People in my Groups** (older builds: **Yes, check**)

Muse asked: "What's your budget and when do you need to move in? I'll keep that private." then
"What about schedule, guests, cleanliness, and pets — anything I should know? I'll keep that private."

Tags: budget $1200 (Kept private) · move-in first two weeks of June (Public) · cleanliness, no messy roommate
(Kept private, dealbreaker).

## What came back

Muse: *"I found two people who fit. Sam's the better one, but you two should talk about move-in timing. You decide
who to message. I won't message anyone. One more thing on Priya's card."*

| Person | Result | Why / the one thing to talk about |
|---|---|---|
| **Sam Rivera** | Best match | Budgets and cleanliness line up; talk about move-in timing (early summer vs mid-September) and late-night gaming. Suggestion: start in June on a shorter term, agree a quiet-hours cutoff. |
| **Priya Shah** | Fits + **More than a lease** | Budgets and cleanliness line up; June vs September needs a human decision. |
| **Jordan Lee** | Not a fit | Budgets don't overlap, timing differs, the dog is non-negotiable. Muse stopped early. |
| **Casey Nguyen** | Not a fit (from her post) | Both looking for a room, neither offering. |

## The connection moment (this is the part to recreate)

On Priya's card, **More than a lease**:

> You're both new to SF and into weekend morning runs, so this Saturday run could be a natural low-pressure way to meet.
>
> 🏃 **New in SF: Weekend Runs** · Saturdays, 8:00 AM · 4 going · **Go together**

Why it works for the pitch:
- It came out of a real practical match (a room), not a "you should be friends" prompt.
- It's **activity-based** and points at an existing open Event (design rule 5).
- It's **selective**: Sam fit too and got nothing. Most exchanges stay exchanges (rule 4).
- Both people opted in to connection suggestions; the overlap is in interests they chose to share.

## The Muse-to-Muse conversation (Alex ⇄ Priya)

1. **Alex's Muse:** Hi Priya, I'm pre-negotiating for Alex Kim, who is looking for a room starting in the first two
   weeks of June. The numbers work on our side, and Alex is pretty clean and does not want a messy roommate. That
   cleanliness point is a dealbreaker… Could you share your thoughts on rent, move-in timing, and cleanliness?
2. **Priya's Muse:** On rent, Priya's budget is around a private number and the numbers work on our side… The timing
   is a mismatch to flag plainly: Alex is looking for June, but Priya is looking to move in early September…
3. **Alex's Muse:** …glad to hear Priya keeps common areas clean… The move-in timing is the blocker to flag plainly…
4. **Priya's Muse:** …Priya is up early on weekdays and keeps quiet after 11pm on weeknights, so we'd want to
   confirm that quiet-hours compromise works for Alex.
5. **The call:** One thing to talk about: move-in timing. Budgets and cleanliness line up, but June vs September
   needs a human decision.

## Demo beats on top of it

1. Alex's shortlist → Priya's card → **More than a lease** → **Go together** → the Event → **Going**.
2. **Prove the Muses talked:** switch to **Priya**. Her Home's first card: **"Alex's Muse talked with yours in
   Stanford Housing '27"**. Open it to see both Muses side by side, Alex's budget as "a private number", and which of
   her preferences her Muse used. Then **Message Alex**.
