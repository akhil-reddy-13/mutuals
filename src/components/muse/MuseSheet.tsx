"use client";
// The Muse chat sheet, opened from a Group's composer with that Group as context (handoff decisions 1, 2, 4b).
// One conversation carries the whole hero flow: ask -> follow-ups -> visibility-tagged prefs -> room video ->
// opt-in question -> live matching (streamed) -> shortlist -> Messenger handoff.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon, MuseMark, SendIcon, VideoCamIcon } from "../icons";
import MatchCard from "../MatchCard";
import type { EventInfo } from "../ConnectionCard";
import IntakeCard from "./IntakeCard";
import HomesCard from "./HomesCard";
import LiveMatching, { type LiveCandidate } from "./LiveMatching";
import PrefChips from "./PrefChips";
import VideoCapture from "./VideoCapture";
import { firstName } from "@/lib/format";
import type { MatchEvent } from "@/lib/match";
import type { Ask, Group, Item, Match, Preference, RoomDetails, User } from "@/lib/types";

export interface MuseSheetProps {
  me: Pick<User, "id" | "name" | "avatarUrl" | "museGroups">;
  group: Pick<Group, "id" | "name">;
  onClose: () => void;
}

type Card = "prefs" | "video" | "intake" | "matching" | "shortlist" | "homes";
interface Msg {
  id: string;
  role: "muse" | "user";
  text?: string;
  card?: Card;
  actions?: { label: string; primary?: boolean; onClick: () => void }[];
  chips?: string[];
}

let seq = 0;
const mid = () => `m${++seq}_${Date.now().toString(36)}`;

/** The video step only makes sense when there's something to film: a room you're offering or items you're selling. */
function canShowVideo(ask: Ask): boolean {
  if (ask.side === "seeking") return false;
  return ask.type === "roommate" || ask.type === "sublet" || ask.type === "item";
}

/** Fields the seller changed in a row since it was sent to Spark (so Spark's answer doesn't overwrite them). */
function editedFields(now: Item, sent: Item): Partial<Item> {
  const out: Partial<Item> = {};
  for (const k of ["name", "model", "suggestedPriceUsd", "condition"] as const) {
    if (now[k] !== sent[k]) (out as Record<string, unknown>)[k] = now[k];
  }
  return out;
}

/** Selling = an item ask from someone offering things (results are people who need them). */
function isSelling(a: Ask | null | undefined): boolean {
  return !!a && a.type === "item" && a.side !== "seeking";
}

