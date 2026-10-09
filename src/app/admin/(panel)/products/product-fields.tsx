import type { Category, Product } from "@/generated/prisma/client";

const dollars = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2));

export function ProductFields({ product, categories }: { product?: Product; categories: Category[] }) {
  return (
    <div className="space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" name="title" defaultValue={product?.title} required className="sm:col-span-2" />
        <Field label="SKU" name="sku" defaultValue={product?.sku} required />
        <Field label="Brand" name="brand" defaultValue={product?.brand ?? ""} />
        <Field
          label="URL slug (blank = from title)"
          name="slug"
          defaultValue={product?.slug}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
        />
        <div>
          <label className="label" htmlFor="categoryId">
            Category
          </label>
          <select id="categoryId" name="categoryId" className="input" defaultValue={product?.categoryId ?? ""}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea id="description" name="description" rows={6} className="input" defaultValue={product?.description} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-4">
        <legend className="mb-2 font-semibold">Pricing &amp; stock</legend>
        <Field label="Price ($)" name="price" defaultValue={dollars(product?.priceCents)} required inputMode="decimal" />
        <Field label="Compare-at ($)" name="compareAt" defaultValue={dollars(product?.compareAtCents)} inputMode="decimal" />
        <Field label="Core charge ($)" name="coreCharge" defaultValue={dollars(product?.coreChargeCents) || "0.00"} inputMode="decimal" />
        <Field label="Stock qty" name="stockQty" type="number" min={0} defaultValue={product?.stockQty ?? 0} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-4">
        <legend className="mb-1 font-semibold">Shipping box (one unit, packed)</legend>
        <p className="text-xs text-muted sm:col-span-4">
          Carriers charge by box size as well as weight, so measure the packed box, not the part.
        </p>
        <Field label="Weight (oz)" name="weightOz" type="number" step="0.1" min={0.1} defaultValue={product?.weightOz} required />
        <Field label="Length (in)" name="lengthIn" type="number" step="0.1" min={0.1} defaultValue={product?.lengthIn} required />
        <Field label="Width (in)" name="widthIn" type="number" step="0.1" min={0.1} defaultValue={product?.widthIn} required />
        <Field label="Height (in)" name="heightIn" type="number" step="0.1" min={0.1} defaultValue={product?.heightIn} required />
      </fieldset>

      <fieldset className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="hazmat" defaultChecked={product?.hazmat} />
          Hazardous material (battery, fluid, aerosol): ground shipping only
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="universalFit" defaultChecked={product?.universalFit} />
          Universal fit (no vehicle fitment needed)
        </label>
      </fieldset>

      <div className="max-w-xs">
        <label className="label" htmlFor="status">
          Status
        </label>
        <select id="status" name="status" className="input" defaultValue={product?.status ?? "DRAFT"}>
          <option value="DRAFT">Draft (hidden)</option>
          <option value="ACTIVE">Active (for sale)</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  ...props
}: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label className="label" htmlFor={props.name}>
        {label}
      </label>
      <input id={props.name} className="input" {...props} />
    </div>
  );
}
