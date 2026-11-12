"use client";
// What Ember pulled out of the video: room facts + leftover items, with a one-tap Marketplace listing.
import { useState } from "react";
import { MarketplaceIcon } from "../icons";
import type { Item, RoomDetails } from "@/lib/types";

export default function IntakeCard({ room, items, onList, listed }: { room: RoomDetails | null; items: Item[]; onList?: (items: Item[]) => Promise<void>; listed?: { id: string; title: string; priceUsd: number } | null }) {
  const [busy, setBusy] = useState(false);
  const total = items.reduce((s, i) => s + i.suggestedPriceUsd, 0);
  const facts = room
    ? [
        ["Furnished", room.furnished ? "Yes" : "No"],
        ["Size", room.approxSize],
        ["Light", room.naturalLight],
        ["Desk space", room.deskSpace ? "Yes" : "No"],
        ["Closet", room.closet ? "Yes" : "No"],
      ]
    : [];
  return (
    <div className="overflow-hidden rounded-xl border border-fb-divider bg-white">
      {room && (
        <div className="p-3">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-fb-muted">The room</div>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-lg bg-fb-bg px-2 py-1.5">
                <div className="text-[11px] text-fb-muted">{k}</div>
                <div className="text-[13px] font-semibold capitalize">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {room.notes.map((n) => (
              <span key={n} className="rounded-full bg-fb-bg px-2 py-0.5 text-[12px]">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
      {items.length > 0 && (
        <div className="border-t border-fb-divider p-3">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-fb-muted">Leftover items the next tenant might want</div>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-2.5">
                {it.imageDataUrl ? (
                  <img src={it.imageDataUrl} alt="" className="h-11 w-11 rounded-md object-cover" />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-fb-bg text-fb-muted">
                    <MarketplaceIcon size={20} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">
                    {it.name}
                    {it.brandGuess && it.brandGuess !== it.name && <span className="font-normal text-fb-muted"> · {it.brandGuess}</span>}
                  </div>
                  <div className="truncate text-[12px] text-fb-muted">
                    <span className="capitalize">{it.condition}</span>
                    {it.flaws.length > 0 && ` · ${it.flaws.join(", ")}`}
                  </div>
                </div>
                <div className="text-[14px] font-semibold">${it.suggestedPriceUsd}</div>
              </li>
            ))}
          </ul>
          {listed ? (
            <a href={`/marketplace/${listed.id}`} className="mt-2.5 flex items-center gap-2 rounded-lg bg-fb-blue-soft px-3 py-2 text-[13px] font-semibold text-fb-blue">
              <MarketplaceIcon size={18} /> Listed on Marketplace: {listed.title} · ${listed.priceUsd}
            </a>
          ) : (
            onList && (
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onList(items);
                  setBusy(false);
                }}
                className="fb-btn-secondary mt-2.5 h-9 w-full"
              >
                <MarketplaceIcon size={18} /> {busy ? "Writing the listing…" : `List on Marketplace for $${total}`}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
