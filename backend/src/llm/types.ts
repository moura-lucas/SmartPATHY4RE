export interface GenerateOptions {
  systemPrompt?: string;
  /** Asks the model to respond only with valid JSON. */
  json?: boolean;
  temperature?: number;
}

export interface LLMClient {
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
}

export class LLMError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LLMError";
  }
}
