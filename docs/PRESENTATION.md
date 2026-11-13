# Presentation script (5:00)

Speakers: **E** Eddy, **L** Luke (skit) · **K** Kyle (problem, how it works) · **A** Akhil (demo).
Setup: one laptop, production build in stage mode (`npm run demo:build`, stop the dev server, then
`npm run demo:start:stage`: cached replies still "think" ~1.5 s so the live part doesn't look canned), saved run restored
(`npm run snapshot -- restore june-room-weekend-runs`), desk video pre-run, `recordings/friends.mp4` open in
QuickTime, the app open on **Stanford Free & For Sale**. Total 4:50 (10 s buffer).

## 1. Skit (0:00-0:30) E + L
*L scrolling Reels. E walks up.*
- **E:** Yo, get off Reels. Facebook has a new feature. Check it out.
- **L:** Bro, nobody uses Facebook. I've got Insta, Snap, Hinge, Beli. My phone's out of storage.
- **E:** Aren't you looking for housing in SF? For your internship this summer?
- **L:** …Yeah. I don't know anyone there. I was gonna post in a housing Group with 1,800 strangers and just pray.
- **E:** And get ghosted by accounts with no profile picture. Watch this.

## 2. Problem (0:30-1:05) K
Young adults *do* use Facebook, just not to socialize. We use it to get real things done: a couch, a sublet, a
roommate. **23% of 18-to-34-year-olds on Facebook use Marketplace every single day**, more than any other age group.
But the part with other people is miserable. For a couch it's "is this still available?" to eleven sellers, then
haggling in DMs. For a roommate it's worse, because the other person has to *fit you*. So you post your real budget,
your sleep schedule and your dealbreakers to 1,800 strangers. We're not trying to make Facebook cool. We're making
the reason you already open it painless.

## 3. One line (1:05-1:15) K
So we built **Mutuals**. *Your Muse talks to their Muse, so you only talk to the people who actually fit.* Akhil?

## 4. Roommate demo, `friends.mp4` + live voiceover (1:15-2:40) A
Chill, conversational, about 185 words. Let the video breathe between lines.
- **Ask Muse:** This is Alex. He's got a two-bedroom in the Mission and needs a roommate. Instead of posting to a
  bunch of strangers, he just tells his Muse.
- **Lines typed, tags appear:** Including the stuff he'd never post, like his real budget, or that he's a night owl.
  Muse tags every fact, and anything marked "Never shared" gets removed in code before a model ever sees it.
- **Yes, check:** Then his Muse goes and talks to the Muses of seven people looking for a room. All at once. Rent,
  move-in, quiet hours. Budgets are just a yes or no, so nobody's real number gets out.
- **Verdict:** And it comes back like a friend would: "Priya's the best one, but you two should talk about weeknight
  noise."
- **Shortlist, Message Priya:** People, not listings. Muse drafts the first message, and Alex hits send.
- **More than a lease, Go together:** Here's our favorite part. They're both new to SF and both run on weekends, so
  Muse suggests the New in SF weekend run. Most matches get nothing.
- **Switch to Priya:** On her side: "Alex's Muse talked with yours." She can read the whole conversation, and Alex's
  budget just shows up as "a private number".
- **She taps Going:** A roommate search just turned into Saturday plans. And honestly, that's what gets Gen Z back on
  Facebook. Not making it "cool" for existing friends, but making it the place you actually meet people.

## 5. Selling, LIVE (2:40-3:40) A
*Switch to the app: Stanford Free & For Sale, Ask Muse.* Backup if anything breaks: play `recordings/selling.mp4`.
- **Transition (while switching):** But a roommate's a once-a-year thing. The stuff you're on Facebook for every
  week is smaller, like getting rid of everything when you move out. So let's do that one live.
- *Tap "Selling some stuff before I move out", answer Muse's question.* I filmed my desk on my phone and just talked
  over it.
- *Upload `~/Downloads/Selling_catalog_items.MOV`, tap Catalog items.*
- **Muse Ember** watches the frames *and* listens. Here's the word-for-word transcript; it lists only what I said
  I'm selling and notes what it saw that I didn't mention.
- Each item goes to **Muse Spark**, in parallel, with its clearest frame and the frames around it. I said "this Canon
  camera"; Spark read the body and identified a **Canon PowerShot G7 X Mark II**, with a used price range and a
  confidence. Everything's editable.
- **Yes, check.** Instead of a listing that eleven people message "is this still available", my Muse checks who's
  already looking: *two of these already have a home.* The camera goes to June, going to Japan in December. The
  earbuds go to Theo, for his BART commute. Their Muses already worked out price and pickup. The rest gets offered to
  everyone nearby.

## 6. How it works and trust (3:40-4:20) K
- **Muse Ember** handles everything you wait on: chat, watching and listening to video, both sides of every Muse
  conversation, the verdict. Side by side with the bigger models, it made the same decisions in about a second
  instead of thirty. **Muse Spark** does the one job it's clearly better at: reading an exact model off a photo.
- **Privacy is in code, not prompts.** Never-shared facts never enter a model. Private numbers are compared as yes or
  no, and every sentence a human sees is checked for private details first.
- **You choose who your Muse can talk to** in one setting: people you're connected with, your Groups, or everyone nearby.
- **Muse never commits.** It hands you people and a draft. You decide, and you hit send.

## 7. Close (4:20-4:50) all
- **K:** A marketplace finds you stuff. **Your Muse finds you people, and the stuff is just the reason to meet.**
- **E** *(to L)*: So… still homeless?
- **L:** Nah. I've got a roommate. And a Saturday run club, apparently.
- **A:** You might have zero mutuals on Facebook today. **Mutuals builds them for you.** Thank you.

## Notes
- Running long: drop the "See why" line in section 4. If the video stalls, keep narrating over the frame.
- Rehearse the handoffs with a timer (K to A at 1:15, A to K at 3:40).
- Q&A: `docs/QA.md`.
