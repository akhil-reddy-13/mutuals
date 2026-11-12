"use client";
// Preferences as chips with a visibility badge. Tap the badge to cycle public -> match only -> never.
import { EyeOffIcon, GlobeIcon, LockIcon } from "../icons";
import { topicLabel } from "@/lib/format";
import type { Preference, Visibility } from "@/lib/types";

const NEXT: Record<Visibility, Visibility> = { public: "match_only", match_only: "never", never: "public" };

export function VisBadge({ v, onClick, size = "sm" }: { v: Visibility; onClick?: () => void; size?: "sm" | "xs" }) {
  const cls =
    v === "public" ? "bg-fb-blue-soft text-fb-blue" : v === "match_only" ? "bg-[#f3ecff] text-fb-purple" : "bg-fb-chip text-fb-muted";
  const label = v === "public" ? "Public" : v === "match_only" ? "Kept private" : "Never shared";
  const Icon = v === "public" ? GlobeIcon : v === "match_only" ? LockIcon : EyeOffIcon;
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      title={onClick ? "Tap to change who can see this" : label}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ${cls} ${size === "xs" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-[12px]"} ${onClick ? "hover:brightness-95 active:scale-95" : ""}`}
    >
      <Icon size={size === "xs" ? 10 : 12} />
      {label}
    </Comp>
  );
}

export default function PrefChips({ prefs, onChange, remembered = [] }: { prefs: Preference[]; onChange?: (next: Preference[]) => void; remembered?: string[] }) {
  function cycle(id: string) {
    if (!onChange) return;
    onChange(prefs.map((p) => (p.id === id ? { ...p, visibility: NEXT[p.visibility] } : p)));
  }
  function confirm(id: string) {
    onChange?.(prefs.map((p) => (p.id === id ? { ...p, confirmed: true } : p)));
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {prefs.map((p) => (
        <li key={p.id} className={`flex items-start justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${p.visibility === "never" ? "border-dashed border-fb-border bg-white" : "border-fb-divider bg-white"}`}>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-fb-muted">
              {topicLabel(p.topic)}
              {p.importance === "dealbreaker" && <span className="ml-1.5 rounded bg-[#fde8ec] px-1 py-px text-[10px] normal-case tracking-normal text-fb-red">Dealbreaker</span>}
            </div>
            <div className="text-[14px] leading-5">{p.value}</div>
            {p.source === "inferred" && !p.confirmed && (
              <button onClick={() => confirm(p.id)} className="mt-0.5 text-[12px] font-semibold text-fb-blue hover:underline">
                {remembered.includes(p.id) ? "From your last ask. Still true?" : "I guessed this. Confirm?"}
              </button>
            )}
          </div>
          <VisBadge v={p.visibility} onClick={onChange ? () => cycle(p.id) : undefined} />
        </li>
      ))}
    </ul>
  );
}
