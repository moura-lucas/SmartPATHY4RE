export class LlmError extends Error {
  override name = "LlmError";
  constructor(
    message: string,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

// Final error, thrown when all attempts have failed.
export class LlmUnavailableError extends Error {
  override name = "LlmUnavailableError";
  constructor(options?: ErrorOptions) {
    super("LLM unavailable after all attempts", options);
  }
}
