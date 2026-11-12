"use client";
// What Muse pulled out of the video, as an editable card.
//   Room asks: room facts + leftover items the next tenant might want.
//   Selling asks: "What I heard" (Ember's transcript) + every item you said you're selling, each one identified by
//   Spark (exact model, used price range) and fully editable before it goes to Marketplace. Things Ember saw but you
//   didn't mention are offered underneath, off by default.
import { useState } from "react";
import { MarketplaceIcon, MuseMark } from "../icons";
import type { Item, RoomDetails } from "@/lib/types";

const CONDITIONS = ["new", "good", "fair", "worn"] as const;

export default function IntakeCard({
  room,
  items,
  transcript,
  identifying = new Set<string>(),
  selling = false,
  onChange,
  onAdd,
  onList,
  listed,
}: {
  room: RoomDetails | null;
  items: Item[];
  transcript?: string | null;
  /** Item ids Spark is still identifying. */
  identifying?: Set<string>;
  selling?: boolean;
  onChange?: (items: Item[]) => void;
  /** Turn an unmentioned item on (the parent sends it to Spark for identification). */
  onAdd?: (item: Item) => void;
  onList?: (items: Item[]) => Promise<void>;
  listed?: { id: string; title: string; priceUsd: number } | null;
}) {
  const [busy, setBusy] = useState(false);
  const [heardOpen, setHeardOpen] = useState(false);
  const active = items.filter((i) => i.mentioned !== false);
  const extras = items.filter((i) => i.mentioned === false);
  const total = active.reduce((s, i) => s + (Number(i.suggestedPriceUsd) || 0), 0);
  const editable = !!onChange && !listed;
  const update = (id: string, patch: Partial<Item>) => onChange?.(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = (id: string) => onChange?.(items.filter((i) => i.id !== id));
  const addBlank = () =>
    onChange?.([
      ...items,
      { id: `item_manual_${Date.now()}`, name: "", condition: "good", flaws: [], suggestedPriceUsd: 0, mentioned: true, identified: true },
    ]);
  const pending = active.filter((i) => identifying.has(i.id)).length;

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
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-fb-divider bg-white">
      {/* Pipeline status: which Muse did what. */}
      <div className="flex items-start gap-2 border-b border-fb-divider bg-fb-bg/60 px-3 py-2 text-[12px] leading-4 text-fb-muted">
        <MuseMark size={16} />
        <span className="min-w-0 flex-1">
          <b className="text-fb-text">Ember</b> watched{transcript ? " and listened" : ""}
          {active.length > 0 && (
            <>
              {" → "}
              <b className="text-fb-text">Spark</b> {pending > 0 ? `identifying ${pending} of ${active.length}…` : "identified each item"}
            </>
          )}
        </span>
      </div>

      {transcript && (
        <div className="border-b border-fb-divider px-3 py-2.5">
          <button type="button" onClick={() => setHeardOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-fb-muted">What I heard</span>
            <span className="text-[12px] font-semibold text-fb-blue">{heardOpen ? "Hide" : "Show"}</span>
          </button>
          <p className={`mt-1 text-[14px] italic leading-5 text-fb-text ${heardOpen ? "" : "line-clamp-2"}`}>“{transcript}”</p>
        </div>
      )}

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

      {(active.length > 0 || editable) && (
        <div className={`p-3 ${room ? "border-t border-fb-divider" : ""}`}>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-fb-muted">
            {selling || !room ? "What you're selling" : "Leftover items the next tenant might want"}
          </div>
          <ul className="mt-2 flex flex-col gap-2.5">
            {active.map((it) => (
              <ItemRow key={it.id} it={it} busy={identifying.has(it.id)} editable={editable} onPatch={(p) => update(it.id, p)} onRemove={() => remove(it.id)} />
            ))}
          </ul>
          {editable && (
            <button type="button" onClick={addBlank} className="mt-2 text-[13px] font-semibold text-fb-blue hover:underline">
              + Add an item
            </button>
          )}

          {extras.length > 0 && editable && (
            <div className="mt-3 rounded-lg bg-fb-bg px-2.5 py-2">
              <div className="text-[12px] text-fb-muted">Also in your video. You didn&apos;t mention these, so they&apos;re not included:</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {extras.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => (onAdd ? onAdd(x) : update(x.id, { mentioned: true }))}
                    className="rounded-full border border-fb-divider bg-white px-2.5 py-1 text-[12px] font-semibold hover:bg-fb-hover"
                  >
                    + {x.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {listed ? (
            <a href={`/marketplace/${listed.id}`} className="mt-3 flex items-center gap-2 rounded-lg bg-fb-blue-soft px-3 py-2 text-[13px] font-semibold text-fb-blue">
              <MarketplaceIcon size={18} /> Listed on Marketplace: {listed.title} · ${listed.priceUsd}
            </a>
          ) : (
            onList &&
            active.length > 0 && (
              <button
                disabled={busy || active.some((i) => !i.name.trim())}
                onClick={async () => {
                  setBusy(true);
                  await onList(active);
                  setBusy(false);
                }}
                className="fb-btn-primary mt-3 h-10 w-full"
              >
                <MarketplaceIcon size={18} /> {busy ? "Writing the listing…" : `List ${active.length} on Marketplace · $${total}`}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({ it, busy, editable, onPatch, onRemove }: { it: Item; busy: boolean; editable: boolean; onPatch: (p: Partial<Item>) => void; onRemove: () => void }) {
  const conf = it.confidence === "high" ? "bg-[#e7f3e8] text-[#1e7a34]" : it.confidence === "medium" ? "bg-[#fff4d6] text-[#8a6100]" : "bg-fb-bg text-fb-muted";
  return (
    <li className="min-w-0 rounded-lg border border-fb-divider p-2.5">
      <div className="flex gap-2.5">
        {it.imageDataUrl ? (
          <img src={it.imageDataUrl} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-fb-bg text-fb-muted">
            <MarketplaceIcon size={22} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            {editable ? (
              <textarea
                value={it.name}
                rows={1}
                onChange={(e) => onPatch({ name: e.target.value })}
                placeholder="Item name"
                aria-label="Item name"
                className="field-sizing-content min-h-[24px] w-full min-w-0 resize-none rounded-md px-1 py-0.5 text-[15px] font-semibold leading-5 outline-none hover:bg-fb-bg focus:bg-fb-bg"
              />
            ) : (
              <div className="text-[15px] font-semibold leading-5">{it.name}</div>
            )}
            {editable && (
              <button type="button" onClick={onRemove} aria-label={`Remove ${it.name}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[16px] text-fb-muted hover:bg-fb-bg">
                ×
              </button>
            )}
          </div>

          {busy ? (
            <div className="mt-1 flex items-center gap-1.5 px-1 text-[12px] text-fb-muted">
              <span className="h-3 w-24 rounded shimmer" /> Spark is identifying the exact model…
            </div>
          ) : (
            <>
              {(it.model || editable) && (
                <div className="mt-1 min-w-0 px-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-fb-muted">
                    Model
                    {it.confidence && (
                      <span title="How sure Spark is about the model" className={`rounded-full px-1.5 py-px text-[10px] normal-case tracking-normal ${conf}`}>
                        {it.confidence} confidence
                      </span>
                    )}
                  </div>
                  {editable ? (
                    <textarea
                      value={it.model ?? ""}
                      rows={1}
                      onChange={(e) => onPatch({ model: e.target.value })}
                      placeholder="Unknown. Add it if you know"
                      aria-label="Brand and model"
                      className="field-sizing-content -mx-1 block w-full min-w-0 resize-none rounded-md px-1 py-0.5 text-[13px] font-medium leading-4 text-fb-text outline-none hover:bg-fb-bg focus:bg-fb-bg"
                    />
                  ) : (
                    <div className="text-[13px] font-medium leading-4">{it.model}</div>
                  )}
                </div>
              )}
              {it.identifyNote && <div className="px-1 text-[12px] leading-4 text-fb-muted">{it.identifyNote}</div>}
              {it.spokenAs && <div className="px-1 text-[12px] leading-4 text-fb-muted">You said: “{it.spokenAs}”</div>}
            </>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1">
            <label className="flex items-center rounded-md bg-fb-bg px-2 py-1 text-[14px] font-semibold">
              $
              {editable ? (
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  size={1}
                  value={Number.isFinite(it.suggestedPriceUsd) ? it.suggestedPriceUsd : 0}
                  onChange={(e) => onPatch({ suggestedPriceUsd: Math.max(0, Number(e.target.value) || 0) })}
                  aria-label="Price"
                  className="w-16 bg-transparent outline-none"
                />
              ) : (
                <span>{it.suggestedPriceUsd}</span>
              )}
            </label>
            {editable ? (
              <select value={it.condition} onChange={(e) => onPatch({ condition: e.target.value })} aria-label="Condition" className="rounded-md bg-fb-bg px-2 py-1 text-[13px] capitalize outline-none">
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[13px] capitalize text-fb-muted">{it.condition}</span>
            )}
            {it.priceLowUsd != null && it.priceHighUsd != null && !busy && (
              <span className="text-[12px] text-fb-muted">
                Used: ${it.priceLowUsd}–${it.priceHighUsd}
              </span>
            )}
          </div>
          {it.flaws.length > 0 && !busy && <div className="mt-1 px-1 text-[12px] text-fb-muted">Flaws: {it.flaws.join(", ")}</div>}
        </div>
      </div>
    </li>
  );
}
