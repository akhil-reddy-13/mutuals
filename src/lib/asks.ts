// Ask parsing (PRD §5.1 step 2): the chat in the Muse sheet -> Spark -> structured, visibility-tagged prefs.
// Called after every user message. Returns Muse's next line until `ready`.
import { getAsk, getGroup, getUser, newId, saveAsk } from "./db";
import { mockAskParse } from "./mocks";
import { museJSON } from "./muse";
import { askParsePrompt } from "./prompts";
import { AskParseSchema } from "./schemas";
import type { Ask, Preference } from "./types";

export interface ChatMsg {
  role: "user" | "muse";
  text: string;
}

export async function parseAsk(a: { userId: string; groupId: string; askId?: string; conversation: ChatMsg[] }) {
  const user = getUser(a.userId);
  const group = getGroup(a.groupId);
  if (!user || !group) throw new Error("unknown user/group");
  const convo = a.conversation.map((m) => `${m.role === "user" ? "User" : "Muse"}: ${m.text}`).join("\n");
  const p = askParsePrompt({ ownerName: user.name.split(" ")[0], groupName: group.name, conversation: convo });
  const out = await museJSON({ model: "spark", system: p.system, user: p.user, schema: AskParseSchema, mock: mockAskParse(user.id, convo) });

  const existing = a.askId ? getAsk(a.askId) : undefined;
  // Keep any visibility edits the user already made in the chips.
  const edited = new Map((existing?.preferences ?? []).map((x) => [x.id, x]));
  const preferences: Preference[] = out.preferences.map((x) => ({
    ...x,
    visibility: edited.get(x.id)?.visibility ?? x.visibility,
    importance: edited.get(x.id)?.importance ?? x.importance,
    confirmed: x.source === "stated" ? true : (edited.get(x.id)?.confirmed ?? false),
  }));
  const ask: Ask = {
    id: existing?.id ?? newId("ask"),
    userId: user.id,
    groupId: group.id,
    type: out.ask_type,
    summary: out.summary,
    preferences,
    roomDetails: existing?.roomDetails,
    items: existing?.items,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    status: "draft",
  };
  saveAsk(ask);
  return { ask, followUp: out.ready ? null : (out.follow_up_question ?? null), ready: !!out.ready };
}
