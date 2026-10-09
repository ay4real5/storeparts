import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createCategory, deleteCategory } from "@/app/admin/actions";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/form-status";

// Admin pages read fresh data and may block; instant navigation is not needed here.
export const instant = false;

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await connection();
  await requireAdmin();
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { parent: true, _count: { select: { products: true } } },
  });
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Categories</h1>
      <ActionForm action={createCategory} resetOnSuccess submit="Add category" className="card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" buttonClass="btn">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" className="input" placeholder="Brakes" required />
        </div>
        <div>
          <label className="label" htmlFor="parentId">
            Parent (optional)
          </label>
          <select id="parentId" name="parentId" className="input">
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </ActionForm>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Parent</th>
              <th>Products</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="text-muted">{c.parent?.name}</td>
                <td>{c._count.products}</td>
                <td className="text-right">
                  <form action={deleteCategory}>
                    <input type="hidden" name="categoryId" value={c.id} />
                    <SubmitButton
                      className="text-xs text-warn underline"
                      pending="…"
                      confirm={`Delete ${c.name}? Its products become uncategorised.`}
                    >
                      Delete
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
