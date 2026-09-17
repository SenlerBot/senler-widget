export class SenlerWidgetInitializationError extends Error {
    constructor(code, message, retryable) {
        super(message);
        this.code = code;
        this.retryable = retryable;
        this.name = "SenlerWidgetInitializationError";
    }
}
export const SENLER_WIDGET_INITIALIZATION_TIMEOUT_MS = 90000;
