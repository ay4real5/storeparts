import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { orderLabel } from "@/lib/money";
import { config } from "@/lib/config";
import { verifyEasyPostSignature } from "@/lib/shipping";

type TrackerEvent = {
  id: string;
  description: string;
  result: {
    id: string;
    status: string;
    tracking_code: string;
    public_url?: string;
    est_delivery_date?: string | null;
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyEasyPostSignature(raw, req.headers.get("x-hmac-signature"))) {
    return new Response("Bad signature", { status: 400 });
  }
  const event = JSON.parse(raw) as TrackerEvent;
  if (!event.description?.startsWith("tracker.")) return Response.json({ received: true });
  if (await db.webhookEvent.findUnique({ where: { id: event.id } })) {
    return Response.json({ received: true, duplicate: true });
  }

  const t = event.result;
  const shipment = await db.shipment.findFirst({
    where: { OR: [{ easypostTrackerId: t.id }, { trackingNumber: t.tracking_code }] },
    include: { order: true },
  });
  if (shipment) {
    await db.shipment.update({
      where: { id: shipment.id },
      data: {
        trackingStatus: t.status,
        trackingUrl: t.public_url ?? shipment.trackingUrl,
        easypostTrackerId: t.id,
        estDeliveryAt: t.est_delivery_date ? new Date(t.est_delivery_date) : shipment.estDeliveryAt,
      },
    });
    if (t.status === "delivered" && !shipment.isReturn && shipment.order.status === "SHIPPED") {
      await db.order.update({ where: { id: shipment.orderId }, data: { status: "DELIVERED" } });
      const o = shipment.order;
      await sendEmail(
        o.email,
        `Order ${orderLabel(o.number)} was delivered`,
        `Your order was delivered. If a part doesn't fit, you can start a return here:\n${config.siteUrl}/order/${o.id}?token=${o.accessToken}`,
      );
    }
  }

  await db.webhookEvent.upsert({
    where: { id: event.id },
    update: {},
    create: { id: event.id, source: "easypost", type: event.description },
  });
  return Response.json({ received: true });
}
