# Devpost submission

## Project name
Mutuals

## Tagline
Your Muse talks to their Muse, so you only talk to the people who fit.

## Problem to solve
Young adults use Facebook to get real things done: a roommate, a sublet, a couch, a buyer for the stuff they're
leaving behind. But the part with other people is miserable. You message "is this still available?" to dozens of
people, haggle in DMs, and repeat the same screening conversation over and over. For a roommate it's worse: the only
option is posting your budget, sleep schedule and dealbreakers to 1,800 strangers.

## Our solution
Mutuals is a new layer inside Facebook Groups. You tell your Muse what you need, including what you'd never post
publicly. Your Muse talks to the Muses of other people in your Groups, each knowing only its own person, and comes
back with a ranked shortlist of people who actually fit, plus the one thing you should talk about. You decide who
to message, and Muse drafts the first line.

## What problem are you solving for young adults, and why is it important to them?
Young adults use Facebook for practical things, not to socialize. Our friends are on Instagram, TikTok and Snap,
but when we need a roommate, a sublet, a couch, or someone to buy our stuff before we move out, we end up in
Facebook Groups and Marketplace.

That part works badly, and it's the part involving other people. A listing gets a pile of "is this still
available?" messages, then haggling in DMs. A roommate search is worse, because the other person has to fit you:
your budget, your schedule, your habits, your dealbreakers. The only tool is a public post, which forces a bad
tradeoff. Either you overshare private details with strangers, or you leave out exactly what matters and find out
three conversations in.

This matters because these are some of the biggest moments of being a young adult: moving to a new city for an
internship or first job, often without knowing anyone. Finding a roommate or selling your stuff is also how you'd
meet the people around you. Right now Facebook turns it into busywork, and people give up and close the app.

## Describe your solution/product, and how it solves the problem.
Mutuals adds a Muse to every Facebook Group. Instead of posting, you tap Ask Muse and say what you need in a few
lines, like talking to a friend.

1. **You tell your Muse, not the Group.** Every fact is tagged Public, Kept private, or Never shared, and you can
   change any tag. Alex can say his real floor is $1,200 even though he's asking $1,350.
2. **Muses talk to Muses.** Say "Yes, check" and your Muse opens a real conversation with the Muse of everyone in
   reach who's looking for the same thing, all in parallel. They work through rent, move-in dates, quiet hours, or
   price and pickup. Each Muse only knows its own person. Private numbers are compared in code as a yes or no, so
   nobody's real number crosses over. People who don't have Muse still count: your Muse reads their Group post and
   drafts a reply.
3. **You get people, ranked.** Muse comes back like a friend: "I found three people who fit. Priya's the best one,
   but you two should talk about weeknight noise." Each card shows why they fit, where you'd disagree, and a
   compromise the Muses already proposed.
4. **You talk.** Muse never messages anyone for you. It drafts an opener with real context, and you hit send in
   Messenger.
5. **Sometimes, more than a lease.** When two people share something real and both opted in, Muse suggests an
   activity, an existing Facebook Event like "New in SF: Weekend Runs". Most matches get nothing, so it means
   something when it shows up.
6. **Proof, and control.** The other person sees "Alex's Muse talked with yours" and can read the whole
   conversation from their side, with Alex's private values shown only as "a private number". You choose who your
   Muse can talk to in Muse settings: people you're connected with, your Groups, or everyone nearby, with a switch
   per Group.

The same engine handles selling. Film your desk and talk over it. Muse lists what you said you're selling,
identifies each exact model, and checks who's already looking: "2 of these already have a home." The camera goes to
June, who's going to Japan. The earbuds go to Theo, for his BART commute. Their Muses already discussed price and
pickup.

It solves the problem by moving the screening and the logistics into Muse-to-Muse conversations that happen in
seconds and in private. Humans only show up for the conversations worth having.

## How does Muse play a key role in your solution?
Muse is the product. Every step a user waits on runs on Meta's Muse models through the Meta Model API, behind one
role map in our code (`modelFor`):

- **Muse Ember**: the chat that turns what you say into tagged preferences; watching and listening to your video
  (frames plus your narration, so what you *say* decides what gets listed); both sides of every Muse-to-Muse
  conversation; the verdict for each person; whether two people should be introduced to an activity; routing items
  to the people who need them; and the opener.
- **Muse Spark**: identifying each item from its clearest frame and the frames around it. I said "this Canon
  camera"; Spark read the body and named a Canon PowerShot G7 X Mark II, with a used price range and a confidence
  level. Items run in parallel.
- **Muse Image**: every photo in our demo feed.

