import { connection } from "next/server";
import { db } from "@/lib/db";

// Liveness + database check for Docker / the hosting platform.
export async function GET() {
  await connection();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "database unreachable" }, { status: 503 });
  }
}
