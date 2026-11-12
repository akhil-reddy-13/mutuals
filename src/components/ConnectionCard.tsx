"use client";
// Connection potential (PRD §3.5): activity-based, double opt-in, usually a Facebook Event. Shown rarely.
import Link from "next/link";
import { useState } from "react";
import { CalendarIcon, MuseMark } from "./icons";
import type { ConnectionSuggestion } from "@/lib/types";

export interface EventInfo {
  id: string;
  name: string;
  when: string;
  where: string;
  going: number;
  coverEmoji: string;
}

export default function ConnectionCard({ connection, event, otherFirst }: { connection: ConnectionSuggestion; event: EventInfo | null; otherFirst: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="muse-gradient rounded-xl p-[1.5px]">
      <div className="rounded-[10.5px] bg-white p-3">
        <div className="flex items-center gap-2">
          <MuseMark size={20} />
          <span className="text-[12px] font-semibold uppercase tracking-wide muse-text">More than a lease</span>
        </div>
        <p className="mt-1.5 text-[15px] font-semibold leading-5">{connection.reason}</p>
        {event ? (
          <Link href={`/events/${event.id}?with=${encodeURIComponent(otherFirst)}`} className="mt-2.5 flex items-center gap-3 rounded-lg bg-fb-bg p-2.5 hover:bg-[#e4e6e9]">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#ffd36e] to-[#ff8a5c] text-2xl">{event.coverEmoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{event.name}</span>
              <span className="flex items-center gap-1 text-[12px] text-fb-muted">
                <CalendarIcon size={12} /> {event.when} · {event.going} going
              </span>
            </span>
          </Link>
        ) : (
          connection.activity && <p className="mt-1 text-[14px] text-fb-muted">{connection.activity}</p>
        )}
        <div className="mt-2.5 flex gap-2">
          {event && (
            <Link href={`/events/${event.id}?with=${encodeURIComponent(otherFirst)}`} className="fb-btn-soft h-9 flex-1">
              Go together
            </Link>
          )}
          <button onClick={() => setDismissed(true)} className="fb-btn-secondary h-9 flex-1">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