We picked models by measuring. On the same inputs side by side, Ember made the same decisions as Spark and Wonder in
about a second instead of 10 to 30 seconds. Checking one person takes about six calls in a row, so that speed is what
makes the live view watchable. Spark keeps the one job where it was clearly better: reading an exact model off a
shaky photo. Any role can switch to Spark or Wonder with one setting.

Agent-to-agent only works because each person has their own Muse that represents them and knows only what they
allowed. Meta has described a network where your Muse works with your friends' and family's Muses. Mutuals extends
that to the people you haven't met yet.

## Walk us through your build process and how you leveraged AI in your workflow
*Problem and brainstorming.* We started from our own experience: all four of us have hunted for housing or sold stuff
in Facebook Groups and hated it. We used AI to pressure-test ideas, asking it to argue against each one and list what
a judge would poke at. That pushed us from "a smarter Marketplace search" to agent-to-agent: the thing a search box
can't do is screen on what people won't say out loud.

*Design and spec.* Before writing code, we wrote a PRD with AI help: the hero flow, the data types, every prompt, the
privacy model, and a demo plan. We kept a shared instructions file (`CLAUDE.md`) for the AI coding agents each of us
used, with hard rules: every model call goes through one client, every output is validated with a schema, every
prompt with preferences is built from one privacy function. With four people and their agents editing one repo, that
file kept everyone consistent.

*Architecture.* Next.js and TypeScript. Every Muse call goes through one client that handles model routing, retries,
schema validation, a response cache keyed by input, and an offline mock mode. Matching runs every candidate in
parallel and streams each Muse-to-Muse turn to the screen as it happens.

*Where AI helped most.* Speed. Coding agents built the Facebook-style UI, the streaming live view, the video pipeline
(server-side ffmpeg pulls frames and audio from iPhone videos), and a tool that drives the real app in a browser to
record our demo clips. A second agent reviewing the code caught real bugs: matching died if the browser
disconnected, and one side's private number could slip into the transcript.

*Where it fell short, and how we adapted:*
- **Prompts don't guarantee privacy.** Models sometimes repeated a private number or phrase ("night owl", "partner
  stays over") onto a card both people see, even when told not to. So we moved privacy into code: never-shared facts
  are removed before a prompt exists, budgets and move-in dates are compared in code, and every sentence a human sees
  passes deterministic checks that catch rewrites like "$1300" or "1.3k". Tests cover it.
- **Models aren't deterministic.** The same video gave slightly different item names, and once the routing step said
  nobody wanted a camera that clearly fit June. We added a retry for that case, a fixed shortlist ranking so Muse's
  "Priya's the best one" always matches the cards, and snapshots that save a good run and replay it word for word.
- **Bigger wasn't better for us.** We expected the largest model to run the agent conversations. Measuring showed
  Ember gave the same verdicts far faster, so we rebuilt the role map around it.
- **Agents drift.** Docs and on-screen copy went stale as features changed, and agents happily wrote jargon. We set
  copy rules (results are people, not listings; no "agents" or "negotiation" in the UI) and reviewed everything a
  user sees by hand.

## Individual contributions
- **Akhil:** Product direction and the agent-to-agent engine around it. The Muse-to-Muse conversation page that
  proves the Muses talked (readable from either side, private values redacted). The selling flow end to end: video
  with narration, item identification with Spark, routing items to buyers, per-buyer price and pickup
  conversations. Privacy controls in Muse settings, move-in timing checks in code, saved-run snapshots, the demo
  clip recorder, README, Q&A prep and the presentation script.
- **Kyle:** The core matching engine and most of the frontend: Group-scoped asks, parallel matching with two rounds
  plus a referee, the sealed budget comparison. The Facebook-style interface (Home feed, Groups, the Muse chat with
  live matching, match cards, notifications), the full-page Muse chat, per-Group Muse switches. The realism pass
  (posts, photos, comments, extra demo flows), a code-review round of fixes, and the first Devpost draft.
- **Luke:** The demo video, from recording tooling through the screenplay to the final 1080p60 cut. Demo-blocker
  fixes in the engine, including the guard that keeps private wording off cards both people see, and matching that
  survives a failed candidate.
- **Eddy:** The shortlist experience: fit levels (Fits, Could work, Long shot) instead of scores, the two-up card
  redesign, the "Your ask" header. Muse chat memory across asks, the extra roommate candidates who make the search
  realistic, and the Muse conversations wall used in the demo.

## Built with
Next.js, React, TypeScript, Tailwind CSS, zod, ffmpeg, Meta Model API (Muse Ember, Muse Spark, Muse Wonder, Muse Image)

## Links
- Code: https://github.com/akhil-reddy-13/mutuals
- Demo video: `docs/video/mutuals-demo.mp4`
