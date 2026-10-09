import Link from "next/link";
import { Cog } from "lucide-react";

const storeName = process.env.STORE_NAME ?? "StoreParts";

export function Logo({ href = "/", light = true }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent shadow-[0_0_24px_-4px_var(--accent)] transition duration-500 group-hover:rotate-90">
        <Cog className="h-5 w-5 text-white" strokeWidth={2.5} />
      </span>
      <span className={`display text-2xl leading-none ${light ? "text-white" : ""}`}>{storeName}</span>
    </Link>
  );
}
