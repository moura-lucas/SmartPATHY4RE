/** Cause of an LLM failure, shown to the user in plain language (AC11.3). */
export type LlmFailureKind = "unavailable" | "rate_limited" | "invalid_response";

export class LlmError extends Error {
  override name = "LlmError";
  readonly kind: LlmFailureKind;
  constructor(
    message: string,
    readonly retryable: boolean,
    options?: ErrorOptions & { kind?: LlmFailureKind },
  ) {
    super(message, options);
    this.kind = options?.kind ?? "unavailable";
  }
}

// Final error, thrown when all attempts have failed.
export class LlmUnavailableError extends Error {
  override name = "LlmUnavailableError";
  /** The cause of the last attempt. */
  readonly kind: LlmFailureKind;
  constructor(options?: ErrorOptions) {
    super("LLM unavailable after all attempts", options);
    this.kind = options?.cause instanceof LlmError ? options.cause.kind : "unavailable";
  }
}
