"use client";
// Clears a badge when you actually look: opening a chat marks it read, opening Notifications marks them seen.
// Runs after render, then refreshes so the top-bar counts update immediately.
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MarkSeen({ kind, threadId, latest }: { kind: "notifications" | "thread"; threadId?: string; latest?: string }) {
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    fetch("/api/seen", { method: "POST", body: JSON.stringify({ kind, threadId }) })
      .then(() => alive && router.refresh())
      .catch(() => {});
    return () => {
      alive = false;
    };
    // `latest` re-runs this when a new message arrives while the chat is open.
  }, [kind, threadId, latest, router]);
  return null;
}
