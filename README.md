

This project uses several external services (Stripe, Pinecone, Google Gemini, Vonage Video API, Clerk, and a database via Prisma). To run the app locally or in production, you need to provide environment variables and API keys.

## Required Environment Variables

Add these variables to a `.env` file at the project root . See `.env.example` for a ready-to-copy template.

- **Database**
	- `DATABASE_URL`: Connection string for your DB (Postgres/MySQL/etc.). Used by Prisma.

- **Stripe**
	- `STRIPE_SECRET_KEY`: Server-side Stripe API key used for Checkout and webhooks.
	- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret from your Stripe webhook endpoint.
	- `NEXT_PUBLIC_APP_URL`: Public base URL for redirect success/cancel (e.g., `http://localhost:3000`).

- **Pinecone**
	- `PINECONE_API_KEY`: Pinecone API key to query the vector index.
	- `PINECONE_INDEX`: Pinecone index name (defaults to `medical-chatbot` in code; ensure this exists or update).

- **Gemini (Google Generative AI)**
	- `GEMINI_API_KEY`: API key for Google Generative AI used by the chat assistant.

- **Vonage Video API**
	- `NEXT_PUBLIC_VONAGE_APPLICATION_ID`: Vonage application ID (exposed client-side for session init).
	- `VONAGE_PRIVATE_KEY`: PEM private key (contents) for the Vonage application used server-side.

- **Clerk (Authentication)**
	- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Client-side publishable key for Clerk.
	- `CLERK_SECRET_KEY`: Server-side secret key for Clerk.

## Where Variables Are Used (File References)

- `prisma/schema.prisma`: `DATABASE_URL`
- `lib/stripe.ts`: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`
- `app/api/webhook/stripe/route.js`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `lib/pinecone.js`: `PINECONE_API_KEY`, `PINECONE_INDEX`
- `app/api/chat/route.js`: `GEMINI_API_KEY`
- `actions/appointments.js`: `NEXT_PUBLIC_VONAGE_APPLICATION_ID`, `VONAGE_PRIVATE_KEY`
- `app/(main)/video-call/video-call-ui.jsx`: `NEXT_PUBLIC_VONAGE_APPLICATION_ID`
- `middleware.js` & Clerk usage: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

Note: `lib/embeddings.js` calls a hosted embeddings endpoint and does not require an API key in this repo. Ensure the endpoint is reachable or replace it with your own.

## Quickstart (Windows PowerShell)

1. Create your `.env` from `.env.example` and fill in values.
2. Install dependencies and set up Prisma:

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
```

3. Run the app:

```powershell
npm run dev
```

### Optional: Set Environment Variables Per-Session (without `.env`)

```powershell
$env:DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public"
$env:STRIPE_SECRET_KEY="sk_test_..."
$env:STRIPE_WEBHOOK_SECRET="whsec_..."
$env:NEXT_PUBLIC_APP_URL="http://localhost:3000"
$env:PINECONE_API_KEY="pcn_..."
$env:PINECONE_INDEX="medical-chatbot"
$env:GEMINI_API_KEY="AIza..."
$env:NEXT_PUBLIC_VONAGE_APPLICATION_ID="app-id"
$env:VONAGE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----`n...`n-----END PRIVATE KEY-----"
$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
$env:CLERK_SECRET_KEY="sk_test_..."
npm run dev
```

## Notes & Tips

- Ensure your Pinecone index (`PINECONE_INDEX`) exists; the chat route expects `medical-chatbot` unless you update it.
- For Stripe webhooks during local development, use a tunnel (e.g., `stripe listen`) and set `STRIPE_WEBHOOK_SECRET` accordingly.
- Vonage `VONAGE_PRIVATE_KEY` should be the full PEM content; keep it secure.
- Clerk keys are required even if not explicitly referenced in code; `@clerk/nextjs` and middleware rely on them.

