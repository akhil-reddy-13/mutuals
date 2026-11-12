// Facebook chrome: top bar, left nav (desktop), bottom tab bar (mobile ~390px). Server component.
import Link from "next/link";
import { allUsers, getUser } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import PersonaSwitcher from "./PersonaSwitcher";

const NAV = [
  { href: "/mutuals/digest", label: "Mutuals", icon: "🤝" },
  { href: "/mutuals/ask/new", label: "New ask", icon: "✨" },
  { href: "/mutuals/log", label: "What my Muse shared", icon: "🔒" },
  { href: "/mutuals/settings", label: "Muse settings", icon: "⚙️" },
  { href: "/messenger", label: "Messenger", icon: "💬" },
];

export default async function FbShell({ children }: { children: React.ReactNode }) {
  const me = getUser(await currentUserId());
  const personas = allUsers().map((u) => ({ id: u.id, name: u.name }));
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-fb-border bg-fb-card px-4 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fb-blue text-2xl font-bold text-white">f</span>
          <span className="hidden text-lg font-semibold sm:inline">Mutuals</span>
        </Link>
        <div className="flex items-center gap-2">
          <PersonaSwitcher personas={personas} current={me?.id ?? "alex"} />
          {me && <img src={me.avatarUrl} alt={me.name} className="h-9 w-9 rounded-full" />}
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-4 px-0 sm:px-4">
        <nav className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 flex-col gap-1 py-4 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium hover:bg-fb-hover">
              <span className="text-xl">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1 px-4 py-4 pb-20 md:pb-4">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-fb-border bg-fb-card py-2 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="flex flex-col items-center text-xs text-fb-muted">
            <span className="text-xl">{n.icon}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
