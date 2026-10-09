import {
  BatteryCharging,
  Cable,
  Cog,
  Disc3,
  Droplet,
  Fan,
  Filter,
  Gauge,
  Lightbulb,
  Settings2,
  Thermometer,
  Wind,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// Category → icon and colour, matched on keywords so new categories pick up a
// sensible look without code changes.
const THEMES: { match: RegExp; icon: LucideIcon; from: string; to: string }[] = [
  { match: /brake|rotor|caliper|pad/i, icon: Disc3, from: "#ff5a1f", to: "#b91c1c" },
  { match: /batter/i, icon: BatteryCharging, from: "#22c55e", to: "#0f766e" },
  { match: /electric|alternator|starter|ignition|sensor/i, icon: Cable, from: "#facc15", to: "#ea580c" },
  { match: /light|lamp|bulb/i, icon: Lightbulb, from: "#fde047", to: "#ca8a04" },
  { match: /cool|radiator|thermo/i, icon: Thermometer, from: "#38bdf8", to: "#1d4ed8" },
  { match: /fan|hvac|a\/c|air ?con/i, icon: Fan, from: "#67e8f9", to: "#0e7490" },
  { match: /filter/i, icon: Filter, from: "#a3e635", to: "#4d7c0f" },
  { match: /oil|fluid|lubric/i, icon: Droplet, from: "#fbbf24", to: "#b45309" },
  { match: /exhaust|intake|air/i, icon: Wind, from: "#94a3b8", to: "#334155" },
  { match: /engine|perform/i, icon: Gauge, from: "#f472b6", to: "#9d174d" },
  { match: /suspens|steer|strut|shock/i, icon: Settings2, from: "#a78bfa", to: "#5b21b6" },
  { match: /maint|wiper|tool|accessor/i, icon: Wrench, from: "#60a5fa", to: "#1e40af" },
];

const FALLBACK = { icon: Cog, from: "#64748b", to: "#1e293b" };

export function partTheme(...hints: (string | null | undefined)[]) {
  const text = hints.filter(Boolean).join(" ");
  return THEMES.find((t) => t.match.test(text)) ?? FALLBACK;
}

/** Stand-in artwork for products without photos, and category tiles. */
export function PartArt({
  hints,
  className = "",
  iconClass = "h-16 w-16",
}: {
  hints: (string | null | undefined)[];
  className?: string;
  iconClass?: string;
}) {
  const { icon: Icon, from, to } = partTheme(...hints);
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 120% at 20% 10%, ${from}, ${to})` }}
    >
      <div className="bg-stripes absolute inset-0 opacity-70" />
      <Icon className={`relative text-white/90 drop-shadow-[0_8px_16px_rgb(0_0_0/0.35)] ${iconClass}`} strokeWidth={1.5} />
    </div>
  );
}
