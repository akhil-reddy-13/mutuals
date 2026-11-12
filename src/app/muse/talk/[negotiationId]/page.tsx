// The proof that two Muses really talked: the same conversation, seen from whichever side you're on.
// Your Muse's messages in full; the other Muse's messages with THEIR private numbers/times redacted. Then the call,
// and exactly which of your preferences your Muse used. Only the two people in the conversation can open it.
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import { BackIcon, MuseMark } from "@/components/icons";
import MessageButton from "@/components/muse/MessageButton";
import { getAsk, getGroup, getNegotiation, getUser, matchesInvolving } from "@/lib/db";
import { firstName } from "@/lib/format";
import { publicSummary, redactPrivateValues } from "@/lib/privacy";
import { REACH_LABEL, reachOf } from "@/lib/reach";
import { currentUser } from "@/lib/session";
import type { Preference } from "@/lib/types";

export const dynamic = "force-dynamic";

const VIS_LABEL: Record<Preference["visibility"], string> = { public: "Public", match_only: "Kept private", never: "Never shared" };

export default async function MuseTalkPage({ params }: { params: Promise<{ negotiationId: string }> }) {
  const { negotiationId } = await params;
  const neg = getNegotiation(negotiationId);
  if (!neg) notFound();
  const askA = getAsk(neg.askAId);
  const askB = getAsk(neg.askBId);
  if (!askA || !askB) notFound();
  const me = await currentUser();
  const side = me.id === askA.userId ? "A" : me.id === askB.userId ? "B" : null;
  if (!side) notFound();
  const myAsk = side === "A" ? askA : askB;
  const theirAsk = side === "A" ? askB : askA;
  const them = getUser(theirAsk.userId)!;
  const group = getGroup(askA.groupId);
  const match = matchesInvolving(me.id).find((m) => m.negotiationId === negotiationId);
  const theirPrivate = theirAsk.preferences.filter((p) => p.visibility !== "public");
  const turns = neg.rounds.filter((t) => t.speaker !== "orchestrator");
  const disclosedByMe = new Set(turns.filter((t) => t.speaker === side).flatMap((t) => t.disclosed));
  const t1 = firstName(them.name);
  const iStarted = side === "A";

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-3 pb-24 md:gap-4 md:py-4">
      {/* Who talked to whom */}
      <section className="fb-card rounded-none p-4 md:rounded-[8px]">
        <div className="flex items-center gap-2">
          <Link href={group ? `/groups/${group.id}` : "/"} className="fb-icon-btn h-9 w-9 bg-transparent" aria-label="Back">
            <BackIcon size={22} />
          </Link>
          <div className="text-[13px] font-semibold text-fb-muted">{group?.name}</div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <MusePerson name={them.name} avatarUrl={them.avatarUrl} label={`${t1}'s Muse`} />
          <div className="flex flex-col items-center text-fb-muted">
            <span className="text-[20px] leading-none">⇄</span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide">{turns.length} messages</span>
          </div>
          <MusePerson name={me.name} avatarUrl={me.avatarUrl} label="Your Muse" />
        </div>
        <h1 className="mt-3 text-center text-[20px] font-bold leading-tight">
          {iStarted ? `Your Muse checked with ${t1}'s Muse` : `${t1}'s Muse reached out to yours`}
        </h1>
        <p className="mt-1 text-center text-[14px] text-fb-muted">
          About {iStarted ? "your ask" : `${t1}'s ask`}: &ldquo;{iStarted ? askA.summary : publicSummary(askA)}&rdquo;
        </p>
        <p className="mt-2 text-center text-[13px] text-fb-muted">
          {iStarted ? `You chose to let your Muse talk to ${REACH_LABEL[reachOf(askA)].toLowerCase()}. ` : `${t1} chose to let their Muse talk to ${REACH_LABEL[reachOf(askA)].toLowerCase()}. `}
          Two separate Muses. Each one only knew its own person&apos;s preferences. Nobody messaged {iStarted ? t1 : "you"} — this happened between the Muses.
        </p>
      </section>

      {/* The conversation */}
      <section className="fb-card flex flex-col gap-3 rounded-none p-4 md:rounded-[8px]">
        {turns.map((t, i) => {
          const mine = t.speaker === side;
          const text = mine ? t.message : redactPrivateValues(t.message, theirPrivate);
          return (
            <div key={i} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <span className="relative shrink-0">
                <MuseMark size={28} />
                <span className="absolute -bottom-1 -right-1">
                  <Avatar src={mine ? me.avatarUrl : them.avatarUrl} name={mine ? me.name : them.name} size={16} />
                </span>
              </span>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[14px] leading-5 ${mine ? "rounded-br-md bg-fb-blue text-white" : "rounded-bl-md bg-fb-bg"}`}>
                <div className={`mb-0.5 text-[11px] font-semibold ${mine ? "text-white/80" : "text-fb-muted"}`}>{mine ? "Your Muse" : `${t1}'s Muse`}</div>
                {text}
              </div>
            </div>
          );
        })}
        {neg.verdict && (
          <div className="mt-1 rounded-xl border border-fb-divider p-3">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-fb-muted">What the two Muses concluded</div>
            <p className="mt-1 text-[15px] font-semibold leading-5">
              {redactPrivateValues(neg.verdict.summaryForHumans, theirPrivate)}
            </p>
            {neg.verdict.compromise && <p className="mt-1 text-[14px] leading-5 text-fb-muted">Suggestion: {redactPrivateValues(neg.verdict.compromise, theirPrivate)}</p>}
          </div>
        )}
      </section>

      {/* What my Muse knew and what it shared */}
      <section className="fb-card rounded-none p-4 md:rounded-[8px]">
        <div className="text-[15px] font-bold">What your Muse knew about you</div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {myAsk.preferences.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3 text-[14px] leading-5">
              <span className="min-w-0">
                <span className="font-semibold capitalize">{p.topic.replace(/_/g, " ")}:</span> {p.value}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.visibility === "public" ? "bg-fb-blue-soft text-fb-blue" : p.visibility === "match_only" ? "bg-[#f3ecff] text-fb-purple" : "bg-fb-chip text-fb-muted"}`}>
                  {VIS_LABEL[p.visibility]}
                </span>
                <span className="text-[11px] font-semibold text-fb-muted">{p.visibility === "never" ? "not used" : disclosedByMe.has(p.id) ? "used" : "not needed"}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] text-fb-muted">
          {t1} only sees the summary above, never your kept-private values. Anything marked never shared wasn&apos;t in your Muse&apos;s context at all.
        </p>
      </section>

      {match && match.verdict.compatible && (
        <div className="px-3 md:px-0">
          <MessageButton matchId={match.id} name={them.name} className="w-full" />
          <p className="mt-1.5 text-center text-[12px] text-fb-muted">Muse drafts the first message. You decide and you send.</p>
        </div>
      )}
    </div>
  );
}

function MusePerson({ name, avatarUrl, label }: { name: string; avatarUrl: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="relative">
        <Avatar src={avatarUrl} name={name} size={52} />
        <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5">
          <MuseMark size={20} />
        </span>
      </span>
      <span className="text-[12px] font-semibold">{label}</span>
    </div>
  );
}
