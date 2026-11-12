// Daily digest (breadth beat): Ember writes 3 cards from the open asks in the user's Groups.
// Shared by the /digest page, GET /api/digest and scripts/warm-cache.ts, so the warm run sends the exact prompt the page does.
import { allAsks, getUser } from "./db";
import { mockDigest } from "./mocks";
import { modelFor, museJSON } from "./muse";
import { digestPrompt } from "./prompts";
import { DigestSchema } from "./schemas";
import type { DigestCard, User } from "./types";

/** The cards as the model returns them (schema shape). */
export async function digestCards(me: User) {
  const asks = allAsks().filter((a) => a.userId !== me.id && me.groups.includes(a.groupId) && a.type !== "roommate");
  const p = digestPrompt({
    userProfile: `${me.name}, ${me.school ?? ""}, ${me.city}. Interests: ${me.interests.map((i) => i.value).join(", ")}. ${me.bio ?? ""}`,
    asks: asks.map((a) => `${a.userId} (${getUser(a.userId)?.name}): [${a.type}] ${a.summary}`).join("\n"),
  });
  return (await museJSON({ model: modelFor("digest"), system: p.system, user: p.user, schema: DigestSchema, mock: mockDigest })).cards;
}

export async function buildDigest(me: User): Promise<DigestCard[]> {
  return (await digestCards(me)).map((c, i) => ({ id: `digest_${i}`, userId: me.id, type: c.type, title: c.title, body: c.body, relatedUserIds: c.related_user_ids }));
}
