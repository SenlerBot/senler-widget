import type { WidgetChatCommand } from "./chatTypes.js";
export declare const WIDGET_CHAT_PROTOCOL = 2;
export declare const WIDGET_CHAT_MESSAGE = "SENLER_WIDGET_CHAT";
export declare function isChatRecord(value: unknown): value is Record<string, unknown>;
/** Validate at both ends; untrusted postMessage input never reaches the API. */
export declare function parseChatCommand(value: unknown): WidgetChatCommand;
