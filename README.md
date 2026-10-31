# Riplay — powered by Aiplay

**Riplay** is an AI-powered creative studio for music, video and social publishing. **Aiplay** is its video-generation engine.

> Your imagination. Your sound. Your visual story.

## Product direction

Riplay is being designed to help creators turn an idea into a short, polished video: describe the concept, develop a storyboard, generate or upload media, arrange scenes, preview the result, and export it for social platforms.

A core product focus is authentic African creativity: regional storytelling, music styles, languages and voice experiences. These capabilities must be validated with consenting native speakers before being advertised as supported.

## Current status

This repository is the initial foundation. The first milestone is a responsive web studio shell and a provider-neutral Aiplay job contract. Live model generation, media rendering, user accounts, storage and social publishing are not yet implemented.

## Planned architecture

- **Web studio:** Next.js + TypeScript.
- **Aiplay API:** asynchronous generation jobs with status and result records.
- **AI provider adapters:** model-specific integrations behind a common interface.
- **Media pipeline:** validate, store, assemble and export user-authorized assets.
- **Cloud infrastructure:** Cloudflare Workers and R2 are the intended deployment direction.
- **Social publishing:** official platform APIs and OAuth authorization only.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [services/aiplay-engine/README.md](services/aiplay-engine/README.md).

## Local development

Requirements: Node.js 20.9+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env.local` when local environment configuration is needed. Never commit real API keys, OAuth secrets, access tokens or passwords.

## Roadmap

1. [x] Establish the repository and product architecture.
2. [x] Add the initial Riplay studio shell.
3. [x] Define the provider-neutral Aiplay job contract.
4. [ ] Add authentication and project persistence.
5. [ ] Add a real, licensed video-generation provider.
6. [ ] Add secure media storage and asynchronous rendering.
7. [ ] Add export presets and publishing integrations.
8. [ ] Test African language and voice experiences with consenting speakers.

## Responsible use

Only upload media you own or have permission to use. Obtain clear permission before using someone's likeness or voice. Social publishing must be an explicit user action, with platform permissions and terms respected.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
