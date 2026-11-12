// Round avatar with initials fallback (no network needed for the fallback).
const COLORS = ["#0866ff", "#a033ff", "#ff5c87", "#31a24c", "#f7b928", "#e41e3f", "#00a4a6"];
export default function Avatar({ src, name, size = 40, className = "", ring = false }: { src?: string; name: string; size?: number; className?: string; ring?: boolean }) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${ring ? "ring-2 ring-white" : ""} ${className}`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
      aria-label={name}
    >
      {initials}
      {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
    </span>
  );
}
