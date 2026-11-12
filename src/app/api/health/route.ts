// GET -> { mode: "mock" | "live" }   shown as a small badge so nobody claims "live" when it is cached/mocked (handoff fix 9)
import { NextResponse } from "next/server";
import { museMode } from "@/lib/muse";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ mode: museMode() });
}
