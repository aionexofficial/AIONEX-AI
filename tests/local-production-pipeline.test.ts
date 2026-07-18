import assert from "node:assert/strict";
import test from "node:test";
import {fallbackVideoContent,videoContentPackageSchema} from "../lib/content/schema.ts";
import {PUBLICATION_PLATFORMS} from "../lib/platforms/config.ts";
import {validateVideoProbe} from "../lib/video/validation.ts";

test("fallback content is a complete five-scene production package",()=>{const content=videoContentPackageSchema.parse(fallbackVideoContent("2026-07-18"));assert.equal(content.durationSeconds,30);assert.equal(content.scenes.length,5);assert.ok(content.scenes.every(scene=>scene.subtitle&&scene.visual));assert.ok(content.telegramCaption);assert.ok(content.youtubeDescription);});
test("future X and TikTok publishing remain disabled",()=>{assert.equal(PUBLICATION_PLATFORMS.x.enabled,false);assert.equal(PUBLICATION_PLATFORMS.tiktok.enabled,false);assert.equal(PUBLICATION_PLATFORMS.telegram.enabled,true);assert.equal(PUBLICATION_PLATFORMS.youtube.enabled,true);});
test("video validation accepts production H.264/AAC and rejects draft scale",()=>{const valid=validateVideoProbe({format:{duration:"30",size:"900000"},streams:[{codec_type:"video",codec_name:"h264",width:1080,height:1920},{codec_type:"audio",codec_name:"aac"}]},true);assert.equal(valid.passed,true);const draft=validateVideoProbe({format:{duration:"30",size:"900000"},streams:[{codec_type:"video",codec_name:"h264",width:270,height:480},{codec_type:"audio",codec_name:"aac"}]},true);assert.equal(draft.passed,false);assert.match(draft.errors.join(" "),/270x480/);});
