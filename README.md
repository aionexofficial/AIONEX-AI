This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Daily publishing automation

The production workflow generates one Web3 post at 09:00 UTC daily, stores it in Postgres, publishes it on `/news`, and sends it to Telegram and X. It is idempotent per UTC day and does not resend successful channel deliveries.

Configure the variables in `.env.example` in Vercel. Add Neon Postgres through the Vercel Marketplace, make the Telegram bot an administrator of `@aionexweb3`, and create X OAuth 1.0a user credentials with Read/Write access. Set a strong `CRON_SECRET`; Vercel sends it to the cron route as a bearer token. Open `/admin/posts` to generate, edit, approve, publish, or retry posts. Set `AUTO_PUBLISH=false` to require approval for every scheduled post. The table is created safely on first use.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
