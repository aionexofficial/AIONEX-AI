import { getAdminSession } from "@/lib/admin/auth";
import { adminAionOverview, adminUpdateAionDialogue, adminUpdateAionStage,adminUpdateChest,adminUpdateSeason } from "@/lib/aion/admin";
import { exceedsContentLength, isSameOrigin } from "@/lib/http/request";

export async function GET() { if (!await getAdminSession()) return Response.json({ error: "Unauthorized" }, { status: 401 }); return Response.json(await adminAionOverview(), { headers: { "Cache-Control": "no-store" } }); }
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (exceedsContentLength(request, 16_384)) return Response.json({ error: "Request is too large." }, { status: 413 });
  const admin = await getAdminSession(); if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { const body = await request.json(); if (body.type === "stage") return Response.json({ stage: await adminUpdateAionStage(admin.username, { key: String(body.key || ""), name: String(body.name || ""), minLevel: Number(body.minLevel), maxLevel: Number(body.maxLevel), description: String(body.description || ""), enabled: Boolean(body.enabled) }) }); if (body.type === "dialogue") return Response.json({ dialogue: await adminUpdateAionDialogue(admin.username, { key: String(body.key || ""), message: String(body.message || ""), enabled: Boolean(body.enabled), priority: Number(body.priority) }) });if(body.type==="chest")return Response.json({chest:await adminUpdateChest(admin.username,{key:String(body.key||""),name:String(body.name||""),enabled:Boolean(body.enabled),costAxp:Number(body.costAxp),rewardPool:body.rewardPool})});if(body.type==="season")return Response.json({season:await adminUpdateSeason(admin.username,{key:String(body.key||""),name:String(body.name||""),startsAt:String(body.startsAt||""),endsAt:String(body.endsAt||""),enabled:Boolean(body.enabled),rewardConfig:body.rewardConfig,eventConfig:body.eventConfig})}); return Response.json({ error: "Invalid AION admin action." }, { status: 400 }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "AION configuration failed." }, { status: 400 }); }
}
