// A Facebook Event. Replaces "circles": the connection card points here. PRD §5.1 step 7 / handoff decision 5.
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import GoingButton from "@/components/GoingButton";
import { BackIcon, CalendarIcon, GlobeIcon, MuseMark, PinIcon } from "@/components/icons";
import { getEvent, getUser } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ with?: string }> }) {
  const { id } = await params;
  const { with: withName } = await searchParams;
  const event = getEvent(id);
  if (!event) notFound();
  const me = await currentUser();
  const host = getUser(event.hostId)!;
  const going = event.goingIds.map((g) => getUser(g)!).filter(Boolean);

  return (
    <div className="mx-auto max-w-[680px] pb-24 md:py-4">
      <section className="fb-card overflow-hidden rounded-none md:rounded-[8px]">
        <div className="relative flex h-[200px] items-center justify-center bg-gradient-to-br from-[#ffd36e] via-[#ff9a62] to-[#ff5c87] text-[88px] md:h-[260px]">
          <Link href="/groups/g_housing27" className="fb-icon-btn absolute left-3 top-3 bg-white/80 md:hidden" aria-label="Back">
            <BackIcon size={22} />
          </Link>
          <span className="drop-shadow">{event.coverEmoji}</span>
        </div>
        <div className="px-4 pb-4 pt-3">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-fb-red">
            <CalendarIcon size={14} /> {event.when}
          </div>
          <h1 className="mt-1 text-[24px] font-bold leading-tight">{event.name}</h1>
          <div className="mt-1 flex items-center gap-1 text-[15px] text-fb-muted">
            <PinIcon size={16} /> {event.where}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[13px] text-fb-muted">
            <GlobeIcon size={13} /> Public event · Hosted by {host.name}
          </div>

          {withName && (
            <div className="muse-gradient mt-3 rounded-xl p-[1.5px]">
              <div className="flex items-start gap-2.5 rounded-[10.5px] bg-white px-3 py-2.5">
                <MuseMark size={20} className="mt-0.5" />
                <p className="text-[14px] leading-5">
                  <span className="font-semibold">Suggested by Muse.</span> You and {withName} both run weekend mornings and are both new to SF. {withName} got the same invite.
                </p>
              </div>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <GoingButton eventId={event.id} going={event.goingIds.includes(me.id)} />
            <button className="fb-btn-secondary flex-1">Invite</button>
            <button className="fb-btn-secondary">Share</button>
          </div>
        </div>
      </section>

      <section className="fb-card mt-3 p-4 md:mt-4">
        <h2 className="text-[17px] font-bold">Details</h2>
        <p className="mt-2 text-[15px] leading-5">{event.description}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex -space-x-2">
            {going.map((u) => (
              <Avatar key={u.id} src={u.avatarUrl} name={u.name} size={32} ring />
            ))}
          </div>
          <span className="text-[15px] text-fb-muted">
            <b className="text-fb-text">{going.length} going</b>
            {going.length > 0 && ` · ${going.slice(0, 2).map((u) => u.name.split(" ")[0]).join(", ")}${going.length > 2 ? ` and ${going.length - 2} others` : ""}`}
          </span>
        </div>
      </section>

      <section className="fb-card mt-3 p-4 md:mt-4">
        <h2 className="text-[17px] font-bold">Discussion</h2>
        <div className="mt-3 flex items-center gap-2">
          <Avatar src={me.avatarUrl} name={me.name} size={36} />
          <button className="h-9 flex-1 rounded-full bg-fb-bg px-4 text-left text-[15px] text-fb-muted">Write something…</button>
        </div>
      </section>
    </div>
  );
}
