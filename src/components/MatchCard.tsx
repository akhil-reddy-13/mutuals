"use client";
// A match card: who, the verdict, what lines up / what to talk about, the compromise, the handoff button, and
// "What <name>'s Muse saw" as the footer. No numeric score (handoff fix 8). A connection suggestion rides along
// as a slim row when Wonder made one (the full shortlist page shows it as its own banner instead).
import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "./Avatar";
import ConnectionCard, { type EventInfo } from "./ConnectionCard";
import { CheckIcon, ChevronDown, LockIcon, MessengerIcon } from "./icons";
import { DisclosedChips } from "./muse/LiveMatching";
import { FIT_LABEL, firstName, fitLevel, type FitLevel } from "@/lib/format";
import type { AgentLogEntry, Match } from "@/lib/types";

const CHIP: Record<FitLevel, string> = {
  fit: "bg-fb-blue-soft text-fb-blue",
  could_work: "bg-[#fff1cc] text-[#7a5200]",
  long_shot: "bg-fb-chip text-fb-muted",
  no: "bg-fb-chip text-fb-muted",
};

export interface CardCandidate {
  id: string;
  name: string;
  avatarUrl: string;
  school?: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// The referee's summary has a "One thing to talk about: X." sentence (first or last) that repeats the "Talk about"
// line, so the headline is the rest. Fall back to the whole summary if that's all there is.
const headline = (s: string) => s.replace(/\s*One thing to talk about:[^.]*\.?\s*/i, " ").trim() || s;

export default function MatchCard({
  match,
  candidate,
  event,
  compact = false,
  label,
  groupName,
  showConnection = true,
}: {
  match: Match;
  candidate: CardCandidate;
  event?: EventInfo | null;
  compact?: boolean;
  /** A sticker next to the name in place of the level chip, e.g. "Best match"; the avatar gets a story ring. */
  label?: string;
  /** The Group the card is shown in: its "Both in <group>" signal says nothing here, so it's dropped. */
  groupName?: string;
  /** false when the page shows the connection suggestion as its own banner (keeps grid rows even). */
  showConnection?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [log, setLog] = useState<{ entries: AgentLogEntry[]; prefs: Record<string, { topic: string; visibility: string }> } | null>(null);
  const v = match.verdict;
  const fit = v.compatible;
  const level = fitLevel(v);
  const first = firstName(candidate.name);
  const talk = v.disagreements[0];
  const meta = [
    ...(match.mode === "one_sided" ? ["From their post"] : []),
    ...match.trustSignals.filter((t) => !groupName || !t.includes(groupName)).slice(0, 2),
  ].join(" · ");

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

  const px = compact ? "px-4" : "px-5";

  // Their page with the full Muse-to-Muse transcript (/muse/talk), linked above the footer toggle.
  const talkLink = match.negotiationId ? (
    <a href={`/muse/talk/${match.negotiationId}`} className="block pt-2.5 text-[13px] font-semibold text-fb-blue hover:underline">
      See the whole conversation between your Muses →
    </a>
  ) : null;

  // The card's footer: what left your side, always one tap away and out of the way of the decision.
  const sharedLog = (
    <div className={`border-t border-fb-divider ${compact ? "mx-4" : "mx-5"}`}>
      {talkLink}
      <button onClick={toggleLog} aria-expanded={logOpen} className="flex w-full items-center gap-2 py-3 text-left text-[13px] font-semibold text-fb-muted hover:text-fb-text">
        <LockIcon size={13} />
        What {first}
        {match.mode === "agent_to_agent" ? "’s Muse" : ""} saw
        <ChevronDown size={16} className={`ml-auto transition ${logOpen ? "rotate-180" : ""}`} />
      </button>
      {logOpen && (
        <div className="rise flex flex-col gap-2 pb-3">
          {match.mode === "one_sided" ? (
            <p className="text-[13px] text-fb-muted">Nothing. {first} doesn&apos;t have Muse on, so your Muse only read their post.</p>
          ) : !log ? (
            <div className="h-10 rounded-lg shimmer" />
          ) : log.entries.length === 0 ? (
            <p className="text-[13px] text-fb-muted">Your Muse wasn&apos;t part of this conversation.</p>
          ) : (
            log.entries.map((e) => (
              <div key={e.id} className="rounded-xl bg-fb-bg px-3 py-2 text-[13px] leading-5">
                {e.message}
                <DisclosedChips meta={e.disclosed.map((id) => ({ id, topic: log.prefs[id]?.topic ?? id, visibility: log.prefs[id]?.visibility ?? "public" }))} />
              </div>
            ))
          )}
          {match.mode === "agent_to_agent" && <p className="text-[12px] text-fb-muted">Facts you kept private were used to check fit, never shown. Never-shared facts were never in your Muse&apos;s context.</p>}
        </div>
      )}
    </div>
  );

  return (
    // @container: the card adapts to its own width (grid cell, chat sheet, phone).
    <article
      id={match.id}
      className={`@container flex h-full scroll-mt-[72px] flex-col overflow-hidden bg-fb-card ${compact ? "rounded-2xl border border-fb-divider" : "rounded-none md:rounded-2xl"}`}
    >
      <header className={`flex items-center gap-3 ${px} ${compact ? "pt-4" : "pt-5"}`}>
        {label ? (
          <span className="shrink-0 rounded-full bg-fb-blue p-[4px]">
            <Avatar src={candidate.avatarUrl} name={candidate.name} size={compact ? 44 : 52} className="ring-2 ring-fb-card" />
          </span>
        ) : (
          <Avatar src={candidate.avatarUrl} name={candidate.name} size={fit ? (compact ? 44 : 52) : 40} className={fit ? "" : "grayscale"} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`truncate font-extrabold leading-tight tracking-tight ${fit ? "text-[19px]" : "text-[16px]"}`}>{candidate.name}</h3>
            {label ? (
              <span className="shrink-0 rounded-full bg-fb-accent px-2.5 py-0.5 text-[12px] font-bold text-[#050505]">{label}</span>
            ) : (
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${CHIP[level]}`}>{FIT_LABEL[level]}</span>
            )}
          </div>
          {fit && meta && <p className="mt-0.5 truncate text-[13px] text-fb-muted">{meta}</p>}
        </div>
      </header>

      <p className={`${px} pt-3 ${fit ? "text-[17px] font-bold leading-[22px] tracking-tight" : "text-[15px] leading-5 text-fb-muted"}`}>{headline(v.summaryForHumans)}</p>

      {!fit ? (
        <div className="mt-auto pt-3">{sharedLog}</div>
      ) : (
        <>
          {/* At a glance: the verdict above, the one thing to talk about here. Everything else is one tap away. */}
          {talk && (
            <p className={`${px} flex gap-2 pt-2 text-[15px] leading-5`}>
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-fb-amber" />
              <span>
                <span className="font-semibold">Talk about:</span> {talk.charAt(0).toLowerCase() + talk.slice(1)}
                {v.disagreements.length > 1 && <span className="text-fb-muted"> +{v.disagreements.length - 1}</span>}
              </span>
            </p>
          )}
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`${compact ? "mx-4" : "mx-5"} mt-2 flex w-fit items-center gap-1 text-[13px] font-semibold text-fb-muted hover:text-fb-text`}>
            {open ? "Hide" : "See why"}
            <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className={`rise ${px} flex flex-col gap-3 pt-3`}>
              <ul className="flex flex-col gap-1.5">
                {v.fits.map((f) => (
                  <li key={f} className="flex gap-2 text-[15px] leading-5">
                    <CheckIcon size={16} className="mt-0.5 shrink-0 text-fb-blue" />
                    {cap(f)}
                  </li>
                ))}
                {v.disagreements.slice(1).map((d) => (
                  <li key={d} className="flex gap-2 text-[15px] leading-5">
                    <span className="mx-[5px] mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-fb-amber" />
                    {cap(d)}
                  </li>
                ))}
              </ul>
              {v.compromise && (
                <div className="rounded-xl bg-fb-bg px-4 py-3">
                  <div className="text-[13px] font-semibold text-fb-muted">Compromise</div>
                  <div className="mt-0.5 text-[15px] leading-5">{v.compromise}</div>
                </div>
              )}
              {match.mode === "one_sided" && match.draftReply && (
                <div className="rounded-xl border border-dashed border-fb-border px-4 py-3">
                  <div className="text-[13px] font-semibold text-fb-muted">Your reply, drafted</div>
                  <p className="mt-0.5 text-[15px] leading-5">{match.draftReply}</p>
                </div>
              )}
            </div>
          )}
          {showConnection && match.connection?.suggest && (
            <div className={`${px} pt-3`}>
              <ConnectionCard connection={match.connection} event={event ?? null} otherFirst={first} />
            </div>
          )}

          {/* The button row; mt-auto keeps it at the bottom if a parent ever stretches the card. */}
          <div className={`mt-auto ${px} pt-4`}>
            <button onClick={openThread} disabled={busy} className="fb-btn-primary mb-3 h-11 w-full rounded-full">
              <MessengerIcon size={18} />
              {busy ? "Opening Messenger…" : match.threadId ? `Open chat with ${first}` : match.mode === "one_sided" ? `Reply to ${first}` : `Message ${first}`}
            </button>
          </div>

          {sharedLog}
        </>
      )}
    </article>
  );
}