export default function MuseSheet({ me, group, onClose }: MuseSheetProps) {
  const router = useRouter();
  const first = firstName(me.name);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [ask, setAsk] = useState<Ask | null>(null);
  const [ready, setReady] = useState(false);
  const [intake, setIntake] = useState<{ room: RoomDetails | null; items: Item[]; transcript?: string | null } | null>(null);
  // Items Spark is still identifying (step 2 of the seller pipeline).
  const [identifying, setIdentifying] = useState<Set<string>>(new Set());
  const framesRef = useRef<string[]>([]);
  const intakeRef = useRef<typeof intake>(null);
  useEffect(() => {
    intakeRef.current = intake;
  }, [intake]);
  const [listed, setListed] = useState<{ id: string; title: string; priceUsd: number } | null>(null);
  const [cands, setCands] = useState<LiveCandidate[]>([]);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [events, setEvents] = useState<Record<string, EventInfo | null>>({});
  const bodyRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const askRef = useRef<Ask | null>(null);
  askRef.current = ask;
  const candsRef = useRef<LiveCandidate[]>([]);
  candsRef.current = cands;

  const push = useCallback((m: Omit<Msg, "id">) => {
    const id = mid();
    setMsgs((xs) => [...xs, { ...m, id }]);
    return id;
  }, []);

  // Opening line (guarded: React strict mode runs effects twice in dev)
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    push({
      role: "muse",
      text: `Hey ${first}. What do you need in ${group.name}? Tell me the stuff you wouldn't post, too. I keep that between us.`,
      chips: ["I have a room to fill", "Looking for a room", "Selling furniture before I move"],
    });
    return () => esRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking, cands, intake]);

  const conversation = (extra?: string) =>
    [...msgs.filter((m) => m.text && !m.card).map((m) => ({ role: m.role, text: m.text! })), ...(extra ? [{ role: "user" as const, text: extra }] : [])];

  async function send(text: string) {
    const t = text.trim();
    if (!t || thinking) return;
    setInput("");
    push({ role: "user", text: t });
    setThinking(true);
    try {
      const res = await fetch("/api/asks", {
        method: "POST",
        body: JSON.stringify({ groupId: group.id, askId: askRef.current?.id, conversation: conversation(t) }),
      });
      const out = (await res.json()) as { ask: Ask; followUp: string | null; ready: boolean; error?: string };
      if (out.error) throw new Error(out.error);
      setAsk(out.ask);
      if (!out.ready) {
        push({ role: "muse", text: out.followUp ?? "Tell me a bit more." });
      } else if (!ready) {
        setReady(true);
        push({
          role: "muse",
          text: "Here's what I'll look for. Tap a tag to change who sees what: Public can show on your card, Kept private I only use to check fit, Never shared stays with me.",
        });
        push({ role: "muse", card: "prefs" });
        // Only someone OFFERING a room or items has something to film. "Looking for a room" skips straight on.
        const wantsVideo = canShowVideo(out.ask);
        if (wantsVideo) {
          push({
            role: "muse",
            text:
              out.ask.type === "item"
                ? "Show me what you're selling. A 10-second video of the shelf or corner is enough, I'll catalog it and price it."
                : "Want to show me the room? A 10-second video is enough. I'll pull out the details and anything the next person might want to buy.",
            card: "video",
          });
        } else {
          askOptIn();
        }
      } else {
        push({ role: "muse", text: out.followUp ?? "Updated." });
      }
    } catch (e) {
      push({ role: "muse", text: `Something went wrong on my end (${e instanceof Error ? e.message : String(e)}). Try again?` });
    } finally {
      setThinking(false);
    }
  }

  async function updatePrefs(next: Preference[]) {
    if (!ask) return;
    setAsk({ ...ask, preferences: next });
    await fetch("/api/asks", { method: "PATCH", body: JSON.stringify({ askId: ask.id, preferences: next }) });
  }

  function askOptIn() {
    const id = push({
      role: "muse",
      text: isSelling(askRef.current)
        ? `Want me to ask around ${group.name} and see who's looking for these? I'll only say what's in your list, and you'll see everything I share.`
        : `Want me to ask around ${group.name}? I'll check with people's Muses and read the posts. I only share what you said was OK, and you'll see everything I say.`,
      actions: [
        { label: "Yes, check", primary: true, onClick: () => startMatching() },
        {
          label: "Not now",
          onClick: () =>
            push({
              role: "muse",
              text: "No problem. Your ask is saved. Whenever you're ready, I can check.",
              actions: [{ label: "Check now", primary: true, onClick: () => startMatching() }],
            }),
        },
      ],
    });
    return id;
  }

  async function onFrames(frames: string[], narration: string, audio: string | null = null) {
    if (!ask) return;
    framesRef.current = frames;
    setThinking(true);
    push({ role: "user", text: `📹 ${frames.length} frames${audio ? " + narration" : ""}${narration ? ` · "${narration}"` : ""}` });
    try {
      const res = await fetch("/api/intake", { method: "POST", body: JSON.stringify({ frames, narration, audio, askId: ask.id }) });
      const out = (await res.json()) as { room: RoomDetails | null; items: Item[]; transcript?: string | null; error?: string };
      if (out.error) throw new Error(out.error);
      setIntake(out);
      setAsk((a) => (a ? { ...a, roomDetails: out.room ?? a.roomDetails, items: out.items } : a));
      // Step 2: Spark identifies each item you mentioned, in parallel. Rows update as each one lands.
      for (const it of out.items.filter((i) => i.mentioned !== false)) void identify(it, out.transcript ?? undefined);
      const n = out.items.filter((i) => i.mentioned !== false).length;
      const selling = ask.type === "item";
      push({
        role: "muse",
        text: selling
          ? `Got it. I found ${n} ${n === 1 ? "thing" : "things"} you're selling. Fix anything I got wrong, then I'll find who needs them.`
          : `Got it. ${out.room ? "Here's what I can see, plus" : "I found"} ${n} ${n === 1 ? "item" : "items"} the next person might want. Prices are what students nearby pay.`,
        card: "intake",
      });
    } catch (e) {
      push({ role: "muse", text: `I couldn't read that video (${e instanceof Error ? e.message : String(e)}). Want to try photos instead?`, card: "video" });
      setThinking(false);
      return;
    }
    setThinking(false);
    askOptIn();
  }

  async function identify(item: Item, transcript?: string) {
    setIdentifying((s) => new Set(s).add(item.id));
    try {
      const f = framesRef.current;
      const k = item.frameIndex ?? -1;
      const nearby = k >= 0 ? [f[k - 1], f[k + 1]].filter(Boolean) : [];
      const res = await fetch("/api/identify", { method: "POST", body: JSON.stringify({ item, transcript, nearby }) });
      const out = (await res.json()) as { item?: Item };
      if (out.item) {
        // Keep anything the seller already typed into this row while Spark was working.
        setIntake((prev) =>
          prev ? { ...prev, items: prev.items.map((i) => (i.id === item.id ? { ...out.item!, ...editedFields(i, item) } : i)) } : prev,
        );
      }
    } catch {
      // Identification is a bonus: on failure the row keeps Ember's first pass.
    } finally {
      setIdentifying((s) => {
        const n = new Set(s);
        n.delete(item.id);
        return n;
      });
    }
  }

  function onEditItems(items: Item[]) {
    setIntake((prev) => (prev ? { ...prev, items } : prev));
    setAsk((a) => (a ? { ...a, items } : a));
  }

  async function onList(items: Item[]) {
    if (!ask) return;
    const res = await fetch("/api/listing", { method: "POST", body: JSON.stringify({ askId: ask.id, items }) });
    const { listing } = await res.json();
    setListed({ id: listing.id, title: listing.title, priceUsd: listing.priceUsd });
    push({ role: "muse", text: `Listed. "${listing.title}" is on Marketplace for $${listing.priceUsd}. I'll mention it to anyone whose Muse is looking for one.` });
  }

  async function startMatching() {
    const cur = askRef.current ?? ask;
    if (!cur) return;
    setCands([]);
    setMatches(null);
    const selling = isSelling(cur);
    push({
      role: "muse",
      text: selling ? `On it. Asking around ${group.name} for anyone who needs these.` : `On it. Asking around ${group.name}. You can watch.`,
      card: "matching",
    });
    // Selling: route exactly what the seller approved (Spark's model names, their edits), not Ember's first pass.
    const latest = intakeRef.current;
    if (selling && latest?.items.length) {
      await fetch("/api/ask-items", { method: "POST", body: JSON.stringify({ askId: cur.id, items: latest.items }) }).catch(() => {});
    }
    const es = new EventSource(`/api/match?askId=${cur.id}`);
    esRef.current = es;
    es.onmessage = (ev) => {
      const e = JSON.parse(ev.data) as MatchEvent;
      if (e.type === "start") {
        setCands(e.candidates.map((c) => ({ ...c, turns: [] })));
        if (e.candidates.length) {
          push({ role: "muse", text: `Checking with ${e.candidates.length} ${e.candidates.length === 1 ? "person's Muse" : "people's Muses"} in ${group.name}…` });
        }
      } else if (e.type === "turn") {
        setCands((cs) => cs.map((c) => (c.id === e.candidateId ? { ...c, turns: [...c.turns, { turn: e.turn, disclosedMeta: e.disclosedMeta }] } : c)));
      } else if (e.type === "verdict") {
        setCands((cs) => cs.map((c) => (c.id === e.candidateId ? { ...c, match: e.match } : c)));
      } else if (e.type === "connection") {
        setCands((cs) => cs.map((c) => (c.id === e.candidateId && c.match ? { ...c, match: { ...c.match, connection: e.connection }, connection: e.connection } : c)));
        setEvents((m) => ({ ...m, [e.matchId]: e.event }));
      } else if (e.type === "done" && selling) {
        es.close();
        setMatches(e.matches);
        const homed = e.matches.filter((m) => m.routedItems?.length);
        const n = homed.reduce((k, m) => k + (m.routedItems?.length ?? 0), 0);
        const names = homed.map((m) => firstName(candsRef.current.find((c) => c.id === m.candidateId)?.name ?? ""));
        push({
          role: "muse",
          text:
            n > 0
              ? `Good news: ${n} of your things already ${n === 1 ? "has" : "have"} a home with ${names.join(" and ")}. I told them nothing beyond your list. You decide who to message.`
              : `Nobody in ${group.name} is looking for these right now. I can offer them to everyone nearby.`,
          card: "homes",
        });
        router.refresh();
      } else if (e.type === "done") {
        es.close();
        setMatches(e.matches);
        const fits = e.matches.filter((m) => m.verdict.compatible);
        const nofit = e.matches.length - fits.length;
        const oneSided = fits.filter((m) => m.mode === "one_sided").length;
        const connected = fits.find((m) => m.connection?.suggest);
        const connectedName = connected ? candsRef.current.find((c) => c.id === connected.candidateId)?.name : undefined;
        // Muse's voice: "I found two people who fit. Priya's the better one, but you two should talk about noise."
        const best = fits.find((m) => m.mode === "agent_to_agent") ?? fits[0];
        const bestName = best ? firstName(candsRef.current.find((c) => c.id === best.candidateId)?.name ?? "") : "";
        const topic = best?.verdict.summaryForHumans.match(/one thing to talk about:\s*([^.]+)/i)?.[1]?.trim();
        const count = (n: number) => (n === 1 ? "one person" : n === 2 ? "two people" : n === 3 ? "three people" : `${n} people`);
        push({
          role: "muse",
          text:
            (fits.length === 0
              ? `Nobody here fits yet${nofit ? ` (I checked ${count(nofit)})` : ""}. I'll keep an eye out.`
              : `I found ${count(fits.length)} who ${fits.length === 1 ? "fits" : "fit"}.` +
                (fits.length > 1 && bestName ? ` ${bestName}'s the best one${topic ? `, but you two should talk about ${topic.toLowerCase()}` : ""}.` : topic && bestName ? ` You and ${bestName} should talk about ${topic.toLowerCase()}.` : "") +
                (oneSided ? ` ${oneSided === 1 ? "One of them" : `${oneSided} of them`} posted without Muse on, so I drafted a reply you can send.` : "") +
                ` You decide who to message. I won't message anyone.` +
                (connectedName ? ` One more thing on ${firstName(connectedName)}'s card.` : "")),
          card: "shortlist",
        });
        router.refresh();
      } else if (e.type === "error") {
        es.close();
        push({ role: "muse", text: `I lost the connection while checking (${e.message}). Tap Ask Muse again to retry.` });
      }
    };
    es.onerror = () => {
      es.close();
      recoverByPolling(cur.id);
    };
  }

  // The stream dropped (phone locked, Safari backgrounded). Matching keeps running on the server, so poll for
  // the saved matches and show the shortlist when the ask is marked matched.
  function recoverByPolling(askId: string) {
    push({ role: "muse", text: "Lost the connection for a second. Still checking in the background, I'll show results as soon as they're in." });
    const started = Date.now();
    const tick = async () => {
      try {
        const [a, m] = await Promise.all([
          fetch(`/api/asks?askId=${askId}`, { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/matches?askId=${askId}`, { cache: "no-store" }).then((r) => r.json()),
        ]);
        const ms = (m.matches ?? []) as Match[];
        setCands((cs) => cs.map((c) => ({ ...c, match: ms.find((x) => x.candidateId === c.id) ?? c.match })));
        if (a.ask?.status === "matched") {
          setMatches(ms);
          if (isSelling(askRef.current)) {
            const n = ms.reduce((k, x) => k + (x.routedItems?.length ?? 0), 0);
            push({ role: "muse", text: n ? `${n} of your things already have a home.` : "Nobody here is looking for these yet.", card: "homes" });
          } else {
            push({ role: "muse", text: `${ms.filter((x) => x.verdict.compatible).length} people fit. Here's the shortlist.`, card: "shortlist" });
          }
          router.refresh();
          return;
        }
      } catch {}
      if (Date.now() - started < 90_000) setTimeout(tick, 2000);
      else push({ role: "muse", text: "Still nothing back. Check Notifications in a minute, results land there too." });
    };
    setTimeout(tick, 1500);
  }

  function runAction(msgId: string, fn: () => void) {
    if (used.has(msgId)) return;
    setUsed((s) => new Set(s).add(msgId));
    fn();
  }

  const candById = Object.fromEntries(cands.map((c) => [c.id, c]));
  const firstAgent = cands.find((c) => c.mode === "agent_to_agent")?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-end md:justify-end md:bg-transparent md:pr-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Muse"
        onClick={(e) => e.stopPropagation()}
        className="sheet-up flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-fb-lg md:h-[min(720px,calc(100dvh-72px))] md:w-[420px] md:rounded-t-xl md:border md:border-fb-divider"
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-fb-divider px-3 py-2.5">
          <MuseMark size={36} />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold leading-tight">Muse</div>
            <div className="truncate text-[12px] text-fb-muted">Private · {group.name}</div>
          </div>
          <button onClick={onClose} className="fb-icon-btn h-9 w-9" aria-label="Close">
            <CloseIcon size={20} />
          </button>
        </header>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <div className="flex flex-col gap-2.5">
            {msgs.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="rise flex justify-end">
                  <div className="bubble-out">{m.text}</div>
                </div>
              ) : (
                <div key={m.id} className="rise flex flex-col gap-2">
                  {m.text && (
                    <div className="flex items-end gap-2">
                      <MuseMark size={24} className="mb-0.5" />
                      <div className="bubble-in">{m.text}</div>
                    </div>
                  )}
                  {m.chips && !used.has(m.id) && !msgs.some((x) => x.role === "user") && (
                    <div className="ml-8 flex flex-wrap gap-1.5">
                      {m.chips.map((c) => (
                        <button key={c} onClick={() => runAction(m.id, () => send(c))} className="rounded-full border border-fb-blue px-3 py-1 text-[13px] font-semibold text-fb-blue hover:bg-fb-blue-soft">
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.actions && (
                    <div className="ml-8 flex gap-2">
                      {m.actions.map((a) => (
                        <button
                          key={a.label}
                          disabled={used.has(m.id)}
                          onClick={() => runAction(m.id, a.onClick)}
                          className={`${a.primary ? "fb-btn-primary" : "fb-btn-secondary"} h-9 disabled:opacity-50`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.card === "prefs" && ask && (
                    <div className="ml-8 rounded-xl border border-fb-divider bg-fb-bg p-2.5">
                      <div className="mb-2 text-[14px] font-semibold">{ask.summary}</div>
                      <PrefChips prefs={ask.preferences} onChange={updatePrefs} />
                    </div>
                  )}
                  {m.card === "video" && !intake && !used.has(m.id) && (
                    <div className="ml-8">
                      <VideoCapture
                        disabled={thinking}
                        subject={ask?.type === "item" ? "items" : "room"}
                        onFrames={(f, n, a) => {
                          setUsed((s) => new Set(s).add(m.id));
                          onFrames(f, n, a);
                        }}
                        onSkip={() => {
                          setUsed((s) => new Set(s).add(m.id));
                          push({ role: "user", text: "Skip the video for now" });
                          askOptIn();
                        }}
                      />
                    </div>
                  )}
                  {m.card === "intake" && intake && (
                    <div className="ml-8">
                      <IntakeCard
                        room={intake.room}
                        items={intake.items}
                        transcript={intake.transcript}
                        identifying={identifying}
                        selling={ask?.type === "item"}
                        onChange={onEditItems}
                        onAdd={(x) => {
                          const on = { ...x, mentioned: true };
                          onEditItems(intake.items.map((i) => (i.id === x.id ? on : i)));
                          void identify(on, intake.transcript ?? undefined);
                        }}
                        onList={ask?.type === "item" ? undefined : onList}
                        listed={listed}
                      />
                    </div>
                  )}
                  {m.card === "matching" && (
                    <div className="ml-8">
                      {cands.length === 0 ? <div className="h-14 rounded-xl shimmer" /> : <LiveMatching cands={cands} meName={first} defaultOpen={firstAgent} />}
                    </div>
                  )}
                  {m.card === "homes" && matches && (
                    <div className="ml-8">
                      <HomesCard
                        matches={matches}
                        people={candById}
                        rest={(intake?.items ?? []).filter((i) => i.mentioned !== false && !matches.some((mt) => mt.routedItems?.some((r) => r.id === i.id)))}
                        onOfferRest={onList}
                        listed={listed}
                      />
                    </div>
                  )}
                  {m.card === "shortlist" && matches && (
                    <div className="ml-8 flex flex-col gap-2.5">
                      {matches.map((mt) => {
                        const c = candById[mt.candidateId];
                        return c ? <MatchCard key={mt.id} match={mt} candidate={c} viewerId={me.id} groupId={group.id} event={events[mt.id] ?? null} compact /> : null;
                      })}
                      <a href={`/groups/${group.id}/muse/${ask?.id}`} className="text-center text-[13px] font-semibold text-fb-blue hover:underline">
                        Open the full shortlist
                      </a>
                    </div>
                  )}
                </div>
              ),
            )}
            {thinking && (
              <div className="flex items-end gap-2">
                <MuseMark size={24} className="mb-0.5" />
                <div className="bubble-in flex items-center gap-1 px-3.5 py-3">
                  <span className="dot h-2 w-2 rounded-full bg-fb-muted" />
                  <span className="dot h-2 w-2 rounded-full bg-fb-muted" />
                  <span className="dot h-2 w-2 rounded-full bg-fb-muted" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-fb-divider px-3 py-2"
        >
          <button type="button" className="fb-icon-btn h-9 w-9 bg-transparent text-fb-blue" aria-label="Video" onClick={() => push({ role: "muse", text: ask?.type === "item" ? "Show me what you're selling whenever you're ready." : "Show me the room whenever you're ready.", card: "video" })} disabled={!ask || !canShowVideo(ask)}>
            <VideoCamIcon size={22} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={ask ? "Reply to Muse…" : "Tell Muse what you need…"}
            className="h-10 flex-1 rounded-full bg-fb-bg px-4 text-[15px] outline-none placeholder:text-fb-muted"
            autoFocus
          />
          <button type="submit" disabled={!input.trim() || thinking} className="fb-icon-btn h-9 w-9 bg-transparent text-fb-blue disabled:opacity-40" aria-label="Send">
            <SendIcon size={22} />
          </button>
        </form>
        <p className="bg-white px-3 pb-2 text-center text-[11px] text-fb-muted md:pb-2">Muse pre-negotiates and drafts. You decide and you send.</p>
      </div>
    </div>
  );
}
