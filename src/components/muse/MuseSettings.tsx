"use client";
// Muse settings: the one-time choices about Muse talking to other people's Muses. Set once when you turn it on,
// changeable any time. Every ask uses these (the chat never asks again).
import { useRouter } from "next/navigation";
import { useState } from "react";
import GroupCover from "../GroupCover";
import type { MuseReach } from "@/lib/types";

const REACH_OPTIONS: { reach: MuseReach; title: string; body: string }[] = [
  { reach: "network", title: "People I'm connected with", body: "Your friends and their friends. The most private option." },
  { reach: "groups", title: "People in my Groups", body: "Members of the Groups switched on below who turned Muse on. Recommended." },
  { reach: "everyone", title: "Everyone nearby", body: "Anyone at your school or in your city with Muse on. The widest option." },
];

type Settings = { museEnabled: boolean; museReach: MuseReach; connectionSuggestionsOptIn: boolean };
/** One of my Groups: is my Muse on there, and how many other members have theirs on. */
export type SettingsGroup = { id: string; name: string; cover: string; on: boolean; museMembers: number };

export default function MuseSettings({ initial, groups: initialGroups }: { initial: Settings; groups: SettingsGroup[] }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [groups, setGroups] = useState<SettingsGroup[]>(initialGroups);
  const [saved, setSaved] = useState(false);
  async function toggleGroup(id: string, on: boolean) {
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, on } : g)));
    setSaved(false);
    await fetch("/api/settings", { method: "POST", body: JSON.stringify({ museGroup: { id, on } }) });
    setSaved(true);
    router.refresh();
  }
  async function save(patch: Partial<Settings>) {
    const next = { ...s, ...patch };
    setS(next);
    setSaved(false);
    await fetch("/api/settings", { method: "POST", body: JSON.stringify(patch) });
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="fb-card rounded-none p-4 md:rounded-[8px]">
        <Row
          title="Let my Muse talk to other people's Muses"
          body="Your Muse checks with other Muses to find people who fit what you ask for. It never messages anyone for you."
          control={<Switch on={s.museEnabled} onChange={(v) => save({ museEnabled: v })} label="Let my Muse talk to other people's Muses" />}
        />
      </section>

      <section className={`fb-card rounded-none p-4 md:rounded-[8px] ${s.museEnabled ? "" : "pointer-events-none opacity-50"}`}>
        <div className="text-[17px] font-bold">Who can my Muse talk to?</div>
        <p className="mt-0.5 text-[14px] leading-5 text-fb-muted">
          Your private preferences stay private with every option. This only changes who your Muse checks with.
        </p>
        <div role="radiogroup" aria-label="Who can my Muse talk to?" className="mt-3 flex flex-col divide-y divide-fb-divider overflow-hidden rounded-lg border border-fb-divider">
          {REACH_OPTIONS.map((o) => {
            const on = s.museReach === o.reach;
            return (
              <div key={o.reach}>
              <button
                role="radio"
                aria-checked={on}
                onClick={() => save({ museReach: o.reach })}
                className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors ${on ? "bg-fb-blue-soft" : "bg-white hover:bg-fb-hover"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{o.title}</span>
                  <span className="block text-[13px] leading-4 text-fb-muted">{o.body}</span>
                </span>
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-fb-blue" : "border-fb-border"}`}
                >
                  {on && <span className="h-2.5 w-2.5 rounded-full bg-fb-blue" />}
                </span>
              </button>
              {/* Which Groups: one switch each, two-way (my Muse asks there, and can be asked there). */}
              {o.reach === "groups" && on && groups.length > 0 && (
                <div className="border-t border-fb-divider bg-white py-1 pl-3.5">
                  {groups.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 py-2 pr-3.5">
                      <GroupCover kind={g.cover} className={`h-9 w-9 rounded-lg ${g.on ? "" : "opacity-40 grayscale"}`} />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[15px] font-medium ${g.on ? "" : "text-fb-muted"}`}>{g.name}</span>
                        <span className="block truncate text-[13px] leading-4 text-fb-muted">
                          {g.on
                            ? `${g.museMembers} ${g.museMembers === 1 ? "member has" : "members have"} Muse on`
                            : "Off. Your Muse stays out of this Group."}
                        </span>
                      </span>
                      <Switch on={g.on} onChange={(v) => toggleGroup(g.id, v)} label={`Muse in ${g.name}`} small />
                    </div>
                  ))}
                </div>
              )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={`fb-card rounded-none p-4 md:rounded-[8px] ${s.museEnabled ? "" : "pointer-events-none opacity-50"}`}>
        <Row
          title="Suggest things to do together"
          body="When you and someone you matched with share a real interest, Muse may suggest an activity, like an open Event."
          control={<Switch on={s.connectionSuggestionsOptIn} onChange={(v) => save({ connectionSuggestionsOptIn: v })} label="Suggest things to do together" />}
        />
      </section>

      <p className="px-4 text-[13px] text-fb-muted md:px-1">{saved ? "Saved. Your next chat uses these settings." : "Changes save automatically."}</p>
    </div>
  );
}

function Row({ title, body, control }: { title: string; body: string; control: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-bold leading-6">{title}</div>
        <p className="mt-0.5 text-[14px] leading-5 text-fb-muted">{body}</p>
      </div>
      {control}
    </div>
  );
}

/** Facebook-style blue switch. */
function Switch({ on, onChange, label, small }: { on: boolean; onChange: (v: boolean) => void; label: string; small?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${small ? "" : "mt-1"} ${on ? "bg-fb-blue" : "bg-fb-border"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}
