// Facebook home left rail (desktop only), as in the user's screenshot.
import Link from "next/link";
import Avatar from "./Avatar";
import { AdsIcon, BookmarkIcon, CalendarIcon, ChevronDown, FeedIcon, FriendsIcon, GroupsIcon, MarketplaceIcon, MemoriesIcon, MuseMark, VideoIcon } from "./icons";
import type { User } from "@/lib/types";

const ITEMS: { label: string; href: string; icon: React.ReactNode }[] = [
  { label: "Muse", href: "/digest", icon: <MuseMark size={36} /> },
  { label: "Friends", href: "#", icon: <FriendsIcon size={36} className="text-fb-blue" /> },
  { label: "Memories", href: "#", icon: <MemoriesIcon size={36} className="text-fb-blue" /> },
  { label: "Saved", href: "#", icon: <BookmarkIcon size={36} className="text-fb-purple" /> },
  { label: "Groups", href: "/groups/g_housing27", icon: <GroupsIcon size={36} className="text-fb-blue" /> },
  { label: "Reels", href: "#", icon: <VideoIcon size={36} className="text-fb-pink" /> },
  { label: "Marketplace", href: "/marketplace", icon: <MarketplaceIcon size={36} className="text-fb-blue" /> },
  { label: "Feeds", href: "#", icon: <FeedIcon size={36} className="text-fb-blue" /> },
  { label: "Events", href: "/events/evt_weekend_runs", icon: <CalendarIcon size={36} className="text-fb-red" /> },
  { label: "Ads Manager", href: "#", icon: <AdsIcon size={36} className="text-fb-blue" /> },
];

export default function LeftSidebar({ me }: { me: User }) {
  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[300px] shrink-0 flex-col overflow-y-auto px-2 pt-3 lg:flex xl:w-[360px]">
      <Link href="#" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#e4e6e9]">
        <Avatar src={me.avatarUrl} name={me.name} size={36} />
        <span className="text-[15px] font-medium">{me.name}</span>
      </Link>
      {ITEMS.map((it) => (
        <Link key={it.label} href={it.href} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#e4e6e9]">
          <span className="flex h-9 w-9 items-center justify-center">{it.icon}</span>
          <span className="text-[15px] font-medium">{it.label}</span>
        </Link>
      ))}
      <button className="flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[#e4e6e9]">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fb-chip">
          <ChevronDown size={20} />
        </span>
        <span className="text-[15px] font-medium">See more</span>
      </button>
      <div className="mx-2 my-2 border-t border-fb-border" />
      <div className="px-2 pb-4 text-[13px] text-fb-muted">Privacy · Consumer Health Privacy · Terms · Advertising · Cookies · Meta © 2026</div>
    </aside>
  );
}
