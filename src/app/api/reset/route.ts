// POST -> clears runtime state (asks/matches/threads/log created during a run). Use before each demo run.
import { NextResponse } from "next/server";
import { resetRuntime } from "@/lib/db";
export async function POST() {
  resetRuntime();
  return NextResponse.json({ ok: true });
}
