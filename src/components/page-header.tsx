import { RotorLines } from "./part-art";

/** The title band at the top of every interior page, with the angled navy panel. */
export function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: React.ReactNode;
  /** Links shown under the title. */
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-b border-border bg-surface-2">
      <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[calc(26%+14px)] bg-accent/10 [clip-path:polygon(28px_0,100%_0,100%_100%,0_100%)] md:block" />
      <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[26%] overflow-hidden bg-accent [clip-path:polygon(28px_0,100%_0,100%_100%,0_100%)] md:block">
        <svg
          viewBox="0 0 120 120"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="absolute top-1/2 right-[6%] h-[340px] w-[340px] -translate-y-1/2 text-white/[0.12] [&_*]:[vector-effect:non-scaling-stroke]"
        >
          <RotorLines />
        </svg>
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-10">
        <div className="md:max-w-[66%]">
          <h1 className="display text-3xl sm:text-4xl">{title}</h1>
          {sub && <p className="mt-2 max-w-2xl leading-relaxed text-muted">{sub}</p>}
          {children && <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">{children}</div>}
        </div>
      </div>
    </div>
  );
}
