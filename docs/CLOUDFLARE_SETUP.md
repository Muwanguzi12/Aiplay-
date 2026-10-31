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

## NVIDIA Cosmos3 Nano provider

The API Worker includes a provider adapter for NVIDIA's hosted Cosmos3 Nano text-to-video endpoint. Store the API key as an encrypted Worker secret:

```bash
npx wrangler secret put NVIDIA_API_KEY --config wrangler.api.jsonc
```

Do not add the key to `vars`, source files, GitHub Actions logs, or browser environment variables. The default endpoint is `https://ai.api.nvidia.com/v1/cosmos/nvidia/cosmos3-nano`. If NVIDIA has issued a different invocation URL for your account, configure `NVIDIA_API_URL` as a Worker variable. The adapter submits `text2video`, receives `b64_video`, and writes the MP4 to private R2. The studio needs `NEXT_PUBLIC_AIPLAY_API_URL` set to the deployed API Worker URL.

The current hosted adapter uses 480p and 24 FPS, with NVIDIA's 297-frame limit (about 12.4 seconds maximum per clip). The existing 15–60 second UI request is capped to the endpoint's supported maximum; the job response reports the actual clip duration. Longer multi-shot editing and image-to-video are future work. NVIDIA controls preview endpoint eligibility, throttling and availability.

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
- `POST /v1/jobs`, `GET /v1/jobs/:id` — authenticated generation job creation/status, including the private output asset ID and actual clip duration.
- `POST /v1/assets?projectId=<optional-id>` — authenticated binary upload to private R2.
- `GET /v1/assets/:id` — authenticated, owner-scoped media retrieval.

Uploads are limited to 25 MiB and an allowlist of image/audio/video MIME types. Objects use server-generated keys and are private by default. The Worker streams uploads into R2 rather than exposing bucket credentials or public object URLs.

## Important limits before public launch

- Add rate limits, per-user storage quotas, content scanning, media duration/dimension checks and abuse reporting before opening uploads broadly.
- The queue consumer invokes NVIDIA Cosmos3 Nano and stores successful MP4 output in private R2. Generation remains unavailable until `NVIDIA_API_KEY` is configured and the hosted endpoint is enabled for the account.
- Browser upload uses the Worker as a streaming proxy. For large media, consider short-lived R2 presigned PUT URLs with strict content-type and object-key constraints. R2 presigned URLs are bearer credentials and must be kept short-lived.
- Configure the R2 bucket's CORS only for the intended web origin if direct browser-to-R2 uploads are later enabled.
