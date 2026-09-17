export type SenlerWidgetInitializationErrorCode =
  | "invalid_config"
  | "iframe_load_failed"
  | "startup_failed"
  | "authentication_failed"
  | "init_failed"
  | "init_timeout"
  | "protocol_mismatch";

export class SenlerWidgetInitializationError extends Error {
  readonly name = "SenlerWidgetInitializationError";

  constructor(
    readonly code: SenlerWidgetInitializationErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export const SENLER_WIDGET_INITIALIZATION_TIMEOUT_MS = 90_000;
