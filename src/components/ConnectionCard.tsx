"use client";
// Connection potential (PRD §3.5): activity-based, double opt-in, usually a Facebook Event. Shown rarely.
// One slim row inside the match card (not a card in a card), so cards in a grid row stay close in height.
import Link from "next/link";
import { useState } from "react";
import { CalendarIcon, MuseMark, XSmallIcon } from "./icons";
import type { ConnectionSuggestion } from "@/lib/types";

export interface EventInfo {
  id: string;
  name: string;
  when: string;
  where: string;
  going: number;
  coverEmoji: string;
}

export default function ConnectionCard({
  connection,
  event,
  otherFirst,
  title = "More than a lease",
}: {
  connection: ConnectionSuggestion;
  event: EventInfo | null;
  otherFirst: string;
  title?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const href = event ? `/events/${event.id}?with=${encodeURIComponent(otherFirst)}` : null;
  return (
    // Stacked when narrow (inside a card, phone); text left, event right when there's room (page banner).
    <div className="@container muse-gradient rounded-lg p-[1.5px]">
      <div className="relative flex flex-col gap-2 rounded-[6.5px] bg-white px-3 py-2.5 @2xl:flex-row @2xl:items-center @2xl:gap-6 @2xl:px-4 @2xl:py-3 @2xl:pr-12">
        <button onClick={() => setDismissed(true)} className="fb-icon-btn absolute right-2 top-2 h-6 w-6 bg-transparent text-fb-muted @2xl:top-1/2 @2xl:-translate-y-1/2" aria-label="Not now">
          <XSmallIcon size={14} />
        </button>
        <div className="min-w-0 pr-7 @2xl:flex-1 @2xl:pr-0">
          <div className="flex items-center gap-1.5">
            <MuseMark size={14} />
            <span className="text-[13px] font-semibold muse-text">{title}</span>
          </div>
          <p className="mt-0.5 text-[15px] font-semibold leading-5">{connection.reason}</p>
        </div>
        {event && href ? (
          <div className="flex items-center gap-2.5 @2xl:w-[400px] @2xl:shrink-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#ffd36e] to-[#ff8a5c] text-xl">{event.coverEmoji}</span>
            <Link href={href} className="min-w-0 flex-1 hover:underline">
              <span className="block truncate text-[14px] font-semibold">{event.name}</span>
              <span className="flex items-center gap-1 text-[12px] text-fb-muted">
                <CalendarIcon size={12} /> {event.when} · {event.going} going
              </span>
            </Link>
            <Link href={href} className="fb-btn-soft h-9 shrink-0 px-3">
              Go together
            </Link>
          </div>
        ) : (
          connection.activity && <p className="mt-0.5 text-[14px] text-fb-muted">{connection.activity}</p>
        )}
      </div>
    </div>
  );
}
