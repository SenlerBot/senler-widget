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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Context is validated separately and never makes an empty message sendable. */
export function prepareWidgetMessageBody(
  value: unknown,
  allowEmpty = false,
): WidgetMessageBody {
  if (!isRecord(value) || typeof value.text !== "string") {
    throw new TypeError("text must be a string");
  }
  const text = value.text.trim();
  let attachments: SenlerWidgetAttachment[] | undefined;
  if (value.attachments !== undefined) {
    if (!Array.isArray(value.attachments) || value.attachments.length > 10) {
      throw new TypeError(
        "attachments must be an array of up to 10 file references",
      );
    }
    attachments = [];
    for (const attachment of value.attachments) {
      if (
        !isRecord(attachment) ||
        typeof attachment.id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          attachment.id,
        )
      ) {
        throw new TypeError(
          "Each attachment must contain a confirmed file UUID in id",
        );
      }
      attachments.push({ id: attachment.id });
    }
  }
  if (
    value.replyToEventId !== undefined &&
    (typeof value.replyToEventId !== "string" ||
      !/^[0-9a-f]{24}$/i.test(value.replyToEventId))
  ) {
    throw new TypeError("Invalid replyToEventId");
  }
  if (!allowEmpty && !text && !attachments?.length) {
    throw new TypeError("A message requires text or attachments");
  }
  return {
    text,
    ...(attachments?.length ? { attachments } : {}),
    ...(value.replyToEventId !== undefined
      ? { replyToEventId: value.replyToEventId }
      : {}),
  };
}
