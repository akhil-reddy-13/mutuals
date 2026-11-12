"use client";
// Demo-only: switch the logged-in persona (sets a cookie). Two phones = two personas.
import { useRouter } from "next/navigation";

export default function PersonaSwitcher({ personas, current }: { personas: { id: string; name: string }[]; current: string }) {
  const router = useRouter();
  return (
    <select
      aria-label="Demo persona"
      className="rounded-md border border-fb-border bg-fb-bg px-2 py-1 text-sm"
      value={current}
      onChange={async (e) => {
        await fetch("/api/persona", { method: "POST", body: JSON.stringify({ userId: e.target.value }) });
        router.refresh();
      }}
    >
      {personas.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
