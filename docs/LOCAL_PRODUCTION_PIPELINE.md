# Local production pipeline

AIONEX can generate a validated short-video package with local Ollama, render it with Remotion, and normalize it with FFmpeg. The pipeline is server-side and performs no publishing.

## Prerequisites

- Ollama listening on `http://127.0.0.1:11434`
- The `llama3.2` model installed
- `ffmpeg` and `ffprobe` available on `PATH`
- Project dependencies installed with `npm install`

Environment defaults and optional overrides are documented in `.env.example`. Ollama endpoints are restricted to HTTP loopback addresses.

## Dry run

```bash
npm run pipeline:dry-run
```

Use `-- --day=YYYY-MM-DD` for a predictable dated output directory. Outputs are written to `artifacts/local-pipeline/<day>/` and include the rendered video, validation metadata, and Telegram/YouTube preparation records.

The final video must be 1080×1920, about 30 seconds, H.264 with AAC audio, and large enough to reject placeholder renders. A 270×480 render is explicitly invalid. Telegram and YouTube records remain prepared but unpublished; YouTube defaults to private. X and TikTok adapters are intentionally disabled.

If local inference times out or fails schema validation, a factual fallback package keeps rendering available and records the warning in `metadata.json`. A successful Ollama verification reports `provider: "ollama"` and `fallback: false`.
