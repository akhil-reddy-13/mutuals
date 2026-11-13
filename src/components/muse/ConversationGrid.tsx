"use client";
// DEMO ONLY: the wall of Muse-to-Muse conversations on /conversations, two boxes a row. Every box plays on its own
// clock like a short looping video (timing in pace.ts): some are mid-typing, some sit on a finished conversation, and
// the wall keeps moving while you scroll past; the scroll itself drives nothing. Re-reads the server every 2 s so a
// live match's turns show up. Under reduced motion every box shows its finished conversation at rest.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Avatar from "../Avatar";
import { MuseMark } from "../icons";
import { stateAt, type ConvoView, type Side } from "./pace";

export type { ConvoView };

interface AskGroup {
  askId: string;
  summary: string;
  group: string;
  convos: ConvoView[];
}

export default function ConversationGrid({ groups }: { groups: AskGroup[] }) {
  const router = useRouter();
  const [now, setNow] = useState(0); // ms since the page opened: every box reads its own loop from this one clock
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setReduced(true);
    const start = performance.now();
    const t = setInterval(() => setNow(performance.now() - start), 100);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <section key={g.askId} className="flex flex-col gap-3">
          <div>
            <div className="text-[13px] font-semibold text-fb-blue">{g.group}</div>
            <h2 className="text-[19px] font-bold leading-snug tracking-tight">{g.summary}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {g.convos.map((c) => {
              const s = reduced ? { visible: c.turns.length, typing: c.running ? ("other" as const) : null, dim: false } : stateAt(c, now);
              return <ConversationBox key={c.id} c={c} {...s} animate={!reduced} />;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

const EDGE_PX = 28; // the strip on a box's right edge that scrolls the box; everywhere else the wheel scrolls the page

function ConversationBox({ c, visible, typing, dim, animate }: { c: ConvoView; visible: number; typing: Side | null; dim: boolean; animate: boolean }) {
  const body = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: animate ? "smooth" : "auto" });
  }, [visible, typing, animate]);

  // The box body doesn't catch the wheel (.wheel-edge); this scrolls it only from its right edge, and keeps the slim
  // track in that edge in step with the content (also when the playback scrolls it).
  useEffect(() => {
    const el = body.current;
    const th = thumb.current;
    if (!el || !th) return;
    const paint = () => {
      const over = el.scrollHeight - el.clientHeight;
      th.parentElement!.style.opacity = over > 1 ? "" : "0";
      if (over <= 1) return;
      const track = el.clientHeight - 16;
      const h = Math.max(24, (el.clientHeight / el.scrollHeight) * track);
      th.style.height = `${h}px`;
      th.style.transform = `translateY(${(el.scrollTop / over) * (track - h)}px)`;
    };
    const onWheel = (e: WheelEvent) => {
      if (e.clientX < el.getBoundingClientRect().right - EDGE_PX) return; // the page scrolls
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };
    paint();
    el.addEventListener("scroll", paint, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    const mo = new MutationObserver(paint); // bubbles come and go with the playback
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener("scroll", paint);
      el.removeEventListener("wheel", onWheel);
      mo.disconnect();
    };
  }, []);

  const live = c.running || visible < c.turns.length;
  const status = live
    ? { text: "Live", cls: "bg-fb-blue-soft text-fb-blue" }
    : c.verdict?.compatible
      ? { text: "Fits", cls: "bg-fb-accent text-[#050505]" }
      : { text: "Not a fit", cls: "bg-fb-chip text-fb-muted" };
  const pop = animate ? "bubble-pop" : "";

  return (
    <article className="group flex h-[420px] flex-col overflow-hidden rounded-2xl border border-fb-divider bg-fb-card">
      <header className="flex items-center gap-3 border-b border-fb-divider px-4 py-2.5">
        <span className="flex -space-x-2">
          <Avatar src={c.meAvatar} name={c.meName} size={28} className="ring-2 ring-fb-card" />
          <Avatar src={c.otherAvatar} name={c.otherName} size={28} className="ring-2 ring-fb-card" />
        </span>
        {/* The page title already says whose Muse this is; each box only needs the other side. */}
        <div className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight">{c.otherName}&apos;s Muse</div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${status.cls}`}>
          {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fb-blue" />}
          {status.text}
        </span>
      </header>

      {/* The loop's reset dims the finished conversation and rewrites it; the box never blanks. The right gutter
          (EDGE_PX) is empty space with a slim track: put the cursor there to scroll the box. */}
      <div className="relative flex min-h-0 flex-1">
      <div ref={body} className={`wheel-edge flex flex-1 flex-col gap-2 overflow-y-auto py-3 pl-3 pr-7 transition-opacity duration-300 ${dim ? "opacity-30" : ""}`}>
        {c.turns.slice(0, visible).map((t, i) =>
          t.side === "note" ? (
            // The referee's verdict is the negotiation's last turn.
            <div key={i} className={`${pop} mx-auto mt-1 max-w-[92%] rounded-xl bg-fb-bg px-3 py-2 text-center text-[12px] leading-[17px]`}>
              <span className="font-bold">Referee</span> <span className="text-fb-muted">·</span> {t.text}
            </div>
          ) : t.side === "me" ? (
            <div key={i} className="flex flex-col items-end">
              <span className="mb-0.5 mr-1 text-[11px] font-semibold text-fb-muted">{c.meName}&apos;s Muse</span>
              <div className={`bubble-out ${pop} origin-bottom-right text-[13px] leading-[18px]`}>{t.text}</div>
            </div>
          ) : (
            <div key={i} className="flex items-end gap-1.5">
              <MuseMark size={20} className="mb-0.5 shrink-0" />
              <div className="flex min-w-0 flex-col">
                <span className="mb-0.5 ml-1 text-[11px] font-semibold text-fb-muted">{c.otherName}&apos;s Muse</span>
                <div className={`bubble-in ${pop} origin-bottom-left text-[13px] leading-[18px]`}>{t.text}</div>
              </div>
            </div>
          ),
        )}
        {typing === "note" ? (
          <div className="bubble-pop mx-auto mt-1 flex items-center gap-1.5 rounded-xl bg-fb-bg px-3 py-2 text-[12px] text-fb-muted">
            <span className="font-bold text-fb-text">Referee</span> deciding
            <Dots />
          </div>
        ) : typing === "me" ? (
          <div className="flex justify-end">
            <div className="bubble-out bubble-pop flex origin-bottom-right items-center gap-1 px-3 py-2.5">
              <Dots light />
            </div>
          </div>
        ) : typing === "other" ? (
          <div className="flex items-end gap-1.5">
            <MuseMark size={20} className="mb-0.5 shrink-0" />
            <div className="bubble-in bubble-pop flex origin-bottom-left items-center gap-1 px-3 py-2.5">
              <Dots />
            </div>
          </div>
        ) : null}
      </div>
        <div aria-hidden className="pointer-events-none absolute bottom-2 right-2 top-2 w-1 rounded-full bg-fb-divider transition-opacity">
          <div ref={thumb} className="w-1 rounded-full bg-[#bcc0c4] transition-colors group-hover:bg-fb-muted" />
        </div>
      </div>
    </article>
  );
}

function Dots({ light = false }: { light?: boolean }) {
  const cls = `dot h-1.5 w-1.5 rounded-full ${light ? "bg-white/80" : "bg-fb-muted"}`;
  return (
    <span className="inline-flex items-center gap-1" aria-label="typing">
      <span className={cls} />
      <span className={cls} />
      <span className={cls} />
    </span>
  );
}
