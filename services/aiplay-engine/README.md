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

## Current status

This folder documents the architecture only. No live video model endpoint is connected yet. Provider selection must follow current API availability, licensing, commercial terms, safety controls and measured output quality.
