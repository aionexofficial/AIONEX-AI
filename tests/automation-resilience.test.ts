import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {AutomationFailure,exponentialBackoffMs,providerHttpFailure,providerNetworkFailure} from "../lib/automation/failures.ts";

test("provider failures retry only transient responses",()=>{assert.equal(providerHttpFailure("Ollama",429).retryable,true);assert.equal(providerHttpFailure("OpenAI",500).retryable,true);assert.equal(providerHttpFailure("YouTube",400).retryable,false);assert.equal(providerNetworkFailure("Telegram",new TypeError("fetch failed")).retryable,true);assert.ok(providerHttpFailure("OpenAI",500) instanceof AutomationFailure);});
test("retry delays use bounded exponential backoff",()=>{assert.equal(exponentialBackoffMs(0),1_000);assert.equal(exponentialBackoffMs(3),8_000);assert.equal(exponentialBackoffMs(20),30_000);});
test("production automation has no legacy rendering dependency",async()=>{const runner=await readFile(new URL("../scripts/run-daily-video-automation.mjs",import.meta.url),"utf8"),manifest=await readFile(new URL("../package.json",import.meta.url),"utf8");assert.match(runner,/run-local-video-dry-run\.ts/);assert.match(runner,/youtube_publish/);assert.doesNotMatch(`${runner}\n${manifest}`,/creatomate/i);});
