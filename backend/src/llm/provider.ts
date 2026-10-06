export interface LlmRequest {
  system: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
}

export interface LlmProvider {
  /** Returns the raw response text. Raises LlmError in case of failure. */
  complete(req: LlmRequest): Promise<string>;
}
