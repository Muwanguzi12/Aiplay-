export type VideoAspectRatio = "9:16" | "16:9" | "1:1";

export type AiplayJobStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface CreateAiplayJobInput {
  prompt: string;
  aspectRatio: VideoAspectRatio;
  durationSeconds: 15 | 30 | 45 | 60;
  sourceImageUrl?: string;
}

export interface AiplayJob {
  id: string;
  status: AiplayJobStatus;
  provider: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  outputUrl?: string;
  errorCode?: string;
}

export interface AiplayProvider {
  readonly id: string;
  createVideo(input: CreateAiplayJobInput): Promise<{ providerJobId: string }>;
  getVideoStatus(providerJobId: string): Promise<
    | { status: "queued" | "processing" }
    | { status: "succeeded"; outputUrl: string }
    | { status: "failed"; errorCode: string }
  >;
}
