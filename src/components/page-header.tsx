/** The navy title band at the top of every interior page. */
export function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: React.ReactNode;
  /** Links aligned to the right of the title. */
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-accent text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-8 gap-y-3 px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
        <div>
          <h1 className="display text-3xl sm:text-4xl">{title}</h1>
          {sub && <p className="mt-2 max-w-2xl leading-relaxed text-white/75">{sub}</p>}
        </div>
        {children && <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">{children}</div>}
      </div>
    </div>
  );
}
