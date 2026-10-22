import type { SenlerWidgetMessageSent } from "./clientTypes.js";

function isIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= 256
  );
}

/** The host accepts notifications only after validating the owning iframe and payload. */
export function isWidgetMessageSent(
  value: unknown,
): value is SenlerWidgetMessageSent {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const hasEvent = "eventId" in value && value.eventId !== undefined;
  const hasQueue = "queueId" in value && value.queueId !== undefined;
  return (
    "requestId" in value &&
    isIdentifier(value.requestId) &&
    "dialogId" in value &&
    isIdentifier(value.dialogId) &&
    "source" in value &&
    (value.source === "widget" || value.source === "api") &&
    hasEvent !== hasQueue &&
    (!hasEvent || isIdentifier(value.eventId)) &&
    (!hasQueue || isIdentifier(value.queueId))
  );
}

export function isWidgetMessageReceived(
  value: unknown,
): value is import("./messageResult.js").SenlerWidgetMessageReceived {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    "kind" in value &&
    value.kind === "message" &&
    "eventId" in value &&
    isIdentifier(value.eventId) &&
    "dialogId" in value &&
    isIdentifier(value.dialogId) &&
    "sender" in value &&
    (value.sender === "assistant" || value.sender === "operator") &&
    "timestamp" in value &&
    typeof value.timestamp === "string" &&
    "text" in value &&
    typeof value.text === "string" &&
    "format" in value &&
    (value.format === "plain_text" || value.format === "markdown") &&
    "attachments" in value &&
    Array.isArray(value.attachments) &&
    "buttons" in value &&
    Array.isArray(value.buttons)
  );
}
