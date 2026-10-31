# Cloudflare setup

## Identity for the private beta

The API now validates Cloudflare Access JWTs using the issuer's public JWKS and the configured audience. This is suitable for a restricted beta behind Cloudflare Access; it is **not** a public creator sign-in experience. Before public launch, replace or extend this gate with a consumer identity provider and preserve the same verified-subject ownership model.

1. Create a Cloudflare Access self-hosted application for the API.
2. Restrict its policy to approved beta testers.
3. Copy the team domain and Application Audience (AUD) tag into `wrangler.api.jsonc`.
4. Set `ALLOWED_ORIGIN` to the exact web app origin.
5. Ensure the web app's requests reach the API with a valid `Cf-Access-Jwt-Assertion` header. Do not accept a user ID supplied in request JSON as proof of identity.

The Worker verifies JWT signature, issuer, audience and subject. Every project, job and asset query is scoped to that verified subject.

## Cloudflare resources

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

## Deploy

```bash
npm install
npx wrangler login
npm run cf:deploy:api
```

## Important limits before public launch

- Cloudflare Access is currently the beta identity gate. Add consumer login (OIDC/OAuth) before public onboarding.
- Add rate limits, per-user storage quotas, content scanning, media duration/dimension checks and abuse reporting before opening uploads broadly.
- The queue consumer deliberately retries while no real generation provider is configured.
- Browser upload uses the Worker as a streaming proxy. For large media, consider short-lived R2 presigned PUT URLs with strict content-type and object-key constraints. R2 presigned URLs are bearer credentials and must be kept short-lived.
- Configure the R2 bucket's CORS only for the intended web origin if direct browser-to-R2 uploads are later enabled.

Cloudflare references:
- [Validate Cloudflare Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [R2 presigned URLs and upload security](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
