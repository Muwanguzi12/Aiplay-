export interface Cosmos3Request {
  apiKey?: string;
  endpoint?: string;
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  frames: number;
  fps: number;
}

export async function generateCosmos3NanoVideo(input: Cosmos3Request): Promise<Uint8Array> {
  if (!input.apiKey) throw new Error("nvidia_api_key_missing");
  const response = await fetch(input.endpoint || "https://ai.api.nvidia.com/v1/cosmos/nvidia/cosmos3-nano", {
    method: "POST",
    headers: { authorization: `Bearer ${input.apiKey}`, accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      model_mode: "text2video",
      prompt: input.prompt,
      resolution: `480_${input.aspectRatio.replace(":", "_")}`,
      num_frames: input.frames,
      num_inference_steps: 35,
      fps: input.fps,
      seed: Math.floor(Math.random() * 2147483647)
    }),
    signal: AbortSignal.timeout(12 * 60 * 1000)
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1200);
    console.error("NVIDIA generation request failed", { status: response.status, detail });
    if (response.status === 429 || response.status >= 500) throw new Error("nvidia_provider_retryable");
    throw new Error(response.status === 401 || response.status === 403 ? "nvidia_auth_failed" : "nvidia_request_rejected");
  }
  const payload = await response.json() as { b64_video?: unknown };
  if (typeof payload.b64_video !== "string" || !payload.b64_video.length) throw new Error("nvidia_empty_video_response");
  const binary = atob(payload.b64_video);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface FalKlingRequest {
  apiKey: string;
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
}
const FAL_MODEL = "fal-ai/kling-video/v2.5-turbo/pro/text-to-video";

function trustedFalQueueUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("fal_invalid_queue_url");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "queue.fal.run") throw new Error("fal_invalid_queue_url");
  return url.toString();
}

export async function generateFalKlingVideo(input: FalKlingRequest): Promise<{ bytes: Uint8Array; durationSeconds: number }> {
  const auth = { authorization: `Key ${input.apiKey}`, accept: "application/json" };
  const submitted = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ prompt: input.prompt, aspect_ratio: input.aspectRatio, duration: "5" }),
    signal: AbortSignal.timeout(30_000)
  });
  if (!submitted.ok) throw new Error(submitted.status === 401 || submitted.status === 403 ? "fal_auth_failed" : "fal_submit_failed");
  const queued = await submitted.json() as { request_id?: unknown; status_url?: unknown; response_url?: unknown };
  if (typeof queued.request_id !== "string") throw new Error("fal_request_id_missing");
  const statusUrl = trustedFalQueueUrl(queued.status_url);
  const resultUrl = trustedFalQueueUrl(queued.response_url);
  let complete = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    const statusResponse = await fetch(statusUrl, { headers: auth, signal: AbortSignal.timeout(15_000) });
    if (!statusResponse.ok) throw new Error("fal_status_failed");
    const status = await statusResponse.json() as { status?: unknown; error?: unknown };
    if (status.status === "COMPLETED") {
      if (status.error) throw new Error("fal_generation_failed");
      complete = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 4_000));
  }
  if (!complete) throw new Error("fal_generation_timeout");
  const resultResponse = await fetch(resultUrl, { headers: auth, signal: AbortSignal.timeout(20_000) });
  if (!resultResponse.ok) throw new Error("fal_result_failed");
  const result = await resultResponse.json() as { video?: { url?: unknown } };
  if (typeof result.video?.url !== "string") throw new Error("fal_video_url_missing");
  const mediaUrl = new URL(result.video.url);
  if (mediaUrl.protocol !== "https:" || !(mediaUrl.hostname === "storage.googleapis.com" || mediaUrl.hostname.endsWith(".fal.media"))) {
    throw new Error("fal_video_host_rejected");
  }
  const media = await fetch(mediaUrl, { signal: AbortSignal.timeout(60_000) });
  if (!media.ok) throw new Error("fal_video_download_failed");
  const length = Number(media.headers.get("content-length") || "0");
  if (length > 100 * 1024 * 1024) throw new Error("fal_video_too_large");
  const bytes = new Uint8Array(await media.arrayBuffer());
  if (!bytes.length || bytes.byteLength > 100 * 1024 * 1024) throw new Error("fal_video_too_large");
  return { bytes, durationSeconds: 5 };
}
