// A Facebook Group post: author, pinned/admin labels, text, photo, reactions, actions, first comments.
// Muse annotations (chips) appear only when the viewer's Muse has evaluated the author.
import Avatar from "./Avatar";
import { CommentIcon, GroupsIcon, LikeIcon, MoreIcon, MuseMark, PinIcon, ShareIcon, SmileIcon } from "./icons";
import PostMuseChip from "./PostMuseChip";
import { firstName, timeAgo } from "@/lib/format";
import type { GroupPost, Match, User } from "@/lib/types";

export default function PostCard({
  post,
  author,
  museOn,
  isAdmin,
  match,
  viewer,
  resolve,
}: {
  post: GroupPost;
  author: User;
  museOn: boolean;
  isAdmin: boolean;
  match?: Match;
  viewer: User;
  resolve: (id: string) => User | undefined;
}) {
  const likes = post.reactions;
  const comments = post.comments;
  return (
    <article className="fb-card rounded-none md:rounded-[8px]">
      {post.pinned && (
        <div className="flex items-center gap-1.5 px-4 pt-3 text-[13px] font-semibold text-fb-muted">
          <PinIcon size={14} /> Featured
        </div>
      )}
      <header className={`flex items-start gap-2 px-4 ${post.pinned ? "pt-2" : "pt-3"}`}>
        <Avatar src={author.avatarUrl} name={author.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">{author.name}</span>
            {isAdmin && <span className="rounded bg-fb-chip px-1.5 py-px text-[11px] font-semibold text-fb-muted">Admin</span>}
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
      {post.imageUrl && (
        <div className="max-h-[480px] w-full overflow-hidden bg-fb-bg">
          <img src={post.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      {match && <PostMuseChip match={match} authorName={author.name} viewerId={viewer.id} groupId={post.groupId} />}
      <div className="flex items-center justify-between px-4 py-2 text-[15px] text-fb-muted">
        <span className="flex items-center gap-1.5">
          <span className="flex -space-x-1">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-fb-blue text-white ring-2 ring-white">
              <LikeIcon size={11} />
            </span>
            {likes > 8 && <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-fb-red text-[10px] text-white ring-2 ring-white">♥</span>}
          </span>
          {likes}
        </span>
        {comments.length > 0 && <span>{comments.length === 1 ? "1 comment" : `${comments.length} comments`}</span>}
      </div>
      <div className="mx-4 flex border-y border-fb-divider py-1">
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
      <div className="flex flex-col gap-2 px-4 py-3">
        {comments.slice(0, 2).map((c, i) => {
          const u = resolve(c.authorId);
          return (
            <div key={i} className="flex items-start gap-2">
              <Avatar src={u?.avatarUrl} name={u?.name ?? "?"} size={32} />
              <div className="min-w-0">
                <div className="inline-block rounded-2xl bg-fb-bg px-3 py-1.5">
                  <div className="text-[13px] font-semibold">{u?.name}</div>
                  <div className="text-[15px] leading-5">{c.text}</div>
                </div>
                <div className="ml-3 mt-0.5 flex gap-3 text-[12px] font-semibold text-fb-muted">
                  <span>Like</span>
                  <span>Reply</span>
                  <span className="font-normal">{timeAgo(c.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {comments.length > 2 && <button className="self-start text-[15px] font-semibold text-fb-muted hover:underline">View {comments.length - 2} more comments</button>}
        <div className="flex items-center gap-2">
          <Avatar src={viewer.avatarUrl} name={viewer.name} size={32} />
          <div className="flex h-9 flex-1 items-center justify-between rounded-full bg-fb-bg px-3 text-[15px] text-fb-muted">
            <span>Comment as {firstName(viewer.name)}…</span>
            <SmileIcon size={18} />
          </div>
        </div>
      </div>
    </article>
  );
}
