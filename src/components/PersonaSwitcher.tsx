"use client";
// Demo-only: the avatar menu switches the logged-in persona (sets a cookie). Two phones = two personas.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { CheckIcon, ChevronDown } from "./icons";

type P = { id: string; name: string; avatarUrl: string };
export default function PersonaSwitcher({ personas, current, mode, compact = false }: { personas: P[]; current: string; mode: "mock" | "live"; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const me = personas.find((p) => p.id === current) ?? personas[0];
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  async function pick(id: string) {
    setOpen(false);
    await fetch("/api/persona", { method: "POST", body: JSON.stringify({ userId: id }) });
    router.refresh();
  }
  async function reset() {
    setOpen(false);
    await fetch("/api/reset", { method: "POST" });
    router.push("/groups/g_housing27");
    router.refresh();
  }
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative flex items-center" aria-label="Account menu">
        <Avatar src={me.avatarUrl} name={me.name} size={compact ? 32 : 40} />
        {!compact && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-fb-chip text-fb-text">
            <ChevronDown size={10} />
          </span>
        )}
      </button>
      {open && (
        <div className="fb-card rise absolute right-0 top-12 z-50 w-[300px] p-2 shadow-fb-lg">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <Avatar src={me.avatarUrl} name={me.name} size={40} />
            <div className="min-w-0">
              <div className="truncate font-semibold">{me.name}</div>
              <div className="text-[13px] text-fb-muted">See your profile</div>
            </div>
          </div>
          <div className="mx-2 my-1 border-t border-fb-divider" />
          <div className="px-2 pb-1 pt-2 text-[13px] font-semibold text-fb-muted">Demo: switch account</div>
          <div className="max-h-[260px] overflow-auto">
            {personas.map((p) => (
              <button key={p.id} onClick={() => pick(p.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-fb-hover">
                <Avatar src={p.avatarUrl} name={p.name} size={32} />
                <span className="flex-1 truncate text-[15px]">{p.name}</span>
                {p.id === current && <CheckIcon size={18} className="text-fb-blue" />}
              </button>
            ))}
          </div>
          <div className="mx-2 my-1 border-t border-fb-divider" />
          <div className="flex items-center justify-between px-2 py-1.5 text-[13px] text-fb-muted">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${mode === "live" ? "bg-fb-green" : "bg-fb-amber"}`} />
              {mode === "live" ? "Live on Muse" : "Offline demo (mock Muse)"}
            </span>
            <button onClick={reset} className="font-semibold text-fb-blue hover:underline">
              Reset demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
