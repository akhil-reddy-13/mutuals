# Presentation script (5:00)

Speakers: **E** Eddy, **L** Luke (skit) · **K** Kyle (problem, how it works) · **A** Akhil (demo).
Setup: one laptop, production build (`npm run demo:start`), saved run restored
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
- **Opens Stanford Housing, Ask Muse:** This is Alex. He signed a 2BR in the Mission and needs a roommate. Instead of
  posting, he opens Muse inside the Group and tells it everything, including what he'd *never* post.
- **Three lines + tags:** His real floor is $1,200 even though he's asking $1,350. He's a night owl, his partner stays
  over some weekends, and health stuff stays private. Muse tags every fact Public, Kept private or Never shared, and
  "Never shared" is removed in code before any model sees it.
- **Yes, check; seven Muses talking:** Alex's Muse opens a real conversation with the Muse of every person in his
  Groups looking for a room. Seven at once, each a separate Muse that only knows its own person. They negotiate rent,
  move-in and quiet hours, and budgets are compared in code as a yes or no, so nobody's real number crosses over.
- **Muse's verdict:** *"I found three people who fit. Priya's the best one, but you two should talk about…"*
- **Shortlist, See why:** Every result is a *person*, not a listing: verified Stanford, shared Groups, what lines up,
  the one thing to talk about, and a compromise the Muses already proposed.
- **Message Priya:** Muse never messages anyone for you. It drafts the opener with real context, and Alex hits send.
- **More than a lease, Go together:** Priya and Alex are both new to SF and both run weekend mornings. Muse doesn't
  say "be friends"; it suggests an *activity*: the New in SF weekend run. Most matches never get this. Sam fit too
  and got nothing.
- **Switch to Priya, "Alex's Muse talked with yours":** The proof the Muses really talked. Priya reads the whole
  conversation from her side. Alex's private budget shows as "a private number", and she sees which of *her* facts
  her Muse used.
- **She taps Going:** A roommate search just became Saturday plans.

## 5. Selling, LIVE (2:40-3:40) A
*Stanford Free & For Sale, Ask Muse, chip "Selling some stuff before I move out", answer the follow-up, upload
`~/Downloads/IMG_6396.MOV`, Catalog items.* Backup if anything breaks: play `recordings/selling.mp4`.
- Same engine, the other thing everyone does on Facebook. This part's live. I filmed my desk and talked over it.
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
