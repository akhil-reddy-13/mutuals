"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon } from "./icons";

export default function GoingButton({ eventId, going }: { eventId: string; going: boolean }) {
  const router = useRouter();
  const [state, setState] = useState(going);
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy || state}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/events/join", { method: "POST", body: JSON.stringify({ eventId }) });
        setState(true);
        setBusy(false);
        router.refresh();
      }}
      className={`${state ? "fb-btn-soft" : "fb-btn-primary"} flex-1`}
    >
      {state ? (
        <>
          <CheckIcon size={18} /> Going
        </>
      ) : (
        "Going"
      )}
    </button>
  );
}
