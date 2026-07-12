# AIONEX AI roadmap

## P0 — required before public launch

- Provision production Postgres and apply the checked-in migration.
- Configure and validate all required Vercel environment variables.
- Enable OpenAI billing/quota or explicitly keep scheduled generation disabled with `AUTO_PUBLISH=false`.
- Replace serverless in-memory admin login throttling with a durable rate limiter such as Vercel KV/Upstash.
- Add monitoring and alerts for cron failures, database errors, and Telegram delivery failures.
- Complete an independent security review of wallet and admin authentication flows.
- Track and remediate the remaining moderate `uuid`/wallet dependency advisories when upstream wallet packages release compatible fixes.
- Add legal pages, risk disclosures, privacy policy, and production support/security contacts.

## P1 — launch quality

- Add automated integration tests for API authorization, database CRUD, cron idempotency, and partial delivery retries.
- Add Playwright coverage for mobile navigation, admin review, and wallet modal behavior.
- Add a non-destructive production health check backed by dependency probes and protected diagnostics.
- Add Open Graph artwork and route-specific metadata for key product pages.
- Add database migration tooling and CI migration validation rather than relying on first-request schema setup.
- Add editorial audit history recording who approved or edited each post.
- Add trusted YouTube Data API verification for subscribe/watch/like/comment tasks.
- Add trusted Telegram membership/read-event verification and X follow/repost verification.
- Add server-originated AI chat events and signed daily quiz definitions/answer verification.
- Add admin claim review, AXP adjustment ledger controls, and risk-event investigation screens.

## P2 — post-launch resilience

- Add refresh-token management if X OAuth 2.0 is used instead of OAuth 1.0a.
- Add delivery queues with exponential backoff and dead-letter handling.
- Add analytics with a documented consent and retention policy.
- Add structured log forwarding, request correlation IDs, and operational dashboards.
- Add accessibility testing and performance budgets to CI.
