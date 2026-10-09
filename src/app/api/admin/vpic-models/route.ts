import { getSession } from "@/lib/auth";
import { getVpicModels } from "@/lib/vpic";

export async function GET(req: Request) {
  if (!(await getSession())) return new Response("Unauthorized", { status: 401 });
  const make = new URL(req.url).searchParams.get("make")?.trim();
  if (!make) return Response.json([]);
  return Response.json(await getVpicModels(make));
}
