# Q&A prep: decisions and answers

Every answer here matches what the app actually does. **Built** = you can show it. **Decision** = not built, but this is
our answer and the product would work this way. Never claim a Decision is built.

## Lines to preempt in the script (say these before judges ask)

1. "Muse never messages anyone for you. It hands you people and a drafted opener; you send it." (automation worry)
2. "Your real budget never leaves your Muse. The other side only learns 'budgets overlap', not the number." (privacy)
3. "Works on day one: if the other person doesn't have Muse on, mine reads their Group post and drafts a reply." (cold start)
4. "Most exchanges stay exchanges. Sam fit, and Muse suggested nothing more." (creepiness)
5. "Your ask stays open. When someone new in the Group needs what you have, their Muse checks with yours and you both get a notification." (does it keep searching)

## Does Muse keep searching after I close the app?

- **Built:** Matching runs on the server, so closing the chat or locking your phone doesn't stop it. Results land in
  Notifications. Your ask stays open in the Group: when someone else later asks for the matching thing (e.g. Priya
  looking for a room), their Muse checks with yours and **both** of you get a notification. Try it: run Alex's room
  ask, then switch to Priya and ask for a room.
- **Decision:** It's event-driven, not polling. Muse checks when something new happens in the Group (a new ask, a new
  post), never on a timer. That keeps costs low and means no "still looking…" spam. Asks close when you say you're done
  or after 30 days, and Muse asks you first ("Still need a roommate?").

## What exactly gets shared, and with whom?

- **Built:** Every preference is tagged **Public**, **Kept private** or **Never shared**. Never-shared facts are removed
  in code before any prompt is built (tested). Private numbers are compared in code (`budgetsOverlap`), and every
  sentence a human sees is scanned so a private number or time can't be printed. "What my Muse shared" shows every
  line your Muse said. Facts like "doesn't drink" are protected by prompt instructions, not by code. Say so if asked.

## Can someone fake an ask to fish for private info?

- **Built:** A fake asker only ever sees summaries ("budgets overlap", "different plans for drinks"), never your numbers or
  private facts. **Decision:** rate-limit asks per person per Group, and it only runs inside Groups you joined,
  under your real Facebook identity.

## What if someone lies to their Muse?

- Same as lying in a Group post today, but with more trust signals: verified school, shared Groups and mutual friends
  on every card. Muse only states facts the person gave it. Nothing is committed until humans talk.
  **Decision:** suggest a public first meetup; normal Facebook reporting applies.

## Isn't this just automating conversation?

- No. It automates the screening and logistics (the fifty awkward messages), then gets out of the way. The humans
  have the real conversation, and the opener is a draft you edit.

## Why not a better search or filter?

- Filters can't use what people won't post: the real max, "partner stays over", "night owl". Two Muses can check
  those against each other and return "fits" without either person exposing them.

## Why Facebook, not Instagram or a new app?

- Instagram is for people you already know. Facebook is for people you need to meet: Groups, Marketplace, Messenger,
  Events and real identity, all in one place. You don't need any Facebook friends; your school or city Group is enough.

## Which Muse model does what, and why?

- **Built:** One role map (`src/lib/muse.ts`). **Ember** handles everything you wait on: chat, watching and
  listening to the video, the back-and-forth between Muses, verdicts, finding homes for items, openers. It answers in
  about 1 second. **Spark** identifies exact models from a photo (it read "G7X" off the camera), running in parallel
  so rows fill in as each finishes. **Muse Image** generated the demo photos. **Wonder** can take over any role with
  one setting. We measured side by side: same verdicts and routing, about 10–30x faster on Ember today.

## How fast is it? What does it cost?

- About 1–2 s per chat reply, about 10–20 s to check a whole Group live, and instant for rehearsed runs (cached by
  input). Checking one person is about six short Ember calls, which costs a fraction of a cent.

## Is the demo live or faked?

- Live. Every result comes from a real Muse call. Rehearsed inputs replay from a response cache so the stage demo is
  instant, and `MOCK_MUSE=true` is an offline fallback we only use if the wifi dies. The seed people are fictional.

## What if Muse gets an item wrong?

- **Built:** Each item shows a confidence level and why Spark thinks so. Every field (name, model, price, condition)
  is editable, and items you didn't mention are off by default.

## How is it different from Marketplace?

- Marketplace finds you stuff. Muse finds you people, and the stuff is the reason to meet: "2 of these already have a
  home", sent to June (Japan trip) and Theo (BART commute), each with why.

## Isn't the connection part creepy?

- Both people opt in. It only appears with real shared interests, it's always an activity ("join the New in SF
  weekend runs"), never "be friends", and most matches get nothing.

## Retention: why come back?

- Big asks (a roommate) bring you in. Small weekly ones (a ride, a study partner, a show) and the daily digest bring
  you back. Events turn one exchange into something recurring.

## Where does it search?

- **Built:** Inside the Group you ask in. If nobody there fits, Muse says so and offers the Group where people do
  ("4 people in Stanford Housing '27 might fit. Ask there?"). **Decision:** reach expands to your school, friends of
  friends and nearby, with you choosing. (See PRD §3.1.)

---

## Where the problem-statement draft and the product differ (fix the doc or the script)

| Draft says | Product does | Suggested wording |
|---|---|---|
| Spark "searches it up and does research" to find the model and price | Spark reads the photo plus what you said. It doesn't browse the web | "Spark reads the label and the shape in the clearest frame, then estimates a used price range, with a confidence level" |
| "The two Muses mutually agree… then initiate conversation between the two" | Muses pre-check and draft an opener; **you** send it (design rule 6) | "The Muses check if it would work, then hand both of you the conversation" |
| "Making new friends: autonomously polling for people who fit you" | No friend-finder or polling. Connection comes out of a real exchange, activity-based, both opted in | "When two people have more in common than a desk, Muse suggests something to do together" |
| "We search across your Group, followers, nearby people, people from your school" | Built: Group-scoped (plus "ask in another Group"). The rest is a Decision | Say "starts in your Groups; reach can expand to your school and city" |
| "Digital card… fun facts… nudges like 'X runs weekly with this run club'" | Built as the one hook per card + the connection card (e.g. "You're both into indie music") | Use the real examples from the demo |
| Selling is demo #1 | `docs/DEMO.md` leads with the roommate hero (per the Nov 12 update), with selling at 4:20 | Pick one order and keep the video and live demo consistent |
| "23% of 18–34 users use Marketplace daily" | n/a | Keep the source link handy; judges may ask |
