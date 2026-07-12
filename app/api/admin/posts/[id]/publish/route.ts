import { getAdminSession } from "@/lib/admin/auth";
import { publishPost } from "@/lib/automation/publish";

export const maxDuration = 30;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if ((origin && new URL(origin).host !== new URL(request.url).host) || !await getAdminSession()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json({ post: await publishPost((await params).id) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Publishing failed" }, { status: 500 }); }
}
