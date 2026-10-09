"use client";

import { lookupOrder } from "@/app/(store)/actions";
import { ActionForm } from "./action-form";

export function OrderLookupForm({ next }: { next: "status" | "return" }) {
  return (
    <ActionForm
      action={lookupOrder}
      submit={next === "return" ? "Find my order" : "Track order"}
      pending="Looking up…"
      className="card space-y-4 p-6"
    >
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="number">
          Order number
        </label>
        <input id="number" name="number" className="input" placeholder="SP-1001" required />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email used at checkout
        </label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
    </ActionForm>
  );
}
