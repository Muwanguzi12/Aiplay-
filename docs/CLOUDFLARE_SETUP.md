# Cloudflare setup

This repository uses two Workers:

- `riplay-web`: the existing Next.js 15 web studio, deployed with the Cloudflare OpenNext adapter.
- `riplay-api`: a separate TypeScript Worker for job creation/status, D1, R2 and Queue bindings.

Cloudflare currently recommends vinext for new Next.js-on-Workers projects. This repository is on Next.js 15.5, so this first deployment layer uses the documented OpenNext maintenance path rather than attempting an untested framework migration. Revisit vinext after compatibility testing.

## 1. Prerequisites

- Node.js 20.9 or later
- A Cloudflare account
- Access to the Cloudflare account's Workers, D1, R2 and Queues products

## 2. Install dependencies

```bash
npm install
```

## 3. Create Cloudflare resources

Create a D1 database named `riplay-db`, an R2 bucket named `riplay-media`, a Queue named `riplay-generation`, and a dead-letter Queue named `riplay-generation-dlq`.

Then update `wrangler.api.jsonc`:
- Replace `REPLACE_WITH_D1_DATABASE_ID` with the D1 database ID.
- Confirm the R2 and Queue names match the resources created in your account.

Apply the schema:

```bash
npx wrangler d1 migrations apply riplay-db --remote --config wrangler.api.jsonc
```

## 4. Configure secrets

Set the API's server-to-server token as a Worker secret. Do not put it in source control or in a browser-exposed `NEXT_PUBLIC_*` variable.

```bash
npx wrangler secret put RIPLAY_API_TOKEN --config wrangler.api.jsonc
```

The current API token gate is a temporary service-to-service boundary, not end-user authentication. Before exposing project/job endpoints to the public web app, implement user sign-in and verify the user's identity and ownership on every request. Never ship the shared token to the browser.

## 5. Local development

```bash
npm run dev
npx wrangler dev --config wrangler.api.jsonc
```

The API health endpoint is `/health`. Protected endpoints require the server-to-server bearer token.

## 6. Deploy

Authenticate Wrangler interactively on your own machine:

```bash
npx wrangler login
npm run cf:deploy:api
npm run cf:deploy:web
```

Web deployment uses the OpenNext adapter. API deployment uses `wrangler.api.jsonc`.

## Current limitations

- The queue consumer intentionally does not call a model yet. It retries messages until a real provider adapter is configured; no fake success response is returned.
- The API is not ready for public end-user traffic until real authentication, per-user authorization, rate limiting, request quotas and provider cost controls are added.
- R2 upload/download endpoints and signed upload URLs are not implemented yet.
- Social publishing is not implemented. Future integrations must use official platform authorization flows.
- Replace the example CORS origin in `workers/api/index.ts` with the actual deployed web origin before browser integration.

## Operational security

Store provider credentials with Worker secrets. Keep media private by default, validate MIME type and size, and issue short-lived upload/download authorization only after checking asset ownership.
