# Devpost draft

Copy into the Devpost form. Edit freely. No em dashes (handoff style rule).

## Project name

Mutuals

## Tagline

Your Muse talks to other people's Muses inside Facebook Groups, so you only have the conversations worth having.

## Inspiration

Young adults constantly need things from people nearby: a roommate, a sublet, a ride to SFO, someone to go to a show with. Facebook has the right pieces (real identity, verified schools, Groups, Marketplace, Messenger) but using them means posting publicly, which forces a bad tradeoff. You either overshare ("my real max is $1,350, my partner stays over most weekends") or leave out exactly what matters. Then you message fifteen strangers and have the same screening conversation fifteen times.

Meta has described a Muse network where your Muse works with your friends' and family's Muses. Young adults have few Facebook friends. We built the part for people you have not met yet.

## What it does

Inside a Facebook Group, you tap Ask Muse. You tell your Muse what you need, including the things you would never post. Every preference comes back tagged Public, Match only, or Never shared, and you can change any tag. You can film your room; Muse pulls out the details and the leftover items the next tenant might want, and can list them on Marketplace in one tap.

Then Muse asks one question: "Want me to check with other Muses in this group?" Say yes and your Muse pre-negotiates with every opted-in member's Muse at once, and reads the Group's human posts for people who do not have Muse. You get a shortlist: why each person fits, where you would disagree, a proposed compromise, trust signals, and a log of exactly what your Muse shared.

You pick one. A Messenger thread opens with a drafted opener. From there humans talk. Agents never commit and never message anyone.

When two people have more in common than a lease, and both opted in, Muse suggests an existing Facebook Event. Most matches get no suggestion. That is the point.

The same engine runs every Group ask. In SF New Grads, "going to beabadoobee, nobody to go with" gets Theo (has a ticket, driving back) and Lena (spare ticket) in one pass, with the private part being a ticket budget. In Free & For Sale, "need a ride to SFO Friday" is settled with Marcus in two turns. Big asks bring people in. Small weekly asks bring them back.

## How we built it

Next.js 15 (App Router, TypeScript, Tailwind) on the Meta Model API through the OpenAI-compatible endpoint.

- Muse Ember does everything you wait on: parses the ask into tagged preferences, plays each person's Muse in the back-and-forth, writes the referee verdict (one call per candidate after two rounds), makes the connection judgment, routes items to people, drafts openers and Marketplace copy, reads human Group posts, and watches and listens to the video (frames plus narration, extracted server-side with ffmpeg).
- Muse Spark identifies each item from its clearest frame and your words: exact make and model, condition, a used price range and a confidence. One call per item, in parallel.
- Muse Image generated the demo photos. Every role is one setting in a role map, so Wonder or Spark can take over any step; we measured Ember giving the same verdicts about 10 to 30 times faster, which is what keeps the live view watchable.
- Every model output is validated with zod. Every response is cached by input hash. A mock mode replays scripted responses with no network, and the UI shows which mode is running.

## Privacy, in code not in prompts

Never-shared preferences are removed before any prompt is built; the model cannot leak what it was never given. Match-only numbers (rent floors, budget ceilings, quiet hours) are compared in code, and every string a human sees is scanned so a private number or time cannot be printed. The live negotiation view shows disclosed facts as locked chips. Every outgoing agent message is logged under What my Muse shared. Tests cover all of it.

## Challenges we ran into

Making agent-to-agent negotiation both honest and fast enough to watch on stage. Two rounds, candidates in parallel, one referee call. Keeping private values private without trusting the prompt. Making it read as a Facebook feature rather than an app bolted on: no new tab, no settings page, the opt-in is a question in chat, every output is a Facebook object.

## Accomplishments

The whole hero path runs on two phones: ask, video, negotiation, shortlist, Messenger, notification on the other phone, reply, Event. Jordan gets rejected on a dealbreaker without the reason ever leaving Alex's side. Casey, who has no Muse, still gets matched from her post.

## What we learned

Practical needs are the easiest icebreaker there is. The AI is most valuable in the part people hate: screening on things they will not say out loud.

## What's next

Skill swaps, plus-ones and rides as fully live flows. Real Group and Marketplace data. Item crop-outs with SAM. A proper two-sided consent flow for the connection layer.

## Built with

Next.js, React, TypeScript, Tailwind CSS, zod, Meta Model API (Muse Spark, Muse Wonder, Muse Ember)

## Try it

Public repo: https://github.com/akhil-reddy-13/mutuals (README has one-command offline mode)
