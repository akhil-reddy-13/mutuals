"use client";
// The Muse page: one clean chat, laid out like a chat app (conversation in the middle; on laptop screens, Muse
// and "Today" on the right; phones get just the chat). The conversation is the same component as the Group side
// sheet (MuseSheet, variant "page"), so the two always look alike. It is ONE chat across all my Groups: Muse
// works out which Group each ask belongs in (asks.homeGroupFor).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Avatar from "../Avatar";
import { MuseMark } from "../icons";
import MuseSheet from "./MuseSheet";
import type { Group, User } from "@/lib/types";

export interface TodayCard {
  label: string;
  title: string;
  body: string;
  groupId: string;
  groupName: string;
  people: { id: string; name: string; avatarUrl: string }[];
}

export default function MusePage({
  me,
  groups,
  today,
}: {
  me: Pick<User, "id" | "name" | "avatarUrl" | "museGroups"> & Partial<Pick<User, "museReach" | "museGroupsOff">>;
  groups: Pick<Group, "id" | "name">[];
  today: TodayCard[];
}) {
  // Fill the window below whatever chrome sits above (desktop header, or the phone header + tab row).
  const rootRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(56);
  useEffect(() => {
    const measure = () => {
      if (rootRef.current) setTop(Math.round(rootRef.current.getBoundingClientRect().top + window.scrollY));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div ref={rootRef} className="flex bg-white" style={{ height: `calc(100dvh - ${top}px)` }}>
      <section className="flex min-w-0 flex-1 flex-col">
        <MuseSheet variant="page" me={me} group={{ id: "auto", name: "your Groups" }} groups={groups} />
      </section>

      {/* Right panel (laptop screens): who you're talking to, and what's new in your Groups today. */}
      <aside className="hidden w-[300px] shrink-0 flex-col overflow-y-auto border-l border-fb-divider px-4 py-6 lg:flex xl:w-[340px] xl:px-5">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-fb-blue-soft">
            <MuseMark size={56} />
          </span>
          <div className="mt-3 text-[20px] font-bold leading-tight">Muse</div>
          <div className="mt-0.5 text-[13px] text-fb-muted">Private to you</div>
        </div>

        {today.length > 0 && (
          <>
            <div className="mt-6 text-[15px] font-bold">Today in your Groups</div>
            <div className="mt-2 flex flex-col gap-2">
              {today.map((c, i) => (
                <Link key={i} href={`/groups/${c.groupId}`} className="rounded-xl border border-fb-divider bg-white p-3 transition hover:bg-fb-hover">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-fb-blue">{c.label}</div>
                  <div className="mt-0.5 text-[15px] font-semibold leading-5">{c.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-[13px] leading-[18px] text-fb-muted">{c.body}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {c.people.map((u) => (
                        <Avatar key={u.id} src={u.avatarUrl} name={u.name} size={22} ring />
                      ))}
                    </div>
                    <span className="truncate text-[12px] text-fb-muted">{c.groupName}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
