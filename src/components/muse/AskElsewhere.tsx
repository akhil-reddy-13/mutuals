"use client";
// Empty shortlist, Muse-style: "Nobody in your Groups is looking for this. 3 people nearby might fit. Check them?"
// One tap widens the reach for this ask, runs matching again, and refreshes the shortlist.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MuseMark } from "../icons";

export default function AskElsewhere({
  askId,
  hereLabel,
  what,
  best,
}: {
  askId: string;
  hereLabel: string;
  what: string;
  best: { reach: string; label: string; people: number } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!best) return;
    setBusy(true);
    await fetch("/api/match", { method: "POST", body: JSON.stringify({ askId, reach: best.reach }) });
    router.refresh();
    setBusy(false);
  }
  return (
    <section className="fb-card flex flex-col items-start gap-3 rounded-none p-4 md:rounded-[8px]">
      <div className="flex items-start gap-2.5">
        <MuseMark size={28} />
        <p className="text-[15px] leading-5">
          Nobody among {hereLabel.toLowerCase()} is looking for {what} right now.
          {best ? ` ${best.people === 1 ? "One person" : `${best.people} people`} in "${best.label}" might fit. Want me to check with them?` : " I'll keep an eye out and tell you when someone does."}
        </p>
      </div>
      {best && (
        <button onClick={go} disabled={busy} className="fb-btn-primary h-9 px-4">
          {busy ? "Checking…" : `Check ${best.label.toLowerCase()}`}
        </button>
      )}
    </section>
  );
}
