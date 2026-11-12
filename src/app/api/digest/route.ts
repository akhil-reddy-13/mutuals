// GET -> { cards: DigestCard[] }   Ember writes a short digest of open asks in the persona's Groups (breadth beat).
import { NextResponse } from "next/server";
import { allAsks, getUser } from "@/lib/db";
import { mockDigest } from "@/lib/mocks";
import { museJSON } from "@/lib/muse";
import { digestPrompt } from "@/lib/prompts";
import { DigestSchema } from "@/lib/schemas";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ cards: [] });
  const asks = allAsks().filter((a) => a.userId !== me.id && me.groups.includes(a.groupId) && a.type !== "roommate");
  const p = digestPrompt({
    userProfile: `${me.name}, ${me.school ?? ""}, ${me.city}. Interests: ${me.interests.map((i) => i.value).join(", ")}. ${me.bio ?? ""}`,
    asks: asks.map((a) => `${a.userId} (${getUser(a.userId)?.name}): [${a.type}] ${a.summary}`).join("\n"),
  });
  const out = await museJSON({ model: "ember", system: p.system, user: p.user, schema: DigestSchema, mock: mockDigest });
  return NextResponse.json({
    cards: out.cards.map((c, i) => ({ id: `digest_${i}`, userId: me.id, type: c.type, title: c.title, body: c.body, relatedUserIds: c.related_user_ids })),
  });
}
