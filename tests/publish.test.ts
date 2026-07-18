import assert from "node:assert/strict";
import test from "node:test";
import { sendTelegramPublication } from "../lib/automation/telegram-client.ts";

test("Telegram messages and video captions are plain text by default", async () => {
  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
  const request = async (method: string, payload: Record<string, unknown>) => {
    calls.push({ method, payload });
    return { message_id: 42 };
  };

  assert.equal(await sendTelegramPublication(request, "123", "Plain *caption*"), "42");
  assert.equal(await sendTelegramPublication(request, "123", "Plain *caption*", "https://example.test/video.mp4"), "42");
  assert.equal(calls[0].method, "sendMessage");
  assert.equal(calls[1].method, "sendVideo");
  assert.equal(calls[0].payload.parse_mode, undefined);
  assert.equal(calls[1].payload.parse_mode, undefined);
});

test("explicitly sanitized formatting may set parse_mode", async () => {
  const request = async (_method: string, payload: Record<string, unknown>) => {
    assert.equal(payload.parse_mode, "HTML");
    return { message_id: 43 };
  };
  assert.equal(await sendTelegramPublication(request, "123", "<b>Safe</b>", undefined, { parseMode: "HTML", sanitized: true }), "43");
});

test("parse-entities failures retry once as plain text with the same video URL", async () => {
  const videoUrl = "https://example.test/video.mp4";
  const calls: Record<string, unknown>[] = [];
  const request = async (_method: string, payload: Record<string, unknown>) => {
    calls.push(payload);
    if (calls.length === 1) throw new Error("Telegram sendVideo: Bad Request: can't parse entities at byte offset 140");
    return { message_id: 44 };
  };

  const id = await sendTelegramPublication(request, "123", "<b>Broken", videoUrl, { parseMode: "HTML", sanitized: true });
  assert.equal(id, "44");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].parse_mode, "HTML");
  assert.equal(calls[1].parse_mode, undefined);
  assert.equal(calls[0].video, videoUrl);
  assert.equal(calls[1].video, videoUrl);
});

test("non-entity Telegram errors are not retried", async () => {
  let attempts = 0;
  const request = async () => {
    attempts++;
    throw new Error("Telegram sendVideo: forbidden");
  };
  await assert.rejects(
    sendTelegramPublication(request, "123", "caption", "https://example.test/video.mp4", { parseMode: "HTML", sanitized: true }),
    /forbidden/,
  );
  assert.equal(attempts, 1);
});
