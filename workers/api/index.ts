import { createRemoteJWKSet, jwtVerify } from "jose";

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  GENERATION_QUEUE: Queue<GenerationMessage>;
  TEAM_DOMAIN: string;
  POLICY_AUD: string;
  ALLOWED_ORIGIN: string;
}

interface GenerationMessage {
  jobId: string;
  ownerId: string;
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  durationSeconds: 15 | 30 | 45 | 60;
}

interface AuthUser {
  id: string;
  email?: string;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, "image" | "audio" | "video"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video"
};

const json = (data: unknown, status = 200, origin = "*") =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "vary": "Origin"
    }
  });

async function authenticate(request: Request, env: Env): Promise<AuthUser | null> {
  if (!env.TEAM_DOMAIN || !env.POLICY_AUD) return null;
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return null;
  try {
    const issuer = new URL(env.TEAM_DOMAIN).origin;
    const jwks = createRemoteJWKSet(
      new URL("/cdn-cgi/access/certs", issuer)
    );
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: env.POLICY_AUD
    });
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    return {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined
    };
  } catch {
    return null;
  }
}

function corsHeaders(origin: string, env: Env): HeadersInit {
  const allowed = env.ALLOWED_ORIGIN || "";
  const accepted = origin === allowed ? origin : "null";
  return {
    "access-control-allow-origin": accepted,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, cf-access-jwt-assertion",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") ?? "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, service: "riplay-api", version: "0.2.0" }, 200, origin);
    }

    if (origin && origin !== env.ALLOWED_ORIGIN) {
      return json({ error: "origin_not_allowed" }, 403, origin);
    }

    const user = await authenticate(request, env);
    if (!user) return json({ error: "unauthorized" }, 401, origin);

    if (url.pathname === "/v1/projects" && request.method === "POST") {
      let body: { title?: unknown; aspectRatio?: unknown };
      try { body = await request.json() as typeof body; }
      catch { return json({ error: "invalid_json" }, 400, origin); }

      const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "Untitled project";
      const aspectRatio = body.aspectRatio;
      if (!["9:16", "16:9", "1:1"].includes(String(aspectRatio ?? "9:16"))) {
        return json({ error: "invalid_aspect_ratio" }, 400, origin);
      }

      const id = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO projects (id, owner_id, title, aspect_ratio) VALUES (?, ?, ?, ?)"
      ).bind(id, user.id, title || "Untitled project", aspectRatio ?? "9:16").run();
      return json({ id, title, aspectRatio: aspectRatio ?? "9:16" }, 201, origin);
    }

    if (url.pathname === "/v1/projects" && request.method === "GET") {
      const result = await env.DB.prepare(
        "SELECT id, title, aspect_ratio, created_at, updated_at FROM projects WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 100"
      ).bind(user.id).all();
      return json({ projects: result.results }, 200, origin);
    }

    if (url.pathname === "/v1/jobs" && request.method === "POST") {
      let body: { prompt?: unknown; aspectRatio?: unknown; durationSeconds?: unknown; projectId?: unknown };
      try { body = await request.json() as typeof body; }
      catch { return json({ error: "invalid_json" }, 400, origin); }

      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      const aspectRatio = body.aspectRatio;
      const durationSeconds = body.durationSeconds;
      const projectId = typeof body.projectId === "string" ? body.projectId : null;

      if (!prompt || prompt.length > 2000 ||
          !["9:16", "16:9", "1:1"].includes(String(aspectRatio ?? "")) ||
          ![15, 30, 45, 60].includes(Number(durationSeconds))) {
        return json({ error: "invalid_job_input" }, 400, origin);
      }
      if (projectId) {
        const owned = await env.DB.prepare(
          "SELECT id FROM projects WHERE id = ? AND owner_id = ?"
        ).bind(projectId, user.id).first();
        if (!owned) return json({ error: "project_not_found" }, 404, origin);
      }

      const jobId = crypto.randomUUID();
      const message: GenerationMessage = {
        jobId, ownerId: user.id, prompt,
        aspectRatio: aspectRatio as GenerationMessage["aspectRatio"],
        durationSeconds: Number(durationSeconds) as GenerationMessage["durationSeconds"]
      };

      await env.DB.prepare(
        `INSERT INTO generation_jobs
          (id, project_id, owner_id, prompt, aspect_ratio, duration_seconds, status)
         VALUES (?, ?, ?, ?, ?, ?, 'queued')`
      ).bind(jobId, projectId, user.id, prompt, message.aspectRatio, message.durationSeconds).run();

      try {
        await env.GENERATION_QUEUE.send(message);
      } catch {
        await env.DB.prepare(
          "UPDATE generation_jobs SET status = 'failed', error_code = 'queue_unavailable', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
        ).bind(jobId).run();
        return json({ error: "queue_unavailable" }, 503, origin);
      }
      return json({ id: jobId, status: "queued" }, 202, origin);
    }

    const jobMatch = url.pathname.match(/^\/v1\/jobs\/([0-9a-f-]{36})$/i);
    if (jobMatch && request.method === "GET") {
      const row = await env.DB.prepare(
        `SELECT id, status, provider, output_asset_key, error_code, created_at, updated_at
         FROM generation_jobs WHERE id = ? AND owner_id = ?`
      ).bind(jobMatch[1], user.id).first();
      return row ? json(row, 200, origin) : json({ error: "not_found" }, 404, origin);
    }

    if (url.pathname === "/v1/assets" && request.method === "POST") {
      const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const mediaType = ALLOWED_TYPES[contentType];
      const length = Number(request.headers.get("content-length") ?? 0);
      if (!mediaType || !request.body || !Number.isFinite(length) ||
          length <= 0 || length > MAX_UPLOAD_BYTES) {
        return json({ error: "unsupported_file_or_size", maxBytes: MAX_UPLOAD_BYTES }, 400, origin);
      }

      const projectId = url.searchParams.get("projectId");
      if (projectId) {
        const owned = await env.DB.prepare(
          "SELECT id FROM projects WHERE id = ? AND owner_id = ?"
        ).bind(projectId, user.id).first();
        if (!owned) return json({ error: "project_not_found" }, 404, origin);
      }

      const assetId = crypto.randomUUID();
      const objectKey = `users/${encodeURIComponent(user.id)}/assets/${assetId}`;
      let receivedBytes = 0;
      const limitedBody = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          receivedBytes += chunk.byteLength;
          if (receivedBytes > MAX_UPLOAD_BYTES || receivedBytes > length) {
            throw new Error("upload_size_limit_exceeded");
          }
          controller.enqueue(chunk);
        }
      }));

      try {
        await env.MEDIA.put(objectKey, limitedBody, {
          httpMetadata: { contentType },
          customMetadata: { ownerId: user.id, assetId }
        });
        if (receivedBytes !== length) {
          await env.MEDIA.delete(objectKey);
          return json({ error: "content_length_mismatch" }, 400, origin);
        }
      } catch {
        await env.MEDIA.delete(objectKey).catch(() => undefined);
        return json({ error: "storage_unavailable_or_size_limit" }, 413, origin);
      }

      try {
        await env.DB.prepare(
        `INSERT INTO media_assets
          (id, owner_id, project_id, object_key, media_type, content_type, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(assetId, user.id, projectId, objectKey, mediaType, contentType, length).run();
      } catch {
        await env.MEDIA.delete(objectKey).catch(() => undefined);
        return json({ error: "asset_record_failed" }, 503, origin);
      }

      return json({ id: assetId, mediaType, contentType, sizeBytes: length }, 201, origin);
    }

    const assetMatch = url.pathname.match(/^\/v1\/assets\/([0-9a-f-]{36})$/i);
    if (assetMatch && request.method === "GET") {
      const asset = await env.DB.prepare(
        "SELECT object_key, content_type FROM media_assets WHERE id = ? AND owner_id = ?"
      ).bind(assetMatch[1], user.id).first<{ object_key: string; content_type: string }>();
      if (!asset) return json({ error: "not_found" }, 404, origin);
      const object = await env.MEDIA.get(asset.object_key);
      if (!object) return json({ error: "not_found" }, 404, origin);
      const headers = new Headers(cors);
      headers.set("content-type", asset.content_type);
      headers.set("cache-control", "private, no-store");
      headers.set("content-length", String(object.size));
      return new Response(object.body, { headers });
    }

    return json({ error: "not_found" }, 404, origin);
  },

  async queue(batch: MessageBatch<GenerationMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      // Provider adapter is not configured yet. Do not fake a successful render.
      console.log("Generation job awaiting provider configuration", {
        jobId: message.body.jobId
      });
      message.retry({ delaySeconds: 60 });
    }
  }
} satisfies ExportedHandler<Env, GenerationMessage>;
