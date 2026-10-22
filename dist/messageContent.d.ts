import type { SenlerWidgetContextItem } from "./types.js";
export interface SenlerWidgetAttachment {
    /** ID returned after confirming an upload for this widget's lead. */
    id: string;
}
/** Message content shared by the composer and programmatic sending. */
export interface SenlerWidgetMessageContent {
    /** May be empty when attachments are provided. */
    text: string;
    attachments?: SenlerWidgetAttachment[];
    replyToEventId?: string;
    /** Structured context attached to this message only. */
    contextItems?: SenlerWidgetContextItem[];
}
type WidgetMessageBody = Omit<SenlerWidgetMessageContent, "contextItems">;
/** Context is validated separately and never makes an empty message sendable. */
export declare function prepareWidgetMessageBody(value: unknown, allowEmpty?: boolean): WidgetMessageBody;
export {};
