import Link from "next/link";

const storeName = process.env.STORE_NAME ?? "StoreParts";

export function Logo({ href = "/", inverse = false }: { href?: string; inverse?: boolean }) {
  return (
    <Link href={href} className={`text-xl font-semibold tracking-[-0.02em] ${inverse ? "text-white" : "text-ink"}`}>
      {storeName}
    </Link>
  );
}
