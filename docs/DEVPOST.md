# Devpost draft

Copy into the Devpost form. Edit freely. No em dashes (handoff style rule).

## Project name

Mutuals

## Tagline

Skip the fifty awkward messages. Your Muse checks with other people's Muses to find who actually fits what you need, so you only talk to the right people.

## Inspiration

Young adults constantly need things from people nearby: a roommate, a sublet, a ride to SFO, someone to go to a show with. Facebook has the right pieces (real identity, verified schools, Groups, Marketplace, Messenger) but using them means posting publicly, which forces a bad tradeoff. You either overshare ("my real max is $1,350, my partner stays over most weekends") or leave out exactly what matters. Then you message fifteen strangers and have the same screening conversation fifteen times.

Meta has described a Muse network where your Muse works with your friends' and family's Muses. Young adults have few Facebook friends. We built the part for people you have not met yet.

## What it does

Inside a Facebook Group, you tap Ask Muse privately. You tell your Muse what you need, including the things you would never post. Every preference comes back tagged Public, Kept private, or Never shared, and you can change any tag. You can film your room; Muse pulls out the details and the leftover items the next tenant might want.

Then Muse asks who it may talk to, as an explicit privacy choice with a live count for each: People I'm connected with (friends and friends of friends), People in my Groups (recommended), or Everyone nearby (your school or city). Your Muse then has a real back-and-forth with each person's Muse at once, and reads human posts for people who do not have Muse. You get a shortlist of people, not listings: why each one fits, where you would disagree, a proposed compromise, trust signals, and a log of exactly what your Muse shared.

The other person sees it happened. Switch to Priya and her Home says "Alex's Muse talked with yours." It opens the whole conversation from her side: both Muses side by side, every message, Alex's private budget shown only as "a private number", and which of her own preferences her Muse used. Nobody messaged her.

You pick one. A Messenger thread opens with a drafted opener. From there humans talk. Agents never commit and never message anyone.

When two people have more in common than a lease, and both opted in, Muse suggests an existing Facebook Event. Most matches get no suggestion. That is the point.

Selling works the same way. Film your stuff and talk over it ("I want to sell this Canon camera, these Poly earbuds"). Muse Ember hears you and finds the items; Muse Spark names each exact model from its clearest frame (Canon PowerShot G7 X Mark II) with a used price range. Then Muse checks with people who are looking for something: "2 of these already have a home." The camera goes to June, who is going to Japan in December; the earbuds to Theo, for his BART commute. Your Muse and theirs work out price and pickup ("Meet on campus, $425"), and the rest is offered to everyone nearby.

The same engine runs every Group ask. "Need a tent for a camping trip" gets one friend-like question ("Is this for a trip? Want people to go with too?"), then Marcus, who has a tent and is driving to Yosemite, and the carpool Event to join. In SF New Grads, "going to beabadoobee, nobody to go with" gets Theo (has a ticket, driving back) and Lena (spare ticket) in one pass, with the private part being a ticket budget. In Free & For Sale, "need a ride to SFO Friday" is settled with Marcus in two turns. Big asks bring people in. Small weekly asks bring them back.

## How we built it

Next.js 15 (App Router, TypeScript, Tailwind) on the Meta Model API through the OpenAI-compatible endpoint.

- Muse Ember does everything you wait on: parses the ask into tagged preferences, plays each person's Muse in the back-and-forth, writes the referee verdict (one call per candidate after two rounds), makes the connection judgment, routes items to people, drafts openers and Marketplace copy, reads human Group posts, and watches and listens to the video (frames plus narration, extracted server-side with ffmpeg).
- Muse Spark identifies each item from its clearest frame and your words: exact make and model, condition, a used price range and a confidence. One call per item, in parallel.
- Muse Image generated the demo photos. Every role is one setting in a role map, so Wonder or Spark can take over any step; we measured Ember giving the same verdicts about 10 to 30 times faster, which is what keeps the live view watchable.
- Every model output is validated with zod. Every response is cached by input hash. A mock mode replays scripted responses with no network, and the UI shows which mode is running.

## Privacy, in code not in prompts

Never-shared preferences are removed before any prompt is built; the model cannot leak what it was never given. Kept-private numbers (rent floors, budget ceilings, quiet hours) are compared in code, and every string a human sees is scanned so a private number or time cannot be printed. A second guard catches the words of a private fact ("night owl", "partner stays over") echoed into a match card or opener, and the one-line title Muse writes for your ask is redacted anywhere someone else sees it. The live negotiation view shows disclosed facts as locked chips. Every outgoing agent message is logged under What my Muse shared. Tests cover all of it.

## Challenges we ran into

Making agent-to-agent negotiation both honest and fast enough to watch on stage. Two rounds, candidates in parallel, one referee call. Under load the heavier models took 10 to 30 seconds a call, and one candidate is six calls in a row, so we measured each job side by side and moved everything the user waits on to Ember (same verdicts, about 1 second a call), keeping Spark for reading exact models off photos. Making it provable that two separate Muses really talked, which became the conversation page the other person sees. Keeping private values private without trusting the prompt. Making it read as a Facebook feature rather than an app bolted on: no new tab, no settings page, the opt-in is a question in chat, every output is a Facebook object.

## Accomplishments

The whole hero path runs live: ask, video, negotiation, shortlist, Messenger, the other person's notification and their side of the Muse conversation, reply, Event. Jordan gets rejected on a dealbreaker without the reason ever leaving Alex's side. Casey, who has no Muse, still gets matched from her post. A real iPhone video of a cluttered desk ("this Canon camera") comes back as a Canon PowerShot G7 X Mark II with a price range, routed to the one person who needs it, with the two Muses haggling the price.

## What we learned

Practical needs are the easiest icebreaker there is. The AI is most valuable in the part people hate: screening on things they will not say out loud.

## What's next

Standing asks that wake up when someone new in your reach needs the other side (event-driven, never polling). Real Group and Marketplace data. Item crop-outs with SAM and clean listing photos with Muse Image. A proper two-sided consent flow for the connection layer.

## Built with

Next.js, React, TypeScript, Tailwind CSS, zod, ffmpeg, Meta Model API (Muse Ember, Muse Spark, Muse Image; Muse Wonder available per role)

## Try it

Public repo: https://github.com/akhil-reddy-13/mutuals (README has one-command offline mode)
