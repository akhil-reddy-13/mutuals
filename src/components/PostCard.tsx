// A Facebook Group post. Muse annotations (chips) appear only when the viewer's Muse has evaluated the author.
import Avatar from "./Avatar";
import { CommentIcon, GroupsIcon, LikeIcon, MoreIcon, MuseMark, ShareIcon } from "./icons";
import PostMuseChip from "./PostMuseChip";
import { timeAgo } from "@/lib/format";
import type { GroupPost, Match, User } from "@/lib/types";

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export default function PostCard({ post, author, museOn, match, viewerId }: { post: GroupPost; author: User; museOn: boolean; match?: Match; viewerId: string }) {
  const likes = hash(post.id) % 14;
  const comments = hash(post.id + "c") % 6;
  return (
    <article className="fb-card rounded-none md:rounded-[8px]">
      <header className="flex items-start gap-2 px-4 pt-3">
        <Avatar src={author.avatarUrl} name={author.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">{author.name}</span>
            {museOn && (
              <span title="Lets their Muse talk to other Muses in this group" className="inline-flex">
                <MuseMark size={12} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[13px] text-fb-muted">
            <span>{timeAgo(post.createdAt)}</span>
            <span>·</span>
            <GroupsIcon size={12} />
          </div>
        </div>
        <button className="fb-icon-btn h-9 w-9 bg-transparent" aria-label="More">
          <MoreIcon size={20} className="text-fb-muted" />
        </button>
      </header>
      <p className="whitespace-pre-wrap px-4 pb-3 pt-2 text-[15px] leading-5">{post.text}</p>
      {match && <PostMuseChip match={match} authorName={author.name} viewerId={viewerId} groupId={post.groupId} />}
      <div className="flex items-center justify-between px-4 py-2 text-[15px] text-fb-muted">
        <span className="flex items-center gap-1.5">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-fb-blue text-white">
            <LikeIcon size={11} />
          </span>
          {likes + 2}
        </span>
        <span>{comments === 1 ? "1 comment" : `${comments} comments`}</span>
      </div>
      <div className="mx-4 flex border-t border-fb-divider py-1">
        {[
          ["Like", LikeIcon],
          ["Comment", CommentIcon],
          ["Share", ShareIcon],
        ].map(([label, Icon]) => {
          const I = Icon as typeof LikeIcon;
          return (
            <button key={label as string} className="flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-[15px] font-semibold text-fb-muted hover:bg-fb-hover">
              <I size={20} />
              {label as string}
            </button>
          );
        })}
      </div>
    </article>
  );
}
