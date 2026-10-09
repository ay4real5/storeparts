import { config } from "@/lib/config";
import { releaseExpiredReservations } from "@/lib/orders";
import { tokensMatch } from "@/lib/tokens";

// Call every ~10 minutes from any scheduler with
//   Authorization: Bearer $CRON_SECRET
export async function GET(req: Request) {
  const secret = config.cronSecret;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!secret || !tokensMatch(given, secret)) return new Response("Unauthorized", { status: 401 });
  const released = await releaseExpiredReservations();
  return Response.json({ released });
}
