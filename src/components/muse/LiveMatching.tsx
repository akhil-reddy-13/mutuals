"use client";
// "Behind the scenes": every candidate's negotiation streaming live. The asker's own Muse is on the right (blue);
// the other Muse on the left. Disclosed preferences appear as chips: match-only ones are LOCKED chips (topic only).
import { useState } from "react";
import Avatar from "../Avatar";
import { CheckIcon, ChevronDown, GlobeIcon, LockIcon, MuseMark, XSmallIcon } from "../icons";
import { firstName, topicLabel } from "@/lib/format";
import type { ConnectionSuggestion, Match, NegotiationTurn } from "@/lib/types";

/** Which Muse model did each job, as labels ("Muse Ember"). Comes from the match stream so it follows `modelFor`. */
export type MatchModelLabels = { agent: string; referee: string; posteval: string; opener: string };
const DEFAULT_MODELS: MatchModelLabels = { agent: "Muse Ember", referee: "Muse Ember", posteval: "Muse Ember", opener: "Muse Ember" };

function creditLine(c: { mode: Match["mode"]; name: string }, meName: string, m: MatchModelLabels): string {
  const them = firstName(c.name);
  if (c.mode === "agent_to_agent") {
    const talked = m.agent === m.referee ? `talked it through and settled it (${m.agent})` : `talked it through (${m.agent}), then ${m.referee} made the call`;
    return `Your Muse and ${them}'s ${talked}. ${meName}'s private numbers stayed private, and so did ${them}'s.`;
  }
  const read = m.posteval === m.opener ? `I read their post and drafted a reply (${m.posteval})` : `I read their post (${m.posteval}) and drafted a reply (${m.opener})`;
  return `${them} doesn't have Muse on, so ${read}. Nothing left your side.`;
}

export interface LiveCandidate {
  id: string;
  name: string;
  avatarUrl: string;
  mode: Match["mode"];
  postId?: string;
  turns: { turn: NegotiationTurn; disclosedMeta: { id: string; topic: string; visibility: string }[] }[];
  match?: Match;
  connection?: ConnectionSuggestion | null;
}

function Typing() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1">
      <span className="dot h-1.5 w-1.5 rounded-full bg-fb-muted" />
      <span className="dot h-1.5 w-1.5 rounded-full bg-fb-muted" />
      <span className="dot h-1.5 w-1.5 rounded-full bg-fb-muted" />
    </span>
  );
}

export function DisclosedChips({ meta, light }: { meta: { id: string; topic: string; visibility: string }[]; light?: boolean }) {
  if (meta.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {meta.map((m) => (
        <span
          key={m.id}
          title={m.visibility === "match_only" ? "Kept private: used to check fit, never shown to the other person" : "Public"}
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[11px] font-semibold ${
            m.visibility === "match_only" ? (light ? "bg-white/20 text-white" : "bg-[#f3ecff] text-fb-purple") : light ? "bg-white/20 text-white" : "bg-fb-blue-soft text-fb-blue"
          }`}
        >
          {m.visibility === "match_only" ? <LockIcon size={10} /> : <GlobeIcon size={10} />}
          {topicLabel(m.topic)}
        </span>
      ))}
    </div>
  );
}

export default function LiveMatching({ cands, meName, defaultOpen, models }: { cands: LiveCandidate[]; meName: string; defaultOpen?: string; models?: MatchModelLabels }) {
  const [open, setOpen] = useState<Record<string, boolean>>(defaultOpen ? { [defaultOpen]: true } : {});
  return (
    <div className="flex flex-col gap-2">
      {cands.map((c) => {
        const done = !!c.match;
        const fit = c.match?.verdict.compatible;
        const isOpen = open[c.id] ?? false;
        return (
          <div key={c.id} className="overflow-hidden rounded-xl border border-fb-divider bg-white">
            <button onClick={() => setOpen((o) => ({ ...o, [c.id]: !isOpen }))} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-fb-hover">
              <span className="relative">
                <Avatar src={c.avatarUrl} name={c.name} size={36} />
                {c.mode === "agent_to_agent" && (
                  <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-px">
                    <MuseMark size={14} />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                  {c.name}
                  <span className="rounded bg-fb-bg px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-fb-muted">{c.mode === "agent_to_agent" ? "Their Muse" : "From their post"}</span>
                </span>
                <span className="block truncate text-[12px] text-fb-muted">
                  {done ? (
                    <span className={`inline-flex items-center gap-1 font-semibold ${fit ? "text-fb-green" : "text-fb-muted"}`}>
                      {fit ? <CheckIcon size={12} /> : <XSmallIcon size={12} />}
                      {c.match!.verdict.summaryForHumans}
                    </span>
                  ) : c.turns.length === 0 ? (
                    <span className="inline-flex items-center">
                      Reaching {firstName(c.name)}&apos;s Muse
                      <Typing />
                    </span>
                  ) : (
                    <span className="inline-flex items-center">
                      {c.turns[c.turns.length - 1].turn.speaker === "A" ? `${firstName(c.name)}'s Muse is replying` : "Your Muse is replying"}
                      <Typing />
                    </span>
                  )}
                </span>
              </span>
              <ChevronDown size={18} className={`shrink-0 text-fb-muted transition ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="flex flex-col gap-1.5 border-t border-fb-divider bg-fb-bg px-2.5 py-2.5">
                {c.turns.map(({ turn, disclosedMeta }, i) =>
                  turn.speaker === "orchestrator" ? (
                    <div key={i} className="rise flex items-start gap-1.5 self-center rounded-lg bg-white px-2.5 py-1.5 text-center text-[12px] text-fb-muted">
                      <MuseMark size={14} className="mt-0.5" />
                      <span>
                        <span className="font-semibold text-fb-text">{c.mode === "agent_to_agent" && c.match ? "The call: " : ""}</span>
                        {turn.message}
                      </span>
                    </div>
                  ) : turn.speaker === "A" ? (
                    <div key={i} className="rise flex flex-col items-end">
                      <div className="text-[11px] text-fb-muted">Your Muse</div>
                      <div className="bubble-out text-[13px]">
                        {turn.message}
                        <DisclosedChips meta={disclosedMeta} light />
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="rise flex flex-col items-start">
                      <div className="text-[11px] text-fb-muted">{firstName(c.name)}&apos;s Muse</div>
                      <div className="bubble-in bg-white text-[13px]">
                        {turn.message}
                        <DisclosedChips meta={disclosedMeta} />
                      </div>
                    </div>
                  ),
                )}
                {!done && (
                  <div className="self-start rounded-2xl bg-white px-3 py-2">
                    <Typing />
                  </div>
                )}
                {done && (
                  <p className="px-1 pt-1 text-[11px] text-fb-muted">
                    {creditLine(c, meName, models ?? DEFAULT_MODELS)}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
