import { readFile } from "node:fs/promises";
import { uploadContentType, uploadPath } from "@/lib/uploads";

export async function GET(_req: Request, ctx: RouteContext<"/uploads/[file]">) {
  const { file } = await ctx.params;
  const p = uploadPath(file);
  if (!p) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(p);
    return new Response(bytes, {
      headers: {
        "Content-Type": uploadContentType(file),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
