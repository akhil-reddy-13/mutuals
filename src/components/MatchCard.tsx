"use client";
// A match card: why it fits, where you'd disagree, the proposed compromise, trust signals, "What my Muse shared",
// and the handoff button. No numeric score (handoff fix 8). Connection card rides along when Wonder suggested one.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "./Avatar";
import ConnectionCard, { type EventInfo } from "./ConnectionCard";
import { CheckIcon, ChevronDown, LockIcon, MessengerIcon, MuseMark, XSmallIcon } from "./icons";
import { DisclosedChips } from "./muse/LiveMatching";
import { firstName } from "@/lib/format";
import type { AgentLogEntry, Match } from "@/lib/types";

export interface CardCandidate {
  id: string;
  name: string;
  avatarUrl: string;
  school?: string;
}

export default function MatchCard({
  match,
  candidate,
  viewerId,
  groupId,
  event,
  compact = false,
}: {
  match: Match;
  candidate: CardCandidate;
  viewerId: string;
  groupId: string;
  event?: EventInfo | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [log, setLog] = useState<{ entries: AgentLogEntry[]; prefs: Record<string, { topic: string; visibility: string }> } | null>(null);
  const v = match.verdict;
  const fit = v.compatible;
  const first = firstName(candidate.name);
  const iAmAsker = match.userId === viewerId;

  async function openThread() {
    setBusy(true);
    const res = await fetch("/api/messenger", { method: "POST", body: JSON.stringify({ matchId: match.id }) });
    const { thread } = await res.json();
    router.push(`/messenger/${thread.id}`);
  }
  async function toggleLog() {
    setLogOpen((o) => !o);
    if (!log && match.negotiationId) {
      const res = await fetch(`/api/log?negotiationId=${match.negotiationId}`);
      setLog(await res.json());
    }
  }

  // "What my Muse shared" is the card's footer: always there, out of the way of the decision.
  const sharedLog = (
    <div className="mx-4 border-t border-fb-divider">
      <button onClick={toggleLog} className="flex w-full items-center gap-2 py-2.5 text-left text-[13px] font-semibold text-fb-muted hover:text-fb-text">
        <LockIcon size={13} />
        What my Muse shared with {first}
        <ChevronDown size={16} className={`ml-auto transition ${logOpen ? "rotate-180" : ""}`} />
      </button>
      {logOpen && (
        <div className="rise flex flex-col gap-2 pb-3">
          {match.mode === "one_sided" ? (
            <p className="text-[13px] text-fb-muted">Nothing. {first} doesn&apos;t have Muse on, so your Muse only read their post. Nothing left your side.</p>
          ) : !log ? (
            <div className="h-10 rounded-lg shimmer" />
          ) : log.entries.length === 0 ? (
            <p className="text-[13px] text-fb-muted">Your Muse wasn&apos;t part of this negotiation.</p>
          ) : (
            log.entries.map((e) => (
              <div key={e.id} className="rounded-lg bg-fb-bg px-3 py-2 text-[13px] leading-5">
                {e.message}
                <DisclosedChips meta={e.disclosed.map((id) => ({ id, topic: log.prefs[id]?.topic ?? id, visibility: log.prefs[id]?.visibility ?? "public" }))} />
              </div>
            ))
          )}
          {match.mode === "agent_to_agent" && <p className="text-[12px] text-fb-muted">Match-only facts were used to check fit and are never shown to {first}. Anything marked never shared was not in your Muse&apos;s context at all.</p>}
        </div>
      )}
    </div>
  );

  return (
    <article id={match.id} className={`fb-card scroll-mt-[72px] overflow-hidden ${compact ? "rounded-xl border border-fb-divider shadow-none" : ""} ${fit ? "" : "opacity-90"}`}>
      <header className="flex items-start gap-3 px-4 pt-3.5">
        <Avatar src={candidate.avatarUrl} name={candidate.name} size={!fit ? 40 : compact ? 44 : 56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className={`${fit ? "text-[17px]" : "text-[15px]"} font-bold leading-tight`}>{candidate.name}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ${fit ? "bg-[#e6f4ea] text-fb-green" : "bg-fb-chip text-fb-muted"}`}>
              {fit ? <CheckIcon size={12} /> : <XSmallIcon size={12} />}
              {fit ? "Fits" : "Not a fit"}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-fb-bg px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-fb-muted">
              {match.mode === "agent_to_agent" ? (
                <>
                  <MuseMark size={11} /> Muse to Muse
                </>
              ) : (
                "From their post"
              )}
            </span>
          </div>
          {/* Inline spans, not flex items, so a wrapped line never starts with a dangling "·". */}
          <p className="mt-0.5 text-[13px] leading-[18px] text-fb-muted">
            {match.trustSignals.slice(0, 3).map((t, i) => (
              <span key={t}>
                {i > 0 && " · "}
                {t.startsWith("Verified") && <CheckIcon size={12} className="mr-0.5 inline align-[-1px] text-fb-blue" />}
                {t}
              </span>
            ))}
          </p>
        </div>
      </header>

      <p className={`px-4 pt-3 leading-5 ${fit ? "text-[15px] font-semibold" : "text-[14px]"}`}>{v.summaryForHumans}</p>

      {!fit ? (
        <>
          {iAmAsker && match.mode === "agent_to_agent" && <p className="px-4 pb-1 pt-1 text-[13px] text-fb-muted">Your Muse stopped early so neither of you spent time on it.</p>}
          <div className="pt-2">{sharedLog}</div>
        </>
      ) : (
      <>
      <div className={`grid gap-3 px-4 pt-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        {v.fits.length > 0 && (
          <section>
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-fb-muted">Why it fits</h4>
            <ul className="mt-1 flex flex-col gap-1">
              {v.fits.map((f) => (
                <li key={f} className="flex gap-2 text-[14px] leading-5">
                  <CheckIcon size={16} className="mt-0.5 shrink-0 text-fb-green" />
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}
        {v.disagreements.length > 0 && (
          <section>
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-fb-muted">{fit ? "Where you'd disagree" : "Why not"}</h4>
            <ul className="mt-1 flex flex-col gap-1">
              {v.disagreements.map((d) => (
                <li key={d} className="flex gap-2 text-[14px] leading-5">
                  <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${fit ? "bg-fb-amber" : "bg-fb-red"}`} />
                  {d}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {v.compromise && (
        <div className="mx-4 mt-3 flex gap-2.5 rounded-lg bg-fb-bg px-3 py-2.5">
          <MuseMark size={20} className="mt-0.5" />
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-fb-muted">Proposed compromise</div>
            <div className="text-[14px] leading-5">{v.compromise}</div>
          </div>
        </div>
      )}

      {match.mode === "one_sided" && match.draftReply && fit && (
        <div className="mx-4 mt-3 rounded-lg border border-dashed border-fb-border px-3 py-2.5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-fb-muted">Drafted reply</div>
          <p className="mt-0.5 text-[14px] leading-5 text-fb-text">{match.draftReply}</p>
        </div>
      )}

      <div className="flex gap-2 px-4 pb-3 pt-3">
        <button onClick={openThread} disabled={busy} className="fb-btn-primary h-10 flex-1">
          <MessengerIcon size={18} />
          {busy ? "Opening Messenger…" : match.threadId ? `Open chat with ${first}` : match.mode === "one_sided" ? `Reply to ${first}` : `Message ${first}`}
        </button>
        {!compact && (
          <Link href={`/groups/${groupId}`} className="fb-btn-secondary h-10">
            Not now
          </Link>
        )}
      </div>

      {match.connection?.suggest && (
        <div className="px-4 pb-3">
          <ConnectionCard connection={match.connection} event={event ?? null} otherFirst={first} />
        </div>
      )}

      {sharedLog}
      </>
      )}
    </article>
  );
}
