# Cloudflare setup

## Web app deployment (OpenNext)

The Next.js web app is deployed to Cloudflare Workers using OpenNext. A plain `next build` is not sufficient: it does not create the `.open-next` worker bundle required by Wrangler.

In Cloudflare Workers Builds, use:

- **Build command:** `npm run cf:build:web`
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** repository root
- **Build output directory:** leave unset; Wrangler deploys the worker configured in `wrangler.jsonc`.

The repository's `wrangler.jsonc` points to `.open-next/worker.js` and `.open-next/assets`. The OpenNext build command must run before Wrangler deploy.

For local preview and deployment:

```bash
npm install
npx wrangler login
npm run cf:preview:web
npm run cf:deploy:web
```

## Supabase identity

The web app uses Supabase Auth with PKCE magic-link and Google OAuth flows. Configure the Supabase project URL and publishable key for the web app, and configure the Worker with `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the publishable/anon key is not a service-role secret).

In Supabase Authentication → URL Configuration, add the local and production app URLs to the allowed redirect URLs. Configure email delivery and enable Google only after adding valid provider credentials. Never expose a service-role or `sb_secret_…` key in browser code.

The API Worker validates bearer access tokens with Supabase Auth and scopes project, job and asset access to the verified Supabase user ID. Do not trust user IDs supplied by the browser.

## Cloudflare API resources

Create:
- D1 database `riplay-db`
- R2 bucket `riplay-media`
- Queue `riplay-generation`
- Dead-letter Queue `riplay-generation-dlq`

Replace the D1 database ID in `wrangler.api.jsonc`, then apply migrations:

```bash
npx wrangler d1 migrations apply riplay-db --remote --config wrangler.api.jsonc
```

## API capabilities

- `GET /health` — public health check.
- `GET /v1/projects`, `POST /v1/projects` — authenticated, owner-scoped projects.
- `POST /v1/jobs`, `GET /v1/jobs/:id` — authenticated generation job creation/status.
- `POST /v1/assets?projectId=<optional-id>` — authenticated binary upload to private R2.
- `GET /v1/assets/:id` — authenticated, owner-scoped media retrieval.

Uploads are limited to 25 MiB and an allowlist of image/audio/video MIME types. Objects use server-generated keys and are private by default. The Worker streams uploads into R2 rather than exposing bucket credentials or public object URLs.

## Important limits before public launch

- Add rate limits, per-user storage quotas, content scanning, media duration/dimension checks and abuse reporting before opening uploads broadly.
- The queue consumer deliberately retries while no real generation provider is configured; AI generation is not live yet.
- Browser upload uses the Worker as a streaming proxy. For large media, consider short-lived R2 presigned PUT URLs with strict content-type and object-key constraints. R2 presigned URLs are bearer credentials and must be kept short-lived.
- Configure the R2 bucket's CORS only for the intended web origin if direct browser-to-R2 uploads are later enabled.
