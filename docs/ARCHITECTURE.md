# Riplay Architecture

## Product layers

- **Riplay Studio:** prompt, storyboard, timeline, preview and export experience.
- **Aiplay:** asynchronous video-generation orchestration.
- **Music and voice services:** provider adapters for licensed generation or user-provided media.
- **Media pipeline:** validation, private storage, transcoding, thumbnails and export variants.
- **Social publisher:** separate OAuth connections and publishing adapters for each supported platform.

## Request flow

1. Browser sends a validated creation request to Riplay's server.
2. Server checks user authorization, quotas and request limits.
3. Aiplay creates a job and schedules background work.
4. A provider adapter submits the generation request and polls or receives status updates.
5. Completed media is validated and stored in private object storage.
6. Studio displays a preview; the creator explicitly chooses whether to export or publish.

## Initial infrastructure direction

- Next.js web application.
- Cloudflare Workers for edge/server execution.
- Cloudflare R2 for private media objects.
- A durable queue/workflow for long-running generation jobs.
- Supabase may be used for authentication and relational project metadata if that remains the chosen identity/data layer.

The exact deployment wiring will be added after the local app baseline is verified against current Cloudflare/OpenNext documentation.

## Social integrations

Each platform must have its own adapter, OAuth consent flow, token refresh strategy and permission review. Publishing is always user-initiated. Never collect social account passwords. Start with export/download and add platform publishing only after official API access is approved.

## Security and privacy

- Keep API keys and OAuth secrets in encrypted environment secrets.
- Use private object storage and short-lived signed access URLs.
- Validate MIME type, size and media duration on upload.
- Apply quotas, rate limits and cost ceilings to generation jobs.
- Record consent for voice or likeness use.
- Provide deletion controls for projects and uploaded media.
- Do not claim model support for a language or accent until tested with consenting speakers.
