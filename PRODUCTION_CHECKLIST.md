# AIONEX AI production readiness checklist

## Required before deployment

- [ ] Configure `AUTH_SECRET` with at least 32 random characters in Vercel Production.
- [ ] Configure `ADMIN_USERNAME`, `ADMIN_EMAIL`, and a scrypt `ADMIN_PASSWORD_HASH`.
- [ ] Configure `DATABASE_URL` using a production Postgres/Neon connection.
- [ ] Apply `db/migrations/001_automation_posts.sql` to the production database.
- [ ] Apply `db/migrations/002_rewards_ecosystem.sql` and verify AXP ledger constraints.
- [ ] Configure a strong, independent `CRON_SECRET`.
- [ ] Configure `TELEGRAM_BOT_TOKEN`; ensure the bot is an administrator of `@aionexweb3`.
- [ ] Configure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` and `NEXT_PUBLIC_SITE_URL`.
- [ ] Decide whether scheduled AI generation will use OpenAI or remain disabled until quota is available.
- [ ] Set `AUTO_PUBLISH=false` until editorial and delivery monitoring are approved.
- [ ] Add X user credentials only when X publishing is ready; Telegram and website delivery remain independently tracked.

## Deployment verification

- [ ] Run `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build`.
- [ ] Run `npm run check:production-env` in the deployment environment.
- [ ] Confirm `/`, `/robots.txt`, and `/sitemap.xml` return HTTP 200.
- [ ] Confirm `/admin` redirects unauthenticated users to `/admin/login`.
- [ ] Confirm invalid admin credentials return 401 and valid credentials create a secure, HTTP-only session.
- [ ] Confirm `/api/admin/posts` rejects unauthenticated requests.
- [ ] Confirm `/api/cron/daily-post` rejects requests without `Authorization: Bearer $CRON_SECRET`.
- [ ] Confirm the production database accepts a create/read/update cycle using a disposable draft.
- [ ] Confirm Telegram bot identity and a controlled test delivery to `@aionexweb3`.
- [ ] Configure `TELEGRAM_WEBHOOK_SECRET`, register `/api/telegram/webhook`, and test account linking.
- [ ] Verify concurrent mining requests award once and enforce the full 24-hour cooldown.
- [ ] Verify daily streak rollover, referral idempotency, task review, badges, and leaderboard ordering.
- [ ] Confirm Ethereum and Solana wallet modals on desktop and mobile with real wallet extensions/apps.
- [ ] Verify 320 px, 375 px, 768 px, 1024 px, and 1440 px layouts.
- [ ] Review Vercel function logs after cron execution and configure alerting for errors.

## Launch controls

- [ ] Enable Vercel deployment protection for preview environments.
- [ ] Restrict production environment-variable access to the production branch.
- [ ] Configure domain, HTTPS, DNS, and canonical `NEXT_PUBLIC_SITE_URL`.
- [ ] Add uptime monitoring for the homepage and cron delivery.
- [ ] Add database backups and test restoration.
- [ ] Complete privacy policy, terms, risk disclosures, and security contact details.
- [ ] Perform dependency and application security review before handling real funds.
