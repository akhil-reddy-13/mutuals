// Messenger chat list. Threads opened from a match show here for both people.
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { MoreIcon, MuseMark, SearchIcon } from "@/components/icons";
import { getUser, threadsForUser } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MessengerPage() {
  const me = await currentUser();
  const threads = threadsForUser(me.id).sort((a, b) => {
    const la = a.messages.at(-1)?.at ?? "";
    const lb = b.messages.at(-1)?.at ?? "";
    return la < lb ? 1 : -1;
  });
  const ambient = [
    { id: "maya", text: "see you sat morning!! bring water", at: "2026-11-11T22:10:00Z" },
    { id: "dev", text: "You: ok pushing the fix now", at: "2026-11-11T16:40:00Z" },
    { id: "theo", text: "do u still have the extra ticket", at: "2026-11-10T19:00:00Z" },
  ].map((a) => ({ ...a, user: getUser(a.id)! }));

  return (
    <div className="mx-auto max-w-[680px] pb-24 md:py-4">
      <section className="fb-card rounded-none md:rounded-[8px]">
        <div className="flex items-center justify-between px-4 pt-4">
          <h1 className="text-[24px] font-bold">Chats</h1>
          <button className="fb-icon-btn h-9 w-9">
            <MoreIcon size={20} />
          </button>
        </div>
        <div className="px-4 pt-3">
          <label className="flex h-9 items-center gap-2 rounded-full bg-fb-bg px-3 text-fb-muted">
            <SearchIcon size={16} />
            <input className="w-full bg-transparent text-[15px] outline-none" placeholder="Search Messenger" />
          </label>
        </div>
        <ul className="py-2">
          {threads.map((t) => {
            const other = getUser(t.participantIds.find((p) => p !== me.id)!)!;
            const last = t.messages.at(-1);
            const preview = last ? `${last.from === me.id ? "You: " : ""}${last.text.replace(/^\(from their post in the Group\) /, "")}` : t.draft?.for === me.id ? "Muse drafted an opener for you" : "Say hi";
            return (
              <li key={t.id}>
                <Link href={`/messenger/${t.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-fb-hover md:mx-2 md:rounded-lg">
                  <span className="relative">
                    <Avatar src={other.avatarUrl} name={other.name} size={56} />
                    <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-fb-green" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                      {other.name}
                      {t.matchId && <MuseMark size={12} />}
                    </span>
                    <span className="block truncate text-[13px] text-fb-muted">
                      {preview}
                      {last && ` · ${timeAgo(last.at)}`}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
          {ambient.map((a) => (
            <li key={a.id}>
              <div className="flex items-center gap-3 px-3 py-2 md:mx-2">
                <Avatar src={a.user.avatarUrl} name={a.user.name} size={56} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{a.user.name}</span>
                  <span className="block truncate text-[13px] text-fb-muted">
                    {a.text} · {timeAgo(a.at)}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
