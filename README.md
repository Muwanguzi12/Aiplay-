# Riplay — powered by Aiplay

**Riplay** is an AI-powered creative studio for music, video and social storytelling. **Aiplay** is its video-generation engine.

> Your ideas. In another dimension.

## Studio experience

- Animated dark and light themes.
- Responsive creative-studio layout and motion effects.
- Prompt composer, aspect-ratio selection and quick-start directions.
- Visual inspiration gallery with source links.
- Reduced-motion accessibility support.
- Honest preview messaging: the interface does not claim AI generation is live.

## Stack

Next.js 15, React, TypeScript, Supabase Auth, and a Cloudflare Workers/D1/R2/Queues deployment foundation.

## Supabase Auth setup

1. Create a Supabase project and copy its Project URL and publishable key.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
3. In Supabase Authentication → URL Configuration, add your local and production app URLs to the allowed redirect URLs.
4. Enable Google as an OAuth provider in Supabase and configure its provider credentials in the Supabase dashboard.
5. For the Worker, set `SUPABASE_URL` and the Supabase publishable/anon key as encrypted Worker variables/secrets. The Worker validates each bearer access token against Supabase Auth `/auth/v1/user`; it never trusts a user ID supplied by the browser.
6. Configure the email provider and templates in Supabase before relying on email-link sign-in.

The browser uses the Supabase PKCE flow. The publishable key is intended for browser use; never put a service-role/secret key in `NEXT_PUBLIC_*` or commit it. Restrict redirect URLs to your own domains.

## Run locally

Requirements: Node.js 20.9+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project links

- [GitHub repository](https://github.com/Muwanguzi12/Aiplay-)
- [Cloudflare setup](docs/CLOUDFLARE_SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Aiplay engine](services/aiplay-engine/README.md)
- [Unsplash photography](https://unsplash.com)

## Production readiness

This repository has a Cloudflare deployment foundation and a restricted-beta identity gate. It is **not production-ready**. Remaining work:
1. Configure Cloudflare account resources, domains and environment variables.
2. Run type checks, builds, integration tests and staging deployment.
3. Configure Supabase project credentials, Google OAuth provider credentials, email delivery, and production redirect URLs.
4. Add durable rate limiting and per-user storage quotas.
5. Validate media signatures, dimensions, duration and safe content.
6. Connect and test a licensed AI video-generation provider.
7. Add monitoring, billing/cost limits, backups and incident procedures.

Never commit credentials. Obtain permission before using someone's voice or likeness. Social publishing must use official platform APIs and explicit user authorization.

## License

MIT — see [LICENSE](LICENSE).
