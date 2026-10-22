export class SenlerWidgetRequestError extends Error {
    constructor(code, message, requestId, dialogId, retryable, retryAfterMs) {
        super(message);
        this.code = code;
        this.requestId = requestId;
        this.dialogId = dialogId;
        this.retryable = retryable;
        this.retryAfterMs = retryAfterMs;
        this.name = "SenlerWidgetRequestError";
    }
}
