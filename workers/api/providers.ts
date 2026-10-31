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
