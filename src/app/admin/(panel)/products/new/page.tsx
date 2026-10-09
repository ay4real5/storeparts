import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveProduct } from "@/app/admin/actions";
import { ActionForm } from "@/components/action-form";
import { ProductFields } from "../product-fields";

// Admin pages read fresh data and may block; instant navigation is not needed here.
export const instant = false;

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await connection();
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">New product</h1>
      <p className="text-sm text-muted">Save first, then add photos and vehicle fitment.</p>
      <ActionForm action={saveProduct} submit="Create product" pending="Saving…" className="card space-y-6 p-6">
        <ProductFields categories={categories} />
      </ActionForm>
    </div>
  );
}
