// POST <raw video bytes> (Content-Type: video/*, header x-filename) -> { frames: string[], audio: string|null, seconds }
// Server-side frame + narration extraction with bundled ffmpeg. See lib/media.ts.
import { NextResponse } from "next/server";
import { prepVideo } from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const bytes = Buffer.from(await req.arrayBuffer());
    if (bytes.length === 0) return NextResponse.json({ error: "empty upload" }, { status: 400 });
    if (bytes.length > MAX_BYTES) return NextResponse.json({ error: "video over 200 MB, try a shorter clip" }, { status: 413 });
    const ext = (req.headers.get("x-filename") ?? "video.mov").split(".").pop() ?? "mov";
    const out = await prepVideo(bytes, ext);
    if (out.frames.length === 0) return NextResponse.json({ error: "could not read frames from that video" }, { status: 422 });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
