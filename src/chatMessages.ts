import type { SenlerWidgetMessage } from "./messageResult.js";

/** Merge history, ask answers and subscriptions without duplicates or version rollback. */
export function mergeWidgetMessages(
  previous: readonly SenlerWidgetMessage[],
  incoming: readonly SenlerWidgetMessage[],
): SenlerWidgetMessage[] {
  const byId = new Map(previous.map((message) => [message.eventId, message]));
  for (const message of incoming) {
    const old = byId.get(message.eventId);
    if (!old || message.version >= old.version)
      byId.set(message.eventId, message);
  }
  return [...byId.values()].sort(
    (a, b) =>
      a.timestamp.localeCompare(b.timestamp) ||
      a.eventId.localeCompare(b.eventId),
  );
}
