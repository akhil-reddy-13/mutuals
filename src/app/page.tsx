// Facebook Home: composer, stories, and a feed of posts from the Groups you're in. The demo starts here, then goes
// into a Group where Muse lives. Nothing on this page is Muse-specific except the Muse suggestion card.
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { MuseMark, PhotoIcon, PlusIcon, SmileIcon, VideoCamIcon } from "@/components/icons";
import PostCard from "@/components/PostCard";
import { asksForUser, getGroup, getUser, matchesForAsk, seed } from "@/lib/db";
import { firstName } from "@/lib/format";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await currentUser();
  const myGroups = new Set(me.groups);
  const feed = seed.posts
    .filter((p) => myGroups.has(p.groupId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 12);
  const stories = ["maya", "priya", "theo", "june", "dev"].map((id) => getUser(id)!).filter(Boolean);
  const latestMatched = asksForUser(me.id)
    .filter((a) => a.status === "matched")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const fits = latestMatched ? matchesForAsk(latestMatched.id).filter((m) => m.verdict.compatible) : [];
  const matchedGroup = latestMatched ? getGroup(latestMatched.groupId) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-3 pb-24 md:gap-4 md:py-4">
      {/* Composer */}
      <section className="fb-card rounded-none p-3 md:rounded-[8px] md:p-4">
        <div className="flex items-center gap-2">
          <Avatar src={me.avatarUrl} name={me.name} size={40} />
          <button className="h-10 flex-1 rounded-full bg-fb-bg px-4 text-left text-[17px] text-fb-muted hover:bg-[#e4e6e9]">What&apos;s on your mind, {firstName(me.name)}?</button>
        </div>
        <div className="mt-3 flex border-t border-fb-divider pt-2">
          {[
            ["Live video", <VideoCamIcon key="l" size={22} className="text-fb-red" />],
            ["Photo/video", <PhotoIcon key="p" size={22} className="text-fb-green" />],
            ["Feeling/activity", <SmileIcon key="f" size={22} className="text-fb-amber" />],
          ].map(([label, icon]) => (
            <button key={label as string} className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-1 py-2 text-[13px] font-semibold text-fb-muted hover:bg-fb-hover md:text-[14px]">
              {icon as React.ReactNode}
              <span className="truncate">{label as string}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Stories */}
      <section className="no-scrollbar flex gap-2 overflow-x-auto px-3 md:px-0">
        <div className="relative h-[180px] w-[110px] shrink-0 overflow-hidden rounded-xl bg-fb-card shadow-fb">
          <div className="h-[130px] w-full overflow-hidden">
            <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <span className="absolute left-1/2 top-[114px] flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-fb-blue text-white">
            <PlusIcon size={18} />
          </span>
          <div className="absolute bottom-2 w-full text-center text-[12px] font-semibold">Create story</div>
        </div>
        {stories.map((u, i) => (
          <div key={u.id} className="relative h-[180px] w-[110px] shrink-0 overflow-hidden rounded-xl shadow-fb" style={{ background: `linear-gradient(160deg, hsl(${(i * 70 + 200) % 360} 60% 55%), hsl(${(i * 70 + 260) % 360} 60% 35%))` }}>
            <img src={u.avatarUrl} alt="" className="h-full w-full object-cover opacity-80 mix-blend-luminosity" />
            <span className="absolute left-2 top-2 rounded-full border-[3px] border-fb-blue">
              <Avatar src={u.avatarUrl} name={u.name} size={32} />
            </span>
            <div className="absolute bottom-2 left-2 right-2 text-[12px] font-semibold text-white drop-shadow">{u.name}</div>
          </div>
        ))}
      </section>

      {/* Muse card: only once Muse has something to show */}
      {latestMatched && matchedGroup && fits.length > 0 && (
        <Link href={`/groups/${matchedGroup.id}/muse/${latestMatched.id}`} className="fb-card flex items-center gap-3 rounded-none p-3 hover:bg-fb-hover md:rounded-[8px] md:p-4">
          <MuseMark size={40} />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">
              {fits.length} {fits.length === 1 ? "person fits" : "people fit"} your ask in {matchedGroup.name}
            </span>
            <span className="block truncate text-[13px] text-fb-muted">{latestMatched.summary}</span>
          </span>
          <span className="flex -space-x-2">
            {fits.slice(0, 3).map((m) => {
              const u = getUser(m.candidateId)!;
              return <Avatar key={m.id} src={u.avatarUrl} name={u.name} size={28} ring />;
            })}
          </span>
        </Link>
      )}

      {feed.map((p) => {
        const author = getUser(p.authorId)!;
        const g = getGroup(p.groupId)!;
        return (
          <PostCard
            key={p.id}
            post={p}
            author={author}
            isAdmin={g.adminIds.includes(author.id)}
            museOn={author.museEnabled && author.museGroups.includes(g.id)}
            viewer={me}
            resolve={getUser}
            group={{ id: g.id, name: g.name, cover: g.cover }}
          />
        );
      })}
    </div>
  );
}
