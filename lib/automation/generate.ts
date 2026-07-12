import "server-only";

type Generated = { title: string; excerpt: string; body: string; socialText: string };

function slugify(value: string, day: string) {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
  return `${day}-${base || "web3-brief"}`;
}

export async function generateDailyPost(day: string): Promise<Generated & { slug: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required for daily post generation.");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", signal: AbortSignal.timeout(45_000), headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({
    model: process.env.OPENAI_AUTOMATION_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini",
    instructions: "You are AIONEX AI's careful Web3 editor. Write educational, original content. Never invent prices, live events, partnerships, returns, or financial advice. Avoid hype. Return only valid JSON matching the requested keys.",
    input: `Create the daily crypto/Web3 insight for ${day}. Return JSON with title (max 90 chars), excerpt (max 180), body (500-800 words in Markdown), and socialText (max 240 chars, include https://aionex.ai/news and at most 2 hashtags).`,
    text: { format: { type: "json_schema", name: "daily_post", strict: true, schema: { type: "object", additionalProperties: false, required: ["title", "excerpt", "body", "socialText"], properties: { title: { type: "string" }, excerpt: { type: "string" }, body: { type: "string" }, socialText: { type: "string" } } } } },
  }) });
  if (!response.ok) throw new Error(`OpenAI generation failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const text = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!text) throw new Error("OpenAI returned no post content.");
  const result = JSON.parse(text) as Generated;
  if (!result.title || !result.excerpt || !result.body || !result.socialText) throw new Error("OpenAI returned an incomplete post.");
  return { ...result, socialText: result.socialText.slice(0, 280), slug: slugify(result.title, day) };
}
