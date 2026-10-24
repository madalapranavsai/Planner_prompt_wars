export interface AiGenerateRequest {
  system: string;
  prompt: string;
  jsonSchema?: Record<string, unknown> | undefined;
  signal?: AbortSignal | undefined;
}

export interface AiClient {
  generate(req: AiGenerateRequest): Promise<string>;
}

export type AiErrorKind =
  "validation" | "rate_limited" | "timeout" | "invalid_output" | "upstream" | "not_configured";

export interface AiError {
  kind: AiErrorKind;
  message: string;
  retryable: boolean;
}
