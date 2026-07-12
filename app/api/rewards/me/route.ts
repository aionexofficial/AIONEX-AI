import { getProfile } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
export async function GET() { const auth = await requireRewardUser(); if (!auth) return unauthorized(); const profile = await getProfile(auth.userId); return profile ? Response.json({ profile }) : unauthorized(); }
