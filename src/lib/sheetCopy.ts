// Muse's fixed lines in the chat sheet (components/muse/MuseSheet.tsx). The sheet sends its text messages back to
// /api/asks as conversation history, and scripts/warm-cache.ts must send byte-identical history for the Muse cache
// (keyed by the exact prompt) to hit on stage. So both import these. Client-safe: no server imports here.
import type { Ask } from "./types";

export const sheetCopy = {
  greeting: (first: string, groupName: string) =>
    `Hey ${first}. What do you need in ${groupName}? Tell me the stuff you wouldn't post, too. I keep that between us.`,
  moreDetail: "Tell me a bit more.",
  prefsIntro:
    "Here's your ask. Tap a tag to change who can see what. Public shows on your match card. Match only is used to check fit and never shown to anyone. Never shared stays on your phone.",
  updated: "Updated.",
  optIn: (groupName: string) =>
    `Want me to check with other Muses in ${groupName}? I'll also read the group's posts. Only public and match-only facts go out, and you'll see everything I share.`,
};

/** The video step only makes sense when there's something to film: a room you're offering or items you're selling. */
export function canShowVideo(ask: Pick<Ask, "side" | "type">): boolean {
  if (ask.side === "seeking") return false;
  return ask.type === "roommate" || ask.type === "sublet" || ask.type === "item";
}
