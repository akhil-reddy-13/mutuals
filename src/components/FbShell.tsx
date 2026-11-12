// Facebook chrome: desktop top bar (logo, search, center tabs, right icons) + left rail; phone header + tab row.
import Link from "next/link";
import { allUsers, getUser, matchesInvolving, threadsForUser } from "@/lib/db";
import { museMode } from "@/lib/muse";
import { currentUserId } from "@/lib/session";
import { BellIcon, FacebookF, GridIcon, MessengerIcon, PlusIcon, SearchIcon } from "./icons";
import LeftSidebar from "./LeftSidebar";
import { DesktopTabs, MobileTabs } from "./NavTabs";
import PersonaSwitcher from "./PersonaSwitcher";

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-fb-red px-1 text-[11px] font-bold leading-none text-white">
      {n}
    </span>
  );
}

export default async function FbShell({ children }: { children: React.ReactNode }) {
  const meId = await currentUserId();
  const me = getUser(meId) ?? getUser("alex")!;
  const personas = allUsers().map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl }));
  // One notification per ask I made that found fits, plus one per other person whose Muse matched with mine.
  const involving = matchesInvolving(me.id).filter((m) => m.verdict.compatible);
  const notifCount = new Set([
    ...involving.filter((m) => m.userId === me.id).map((m) => `ask:${m.askId}`),
    ...involving.filter((m) => m.candidateId === me.id && m.mode === "agent_to_agent").map((m) => `from:${m.userId}`),
  ]).size;
  const msgCount = threadsForUser(me.id).filter((t) => t.messages.some((m) => m.from !== me.id && !m.text.startsWith("(from their post"))).length;
  const mode = museMode();

  return (
    <div className="min-h-dvh">
      {/* Desktop header */}
      <header className="sticky top-0 z-30 hidden h-14 items-center justify-between bg-fb-card px-4 shadow-fb md:flex">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Facebook" className="flex h-10 w-10 items-center justify-center rounded-full bg-fb-blue text-white">
            <FacebookF size={26} />
          </Link>
          <label className="flex h-10 w-10 items-center justify-center gap-2 rounded-full bg-fb-bg text-fb-muted lg:w-[200px] lg:justify-start lg:px-3 xl:w-[240px]">
            <SearchIcon size={18} />
            <input className="hidden w-full bg-transparent text-[15px] outline-none placeholder:text-fb-muted lg:block" placeholder="Search Facebook" />
          </label>
        </div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <DesktopTabs />
        </div>
        <div className="flex items-center gap-2">
          <button className="fb-icon-btn" aria-label="Menu">
            <GridIcon size={22} />
          </button>
          <Link href="/messenger" className="fb-icon-btn relative" aria-label="Messenger">
            <MessengerIcon size={22} />
            <Badge n={msgCount} />
          </Link>
          <Link href="/notifications" className="fb-icon-btn relative" aria-label="Notifications">
            <BellIcon size={22} />
            <Badge n={notifCount} />
          </Link>
          <PersonaSwitcher personas={personas} current={me.id} mode={mode} />
        </div>
      </header>

      {/* Phone header + tab row */}
      <div className="sticky top-0 z-30 md:hidden">
        <header className="flex h-[52px] items-center justify-between bg-fb-card px-3">
          <Link href="/" className="text-[26px] font-bold tracking-tight text-fb-blue" style={{ fontFamily: "Helvetica, Arial, sans-serif", letterSpacing: "-0.03em" }}>
            facebook
          </Link>
          <div className="flex items-center gap-2">
            <button className="fb-icon-btn" aria-label="Create">
              <PlusIcon size={22} />
            </button>
            <button className="fb-icon-btn" aria-label="Search">
              <SearchIcon size={20} />
            </button>
            <Link href="/messenger" className="fb-icon-btn relative" aria-label="Messenger">
              <MessengerIcon size={22} />
              <Badge n={msgCount} />
            </Link>
            <PersonaSwitcher personas={personas} current={me.id} mode={mode} compact />
          </div>
        </header>
        <MobileTabs notifCount={notifCount} />
      </div>

      <div className="mx-auto flex max-w-[1920px]">
        <LeftSidebar me={me} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
