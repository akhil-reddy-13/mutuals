// Facebook Groups: your groups. Each links to the Group page where Muse lives.
import Link from "next/link";
import GroupCover from "@/components/GroupCover";
import { MuseMark, SearchIcon } from "@/components/icons";
import { getGroup, postsInGroup } from "@/lib/db";
import { compactCount, timeAgo } from "@/lib/format";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const me = await currentUser();
  const groups = me.groups.map((g) => getGroup(g)!).filter(Boolean);
  return (
    <div className="mx-auto max-w-[680px] pb-24 md:py-4">
      <section className="fb-card rounded-none md:rounded-[8px]">
        <div className="flex items-center justify-between px-4 pt-4">
          <h1 className="text-[24px] font-bold">Groups</h1>
          <button className="fb-btn-soft h-9 text-[15px]">+ Create</button>
        </div>
        <div className="px-4 pt-3">
          <label className="flex h-9 items-center gap-2 rounded-full bg-fb-bg px-3 text-fb-muted">
            <SearchIcon size={16} />
            <input className="w-full bg-transparent text-[15px] outline-none" placeholder="Search groups" />
          </label>
        </div>
        <div className="flex gap-2 px-4 pb-1 pt-3">
          <button className="rounded-full bg-fb-blue-soft px-3 py-1.5 text-[15px] font-semibold text-fb-blue">Your groups</button>
          <button className="rounded-full px-3 py-1.5 text-[15px] font-semibold hover:bg-fb-hover">Discover</button>
        </div>
        <ul className="py-2">
          {groups.map((g) => {
            const latest = postsInGroup(g.id)[0];
            const museOn = me.museGroups.includes(g.id);
            return (
              <li key={g.id}>
                <Link href={`/groups/${g.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-fb-hover md:mx-2 md:rounded-lg">
                  <GroupCover kind={g.cover} className="h-14 w-14 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                      {g.name}
                      {museOn && <MuseMark size={12} />}
                    </span>
                    <span className="block truncate text-[13px] text-fb-muted">
                      {compactCount(g.memberCount)} members{latest ? ` · Last active ${timeAgo(latest.createdAt)}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
