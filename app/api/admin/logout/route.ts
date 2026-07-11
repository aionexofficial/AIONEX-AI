import { ADMIN_COOKIE } from "@/lib/admin/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  (await cookies()).set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return Response.json({ ok: true });
}
