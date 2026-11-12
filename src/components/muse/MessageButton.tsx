"use client";
// Open (or create) the Messenger thread for a match as the current persona, with Muse's drafted opener.
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MessageButton({ matchId, name, className = "" }: { matchId: string; name: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch("/api/messenger", { method: "POST", body: JSON.stringify({ matchId }) });
        const { thread } = await r.json();
        if (thread) router.push(`/messenger/${thread.id}`);
        else setBusy(false);
      }}
      className={`fb-btn-primary h-10 ${className}`}
    >
      {busy ? "Opening Messenger…" : `Message ${name.split(" ")[0]}`}
    </button>
  );
}
