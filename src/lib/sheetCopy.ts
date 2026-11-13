// Muse's fixed lines in the chat sheet (components/muse/MuseSheet.tsx). The sheet sends its text messages back to
// /api/asks as conversation history, and scripts/warm-cache.ts must send byte-identical history for the Muse cache
// (keyed by the exact prompt) to hit on stage. So both import these. Client-safe: no server imports here.
import type { Ask } from "./types";

export const sheetCopy = {
  greeting: (first: string, groupName: string) =>
    `Hey ${first}. What do you need in ${groupName}? Tell me the stuff you wouldn't post, too. I keep that between us.`,
  moreDetail: "Tell me a bit more.",
  prefsIntro:
    "Here's what I'll look for. Tap a tag to change who sees what: Public can show on your card, Kept private I only use to check fit, Never shared stays with me.",
  updated: "Updated.",
  // Who Muse may talk to is a one-time choice in Muse settings (/muse/settings), not asked per chat.
  optIn: (_groupName: string, selling: boolean) =>
    selling
      ? `Want me to check with other people's Muses and see who'd want these? I'll work out price and pickup with theirs, only say what's in your list, and you'll see everything I share.`
      : `Want me to check with other people's Muses? I only share what you said was OK, and you'll see everything I say.`,
};

/** The video step only makes sense when there's something to film: a room you're offering or items you're selling. */
export function canShowVideo(ask: Pick<Ask, "side" | "type">): boolean {
  if (ask.side === "seeking") return false;
  return ask.type === "roommate" || ask.type === "sublet" || ask.type === "item";
}
