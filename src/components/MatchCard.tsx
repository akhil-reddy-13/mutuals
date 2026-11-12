"use client";
// A match card: who, the verdict in one line, what lines up / what to talk about, Muse's suggested compromise,
// the handoff button, and "What my Muse shared" as the footer. No numeric score (handoff fix 8). A connection
// suggestion rides along as a slim row when Wonder made one.
import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "./Avatar";
import ConnectionCard, { type EventInfo } from "./ConnectionCard";
import { CheckIcon, ChevronDown, LockIcon, MessengerIcon, MuseMark } from "./icons";
import { DisclosedChips } from "./muse/LiveMatching";
import { firstName } from "@/lib/format";
import type { AgentLogEntry, Match } from "@/lib/types";

export interface CardCandidate {
  id: string;
  name: string;
  avatarUrl: string;
  school?: string;
}

const SHOWN = 3; // list items before "Show N more": keeps cards in a row close in height
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function MatchCard({
  match,
  candidate,
  viewerId,
  event,
  compact = false,
  label,
  showConnection = true,
}: {
  match: Match;
  candidate: CardCandidate;
  viewerId: string;
  event?: EventInfo | null;
  compact?: boolean;
  /** Replaces the "Fits" chip, e.g. "Best match". */
  label?: string;
  /** false when the page shows the connection suggestion as its own banner (keeps grid rows even). */
  showConnection?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [log, setLog] = useState<{ entries: AgentLogEntry[]; prefs: Record<string, { topic: string; visibility: string }> } | null>(null);
  const v = match.verdict;
  const fit = v.compatible;
  const first = firstName(candidate.name);
  const iAmAsker = match.userId === viewerId;
  const hidden = Math.max(0, v.fits.length - SHOWN) + Math.max(0, v.disagreements.length - SHOWN);
  const fits = more ? v.fits : v.fits.slice(0, SHOWN);
  const talks = more ? v.disagreements : v.disagreements.slice(0, SHOWN);

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

  const chip = label
    ? { text: label, cls: "bg-fb-blue-soft text-fb-blue" }
    : fit
      ? { text: "Fits", cls: "bg-[#e6f4ea] text-fb-green" }
      : { text: "Not a fit", cls: "bg-fb-chip text-fb-muted" };

  const talkLink = match.negotiationId ? (
    <a href={`/muse/talk/${match.negotiationId}`} className="mx-4 mb-1 block text-[13px] font-semibold text-fb-blue hover:underline">
      See the whole conversation between your Muses →
    </a>
  ) : null;

  // "What my Muse shared" is the card's footer: always there, out of the way of the decision.
  const sharedLog = (
    <div className="mx-4 border-t border-fb-divider">
      {talkLink && <div className="-mx-4 pt-2">{talkLink}</div>}
      <button onClick={toggleLog} aria-expanded={logOpen} className="flex w-full items-center gap-2 py-2.5 text-left text-[13px] font-semibold text-fb-muted hover:text-fb-text">
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
            <p className="text-[13px] text-fb-muted">Your Muse wasn&apos;t part of this conversation.</p>
          ) : (
            log.entries.map((e) => (
              <div key={e.id} className="rounded-lg bg-fb-bg px-3 py-2 text-[13px] leading-5">
                {e.message}
                <DisclosedChips meta={e.disclosed.map((id) => ({ id, topic: log.prefs[id]?.topic ?? id, visibility: log.prefs[id]?.visibility ?? "public" }))} />
              </div>
            ))
          )}
          {match.mode === "agent_to_agent" && <p className="text-[12px] text-fb-muted">Facts you kept private were used to check fit and are never shown to {first}. Anything marked never shared was not in your Muse&apos;s context at all.</p>}
        </div>
      )}
    </div>
  );

  return (
    // @container + flex column: in a grid row every card is one height, the body grows and the button row sits level.
    <article
      id={match.id}
      className={`@container fb-card flex h-full scroll-mt-[72px] flex-col overflow-hidden ${compact ? "rounded-xl border border-fb-divider shadow-none" : ""}`}
    >
      <header className="flex items-center gap-3 px-4 pt-4">
        <Avatar src={candidate.avatarUrl} name={candidate.name} size={fit ? 48 : 40} className={fit ? "" : "grayscale-[40%]"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`truncate font-bold leading-tight ${fit ? "text-[17px]" : "text-[15px]"}`}>{candidate.name}</h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${chip.cls}`}>{chip.text}</span>
          </div>
          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[13px] text-fb-muted">
            {match.mode === "agent_to_agent" ? <MuseMark size={12} className="shrink-0" /> : null}
            <span className="truncate">
              {[match.mode === "agent_to_agent" ? "Checked with their Muse" : "From their post", ...match.trustSignals.slice(0, 2)].join(" · ")}
            </span>
          </p>
        </div>
      </header>

      <p className={`px-4 pt-3 ${fit ? "text-[15px] font-semibold leading-5" : "text-[15px] leading-5 text-fb-text"}`}>{v.summaryForHumans}</p>

      {!fit ? (
        <>
          {iAmAsker && match.mode === "agent_to_agent" && <p className="px-4 pt-1 text-[13px] text-fb-muted">Your Muse stopped early, so neither of you spent time on it.</p>}
          <div className="mt-auto pt-3">{sharedLog}</div>
        </>
      ) : (
        <>
          {/* Facts on top; spare row height collects under them, so the proposal and the button stay together at the bottom. */}
          <div className="flex-1">
            {(fits.length > 0 || talks.length > 0) && (
              <div className={`grid gap-x-6 gap-y-3 px-4 pt-3 ${compact ? "" : "@lg:grid-cols-2"}`}>
                {fits.length > 0 && (
                  <section>
                    <h4 className="text-[13px] font-semibold text-fb-muted">What lines up</h4>
                    <ul className="mt-1 flex flex-col gap-1">
                      {fits.map((f) => (
                        <li key={f} className="flex gap-2 text-[15px] leading-5">
                          <CheckIcon size={16} className="mt-0.5 shrink-0 text-fb-green" />
                          {cap(f)}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {talks.length > 0 && (
                  <section>
                    <h4 className="text-[13px] font-semibold text-fb-muted">To talk about</h4>
                    <ul className="mt-1 flex flex-col gap-1">
                      {talks.map((d) => (
                        <li key={d} className="flex gap-2 text-[15px] leading-5">
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-fb-amber" />
                          {cap(d)}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
            {hidden > 0 && (
              <button onClick={() => setMore((m) => !m)} className="mx-4 mt-1.5 text-[13px] font-semibold text-fb-muted hover:underline">
                {more ? "Show less" : `Show ${hidden} more`}
              </button>
            )}
          </div>

          <div>
            {v.compromise && (
              <div className="mx-4 mt-3 flex gap-2.5 rounded-lg bg-fb-bg px-3 py-2.5">
                <MuseMark size={20} className="mt-0.5 shrink-0" />
                <div>
                  <div className="text-[13px] font-semibold text-fb-muted">Muse&apos;s suggestion</div>
                  <div className="text-[15px] leading-5">{v.compromise}</div>
                </div>
              </div>
            )}

            {match.mode === "one_sided" && match.draftReply && (
              <div className="mx-4 mt-3 rounded-lg border border-dashed border-fb-border px-3 py-2.5">
                <div className="text-[13px] font-semibold text-fb-muted">Drafted reply</div>
                <p className="mt-0.5 text-[15px] leading-5 text-fb-text">{match.draftReply}</p>
              </div>
            )}

            {showConnection && match.connection?.suggest && (
              <div className="px-4 pt-3">
                <ConnectionCard connection={match.connection} event={event ?? null} otherFirst={first} />
              </div>
            )}
          </div>

          <div className="px-4 pb-3 pt-4">
            <button onClick={openThread} disabled={busy} className="fb-btn-primary h-10 w-full">
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
