// POST { userId } -> sets the demo persona cookie.
import { NextResponse } from "next/server";
import { PERSONA_COOKIE } from "@/lib/session";
export async function POST(req: Request) {
  const { userId } = await req.json();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PERSONA_COOKIE, String(userId), { path: "/" });
  return res;
}
