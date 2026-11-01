import Link from "next/link";

const storeName = process.env.STORE_NAME ?? "StoreParts";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="text-xl font-semibold tracking-[-0.02em] text-ink">
      {storeName}
    </Link>
  );
}
