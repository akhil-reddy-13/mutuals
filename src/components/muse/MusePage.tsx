"use client";
// The Muse page: one clean chat, laid out like a chat app (conversation in the middle; on laptop screens, Muse,
// the Group picker and "Today" on the right; phones get just the chat with Group pills on top). The conversation is the same component as the Group side sheet (MuseSheet, variant "page") and saves
// under the same key, so the two always match. A Group is still the context for every ask; pick it at the top.
import { useEffect, useRef, useState } from "react";
import Avatar from "../Avatar";
import GroupCover from "../GroupCover";
import { MuseMark } from "../icons";
import MuseSheet from "./MuseSheet";
import type { User } from "@/lib/types";

export interface MusePageGroup {
  id: string;
  name: string;
  cover: string;
}
export interface TodayCard {
  label: string;
  title: string;
  body: string;
  groupId: string;
  groupName: string;
  people: { id: string; name: string; avatarUrl: string }[];
}

function TodayList({ cards, onPick }: { cards: TodayCard[]; onPick: (groupId: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {cards.map((c, i) => (
        <button key={i} onClick={() => onPick(c.groupId)} className="rounded-xl border border-fb-divider bg-white p-3 text-left transition hover:bg-fb-hover">
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
        </button>
      ))}
    </div>
  );
}

export default function MusePage({
  me,
  groups,
  today,
  initialGroupId,
}: {
  me: Pick<User, "id" | "name" | "avatarUrl" | "museGroups">;
  groups: MusePageGroup[];
  today: TodayCard[];
  initialGroupId?: string;
}) {
  const [groupId, setGroupId] = useState(groups.find((g) => g.id === initialGroupId)?.id ?? groups[0]?.id);
  const group = groups.find((g) => g.id === groupId) ?? groups[0];

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

  // Keep the chosen Group's pill in view on narrow screens.
  const pillRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    pillRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [groupId]);

  if (!group) return null;

  // Narrow screens have no right panel, so the Group picker sits under the chat header.
  const picker = (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-2.5 lg:hidden">
      {groups.map((g) => (
        <button
          key={g.id}
          ref={g.id === group.id ? pillRef : undefined}
          onClick={() => setGroupId(g.id)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${g.id === group.id ? "bg-fb-blue-soft text-fb-blue" : "bg-fb-bg text-fb-text hover:bg-[#e4e6e9]"}`}
        >
          {g.name}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={rootRef} className="flex bg-white" style={{ height: `calc(100dvh - ${top}px)` }}>
      <section className="flex min-w-0 flex-1 flex-col">
        {/* key: each Group has its own saved conversation, so switching Groups switches chats. */}
        <MuseSheet key={group.id} variant="page" me={me} group={{ id: group.id, name: group.name }} headerExtra={picker} />
      </section>

      {/* Right panel (wide screens): who you're talking to, where, and what's new today. */}
      <aside className="hidden w-[300px] shrink-0 flex-col overflow-y-auto border-l border-fb-divider px-4 py-6 lg:flex xl:w-[340px] xl:px-5">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-fb-blue-soft">
            <MuseMark size={56} />
          </span>
          <div className="mt-3 text-[20px] font-bold leading-tight">Muse</div>
          <div className="mt-0.5 text-[13px] text-fb-muted">Private to you</div>
        </div>

        <div className="mt-6 text-[15px] font-bold">Ask in</div>
        <div className="mt-1.5 flex flex-col">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupId(g.id)}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left transition ${g.id === group.id ? "bg-fb-blue-soft" : "hover:bg-fb-hover"}`}
            >
              <GroupCover kind={g.cover} className="h-9 w-9 rounded-lg" />
              <span className={`min-w-0 flex-1 truncate text-[15px] font-medium ${g.id === group.id ? "text-fb-blue" : ""}`}>{g.name}</span>
            </button>
          ))}
        </div>

        {today.length > 0 && (
          <>
            <div className="mt-6 text-[15px] font-bold">Today</div>
            <div className="mt-2">
              <TodayList cards={today} onPick={setGroupId} />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
