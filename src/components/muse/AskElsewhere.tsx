"use client";
// Empty shortlist, Muse-style: "Nobody here is looking for this. 4 people in Stanford Housing '27 might fit."
// One tap moves the ask to that Group, runs matching there, and opens the new shortlist.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MuseMark } from "../icons";

export default function AskElsewhere({
  askId,
  hereName,
  what,
  best,
}: {
  askId: string;
  hereName: string;
  what: string;
  best: { groupId: string; name: string; people: number } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!best) return;
    setBusy(true);
    await fetch("/api/ask-move", { method: "POST", body: JSON.stringify({ askId, groupId: best.groupId }) });
    await fetch("/api/match", { method: "POST", body: JSON.stringify({ askId }) });
    router.push(`/groups/${best.groupId}/muse/${askId}`);
  }
  return (
    <section className="fb-card flex flex-col items-start gap-3 rounded-none p-4 md:rounded-[8px]">
      <div className="flex items-start gap-2.5">
        <MuseMark size={28} />
        <p className="text-[15px] leading-5">
          Nobody in {hereName} is looking for {what} right now.
          {best ? ` ${best.people === 1 ? "One person" : `${best.people} people`} in ${best.name} might fit. Want me to ask there?` : " I'll keep an eye out and tell you when someone does."}
        </p>
      </div>
      {best && (
        <button onClick={go} disabled={busy} className="fb-btn-primary h-9 px-4">
          {busy ? `Asking around ${best.name}…` : `Ask in ${best.name}`}
        </button>
      )}
    </section>
  );
}
