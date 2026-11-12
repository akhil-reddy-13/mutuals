"use client";
// Record/upload a 10-15s video (or a few photos). Frames are sampled CLIENT-side (~1 fps, max 10, 640px JPEG)
// so the server never needs ffmpeg. Hands data URLs to the caller, which POSTs them to /api/intake.
import { useRef, useState } from "react";
import { PhotoIcon, VideoCamIcon } from "../icons";

/**
 * Pull the spoken narration out of a video, in the browser: decode the audio track, downmix to mono, resample to
 * 16 kHz, cap at 30 s, encode as WAV. ~0.5 MB for 15 s, vs. 20-50 MB for the whole video. Returns base64 (no
 * prefix) or null when the video has no decodable audio (silent clip, unsupported codec): intake then runs on
 * frames alone.
 */
async function audioFromVideo(file: File, maxSeconds = 30): Promise<string | null> {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    void ctx.close();
    const rate = 16000;
    const seconds = Math.min(decoded.duration, maxSeconds);
    if (seconds < 0.5) return null;
    const off = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    // Skip near-silent clips so Ember isn't asked to listen to nothing.
    let peak = 0;
    for (let i = 0; i < pcm.length; i += 64) peak = Math.max(peak, Math.abs(pcm[i]));
    if (peak < 0.01) return null;
    const buf = new ArrayBuffer(44 + pcm.length * 2);
    const v = new DataView(buf);
    const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVE"); str(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data");
    v.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  } catch {
    return null;
  }
}

async function framesFromVideo(file: File, max = 10): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const withTimeout = <T,>(p: Promise<T>, ms: number, what: string) =>
    Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${what} timed out. Try a shorter video or photos.`)), ms))]);
  await withTimeout(
    new Promise<void>((res, rej) => {
      video.onloadeddata = () => res();
      video.onerror = () => rej(new Error("Could not read that video"));
      video.load();
    }),
    8000,
    "Loading the video",
  );
  // iOS Safari paints blank frames until the element has played once.
  try {
    await video.play();
    video.pause();
  } catch {}
  const seekTo = (t: number) =>
    withTimeout(
      new Promise<void>((r) => {
        if (Math.abs(video.currentTime - t) < 0.01) return r();
        video.onseeked = () => r();
        video.currentTime = t;
      }),
      3000,
      "Reading a frame",
    );
  let duration = video.duration;
  if (!Number.isFinite(duration) || duration === 0) {
    // Some browsers report Infinity until a seek happens.
    await seekTo(1e6);
    duration = video.duration;
  }
  const n = Math.min(max, Math.max(3, Math.floor(duration)));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    await seekTo(Math.min(duration - 0.05, ((i + 0.5) / n) * duration));
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

export default function VideoCapture({ onFrames, onSkip, disabled }: { onFrames: (frames: string[], narration: string, audio: string | null) => void; onSkip: () => void; disabled?: boolean }) {
  const [frames, setFrames] = useState<string[]>([]);
  const [audio, setAudio] = useState<string | null>(null);
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
      if (kind === "video") {
        const [f, a] = await Promise.all([framesFromVideo(files[0]), audioFromVideo(files[0])]);
        setFrames(f);
        setAudio(a);
      } else {
        setFrames(await framesFromImages(Array.from(files)));
        setAudio(null);
      }
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
              {busy ? "Reading…" : "Video of the room"}
            </button>
            <button disabled={busy || disabled} onClick={() => imgRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-lg bg-fb-bg px-2 py-3 text-[13px] font-semibold hover:bg-[#e4e6e9] disabled:opacity-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fb-green text-white">
                <PhotoIcon size={22} />
              </span>
              Use photos
            </button>
          </div>
          {/* No `capture` attribute: on iOS it would force the camera and hide the Photos library (pre-recorded room video). */}
          <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={(e) => pick(e.target.files, "video")} />
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
          <p className="mt-1.5 text-[12px] text-fb-muted">
            {frames.length} frames{audio ? " + your narration" : ""} sampled on your device. Only these go to Muse.
          </p>
          <input
            key="narration"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Anything to add? e.g. the desk can stay"
            className="mt-2 h-9 w-full rounded-full bg-fb-bg px-3 text-[14px] outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={() => { setFrames([]); setAudio(null); }} className="fb-btn-secondary h-9 flex-1">
              Retake
            </button>
            <button onClick={() => onFrames(frames, narration, audio)} disabled={disabled} className="fb-btn-primary h-9 flex-1">
              Analyze room
            </button>
          </div>
        </>
      )}
    </div>
  );
}
