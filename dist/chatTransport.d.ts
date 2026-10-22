import type { SenlerWidgetChatMethods, WidgetChatNotification } from "./chatTypes.js";
export declare function createChatTransport({ postMessage, reportError, }: {
    postMessage(message: unknown, port: MessagePort): void;
    reportError(error: unknown): void;
}): {
    methods: SenlerWidgetChatMethods;
    subscribeSession(handler: (notification: WidgetChatNotification) => void): () => void;
    destroy(): void;
};
export declare function unsupportedChatMethods(): SenlerWidgetChatMethods;
