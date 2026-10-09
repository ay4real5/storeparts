import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shipping, returns & privacy" };

// Starter policy text. Edit to match how the store actually operates, and have
// it reviewed before launch.
export default function PoliciesPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10 px-4 py-14 leading-relaxed">
      <section id="shipping" className="space-y-2">
        <h1 className="display text-5xl">Shipping</h1>
        <p>
          Orders ship from our warehouse within 1–2 business days. Shipping rates are calculated live from USPS, UPS and
          FedEx at checkout using the actual size and weight of your parts.
        </p>
        <p>
          Batteries, fluids and aerosols are hazardous materials and can only ship by ground service within the
          contiguous United States.
        </p>
      </section>

      <section id="returns" className="space-y-2">
        <h2 className="display text-4xl">Returns &amp; core charges</h2>
        <p>
          You can return unused parts in their original packaging within 30 days of purchase. Start a return online
          from your order page. If a part doesn’t fit the vehicle listed in our fitment table, we’ll cover return
          shipping. Electrical parts that have been installed can only be returned if they are defective.
        </p>
        <p>
          <strong>Core charges.</strong> Some remanufactured parts (alternators, starters, calipers, etc.) carry a
          refundable core deposit. Send your old part back within 90 days, in the box the new part came in, and we’ll
          refund the deposit once we inspect the core. Cores must be complete, drained of fluids and not broken.
        </p>
      </section>

      <section id="privacy" className="space-y-2">
        <h2 className="display text-4xl">Privacy</h2>
        <p>
          We collect your name, email, phone and address only to process, ship and support your order. Card details are
          handled by Stripe and never touch our servers. We share your address with the shipping carrier and never sell
          your data.
        </p>
      </section>
    </article>
  );
}
