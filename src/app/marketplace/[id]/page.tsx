// A Marketplace listing Muse wrote from the room video's leftover items (handoff decision 5).
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import { BackIcon, BookmarkIcon, MarketplaceIcon, MessengerIcon, MuseMark, ShareIcon } from "@/components/icons";
import { getListing, getUser } from "@/lib/db";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const PLACE: Record<string, string> = { "San Francisco": "San Francisco, CA", Stanford: "Stanford, CA", Chicago: "Chicago, IL" };

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = getListing(id);
  if (!l) notFound();
  const seller = getUser(l.sellerId)!;
  return (
    <div className="mx-auto max-w-[900px] pb-24 md:py-4">
      <div className="fb-card overflow-hidden rounded-none md:flex md:rounded-[8px]">
        <div className="relative flex aspect-square items-center justify-center bg-fb-bg md:w-1/2">
          <Link href="/marketplace" className="fb-icon-btn absolute left-3 top-3 bg-white/80" aria-label="Back">
            <BackIcon size={22} />
          </Link>
          {l.imageDataUrl ? (
            <img src={l.imageDataUrl} alt={l.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-fb-muted">
              <MarketplaceIcon size={64} />
              <span className="text-[13px]">Photo from your video</span>
            </div>
          )}
        </div>
        <div className="flex-1 p-4">
          <h1 className="text-[24px] font-bold leading-tight">{l.title}</h1>
          <div className="mt-1 text-[20px] font-semibold">${l.priceUsd}</div>
          <div className="mt-1 text-[13px] text-fb-muted">Listed {timeAgo(l.createdAt)} in {PLACE[seller.city] ?? seller.city}</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="fb-btn-primary col-span-1">
              <MessengerIcon size={18} /> Message
            </button>
            <button className="fb-btn-secondary">
              <BookmarkIcon size={18} /> Save
            </button>
            <button className="fb-btn-secondary">
              <ShareIcon size={18} /> Share
            </button>
          </div>
          <div className="mt-4 border-t border-fb-divider pt-3">
            <h2 className="text-[17px] font-bold">Details</h2>
            <div className="mt-1 text-[15px]">
              <span className="text-fb-muted">Condition</span> <span className="capitalize">{l.condition}</span>
            </div>
            <p className="mt-2 text-[15px] leading-5">{l.description}</p>
            <ul className="mt-2 flex flex-col gap-1 text-[14px]">
              {l.items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>
                    {i.name}
                    {i.flaws.length > 0 && <span className="text-fb-muted"> · {i.flaws.join(", ")}</span>}
                  </span>
                  <span className="text-fb-muted">${i.suggestedPriceUsd}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-fb-muted">
              <MuseMark size={12} /> Items and prices pulled from a 10-second video by Muse. Edited by {seller.name.split(" ")[0]}.
            </div>
          </div>
          <div className="mt-4 border-t border-fb-divider pt-3">
            <h2 className="text-[17px] font-bold">Seller information</h2>
            <div className="mt-2 flex items-center gap-3">
              <Avatar src={seller.avatarUrl} name={seller.name} size={40} />
              <div>
                <div className="text-[15px] font-semibold">{seller.name}</div>
                <div className="text-[13px] text-fb-muted">Joined Facebook in 2019 · Stanford</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
