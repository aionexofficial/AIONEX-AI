# AIONEX AI

Production-oriented Next.js 16 Web3 social rewards platform for the official AIONEX ecosystem.

- Website: https://aionex-ai.vercel.app
- Telegram: https://t.me/aionexweb3
- YouTube: https://www.youtube.com/@AIONEXAIOfficial

X and TikTok integrations are reserved for future use and are currently disabled.

## Local verification

```bash
npm ci
npm run db:migrate
npm run lint
npm run typecheck
npm run build
npm run check:production-env
npm run pipeline:dry-run
```

Copy `.env.example` to `.env.local` and provide real secrets. Never commit environment files.

## Operations

- `/admin/posts` manages scheduled publishing.
- `/admin/rewards` manages rewards, tasks, users, and mining settings.
- `/admin/social` manages official social destinations and verification records.
- `/admin/claims` moderates provider/manual claims.
- `/api/health` reports database migration and required-runtime configuration readiness without exposing secrets.
- `/api/telegram/webhook` is protected by Telegram's secret-token header.
- `/api/cron/daily-post` is protected by `CRON_SECRET` and scheduled through `vercel.json`.

PostgreSQL migrations are applied in filename order by `npm run db:migrate`. Reward points and XP are awarded through an idempotent append-only ledger.

X and YouTube task claims are never automatically trusted without provider OAuth. They remain pending for trusted provider integration or explicit administrator review.

See [docs/LOCAL_PRODUCTION_PIPELINE.md](docs/LOCAL_PRODUCTION_PIPELINE.md) for the local Ollama, Remotion, and FFmpeg workflow.
