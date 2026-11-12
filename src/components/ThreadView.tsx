"use client";
// Messenger thread. Full-screen on phones, a chat panel on desktop. Polls every 2s so two phones see each other.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { BackIcon, CameraIcon, InfoIcon, LikeIcon, MuseMark, PhoneIcon, PhotoIcon, PlusIcon, SendIcon, SmileIcon, VideoCamIcon } from "./icons";
import { firstName } from "@/lib/format";
import type { MessengerThread } from "@/lib/types";

type Person = { id: string; name: string; avatarUrl: string };

export default function ThreadView({
  thread: initial,
  me,
  other,
  context,
}: {
  thread: MessengerThread;
  me: Person;
  other: Person & { museOn: boolean };
  context?: { summary: string; askSummary: string; mode: "agent_to_agent" | "one_sided"; groupId: string; askId: string };
}) {
  const router = useRouter();
  const [thread, setThread] = useState(initial);
  const draft = thread.draft?.for === me.id ? thread.draft.text : "";
  const [text, setText] = useState(draft);
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch(`/api/messenger?threadId=${thread.id}`, { cache: "no-store" });
      if (res.ok) {
        const { thread: t } = (await res.json()) as { thread: MessengerThread };
        // A poll that started before a send can resolve after it; never go backwards.
        setThread((cur) => (t.messages.length < cur.messages.length ? cur : t));
      }
    }, 2000);
    return () => clearInterval(id);
  }, [thread.id]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [thread.messages.length]);

  useEffect(() => {
    const ta = taRef.current;
    if (ta) {
      ta.style.height = "0px";
      ta.style.height = Math.min(120, ta.scrollHeight) + "px";
    }
  }, [text]);

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    const res = await fetch("/api/messenger", { method: "PUT", body: JSON.stringify({ threadId: thread.id, text: t }) });
    const { thread: nt } = await res.json();
    setThread(nt);
    setText("");
    setSending(false);
    router.refresh();
  }

  const showDraftBanner = !!draft && !thread.messages.some((m) => m.from === me.id);
  const msgs = thread.messages;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white md:static md:mx-auto md:my-4 md:h-[calc(100dvh-6rem)] md:max-w-[720px] md:rounded-lg md:shadow-fb">
      <header className="flex items-center gap-2 border-b border-fb-divider px-2 py-2">
        <Link href="/messenger" className="fb-icon-btn h-9 w-9 bg-transparent text-fb-blue" aria-label="Back">
          <BackIcon size={24} />
        </Link>
        <span className="relative">
          <Avatar src={other.avatarUrl} name={other.name} size={40} />
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-fb-green" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight">{other.name}</div>
          <div className="text-[12px] text-fb-muted">Active now</div>
        </div>
        <button className="fb-icon-btn h-9 w-9 bg-transparent text-fb-blue" aria-label="Call">
          <PhoneIcon size={22} />
        </button>
        <button className="fb-icon-btn h-9 w-9 bg-transparent text-fb-blue" aria-label="Video call">
          <VideoCamIcon size={22} />
        </button>
        <button className="fb-icon-btn h-9 w-9 bg-transparent text-fb-blue" aria-label="Info">
          <InfoIcon size={22} />
        </button>
      </header>

      <div ref={bodyRef} className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col items-center gap-1 pb-4 pt-2">
          <Avatar src={other.avatarUrl} name={other.name} size={80} />
          <div className="text-[17px] font-semibold">{other.name}</div>
          <div className="text-[13px] text-fb-muted">{other.museOn ? "Stanford · You're both in Stanford Housing '27" : "Stanford · Stanford Housing '27"}</div>
          {context && (
            <Link href={`/groups/${context.groupId}/muse/${context.askId}`} className="mt-2 flex max-w-[320px] items-start gap-2 rounded-xl border border-fb-divider bg-fb-bg px-3 py-2 text-left hover:bg-[#e4e6e9]">
              <MuseMark size={18} className="mt-0.5 shrink-0" />
              <span className="text-[13px] leading-5">
                <span className="font-semibold">{context.mode === "agent_to_agent" ? "Your Muses talked." : "Your Muse read their post."}</span> {context.summary}
              </span>
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {msgs.map((m, i) => {
            const mine = m.from === me.id;
            const prevSame = i > 0 && msgs[i - 1].from === m.from;
            const nextSame = i < msgs.length - 1 && msgs[i + 1].from === m.from;
            const fromPost = m.text.startsWith("(from their post in the Group) ");
            const body = fromPost ? m.text.replace("(from their post in the Group) ", "") : m.text;
            return (
              <div key={i} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${prevSame ? "" : "mt-2"}`}>
                {!mine && <span className="w-7 shrink-0">{!nextSame && <Avatar src={other.avatarUrl} name={other.name} size={28} />}</span>}
                <div className="flex max-w-[78%] flex-col">
                  {fromPost && <span className="mb-0.5 ml-1 text-[11px] text-fb-muted">From their post in the group</span>}
                  <div
                    className={`whitespace-pre-wrap px-3 py-2 text-[15px] leading-5 ${
                      mine
                        ? `bg-fb-blue text-white ${prevSame ? "rounded-tr-md" : "rounded-tr-2xl"} ${nextSame ? "rounded-br-md" : "rounded-br-2xl"} rounded-l-2xl`
                        : `bg-[#f0f0f0] text-fb-text ${prevSame ? "rounded-tl-md" : "rounded-tl-2xl"} ${nextSame ? "rounded-bl-md" : "rounded-bl-2xl"} rounded-r-2xl`
                    }`}
                  >
                    {body}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showDraftBanner && (
        <div className="mx-3 mb-1 flex items-start gap-2 rounded-xl bg-gradient-to-r from-[#eef3ff] via-[#f3ecff] to-[#ffeef3] px-3 py-2">
          <MuseMark size={18} className="mt-0.5 shrink-0" />
          <p className="text-[13px] leading-5">
            <span className="font-semibold">Drafted by your Muse.</span> Edit anything, then send. {firstName(other.name)} only sees what you send.
          </p>
        </div>
      )}

      <div className="flex items-end gap-1 border-t border-fb-divider px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {!text && (
          <>
            <button className="fb-icon-btn h-9 w-9 bg-transparent text-fb-blue" aria-label="More">
              <PlusIcon size={22} />
            </button>
            <button className="fb-icon-btn h-9 w-9 bg-transparent text-fb-blue" aria-label="Camera">
              <CameraIcon size={22} />
            </button>
            <button className="fb-icon-btn h-9 w-9 bg-transparent text-fb-blue" aria-label="Photo">
              <PhotoIcon size={22} />
            </button>
          </>
        )}
        <div className="flex flex-1 items-end rounded-3xl bg-fb-bg px-3 py-1.5">
          <textarea
            ref={taRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Aa"
            className="max-h-[120px] w-full resize-none bg-transparent text-[15px] leading-5 outline-none placeholder:text-fb-muted"
          />
          <button className="ml-1 text-fb-blue" aria-label="Emoji">
            <SmileIcon size={22} />
          </button>
        </div>
        {text.trim() ? (
          <button onClick={send} disabled={sending} className="fb-icon-btn h-9 w-9 bg-transparent text-fb-blue" aria-label="Send">
            <SendIcon size={22} />
          </button>
        ) : (
          <button className="fb-icon-btn h-9 w-9 bg-transparent text-fb-blue" aria-label="Like">
            <LikeIcon size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
