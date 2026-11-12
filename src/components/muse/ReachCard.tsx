"use client";
// The opt-in, made explicit: WHO may my Muse talk to? Three clear options with how many people's Muses each one
// reaches for this ask. Private preferences stay private in every option; this only controls who Muse checks with.
import { useEffect, useState } from "react";
import type { MuseReach } from "@/lib/types";

const OPTIONS: { reach: MuseReach; icon: string; title: string; body: string }[] = [
  { reach: "network", icon: "👥", title: "People I'm connected with", body: "Your friends and their friends. Most private." },
  { reach: "groups", icon: "🏘️", title: "People in my Groups", body: "Members of your Groups who turned Muse on." },
  { reach: "everyone", icon: "📍", title: "Everyone nearby", body: "Anyone at your school or in your city with Muse on. Widest." },
];

export default function ReachCard({ askId, disabled, onPick }: { askId: string; disabled?: boolean; onPick: (r: MuseReach) => void }) {
  const [counts, setCounts] = useState<Record<MuseReach, number> | null>(null);
  const [current, setCurrent] = useState<MuseReach>("groups");
  const [picked, setPicked] = useState<MuseReach | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/reach?askId=${askId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive || !j.counts) return;
        setCounts(j.counts);
        setCurrent(j.current ?? "groups");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [askId]);

  return (
    <div className="overflow-hidden rounded-xl border border-fb-divider bg-white">
      <div className="border-b border-fb-divider px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-fb-muted">Who can my Muse talk to?</div>
      <div className="flex flex-col">
        {OPTIONS.map((o) => {
          const n = counts?.[o.reach];
          const isDefault = o.reach === current;
          const chosen = picked === o.reach;
          return (
            <button
              key={o.reach}
              disabled={disabled || !!picked}
              onClick={() => {
                setPicked(o.reach);
                onPick(o.reach);
              }}
              className={`flex items-center gap-3 border-b border-fb-divider px-3 py-2.5 text-left last:border-b-0 hover:bg-fb-hover disabled:cursor-default ${chosen ? "bg-fb-blue-soft" : ""} ${picked && !chosen ? "opacity-50" : ""}`}
            >
              <span className="text-[20px]">{o.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                  {o.title}
                  {o.reach === "groups" && <span className="rounded-full bg-fb-blue-soft px-1.5 py-px text-[10px] font-semibold text-fb-blue">Recommended</span>}
                  {isDefault && o.reach !== "groups" && <span className="rounded-full bg-fb-bg px-1.5 py-px text-[10px] font-semibold text-fb-muted">Last time</span>}
                </span>
                <span className="block text-[12px] leading-4 text-fb-muted">{o.body}</span>
              </span>
              <span className="shrink-0 text-right text-[12px] font-semibold text-fb-muted">
                {n == null ? "…" : n === 0 ? "nobody yet" : `${n} ${n === 1 ? "Muse" : "Muses"}`}
              </span>
            </button>
          );
        })}
      </div>
      <div className="bg-fb-bg/60 px-3 py-2 text-[12px] leading-4 text-fb-muted">
        Your private preferences stay private in every option. This only changes who I check with. You can change it any time.
      </div>
    </div>
  );
}
