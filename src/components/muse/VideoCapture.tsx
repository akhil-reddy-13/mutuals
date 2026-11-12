"use client";
// Record/upload a 10-15s video (or a few photos). Frames are sampled CLIENT-side (~1 fps, max 10, 640px JPEG)
// so the server never needs ffmpeg. Hands data URLs to the caller, which POSTs them to /api/intake.
import { useRef, useState } from "react";
import { PhotoIcon, VideoCamIcon } from "../icons";

async function framesFromVideo(file: File, max = 10): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error("Could not read that video"));
  });
  let duration = video.duration;
  if (!Number.isFinite(duration) || duration === 0) {
    // Some browsers report Infinity until a seek happens.
    video.currentTime = 1e6;
    await new Promise<void>((r) => (video.onseeked = () => r()));
    duration = video.duration;
  }
  const n = Math.min(max, Math.max(3, Math.floor(duration)));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    video.currentTime = Math.min(duration - 0.05, ((i + 0.5) / n) * duration);
    await new Promise<void>((r) => (video.onseeked = () => r()));
    const W = Math.min(640, video.videoWidth || 640);
    canvas.width = W;
    canvas.height = Math.round((W * (video.videoHeight || 480)) / (video.videoWidth || 640));
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    out.push(canvas.toDataURL("image/jpeg", 0.7));
  }
  URL.revokeObjectURL(url);
  return out;
}

async function framesFromImages(files: File[], max = 10): Promise<string[]> {
  const out: string[] = [];
  for (const f of files.slice(0, max)) {
    const url = URL.createObjectURL(f);
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Could not read that image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    const W = Math.min(640, img.width);
    canvas.width = W;
    canvas.height = Math.round((W * img.height) / img.width);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    out.push(canvas.toDataURL("image/jpeg", 0.7));
    URL.revokeObjectURL(url);
  }
  return out;
}

export default function VideoCapture({ onFrames, onSkip, disabled }: { onFrames: (frames: string[], narration: string) => void; onSkip: () => void; disabled?: boolean }) {
  const [frames, setFrames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [narration, setNarration] = useState("");
  const vidRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  async function pick(files: FileList | null, kind: "video" | "image") {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    try {
      const f = kind === "video" ? await framesFromVideo(files[0]) : await framesFromImages(Array.from(files));
      setFrames(f);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-fb-divider bg-white p-3">
      {frames.length === 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy || disabled} onClick={() => vidRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-lg bg-fb-bg px-2 py-3 text-[13px] font-semibold hover:bg-[#e4e6e9] disabled:opacity-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fb-red text-white">
                <VideoCamIcon size={22} />
              </span>
              {busy ? "Reading…" : "Record video"}
            </button>
            <button disabled={busy || disabled} onClick={() => imgRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-lg bg-fb-bg px-2 py-3 text-[13px] font-semibold hover:bg-[#e4e6e9] disabled:opacity-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fb-green text-white">
                <PhotoIcon size={22} />
              </span>
              Use photos
            </button>
          </div>
          <input ref={vidRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files, "video")} />
          <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => pick(e.target.files, "image")} />
          {err && <p className="mt-2 text-[13px] text-fb-red">{err}</p>}
          <button onClick={onSkip} disabled={disabled} className="mt-2 w-full text-[13px] font-semibold text-fb-muted hover:underline">
            Skip for now
          </button>
        </>
      ) : (
        <>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {frames.map((f, i) => (
              <img key={i} src={f} alt="" className="h-16 w-24 shrink-0 rounded-md object-cover" />
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-fb-muted">{frames.length} frames sampled on your phone. Only these go to Muse.</p>
          <input
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Anything to add? e.g. the desk can stay"
            className="mt-2 h-9 w-full rounded-full bg-fb-bg px-3 text-[14px] outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={() => setFrames([])} className="fb-btn-secondary h-9 flex-1">
              Retake
            </button>
            <button onClick={() => onFrames(frames, narration)} disabled={disabled} className="fb-btn-primary h-9 flex-1">
              Analyze room
            </button>
          </div>
        </>
      )}
    </div>
  );
}
