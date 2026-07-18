import { readNarration, verifyNarrationUrl } from "@/lib/automation/audio-assets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  if (!verifyNarrationUrl(id, url.searchParams.get("expires"), url.searchParams.get("signature"))) {
    return Response.json({ error: "Invalid or expired media URL." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const asset = await readNarration(id);
  if (!asset) return Response.json({ error: "Media asset not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const body = asset.data.buffer.slice(asset.data.byteOffset, asset.data.byteOffset + asset.data.byteLength) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.data.byteLength),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
