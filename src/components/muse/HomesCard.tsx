"use client";
// Selling, people-first: "2 of these already have a home."
// Each card leads with the PERSON (photo, name, verified school, shared Groups, mutuals), then the thing routed to
// them, then one human line on why. A hook appears only when there's real shared overlap. Whatever has no home yet
// is offered more broadly underneath. Muse never messages anyone: the seller taps "Message …".
import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "../Avatar";
import { MarketplaceIcon } from "../icons";
import type { Item, Match } from "@/lib/types";

type Person = { id: string; name: string; avatarUrl: string };

export default function HomesCard({
  matches,
  people,
  rest,
  onOfferRest,
  listed,
}: {
  matches: Match[];
  people: Record<string, Person>;
  /** Items nobody claimed yet. */
  rest: Item[];
  onOfferRest?: (items: Item[]) => Promise<void>;
  listed?: { id: string; title: string; priceUsd: number } | null;
}) {
  const homed = matches.filter((m) => m.routedItems?.length);
  const count = homed.reduce((n, m) => n + (m.routedItems?.length ?? 0), 0);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="px-1 text-[17px] font-bold leading-tight">
        {count > 0 ? `${count} of these already ${count === 1 ? "has" : "have"} a home` : "Nobody's looking for these yet"}
      </div>
      {homed.map((m) => (
        <HomeRow key={m.id} match={m} person={people[m.candidateId]} />
      ))}
      {rest.length > 0 && <RestRow rest={rest} onOfferRest={onOfferRest} listed={listed} />}
    </div>
  );
}

function HomeRow({ match, person }: { match: Match; person?: Person }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const first = person?.name.split(" ")[0] ?? "them";
  const items = match.routedItems ?? [];
  const budget = match.verdict.fits.find((f) => /spend/i.test(f));
  const overBudget = match.verdict.disagreements.find((d) => /spend/i.test(d));
  async function message() {
    setBusy(true);
    const res = await fetch("/api/messenger", { method: "POST", body: JSON.stringify({ matchId: match.id }) });
    const { thread } = await res.json();
    router.push(`/messenger/${thread.id}`);
  }
  return (
    <section className="rounded-xl border border-fb-divider bg-white p-3">
      {/* The person first. */}
      <div className="flex items-start gap-2.5">
        {person && <Avatar src={person.avatarUrl} name={person.name} size={44} />}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-5">{person?.name}</div>
          <div className="text-[12px] leading-4 text-fb-muted">{match.trustSignals.slice(0, 3).join(" · ")}</div>
        </div>
      </div>
      {/* Then why this person, in human terms. */}
      <p className="mt-2 text-[14px] leading-5">{match.verdict.summaryForHumans}</p>
      {/* Then the thing. */}
      <div className="mt-2 flex items-center gap-2 rounded-lg bg-fb-bg p-1.5">
        <div className="flex -space-x-2">
          {items.slice(0, 3).map((i) =>
            i.imageDataUrl ? (
              <img key={i.id} src={i.imageDataUrl} alt="" className="h-10 w-10 rounded-md border-2 border-white object-cover" />
            ) : (
              <span key={i.id} className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-white bg-white text-fb-muted">
                <MarketplaceIcon size={18} />
              </span>
            ),
          )}
        </div>
        <div className="min-w-0 flex-1 text-[13px] leading-4">
          <div className="font-semibold">{items.map((i) => i.name).join(" + ")}</div>
          <div className="text-fb-muted">${items.reduce((s, i) => s + (Number(i.suggestedPriceUsd) || 0), 0)}</div>
        </div>
      </div>
      {(budget || overBudget) && (
        <div className={`mt-1.5 text-[12px] font-semibold ${overBudget ? "text-[#8a6100]" : "text-[#1e7a34]"}`}>{overBudget ?? `✓ ${budget}`}</div>
      )}
      {match.hook && (
        <div className="mt-2 rounded-lg border border-[#e4d7fb] bg-[#f7f2ff] px-2.5 py-1.5 text-[13px] leading-4">
          <span className="font-semibold muse-text">Also: </span>
          {match.hook}
        </div>
      )}
      <button onClick={message} disabled={busy} className="fb-btn-primary mt-2.5 h-9 w-full">
        {busy ? "Opening Messenger…" : match.threadId ? `Open chat with ${first}` : `Message ${first}`}
      </button>
    </section>
  );
}

function RestRow({ rest, onOfferRest, listed }: { rest: Item[]; onOfferRest?: (items: Item[]) => Promise<void>; listed?: { id: string; title: string; priceUsd: number } | null }) {
  const [busy, setBusy] = useState(false);
  return (
    <section className="rounded-xl border border-dashed border-fb-divider bg-white p-3">
      <div className="text-[13px] font-semibold">Not spoken for yet</div>
      <div className="mt-0.5 text-[13px] leading-4 text-fb-muted">{rest.map((i) => i.name).join(", ")}</div>
      {listed ? (
        <a href={`/marketplace/${listed.id}`} className="mt-2 flex items-center gap-2 rounded-lg bg-fb-blue-soft px-3 py-2 text-[13px] font-semibold text-fb-blue">
          <MarketplaceIcon size={18} /> Offered on Marketplace · ${listed.priceUsd}
        </a>
      ) : (
        onOfferRest && (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onOfferRest(rest);
              setBusy(false);
            }}
            className="fb-btn-secondary mt-2 h-9 w-full"
          >
            <MarketplaceIcon size={18} /> {busy ? "Offering…" : "Offer these to everyone nearby"}
          </button>
        )
      )}
    </section>
  );
}
