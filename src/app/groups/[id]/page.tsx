// Facebook Group page: cover, header, tabs, composer with the Muse row, posts with Muse chips. PRD §11 / handoff 4a.
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import GroupCover from "@/components/GroupCover";
import { CameraIcon, ChevronDown, GlobeIcon, LockIcon, MoreIcon, MuseMark, PhotoIcon, PlusIcon, SearchIcon, SparkleIcon } from "@/components/icons";
import MuseLauncher from "@/components/MuseLauncher";
import PostCard from "@/components/PostCard";
import { asksForUser, getAsk, getGroup, getUser, matchesForAsk, matchesInvolving, postsInGroup } from "@/lib/db";
import { firstName } from "@/lib/format";
import { compactCount } from "@/lib/format";
import { sortMatches } from "@/lib/match";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = getGroup(id);
  if (!group) notFound();
  const me = await currentUser();
  const posts = postsInGroup(id);
  const members = group.memberIds.map((m) => getUser(m)!).filter(Boolean);
  const admins = group.adminIds.map((a) => getUser(a)!).filter(Boolean);
  const museMembers = members.filter((u) => u.museEnabled && u.museGroups.includes(id));
  const myAsk = asksForUser(me.id)
    .filter((a) => a.groupId === id && a.status === "matched")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const matches = myAsk ? sortMatches(matchesForAsk(myAsk.id)) : [];
  const matchByAuthor = new Map(matches.map((m) => [m.candidateId, m]));
  const fits = matches.filter((m) => m.verdict.compatible);
  const media = posts.filter((p) => p.imageUrl).slice(0, 6);
  // The other side of a match: someone else's Muse checked with mine in this Group.
  const talkedToMe = matchesInvolving(me.id)
    .filter((m) => m.candidateId === me.id && m.mode === "agent_to_agent" && m.verdict.compatible && getAsk(m.askId)?.groupId === id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 1);
  const tabs = ["Discussion", "Featured", "Members", "Events", "Media", "Files"];

  return (
    <div className="mx-auto max-w-[1100px] pb-24 md:pb-10">
      {/* Cover + header */}
      <div className="fb-card overflow-hidden rounded-none md:rounded-t-none md:rounded-b-lg">
        <div className="relative">
          <GroupCover kind={group.cover} className="h-[170px] w-full md:h-[300px]" />
          <div className="absolute bottom-3 right-3 hidden md:block">
            <button className="fb-btn-secondary h-9 bg-white/90 text-[15px] hover:bg-white">
              <CameraIcon size={18} /> Edit
            </button>
          </div>
        </div>
        <div className="px-4 pb-0 pt-3 md:px-6">
          <h1 className="text-[24px] font-bold leading-tight md:text-[28px]">{group.name}</h1>
          <div className="mt-1 flex items-center gap-1 text-[15px] text-fb-muted">
            {group.privacy === "private" ? <LockIcon size={14} /> : <GlobeIcon size={14} />}
            <span>{group.privacy === "private" ? "Private group" : "Public group"}</span>
            <span>·</span>
            <span className="font-semibold text-fb-muted">{compactCount(group.memberCount)} members</span>
          </div>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex -space-x-2">
              {members.slice(0, 8).map((u) => (
                <Avatar key={u.id} src={u.avatarUrl} name={u.name} size={32} ring />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex">
              <button className="fb-btn-primary">
                <PlusIcon size={18} /> Invite
              </button>
              <button className="fb-btn-secondary">
                Joined <ChevronDown size={16} />
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center border-t border-fb-divider">
            <div className="no-scrollbar flex flex-1 overflow-x-auto">
              {tabs.map((t, i) => (
                <button key={t} className={`relative shrink-0 px-4 py-3.5 text-[15px] font-semibold ${i === 0 ? "text-fb-blue" : "text-fb-muted hover:bg-fb-hover"} rounded-md`}>
                  {t}
                  {i === 0 && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t bg-fb-blue" />}
                </button>
              ))}
            </div>
            <div className="hidden gap-2 md:flex">
              <button className="fb-icon-btn h-9 w-9">
                <MoreIcon size={20} />
              </button>
              <button className="fb-icon-btn h-9 w-9">
                <SearchIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-4 md:mt-4 md:px-4">
        {/* Feed */}
        <div className="mx-auto flex w-full max-w-[680px] min-w-0 flex-col gap-3 md:gap-4">
          <section className="fb-card rounded-none p-3 md:rounded-[8px] md:p-4">
            <div className="flex items-center gap-2">
              <Avatar src={me.avatarUrl} name={me.name} size={40} />
              <button className="h-10 flex-1 rounded-full bg-fb-bg px-4 text-left text-[15px] text-fb-muted hover:bg-[#e4e6e9]">Write something…</button>
            </div>
            <div className="mt-3 flex border-t border-fb-divider pt-2">
              {[
                ["Anonymous post", <SparkleIcon key="a" size={22} className="text-fb-blue" />],
                ["Photo/video", <PhotoIcon key="p" size={22} className="text-fb-green" />],
                ["Poll", <MoreIcon key="m" size={22} className="text-fb-amber" />],
              ].map(([label, icon]) => (
                <button key={label as string} className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-1 py-2 text-[13px] font-semibold text-fb-muted hover:bg-fb-hover md:text-[14px]">
                  {icon as React.ReactNode}
                  <span className="truncate">{label as string}</span>
                </button>
              ))}
            </div>
            <MuseLauncher me={{ id: me.id, name: me.name, avatarUrl: me.avatarUrl, museGroups: me.museGroups }} group={{ id: group.id, name: group.name }} />
          </section>

          {myAsk && (
            <Link href={`/groups/${group.id}/muse/${myAsk.id}`} className="fb-card flex items-center gap-3 rounded-none p-3 hover:bg-fb-hover md:rounded-[8px] md:p-4">
              <MuseMark size={40} />
              <span className="min-w-0 flex-1">
                {myAsk.type === "item" && myAsk.side !== "seeking" ? (
                  <>
                    <span className="block text-[15px] font-semibold">
                      {(() => {
                        const n = matches.reduce((k, m) => k + (m.routedItems?.length ?? 0), 0);
                        return n ? `${n} of your things already ${n === 1 ? "has" : "have"} a home` : "Nobody here needs these yet";
                      })()}
                    </span>
                    <span className="block truncate text-[13px] text-fb-muted">{myAsk.summary}</span>
                  </>
                ) : (
                  <>
                    <span className="block text-[15px] font-semibold">
                      {fits.length} {fits.length === 1 ? "person fits" : "people fit"} your ask
                    </span>
                    <span className="block truncate text-[13px] text-fb-muted">
                      I checked with {matches.filter((m) => m.mode === "agent_to_agent").length} people&apos;s Muses and read {posts.length} posts here.
                    </span>
                  </>
                )}
              </span>
              <span className="flex -space-x-2">
                {fits.slice(0, 3).map((m) => {
                  const u = getUser(m.candidateId)!;
                  return <Avatar key={m.id} src={u.avatarUrl} name={u.name} size={28} ring />;
                })}
              </span>
            </Link>
          )}

          {talkedToMe.map((m) => {
            const asker = getUser(m.userId)!;
            return (
              <Link key={m.id} href={`/groups/${group.id}/muse/${m.askId}`} className="fb-card flex items-center gap-3 rounded-none p-3 hover:bg-fb-hover md:rounded-[8px] md:p-4">
                <span className="relative">
                  <Avatar src={asker.avatarUrl} name={asker.name} size={40} />
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-px">
                    <MuseMark size={16} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{firstName(asker.name)}&apos;s Muse checked with yours</span>
                  <span className="block truncate text-[13px] text-fb-muted">{m.verdict.summaryForHumans}</span>
                </span>
              </Link>
            );
          })}

          {posts.map((p) => {
            const author = getUser(p.authorId)!;
            return (
              <PostCard
                key={p.id}
                post={p}
                author={author}
                isAdmin={group.adminIds.includes(author.id)}
                museOn={author.museEnabled && author.museGroups.includes(id)}
                match={matchByAuthor.get(author.id)}
                viewer={me}
                resolve={getUser}
              />
            );
          })}
        </div>

        {/* Right column */}
        <aside className="hidden w-[360px] shrink-0 flex-col gap-4 xl:flex">
          <section className="fb-card p-4">
            <h2 className="text-[17px] font-bold">About</h2>
            <p className="mt-2 text-[15px]">{group.about}</p>
            <div className="mt-3 flex gap-3 text-[15px]">
              {group.privacy === "private" ? <LockIcon size={20} className="mt-0.5 shrink-0 text-fb-muted" /> : <GlobeIcon size={20} className="mt-0.5 shrink-0 text-fb-muted" />}
              <div>
                <div className="font-semibold">{group.privacy === "private" ? "Private" : "Public"}</div>
                <div className="text-[13px] text-fb-muted">
                  {group.privacy === "private" ? "Only members can see who's in the group and what they post." : "Anyone can see who's in the group and what they post."}
                </div>
              </div>
            </div>
          </section>
          <section className="fb-card p-4">
            <div className="flex items-center gap-2">
              <MuseMark size={22} />
              <h2 className="text-[17px] font-bold">Muse in this group</h2>
            </div>
            <p className="mt-2 text-[15px] text-fb-muted">
              {museMembers.length} members let their Muse talk to other members&apos; Muses here. Private preferences stay private. You see everything your Muse shares.
            </p>
            <div className="mt-3 flex -space-x-2">
              {museMembers.map((u) => (
                <Avatar key={u.id} src={u.avatarUrl} name={u.name} size={32} ring />
              ))}
            </div>
          </section>
          {media.length > 0 && (
            <section className="fb-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-bold">Recent media</h2>
                <span className="text-[15px] font-semibold text-fb-blue">See all</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 overflow-hidden rounded-lg">
                {media.map((p) => (
                  <img key={p.id} src={p.imageUrl} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                ))}
              </div>
            </section>
          )}
          <section className="fb-card p-4">
            <h2 className="text-[17px] font-bold">Admins and moderators</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {admins.map((u) => (
                <li key={u.id} className="flex items-center gap-3">
                  <Avatar src={u.avatarUrl} name={u.name} size={36} />
                  <div>
                    <div className="text-[15px] font-semibold">{u.name}</div>
                    <div className="text-[13px] text-fb-muted">Admin</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
