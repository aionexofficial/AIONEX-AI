import { getAdminSession } from "@/lib/admin/auth";
import { createPost, findPostForDay, listPosts } from "@/lib/automation/db";
import { generateDailyPost } from "@/lib/automation/generate";

function sameOrigin(request: Request) { const origin = request.headers.get("origin"); return !origin || new URL(origin).host === new URL(request.url).host; }

export async function GET() {
  if (!await getAdminSession()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json({ posts: await listPosts() }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Database error" }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || !await getAdminSession()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const day = new Date().toISOString().slice(0, 10);
    const existing = await findPostForDay(day);
    if (existing) return Response.json({ post: existing });
    const generated = await generateDailyPost(day);
    return Response.json({ post: await createPost({ ...generated, scheduledFor: day, status: "draft" }) }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 500 }); }
}
