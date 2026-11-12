// Illustrated Group covers (no network needed): a different scene per Group.
export default function GroupCover({ kind, className = "" }: { kind: string; className?: string }) {
  const scene = SCENES[kind] ?? SCENES.housing;
  return (
    <div className={`relative shrink-0 overflow-hidden ${className}`} style={{ background: scene.bg }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" aria-hidden>
        {scene.svg}
      </svg>
    </div>
  );
}

const SCENES: Record<string, { bg: string; svg: React.ReactNode }> = {
  // Golden Gate at dusk
  sf: {
    bg: "linear-gradient(180deg,#ff9a5c 0%,#ff6b7a 35%,#7a4fd6 75%,#2b2a6b 100%)",
    svg: (
      <>
        <circle cx="880" cy="150" r="60" fill="#fff3c4" opacity="0.9" />
        <path d="M0 300 Q200 240 400 290 T800 280 T1200 300 V400 H0z" fill="#1f1d4f" opacity="0.6" />
        <rect x="0" y="330" width="1200" height="70" fill="#0f2e5c" />
        <g fill="#c8372d">
          <rect x="300" y="120" width="18" height="220" />
          <rect x="700" y="120" width="18" height="220" />
          <rect x="0" y="262" width="1200" height="10" />
        </g>
        <path d="M309 130 Q505 290 709 130" stroke="#c8372d" strokeWidth="6" fill="none" />
        <path d="M0 220 Q150 290 309 130" stroke="#c8372d" strokeWidth="6" fill="none" />
        <path d="M709 130 Q870 290 1200 215" stroke="#c8372d" strokeWidth="6" fill="none" />
        {Array.from({ length: 24 }).map((_, i) => {
          const x = 320 + i * 16;
          const y = 130 + 160 * Math.sin((Math.PI * (x - 309)) / 400) ** 2;
          return <line key={i} x1={x} y1={y} x2={x} y2={262} stroke="#c8372d" strokeWidth="2" opacity="0.8" />;
        })}
      </>
    ),
  },
  // Victorian rooftops
  housing: {
    bg: "linear-gradient(170deg,#0b2a6f 0%,#0866ff 50%,#9cc3ff 100%)",
    svg: (
      <>
        <circle cx="1000" cy="110" r="42" fill="#fff" opacity="0.85" />
        <g fill="#ffffff" opacity="0.12">
          <path d="M0 400V250h80v-40l40-30 40 30v40h60V180l50-40 50 40v70h70v-60h60v-50l45-35 45 35v110h70V200h80v-50l40-30 40 30v50h70v-80l50-40 50 40v80h60v-60h70v30h50v70h80v-50l35-25 35 25v50h60v120z" />
        </g>
        <g fill="#ffffff" opacity="0.28">
          <path d="M0 400V300h120v-60l50-35 50 35v60h90v-90l60-45 60 45v90h110v-70h70v-40l50-40 50 40v110h100v-60l45-35 45 35v60h110v-90l55-45 55 45v90h110v-50h80v150z" />
        </g>
        {Array.from({ length: 30 }).map((_, i) => (
          <rect key={i} x={40 + ((i * 97) % 1120)} y={300 + ((i * 37) % 60)} width="10" height="14" rx="1" fill="#ffe9a8" opacity={i % 3 ? 0.9 : 0.5} />
        ))}
      </>
    ),
  },
  // Free & For Sale: price tags
  ffs: {
    bg: "linear-gradient(135deg,#0e8a6a 0%,#31a24c 55%,#b7e4a8 100%)",
    svg: (
      <g fill="#fff" opacity="0.18">
        {Array.from({ length: 14 }).map((_, i) => (
          <g key={i} transform={`translate(${(i * 173) % 1150} ${60 + ((i * 131) % 260)}) rotate(${(i * 29) % 40 - 20})`}>
            <path d="M0 20 L40 0 h90 a10 10 0 0 1 10 10 v40 a10 10 0 0 1 -10 10 h-90z" />
            <circle cx="30" cy="30" r="6" fill="#31a24c" />
          </g>
        ))}
      </g>
    ),
  },
  // Runners: hills and a road
  run: {
    bg: "linear-gradient(180deg,#7ad0ff 0%,#dff4ff 55%,#9edc8d 56%,#4ea552 100%)",
    svg: (
      <>
        <path d="M0 260 Q200 150 420 230 T820 220 T1200 250 V400 H0z" fill="#5fb55f" />
        <path d="M0 320 Q300 220 600 300 T1200 290 V400 H0z" fill="#3f8f45" />
        <path d="M100 400 Q500 300 1100 330 L1200 400z" fill="#e9e2cf" />
        <path d="M130 400 Q520 305 1100 335" stroke="#fff" strokeWidth="3" strokeDasharray="20 18" fill="none" opacity="0.9" />
        <circle cx="180" cy="90" r="40" fill="#fff6c2" />
      </>
    ),
  },
};
