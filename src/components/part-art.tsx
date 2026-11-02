// Stand-in for products without photos: a fine white line drawing on navy, like
// an engineering blueprint. Chosen by keyword so new products need no code.

function polar(r: number, angle: number) {
  return { x: (60 + Math.cos(angle) * r).toFixed(2), y: (60 + Math.sin(angle) * r).toFixed(2) };
}

export function RotorLines() {
  return (
    <>
      <circle cx="60" cy="60" r="52" />
      <circle cx="60" cy="60" r="49" />
      <circle cx="60" cy="60" r="22" />
      <circle cx="60" cy="60" r="18" />
      <circle cx="60" cy="60" r="6" />
      {Array.from({ length: 5 }, (_, i) => {
        const p = polar(12, (i / 5) * Math.PI * 2);
        return <circle key={i} cx={p.x} cy={p.y} r="1.8" />;
      })}
      {Array.from({ length: 30 }, (_, i) => {
        const a = (i / 30) * Math.PI * 2;
        const from = polar(25, a);
        const to = polar(46, a + 0.18);
        return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
      })}
    </>
  );
}

function Battery() {
  return (
    <>
      <rect x="14" y="40" width="92" height="54" rx="2" />
      <path d="M14 50h92M14 84h92" />
      <rect x="28" y="32" width="14" height="8" />
      <rect x="78" y="32" width="14" height="8" />
      <path d="M31 62h8M35 58v8M81 62h8" />
    </>
  );
}

function Alternator() {
  return (
    <>
      <circle cx="60" cy="60" r="36" />
      <circle cx="60" cy="60" r="27" />
      <circle cx="60" cy="60" r="12" />
      <circle cx="60" cy="60" r="8" />
      <circle cx="60" cy="60" r="3" />
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        const from = polar(27, a);
        const to = polar(36, a);
        return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
      })}
      <circle cx="22" cy="22" r="6" />
      <circle cx="98" cy="98" r="6" />
      <path d="M27 26l10 7M26 27l7 10M93 94l-10-7M94 93l-7-10" />
    </>
  );
}

function Wiper() {
  return (
    <>
      <path d="M8 72Q60 44 112 72M8 78Q60 50 112 78M8 72v6M112 72v6" />
      <rect x="52" y="48" width="16" height="10" />
      <path d="M60 48V22M24 62l4 6M42 55l2 6M78 55l-2 6M96 62l-4 6" />
    </>
  );
}

function Filter() {
  return (
    <>
      <ellipse cx="60" cy="30" rx="30" ry="9" />
      <ellipse cx="60" cy="30" rx="10" ry="3" />
      <path d="M30 30v58a30 9 0 0 0 60 0V30" />
      <path d="M38 37v58M46 38v59M54 39v58M62 39v58M70 38v59M78 37v58M84 35v57" />
    </>
  );
}

function Strut() {
  return (
    <>
      <rect x="42" y="8" width="36" height="6" />
      <path d="M60 14v24" />
      <path d="M40 26l40 8-40 8 40 8-40 8 40 8-40 8" />
      <rect x="52" y="38" width="16" height="62" />
      <rect x="46" y="100" width="28" height="10" />
    </>
  );
}

function Generic() {
  return (
    <>
      <path d="M60 20l34.6 20v40L60 100 25.4 80V40z" />
      <circle cx="60" cy="60" r="24" />
      <circle cx="60" cy="60" r="14" />
    </>
  );
}

const DRAWINGS: [RegExp, () => React.ReactNode][] = [
  [/wiper/i, Wiper],
  [/brake|rotor|caliper|pad/i, RotorLines],
  [/batter/i, Battery],
  [/alternator|starter|electric/i, Alternator],
  [/filter/i, Filter],
  [/suspens|strut|shock|spring/i, Strut],
];

export function PartArt({
  hints,
  variant = "blueprint",
  label,
  className = "",
}: {
  hints: (string | null | undefined)[];
  /** "blueprint" is a navy tile with center lines; "line" is the bare navy drawing. */
  variant?: "blueprint" | "line";
  /** Small title-block text in the corner of a blueprint, such as the part number. */
  label?: string;
  className?: string;
}) {
  const text = hints.filter(Boolean).join(" ");
  const Drawing = DRAWINGS.find(([match]) => match.test(text))?.[1] ?? Generic;

  if (variant === "line") {
    return (
      <svg
        viewBox="0 0 120 120"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        className={`text-accent/60 [&_*]:[vector-effect:non-scaling-stroke] ${className}`}
      >
        <Drawing />
      </svg>
    );
  }

  return (
    <div className={`relative flex items-center justify-center bg-accent ${className}`}>
      <svg
        viewBox="0 0 120 120"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        className="h-3/5 w-3/5 text-white/60 transition duration-500 group-hover:scale-[1.04] group-hover:text-white/90 [&_*]:[vector-effect:non-scaling-stroke]"
      >
        {/* Dash-dot center lines, as on an engineering drawing. */}
        <path d="M60 0v120M0 60h120" strokeDasharray="9 3 1 3" opacity="0.35" />
        <Drawing />
      </svg>
      {label && <span className="absolute right-2.5 bottom-2 left-2.5 truncate font-mono text-[10px] text-white/55">{label}</span>}
    </div>
  );
}
