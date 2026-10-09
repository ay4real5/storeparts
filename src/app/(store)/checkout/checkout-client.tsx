"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Check, Lock } from "lucide-react";
import { useCart } from "@/components/cart";
import { formatCents } from "@/lib/money";

type Rate = { id: string; carrier: string; service: string; rateCents: number; deliveryDays: number | null };
type Totals = { subtotalCents: number; coreChargeCents: number; shippingCents: number; taxCents: number; totalCents: number };
type Started = { orderId: string; accessToken: string; clientSecret: string; totals: Totals };

const emptyAddress = { name: "", street1: "", street2: "", city: "", state: "", zip: "", phone: "" };

export function CheckoutClient({ publishableKey, taxEnabled }: { publishableKey: string | null; taxEnabled: boolean }) {
  const { items, ready, subtotalCents, coreChargeCents } = useCart();
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [quote, setQuote] = useState<{ shipmentId: string; rates: Rate[]; hazmat: boolean } | null>(null);
  const [rateId, setRateId] = useState("");
  const [started, setStarted] = useState<Started | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);

  const cartPayload = items.map((i) => ({ productId: i.productId, qty: i.qty }));

  if (!ready) return <div className="h-96 animate-pulse rounded-lg bg-surface" />;
  if (items.length === 0 && !started) {
    return (
      <div className="card mx-auto my-16 max-w-lg p-10 text-center">
        <p>Your cart is empty.</p>
        <Link href="/shop" className="btn mt-4">
          Shop parts
        </Link>
      </div>
    );
  }

  async function post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
    return json as T;
  }

  async function getRates(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    setQuote(null);
    setRateId("");
    try {
      const q = await post<{ shipmentId: string; rates: Rate[]; hazmat: boolean }>("/api/checkout/rates", {
        items: cartPayload,
        address,
      });
      setQuote(q);
      setRateId(q.rates[0]?.id ?? "");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startPayment() {
    if (!quote || !rateId) return;
    setError("");
    setBusy(true);
    try {
      setStarted(
        await post<Started>("/api/checkout/order", {
          items: cartPayload,
          email,
          address,
          shipmentId: quote.shipmentId,
          rateId,
        }),
      );
    } catch (err) {
      setError((err as Error).message);
      if ((err as Error).message.includes("choose a shipping option")) setQuote(null);
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof typeof emptyAddress, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={key}>
        {label}
      </label>
      <input
        id={key}
        className="input"
        value={address[key]}
        disabled={Boolean(started)}
        onChange={(e) => {
          setAddress({ ...address, [key]: e.target.value });
          setQuote(null);
        }}
        {...props}
      />
    </div>
  );

  const selectedRate = quote?.rates.find((r) => r.id === rateId);

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <h1 className="display flex items-center gap-3 text-5xl">Checkout <Lock className="h-7 w-7 text-accent" /></h1>

        <form onSubmit={getRates} className="card space-y-4 p-6">
          <StepTitle n={1} title="Contact & shipping" done={Boolean(quote)} />
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              required
              autoComplete="email"
              value={email}
              disabled={Boolean(started)}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {field("name", "Full name", { required: true, autoComplete: "name" })}
          {field("street1", "Address", { required: true, autoComplete: "address-line1" })}
          {field("street2", "Apt, suite (optional)", { autoComplete: "address-line2" })}
          <div className="grid grid-cols-[1fr_80px_120px] gap-3">
            {field("city", "City", { required: true, autoComplete: "address-level2" })}
            {field("state", "State", { required: true, maxLength: 2, placeholder: "TX", autoComplete: "address-level1" })}
            {field("zip", "ZIP", { required: true, inputMode: "numeric", autoComplete: "postal-code" })}
          </div>
          {field("phone", "Phone (for the carrier)", { type: "tel", autoComplete: "tel" })}
          {!started && (
            <button type="submit" className="btn" disabled={busy}>
              {busy && !quote ? "Getting rates…" : quote ? "Update shipping rates" : "Get shipping rates"}
            </button>
          )}
        </form>

        {quote && (
          <div className="card space-y-3 p-6">
            <StepTitle n={2} title="Shipping method" done={Boolean(started)} />
            {quote.hazmat && (
              <p className="text-sm text-muted">Your cart has items that can only ship by ground service.</p>
            )}
            {quote.rates.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition has-checked:border-accent has-checked:bg-accent-soft">
                <input
                  type="radio"
                  name="rate"
                  checked={rateId === r.id}
                  disabled={Boolean(started)}
                  onChange={() => setRateId(r.id)}
                />
                <span className="flex-1">
                  {r.carrier} {r.service.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  {r.deliveryDays && <span className="text-sm text-muted"> · about {r.deliveryDays} business days</span>}
                </span>
                <span className="font-semibold">{formatCents(r.rateCents)}</span>
              </label>
            ))}
            {!started && (
              <button type="button" className="btn" disabled={busy || !rateId || !email} onClick={startPayment}>
                {busy ? "Preparing payment…" : "Continue to payment"}
              </button>
            )}
          </div>
        )}

        {started && stripePromise && (
          <div className="card space-y-3 p-6">
            <StepTitle n={3} title="Payment" done={false} />
            <Elements stripe={stripePromise} options={{ clientSecret: started.clientSecret }}>
              <PayForm started={started} />
            </Elements>
          </div>
        )}
        {!publishableKey && quote && (
          <p className="text-sm text-warn">Payments are not configured on this store yet (Stripe keys missing).</p>
        )}

        {error && <p className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">{error}</p>}
      </div>

      <aside className="card h-fit space-y-2 p-6 text-sm lg:sticky lg:top-24">
        <h2 className="display mb-2 text-2xl">Order summary</h2>
        {items.map((i) => (
          <div key={i.productId} className="flex justify-between gap-2">
            <span>
              {i.qty} × {i.title}
            </span>
            <span>{formatCents(i.priceCents * i.qty)}</span>
          </div>
        ))}
        <hr className="border-border" />
        <Row label="Subtotal" cents={started?.totals.subtotalCents ?? subtotalCents} />
        {(started?.totals.coreChargeCents ?? coreChargeCents) > 0 && (
          <Row label="Core deposits (refundable)" cents={started?.totals.coreChargeCents ?? coreChargeCents} />
        )}
        <Row label="Shipping" cents={started?.totals.shippingCents ?? selectedRate?.rateCents ?? null} />
        <Row label="Tax" cents={started ? started.totals.taxCents : taxEnabled ? null : 0} />
        <hr className="border-border" />
        <div className="flex items-baseline justify-between font-bold">
          <span>Total</span>
          <span className="display text-3xl normal-case">{started ? formatCents(started.totals.totalCents) : "—"}</span>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, cents }: { label: string; cents: number | null }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{cents === null ? "Calculated next" : formatCents(cents)}</span>
    </div>
  );
}

function PayForm({ started }: { started: Started }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError("");
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order/${started.orderId}?token=${started.accessToken}&placed=1`,
      },
    });
    // Only reached when confirmation fails; success redirects to return_url.
    setError(error.message ?? "Payment failed.");
    setBusy(false);
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement />
      <button type="submit" className="btn w-full" disabled={!stripe || busy}>
        {busy ? "Processing…" : `Pay ${formatCents(started.totals.totalCents)}`}
      </button>
      {error && <p className="text-sm text-warn">{error}</p>}
      <p className="text-xs text-muted">Items are reserved for 30 minutes while you pay.</p>
    </form>
  );
}

function StepTitle({ n, title, done }: { n: number; title: string; done: boolean }) {
  return (
    <h2 className="display flex items-center gap-3 text-2xl leading-none">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-base text-white ${done ? "bg-ok" : "bg-accent"}`}
      >
        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
      </span>
      {title}
    </h2>
  );
}
