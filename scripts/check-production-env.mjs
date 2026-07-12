const required = [
  "AUTH_SECRET",
  "ADMIN_USERNAME",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD_HASH",
  "DATABASE_URL",
  "CRON_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
  "NEXT_PUBLIC_SITE_URL",
  "AUTO_PUBLISH",
];

const missing = required.filter((name) => !process.env[name]?.trim());
const hasXOAuth1 = ["X_CONSUMER_KEY", "X_CONSUMER_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"].every((name) => process.env[name]?.trim());
const aiMode = process.env.OPENAI_API_KEY?.trim() ? "OpenAI key configured (quota/runtime access must be verified separately)" : "local assistant only; scheduled generation unavailable";

console.log(`Production environment: ${missing.length ? "INCOMPLETE" : "BASE READY"}`);
for (const name of missing) console.log(`Missing: ${name}`);
if (!hasXOAuth1 && !process.env.X_USER_ACCESS_TOKEN?.trim()) console.log("Optional integration missing: X user authentication");
console.log(`AI mode: ${aiMode}`);
process.exitCode = missing.length ? 1 : 0;
