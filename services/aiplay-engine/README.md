# Aiplay Engine

Aiplay is the video-generation engine inside Riplay. It is designed around asynchronous jobs because generative video requests can take longer than a normal web request.

## Job lifecycle

`queued → processing → succeeded | failed | cancelled`

A job should record its provider, model, prompt, requested aspect ratio, duration, timestamps, safe error code and output asset reference. Never store provider secrets in a job record.

## Provider boundary

The engine must call model providers through an adapter interface. Provider-specific request formats, polling, rate limits and response parsing stay inside each adapter. The web app should not call a model provider directly with a secret key.

## First implementation milestones

1. Validate prompt and requested output settings.
2. Create a job record and return its ID immediately.
3. Queue provider work and update job status.
4. Store generated output in private object storage.
5. Return a time-limited authorized preview URL.
6. Add retry limits, timeouts, cost tracking and user-visible failure reasons.

## NVIDIA Cosmos3 Nano adapter

The Cloudflare Queue consumer now submits text-to-video jobs to NVIDIA's hosted Cosmos3 Nano endpoint, decodes the returned base64 MP4, stores it in private R2 and updates the job row. The adapter requires the `NVIDIA_API_KEY` Worker secret and optionally accepts `NVIDIA_API_URL` as an account-specific endpoint override.

The hosted adapter currently targets 480p at 24 FPS and is limited to 297 frames (about 12.4 seconds) per generated clip. It is a single-shot text-to-video path; image-to-video, multi-shot stitching, music/audio generation, provider billing controls and production observability remain to be implemented and tested. A configured secret and successful live NVIDIA request are required before calling the engine operational.
