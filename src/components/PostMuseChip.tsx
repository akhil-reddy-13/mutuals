"use client";
// Chips on a Group post, from the viewer's Muse: "Fits your ask / Draft reply" (one-sided mode) or "Your Muses talked".
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon, MuseMark, XSmallIcon } from "./icons";
import { firstName } from "@/lib/format";
import type { Match } from "@/lib/types";

export default function PostMuseChip({ match, authorName, viewerId, groupId }: { match: Match; authorName: string; viewerId: string; groupId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const fit = match.verdict.compatible;
  const mine = match.userId === viewerId;
  if (!mine) return null;

  async function draftReply() {
    setBusy(true);
    const res = await fetch("/api/messenger", { method: "POST", body: JSON.stringify({ matchId: match.id }) });
    const { thread } = await res.json();
    router.push(`/messenger/${thread.id}`);
  }

  return (
    <div className="mx-4 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-fb-divider bg-fb-bg px-3 py-2">
      <MuseMark size={16} />
      <span className="flex items-center gap-1 text-[13px] font-semibold">
        {fit ? <CheckIcon size={14} className="text-fb-green" /> : <XSmallIcon className="text-fb-muted" />}
        {match.mode === "one_sided" ? (fit ? "Fits your ask" : "Doesn't fit your ask") : fit ? "Your Muses talked. Good fit." : "Your Muses talked. Not a fit."}
      </span>
      <span className="truncate text-[13px] text-fb-muted">{match.verdict.fits[0] ?? match.verdict.disagreements[0]}</span>
      <span className="ml-auto flex gap-2">
        {match.mode === "one_sided" && fit && (
          <button onClick={draftReply} disabled={busy} className="fb-btn-soft h-8 px-3 text-[13px]">
            {busy ? "Opening…" : `Draft reply to ${firstName(authorName)}`}
          </button>
        )}
        {match.mode === "agent_to_agent" && (
          <Link href={`/groups/${groupId}/muse/${match.askId}`} className="fb-btn-secondary h-8 px-3 text-[13px]">
            See why
          </Link>
        )}
      </span>
    </div>
  );
}
