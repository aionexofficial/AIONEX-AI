# AIONEX Rewards & Mining architecture

## Product boundary

AIONEX Points (AXP) are non-transferable engagement points with no monetary value. The rewards subsystem contains no token balances, contract addresses, conversion rates, withdrawals, claims, or on-chain distribution. A future token integration must consume separately approved eligibility snapshots; it must never reinterpret `axp_balance` as a token liability.

## Identity and channels

- `reward_users` is the shared account and AXP owner.
- `reward_identities` links verified EVM wallets and Telegram user IDs to one account.
- Website wallet authentication uses a short-lived nonce and EIP-191 signature.
- Telegram Mini App authentication validates Telegram `initData` using the bot token.
- A website user can generate a 15-minute one-use link code and open `https://t.me/AIONEXAIBot?start=link_CODE` to merge Telegram into the same account.
- The Telegram webhook requires `X-Telegram-Bot-Api-Secret-Token` and never accepts a bot token from a request.

## AXP accounting

`reward_point_ledger` is the append-only source of every AXP change. Each award has a globally unique idempotency key. Cached totals on `reward_users` are updated only from a successfully inserted ledger row. Mining and daily login operations use atomic SQL CTEs so concurrent requests cannot bypass cooldowns.

Default configurable values:

- Mining: `REWARDS_MINING_AXP=100`, once per 24 hours.
- Daily login: `REWARDS_LOGIN_AXP=20`, plus 5 AXP per streak day up to day 7.
- Referrer: `REWARDS_REFERRER_AXP=100`.
- Referred user: `REWARDS_REFERRED_AXP=50`.

## Task verification

Task definitions choose a category, repeat policy, verification mode, reward, availability window, and JSON verification configuration. Website and verified-wallet tasks can be awarded synchronously. YouTube, Telegram, X, AI chat, and quiz claims remain pending unless a trusted server integration verifies the evidence. Admins can enable, disable, edit, and delete tasks through protected routes.

## Anti-cheat controls

- Unique claim keys prevent duplicate once/daily claims.
- Repeated duplicate attempts create risk events and raise the user risk score.
- Scores at or above 60 move accounts to review, excluding them from active earning and leaderboard placement.
- Admin statistics expose pending claims and flagged users.
- Provider secrets remain server-only; client claims cannot select reward amounts.

## Deployment

1. Apply `db/migrations/001_automation_posts.sql` and `db/migrations/002_rewards_ecosystem.sql`.
2. Configure the environment variables documented in `.env.example`.
3. Set the Telegram webhook to `/api/telegram/webhook` and pass `TELEGRAM_WEBHOOK_SECRET` as `secret_token`.
4. Create tasks at `/admin/rewards` and keep high-risk social tasks disabled until their verifier is connected.
5. Verify mining concurrency, daily boundary behavior, referrals, task review, and leaderboard queries against a staging database.
