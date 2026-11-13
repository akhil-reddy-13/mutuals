export function firstName(name: string) {
  return name.split(" ")[0];
}
export function timeAgo(iso: string, now = new Date()): string {
  const s = Math.max(1, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export function topicLabel(topic: string) {
  return topic.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
export function compactCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 >= 100 && n < 10000 ? 1 : 0)}K`;
  return String(n);
}

/** The referee's score as a level people read; the UI never shows the number. compatible=false is only a
 *  declared dealbreaker or money, so every compatible match lands on fit / could work / long shot. */
export type FitLevel = "fit" | "could_work" | "long_shot" | "no";
export function fitLevel(v: { compatible: boolean; score: number }): FitLevel {
  if (!v.compatible) return "no";
  return v.score >= 0.65 ? "fit" : v.score >= 0.45 ? "could_work" : "long_shot";
}
export const FIT_LABEL: Record<FitLevel, string> = { fit: "Fits", could_work: "Could work", long_shot: "Long shot", no: "Not a fit" };
