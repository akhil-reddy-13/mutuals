"use client";
// Connection potential (PRD §3.5): activity-based, double opt-in, usually a Facebook Event. Shown rarely.
// Stacked when narrow (inside a match card, phone); text left and the event right when there's room (page banner).
import Link from "next/link";
import { useState } from "react";
import { XSmallIcon } from "./icons";
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
  title = "New connection",
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
    <div className="@container rounded-2xl border border-fb-divider bg-fb-card">
      <div className="relative flex flex-col gap-3 p-4 @2xl:flex-row @2xl:items-center @2xl:gap-6 @2xl:px-5 @2xl:pr-14">
        <button onClick={() => setDismissed(true)} className="fb-icon-btn absolute right-2.5 top-2.5 h-8 w-8 bg-transparent text-fb-muted @2xl:top-1/2 @2xl:-translate-y-1/2" aria-label="Not now">
          <XSmallIcon size={16} />
        </button>
        <div className="min-w-0 pr-8 @2xl:flex-1 @2xl:pr-0">
          <span className="inline-block rounded-full bg-fb-accent px-2.5 py-0.5 text-[12px] font-bold text-[#050505]">{title}</span>
          <p className="mt-1.5 text-[17px] font-bold leading-[22px] tracking-tight">{connection.reason}</p>
        </div>
        {event && href ? (
          <div className="flex items-center gap-3 @2xl:w-[380px] @2xl:shrink-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fb-bg text-[22px]">{event.coverEmoji}</span>
            <Link href={href} className="min-w-0 flex-1 hover:underline">
              <span className="block truncate text-[15px] font-semibold leading-5">{event.name}</span>
              <span className="block truncate text-[13px] text-fb-muted">
                {event.when} · {event.going} going
              </span>
            </Link>
            <Link href={href} className="fb-btn-soft h-9 shrink-0 rounded-full px-4">
              Go together
            </Link>
          </div>
        ) : (
          connection.activity && <p className="text-[15px] text-fb-muted">{connection.activity}</p>
        )}
      </div>
    </div>
  );
}
