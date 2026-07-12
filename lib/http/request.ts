export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
}

export function exceedsContentLength(request: Request, maximumBytes: number) {
  const value = request.headers.get("content-length");
  return value !== null && Number(value) > maximumBytes;
}
