export type SenlerWidgetInitializationErrorCode = "invalid_config" | "iframe_load_failed" | "startup_failed" | "authentication_failed" | "init_failed" | "init_timeout" | "protocol_mismatch";
export declare class SenlerWidgetInitializationError extends Error {
    readonly code: SenlerWidgetInitializationErrorCode;
    readonly retryable: boolean;
    readonly name = "SenlerWidgetInitializationError";
    constructor(code: SenlerWidgetInitializationErrorCode, message: string, retryable: boolean);
}
export declare const SENLER_WIDGET_INITIALIZATION_TIMEOUT_MS = 90000;
