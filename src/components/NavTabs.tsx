"use client";
// Facebook's center tab strip (desktop) and the under-header tab row (phone). Active state from the pathname.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon, FriendsIcon, GroupsIcon, HomeIcon, MarketplaceIcon, MenuIcon, VideoIcon } from "./icons";

const TABS = [
  { key: "home", href: "/", match: (p: string) => p === "/", Icon: HomeIcon, label: "Home" },
  { key: "friends", href: "#", match: () => false, Icon: FriendsIcon, label: "Friends" },
  { key: "video", href: "#", match: () => false, Icon: VideoIcon, label: "Video" },
  { key: "market", href: "/marketplace", match: (p: string) => p.startsWith("/marketplace"), Icon: MarketplaceIcon, label: "Marketplace" },
  { key: "groups", href: "/groups", match: (p: string) => p.startsWith("/groups"), Icon: GroupsIcon, label: "Groups" },
];

export function DesktopTabs() {
  const path = usePathname();
  return (
    <nav className="hidden h-14 items-stretch lg:flex" aria-label="Primary">
      {TABS.map(({ key, href, match, Icon, label }) => {
        const active = match(path);
        return (
          <Link
            key={key}
            href={href}
            title={label}
            className={`relative mx-0.5 flex w-[88px] items-center justify-center rounded-lg text-fb-muted hover:bg-fb-hover xl:w-[112px] ${active ? "text-fb-blue" : ""}`}
          >
            <Icon size={28} {...(key === "home" ? { active } : {})} />
            {active && <span className="absolute inset-x-0 -bottom-0 h-[3px] rounded-t bg-fb-blue" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTabs({ notifCount }: { notifCount: number }) {
  const path = usePathname();
  const tabs = [
    ...TABS.slice(0, 4),
    { key: "groups", href: "/groups", match: (p: string) => p.startsWith("/groups"), Icon: GroupsIcon, label: "Groups" },
    { key: "bell", href: "/notifications", match: (p: string) => p.startsWith("/notifications"), Icon: BellIcon, label: "Notifications" },
    { key: "menu", href: "#", match: () => false, Icon: MenuIcon, label: "Menu" },
  ].filter((t) => t.key !== "friends");
  return (
    <nav className="flex h-11 items-stretch border-b border-fb-divider bg-fb-card md:hidden" aria-label="Primary">
      {tabs.map(({ key, href, match, Icon, label }) => {
        const active = match(path);
        return (
          <Link key={key} href={href} title={label} className={`relative flex flex-1 items-center justify-center ${active ? "text-fb-blue" : "text-fb-muted"}`}>
            <Icon size={26} {...(key === "home" ? { active } : {})} />
            {key === "bell" && notifCount > 0 && (
              <span className="absolute left-1/2 top-1 ml-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-fb-red px-1 text-[11px] font-bold text-white">{notifCount}</span>
            )}
            {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t bg-fb-blue" />}
          </Link>
        );
      })}
    </nav>
  );
}
