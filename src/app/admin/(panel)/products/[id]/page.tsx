import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getVpicMakes } from "@/lib/vpic";
import {
  addFitment,
  bulkAddFitment,
  deleteFitment,
  deleteProductImage,
  makePrimaryImage,
  saveProduct,
  uploadProductImages,
} from "@/app/admin/actions";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/form-status";
import { ProductFields } from "../product-fields";
import { FitmentInputs } from "../fitment-inputs";

// Admin pages read fresh data and may block; instant navigation is not needed here.
export const instant = false;

export const metadata = { title: "Edit product" };

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  await connection();
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const [product, categories, makes] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        fitments: { orderBy: [{ make: "asc" }, { model: "asc" }, { yearStart: "asc" }] },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
    getVpicMakes(),
  ]);
  if (!product) notFound();

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/products" className="text-sm text-muted">
          ← Products
        </Link>
        <h1 className="display text-4xl">{product.title}</h1>
        {product.status === "ACTIVE" && (
          <Link href={`/shop/${product.slug}`} target="_blank" className="text-sm text-accent">
            View in store ↗
          </Link>
        )}
      </div>
      {sp.created === "1" && (
        <p className="rounded-md bg-ok/10 px-3 py-2 text-sm text-ok">Created. Now add photos and fitment, then set it Active.</p>
      )}

      <ActionForm action={saveProduct} submit="Save changes" pending="Saving…" className="card space-y-6 p-6">
        <ProductFields product={product} categories={categories} />
      </ActionForm>

      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Photos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {product.images.map((img, i) => (
            <div key={img.id} className="space-y-1">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded border border-border bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} className="h-full w-full object-contain" />
              </div>
              <div className="flex gap-2 text-xs">
                {i === 0 ? (
                  <span className="font-semibold text-ok">Main</span>
                ) : (
                  <form action={makePrimaryImage}>
                    <input type="hidden" name="imageId" value={img.id} />
                    <button className="underline">Make main</button>
                  </form>
                )}
                <form action={deleteProductImage} className="ml-auto">
                  <input type="hidden" name="imageId" value={img.id} />
                  <button className="text-warn underline">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
        <ActionForm action={uploadProductImages} resetOnSuccess submit="Add photos" pending="Uploading…" className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end" buttonClass="btn-secondary">
          <input type="hidden" name="productId" value={product.id} />
          <div>
            <label className="label" htmlFor="images">
              Upload
            </label>
            <input id="images" name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="text-sm" />
          </div>
          <div>
            <label className="label" htmlFor="url">
              …or image URL
            </label>
            <input id="url" name="url" className="input" placeholder="https://" />
          </div>
          <div>
            <label className="label" htmlFor="alt">
              Alt text
            </label>
            <input id="alt" name="alt" className="input" placeholder="Describe the photo" />
          </div>
        </ActionForm>
      </section>

      {product.universalFit ? (
        <p className="card p-6 text-sm text-muted">Marked universal fit, so vehicle fitment is not used for this product.</p>
      ) : (
        <section className="card space-y-5 p-6">
          <div>
            <h2 className="text-lg font-semibold">Vehicle fitment ({product.fitments.length})</h2>
            <p className="text-sm text-muted">
              Make and model suggestions come from NHTSA. Use them so every product spells vehicles the same way.
            </p>
          </div>
          {product.fitments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Years</th>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Trim</th>
                    <th>Engine</th>
                    <th>Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {product.fitments.map((f) => (
                    <tr key={f.id}>
                      <td>{f.yearStart === f.yearEnd ? f.yearStart : `${f.yearStart}–${f.yearEnd}`}</td>
                      <td>{f.make}</td>
                      <td>{f.model}</td>
                      <td>{f.submodel}</td>
                      <td>{f.engine}</td>
                      <td>{f.notes}</td>
                      <td>
                        <form action={deleteFitment}>
                          <input type="hidden" name="fitmentId" value={f.id} />
                          <SubmitButton className="text-xs text-warn underline" pending="…">
                            Remove
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ActionForm action={addFitment} resetOnSuccess submit="Add vehicle" pending="Adding…" buttonClass="btn-secondary">
            <input type="hidden" name="productId" value={product.id} />
            <FitmentInputs makes={makes} />
          </ActionForm>

          <details className="rounded-md border border-border p-4">
            <summary className="cursor-pointer text-sm font-semibold">Bulk add from CSV</summary>
            <ActionForm action={bulkAddFitment} resetOnSuccess submit="Import rows" pending="Importing…" className="mt-3 space-y-3" buttonClass="btn-secondary">
              <input type="hidden" name="productId" value={product.id} />
              <p className="text-xs text-muted">
                One vehicle per line: <code>yearStart,yearEnd,make,model,submodel,engine,notes</code>. Only the first four
                are required. A header line starting with “year” is skipped.
              </p>
              <textarea
                name="csv"
                rows={8}
                className="input font-mono text-xs"
                placeholder={"2015,2020,Toyota,Camry,LE,2.5L L4,\n2016,2018,Honda,Accord,,,Front only"}
              />
            </ActionForm>
          </details>
        </section>
      )}
    </div>
  );
}
