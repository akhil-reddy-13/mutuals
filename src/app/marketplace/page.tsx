import Link from "next/link";
import { MarketplaceIcon } from "@/components/icons";
import { listingsForUser } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MarketplaceIndex() {
  const me = await currentUser();
  const mine = listingsForUser(me.id);
  const ambient = [
    // Photos generated with Muse Image (scripts/gen-images.ts), stored in public/img so the demo works offline.
    ["Free IKEA floor lamp", 0, "/img/mp_lamp.jpg"],
    ["Mini fridge, works great", 45, "/img/mp_fridge.jpg"],
    ["Desk chair, mesh back", 35, "/img/mp_chair.jpg"],
    ["Bookshelf, 5 tier", 20, "/img/mp_bookshelf.jpg"],
    ["Yoga mat + blocks", 15, "/img/mp_yoga.jpg"],
    ["Monitor 24in 1080p", 60, "/img/mp_monitor.jpg"],
  ] as const;
  return (
    <div className="mx-auto max-w-[1100px] px-3 pb-24 md:px-4 md:py-4">
      <h1 className="pt-3 text-[24px] font-bold md:pt-0">Marketplace</h1>
      {mine.length > 0 && (
        <>
          <h2 className="mt-3 text-[17px] font-bold">Your listings</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            {mine.map((l) => (
              <Link key={l.id} href={`/marketplace/${l.id}`} className="fb-card overflow-hidden hover:bg-fb-hover">
                <div className="flex aspect-square items-center justify-center bg-fb-bg">
                  {l.imageDataUrl ? <img src={l.imageDataUrl} alt="" className="h-full w-full object-cover" /> : <MarketplaceIcon size={40} className="text-fb-muted" />}
                </div>
                <div className="p-2">
                  <div className="text-[15px] font-semibold">${l.priceUsd}</div>
                  <div className="truncate text-[14px]">{l.title}</div>
                  <div className="text-[12px] text-fb-muted">San Francisco, CA</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      <h2 className="mt-4 text-[17px] font-bold">Today&apos;s picks</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        {ambient.map(([t, p, img]) => (
          <div key={t} className="fb-card overflow-hidden">
            <img src={img} alt={t} className="aspect-square w-full object-cover" loading="lazy" />
            <div className="p-2">
              <div className="text-[15px] font-semibold">{p === 0 ? "Free" : `$${p}`}</div>
              <div className="truncate text-[14px]">{t}</div>
              <div className="text-[12px] text-fb-muted">Stanford, CA</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
