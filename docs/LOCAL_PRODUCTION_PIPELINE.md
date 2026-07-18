# Local production pipeline

AIONEX can generate a validated short-video package with local Ollama, render it with Remotion, and normalize it with FFmpeg. The pipeline is server-side and performs no publishing.

## Prerequisites

- Ollama listening on `http://127.0.0.1:11434`
- The `llama3.2` model installed
- `ffmpeg` and `ffprobe` available on `PATH`
- ElevenLabs or OpenAI TTS credentials configured
- Project dependencies installed with `npm install`

Environment defaults and optional overrides are documented in `.env.example`. Ollama endpoints are restricted to HTTP loopback addresses.

## Dry run

```bash
npm run pipeline:dry-run
```

Use `-- --day=YYYY-MM-DD` for a predictable dated output directory. Outputs are written to `artifacts/local-pipeline/<day>/` and include the rendered video, validation metadata, and Telegram/YouTube preparation records.

The generated story script is converted to speech before the final FFmpeg pass. Narration is fitted into the 30-second timeline, normalized to −16 LUFS with a −1.5 dB true-peak target, and encoded as AAC. Volume and silence analysis rejects missing, silent, or inaudibly quiet narration. When no provider is pinned, an unavailable ElevenLabs account may fall back to configured OpenAI TTS; the warning is recorded. If no configured TTS provider produces speech, the run stops—there is no silent-audio fallback.

The final video must be 1080×1920, about 30 seconds, H.264 with audible AAC narration, and large enough to reject placeholder renders. A 270×480 render is explicitly invalid. Telegram and YouTube records remain prepared but unpublished; YouTube defaults to private. X and TikTok adapters are intentionally disabled.

If local inference times out or fails schema validation, a factual fallback package keeps rendering available and records the warning in `metadata.json`. A successful Ollama verification reports `provider: "ollama"` and `fallback: false`.

## Daily Telegram automation

On the Windows production workstation, run `scripts/install-daily-video-task.ps1` once to register **AIONEX Daily Narrated Video** for 10:00, 15:00, and 20:00 local time. The task invokes the repository runner through the absolute Node and script paths, generates the dated narrated artifact, rejects silent audio, verifies the official `@aionexweb3` channel, publishes once to Telegram, and uploads both a public YouTube Short and a public standard video. Database content hashes and delivery records prevent duplicate posts. X and TikTok are not invoked.

This automation depends on the workstation being available with Ollama and FFmpeg running locally. Logs are written to `artifacts/local-pipeline/<day>/daily-automation-log.json`.

`REMOTION_RENDER_SCALE` defaults to `0.5` so memory-constrained production workstations render with one half-scale Chrome worker. FFmpeg then performs a Lanczos upscale, and the publisher remains gated on the final 1080x1920 H.264/AAC validation.
