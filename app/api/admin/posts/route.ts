import { getAdminSession } from "@/lib/admin/auth";
import { createPost, findPostForDay, listPosts } from "@/lib/automation/db";
import { generateDailyPost } from "@/lib/automation/generate";
import { isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";

export async function GET() {
  if (!await getAdminSession()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json({ posts: await listPosts() }); }
  catch (error) { logError("admin.posts.list", error); return Response.json({ error: "Posts are temporarily unavailable." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!await getAdminSession()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const day = new Date().toISOString().slice(0, 10);
    const existing = await findPostForDay(day);
    if (existing) return Response.json({ post: existing });
    const generated = await generateDailyPost(day);
    return Response.json({ post: await createPost({ ...generated, scheduledFor: day, status: "draft" }) }, { status: 201 });
  } catch (error) { logError("admin.posts.generate", error); return Response.json({ error: "Post generation failed. Check the server logs." }, { status: 500 }); }
}
