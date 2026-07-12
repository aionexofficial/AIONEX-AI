import { getAdminSession } from "@/lib/admin/auth";
import { publishPost } from "@/lib/automation/publish";
import { isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";

export const maxDuration = 30;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!await getAdminSession()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json({ post: await publishPost((await params).id) }); }
  catch (error) { logError("admin.posts.publish", error); return Response.json({ error: "Publishing failed. Check the delivery status and server logs." }, { status: 500 }); }
}
