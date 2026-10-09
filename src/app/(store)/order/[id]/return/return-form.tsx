"use client";

import { startTransition, useActionState, useState } from "react";
import { requestReturn, type FormState } from "@/app/(store)/actions";
import { FormMessage, SubmitButton } from "@/components/form-status";
import { returnReasonLabel } from "@/lib/labels";

type Item = { id: string; title: string; sku: string; returnableQty: number; coreQty: number };

export function ReturnForm({ orderId, token, items }: { orderId: string; token: string; items: Item[] }) {
  const [state, action, isPending] = useActionState<FormState, FormData>(requestReturn, {});
  const [type, setType] = useState<"RETURN" | "CORE">("RETURN");
  const hasCores = items.some((i) => i.coreQty > 0);

  if (state.ok) return <FormMessage state={state} />;

  return (
    <form
      className="card space-y-5 p-5"
      onSubmit={(e) => {
        // Manual submit keeps the selections if the server rejects the request.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="token" value={token} />

      {hasCores && (
        <fieldset className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="type" value="RETURN" checked={type === "RETURN"} onChange={() => setType("RETURN")} />
            Return a part
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="type" value="CORE" checked={type === "CORE"} onChange={() => setType("CORE")} />
            Send back a core (deposit refund)
          </label>
        </fieldset>
      )}
      {!hasCores && <input type="hidden" name="type" value="RETURN" />}

      <div className="space-y-2">
        {items.map((i) => {
          const max = type === "CORE" ? i.coreQty : i.returnableQty;
          if (type === "CORE" && i.coreQty === 0) return null;
          return (
            <div key={`${type}-${i.id}`} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {i.title} <span className="font-mono text-xs text-muted">({i.sku})</span>
              </span>
              <select name={`qty_${i.id}`} className="input w-20" defaultValue="0" disabled={max <= 0}>
                {Array.from({ length: max + 1 }, (_, n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {type === "RETURN" && (
        <div>
          <label className="label" htmlFor="reason">
            Reason
          </label>
          <select id="reason" name="reason" className="input" required defaultValue="">
            <option value="" disabled>
              Choose a reason
            </option>
            {Object.entries(returnReasonLabel)
              .filter(([k]) => k !== "CORE_RETURN")
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="notes">
          Details (optional)
        </label>
        <textarea id="notes" name="notes" className="input" rows={3} maxLength={1000} placeholder="e.g. my car is the 2.0L turbo, not the 2.5L" />
      </div>

      <FormMessage state={state} />
      <SubmitButton pending="Submitting…" busy={isPending}>
        Submit request
      </SubmitButton>
    </form>
  );
}
