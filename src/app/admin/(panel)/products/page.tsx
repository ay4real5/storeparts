import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatCents } from "@/lib/money";

// Admin pages read fresh data and may block; instant navigation is not needed here.
export const instant = false;

export const metadata = { title: "Products" };

export default async function ProductsPage(props: PageProps<"/admin/products">) {
  await connection();
  await requireAdmin();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const products = await db.product.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { _count: { select: { fitments: true, images: true } }, category: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="display text-4xl">Products</h1>
        <form className="order-last w-full sm:order-none sm:ml-auto sm:w-auto">
          <input name="q" defaultValue={q} placeholder="Search title or SKU" className="input sm:w-64" />
        </form>
        <Link href="/admin/products/new" className="btn ml-auto sm:ml-0">
          + New product
        </Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="hidden sm:table-cell">SKU</th>
              <th>Title</th>
              <th>Status</th>
              <th>Price</th>
              <th>Stock</th>
              <th className="hidden md:table-cell">Fitment</th>
              <th className="hidden md:table-cell">Photos</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="hidden font-mono text-xs sm:table-cell">{p.sku}</td>
                <td>
                  <Link href={`/admin/products/${p.id}`} className="font-medium text-accent">
                    {p.title}
                  </Link>
                  {p.category && <span className="block text-xs text-muted">{p.category.name}</span>}
                </td>
                <td>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      p.status === "ACTIVE" ? "bg-ok/15 text-ok" : "bg-border text-muted"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td>{formatCents(p.priceCents)}</td>
                <td className={p.stockQty <= 0 ? "font-semibold text-warn" : ""}>{p.stockQty}</td>
                <td className={`hidden md:table-cell ${!p.universalFit && p._count.fitments === 0 ? "text-warn" : ""}`}>
                  {p.universalFit ? "Universal" : p._count.fitments}
                </td>
                <td className={`hidden md:table-cell ${p._count.images === 0 ? "text-warn" : ""}`}>{p._count.images}</td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
