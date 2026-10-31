interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  GENERATION_QUEUE: Queue<GenerationMessage>;
  RIPLAY_API_TOKEN: string;
}

interface GenerationMessage {
  jobId: string;
  ownerId: string;
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  durationSeconds: 15 | 30 | 45 | 60;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "https://riplay.example",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type"
    }
  });

function authorized(request: Request, env: Env): boolean {
  const header = request.headers.get("authorization") ?? "";
  return Boolean(env.RIPLAY_API_TOKEN) &&
    header === `Bearer ${env.RIPLAY_API_TOKEN}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "https://riplay.example",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "authorization, content-type",
          "access-control-max-age": "86400"
        }
      });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, service: "riplay-api", version: "0.1.0" });
    }

    if (!authorized(request, env)) {
      return json({ error: "unauthorized" }, 401);
    }

    if (url.pathname === "/v1/jobs" && request.method === "POST") {
      let body: Partial<GenerationMessage>;
      try {
        body = await request.json() as Partial<GenerationMessage>;
      } catch {
        return json({ error: "invalid_json" }, 400);
      }

      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      const aspectRatio = body.aspectRatio;
      const durationSeconds = body.durationSeconds;
      const ownerId = typeof body.ownerId === "string" ? body.ownerId.trim() : "";

      if (!prompt || prompt.length > 2000 || !ownerId ||
          !["9:16", "16:9", "1:1"].includes(aspectRatio ?? "") ||
          ![15, 30, 45, 60].includes(durationSeconds ?? 0)) {
        return json({ error: "invalid_job_input" }, 400);
      }

      const jobId = crypto.randomUUID();
      const message: GenerationMessage = {
        jobId, ownerId, prompt,
        aspectRatio: aspectRatio as GenerationMessage["aspectRatio"],
        durationSeconds: durationSeconds as GenerationMessage["durationSeconds"]
      };

      await env.DB.prepare(
        `INSERT INTO generation_jobs
          (id, owner_id, prompt, aspect_ratio, duration_seconds, status)
         VALUES (?, ?, ?, ?, ?, 'queued')`
      ).bind(jobId, ownerId, prompt, message.aspectRatio, message.durationSeconds).run();

      try {
        await env.GENERATION_QUEUE.send(message);
      } catch {
        await env.DB.prepare(
          "UPDATE generation_jobs SET status = 'failed', error_code = 'queue_unavailable', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
        ).bind(jobId).run();
        return json({ error: "queue_unavailable" }, 503);
      }

      return json({ id: jobId, status: "queued" }, 202);
    }

    const match = url.pathname.match(/^\/v1\/jobs\/([0-9a-f-]{36})$/i);
    if (match && request.method === "GET") {
      const row = await env.DB.prepare(
        `SELECT id, status, provider, output_asset_key, error_code, created_at, updated_at
         FROM generation_jobs WHERE id = ?`
      ).bind(match[1]).first();
      return row ? json(row) : json({ error: "not_found" }, 404);
    }

    return json({ error: "not_found" }, 404);
  },

  async queue(batch: MessageBatch<GenerationMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      // Provider execution is deliberately not simulated. Connect a verified
      // provider adapter here; until then, leave jobs queued for explicit setup.
      console.log("Generation job awaiting provider configuration", {
        jobId: message.body.jobId
      });
      message.retry({ delaySeconds: 60 });
    }
  }
} satisfies ExportedHandler<Env, GenerationMessage>;
