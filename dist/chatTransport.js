import { SenlerWidgetRequestError } from "./clientTypes.js";
import { isChatRecord, parseChatCommand, WIDGET_CHAT_MESSAGE, WIDGET_CHAT_PROTOCOL, } from "./chatProtocol.js";
export function createChatTransport({ postMessage, reportError, }) {
    let destroyed = false;
    const active = new Set();
    function connect(payload, options, receive, fail) {
        if (destroyed)
            throw new SenlerWidgetRequestError("destroyed", "Widget was destroyed");
        const timeoutMs = options.timeoutMs ?? 30000;
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300000)
            throw new TypeError("timeoutMs must be between 1 and 300000");
        const channel = new MessageChannel();
        let closed = false;
        const cleanup = () => {
            if (closed)
                return;
            closed = true;
            clearTimeout(timer);
            options.signal?.removeEventListener("abort", abort);
            active.delete(dispose);
            channel.port1.postMessage({ type: "cancel" });
            channel.port1.close();
        };
        const reject = (code, message) => {
            cleanup();
            fail(new SenlerWidgetRequestError(code, message));
        };
        const abort = () => reject("aborted", "Chat operation aborted");
        const dispose = () => reject("destroyed", "Widget was destroyed");
        const timer = setTimeout(() => reject("timeout", "Chat operation timed out"), timeoutMs);
        active.add(dispose);
        channel.port1.onmessage = ({ data }) => {
            if (closed || !isChatRecord(data))
                return;
            if (data.type === "error") {
                cleanup();
                fail(new SenlerWidgetRequestError(typeof data.code === "string" ? data.code : "request_failed", typeof data.message === "string"
                    ? data.message
                    : "Chat operation failed", undefined, typeof data.dialogId === "string" ? data.dialogId : undefined, typeof data.retryable === "boolean" ? data.retryable : undefined));
                return;
            }
            if (data.type === "result" ||
                data.type === "notification" ||
                (data.type === "update" &&
                    isChatRecord(data.value) &&
                    (data.value.type === "snapshot" || data.value.type === "deleted")))
                clearTimeout(timer);
            try {
                if (receive(data))
                    cleanup();
            }
            catch (error) {
                reportError(error);
            }
        };
        options.signal?.addEventListener("abort", abort, { once: true });
        if (options.signal?.aborted) {
            abort();
            channel.port2.close();
        }
        else {
            try {
                postMessage({ type: WIDGET_CHAT_MESSAGE, version: WIDGET_CHAT_PROTOCOL, payload }, channel.port2);
            }
            catch (error) {
                channel.port2.close();
                reject("transport_failed", error instanceof Error ? error.message : "Could not reach widget");
            }
        }
        return cleanup;
    }
    function request(method, input, options = {}) {
        const payload = parseChatCommand({ method, input });
        return new Promise((resolve, reject) => connect(payload, options, (data) => {
            if (data.type !== "result")
                return false;
            // Only the authenticated, protocol-matched iframe owns this private reply port.
            resolve(data.value);
            return true;
        }, reject));
    }
    const methods = {
        getSettings: (options = {}) => request("getSettings", {}, options),
        getDialogs: (options = {}) => request("getDialogs", options, options),
        getMessages: (options) => request("getMessages", options, options),
        getDialogState: (options) => request("getDialogState", options, options),
        getWelcome: (options = {}) => request("getWelcome", {}, options),
        getScheduledActions: (options) => request("getScheduledActions", options, options),
        cancelScheduledAction: (options) => request("cancelScheduledAction", options, options),
        markRead: (options) => request("markRead", options, options),
        setTyping: (options) => request("setTyping", options, options),
        clickButton: (options) => request("clickButton", options, options),
        updateQueuedQuestion: (options) => request("updateQueuedQuestion", options, options),
        cancelQueuedQuestion: (options) => request("cancelQueuedQuestion", options, options),
        sendQueuedQuestion: (options) => request("sendQueuedQuestion", options, options),
        subscribeDialog(options) {
            if (typeof options.onUpdate !== "function" ||
                typeof options.onError !== "function")
                throw new TypeError("subscribeDialog requires onUpdate and onError");
            const page = parseChatCommand({
                method: "getMessages",
                input: options,
            }).input;
            const state = parseChatCommand({
                method: "getDialogState",
                input: options,
            }).input;
            return connect({ method: "subscribeDialog", input: { ...page, ...state } }, options, (data) => {
                if (data.type === "update")
                    options.onUpdate(data.value);
                return (data.type === "update" &&
                    isChatRecord(data.value) &&
                    data.value.type === "deleted");
            }, options.onError);
        },
    };
    return {
        methods,
        subscribeSession(handler) {
            return connect({ method: "subscribeSession", input: {} }, {}, (data) => {
                if (data.type === "notification")
                    handler(data.value);
                return false;
            }, reportError);
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            for (const dispose of [...active])
                dispose();
        },
    };
}
export function unsupportedChatMethods() {
    const unsupported = () => {
        throw new SenlerWidgetRequestError("unsupported_mode", "Chat data requires an authenticated widget");
    };
    return {
        getSettings: unsupported,
        getDialogs: unsupported,
        getMessages: unsupported,
        getDialogState: unsupported,
        getWelcome: unsupported,
        getScheduledActions: unsupported,
        cancelScheduledAction: unsupported,
        subscribeDialog: unsupported,
        markRead: unsupported,
        setTyping: unsupported,
        clickButton: unsupported,
        updateQueuedQuestion: unsupported,
        cancelQueuedQuestion: unsupported,
        sendQueuedQuestion: unsupported,
    };
}
