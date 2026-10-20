import { expect, it } from "vitest";
import { parseChatCommand } from "./chatProtocol";
import { mergeWidgetMessages } from "./chatMessages";
import { normalizeWelcomeReaction } from "./welcome";
import type { SenlerWidgetMessage } from "./messageResult";

const dialogId = "507f1f77bcf86cd799439011";
const message = (eventId: string, version: number): SenlerWidgetMessage => ({
  kind: "message",
  eventId,
  dialogId,
  version,
  timestamp: "2026-10-20T00:00:00Z",
  sender: "visitor",
  deleted: false,
  text: String(version),
  format: "plain_text",
  attachments: [],
  buttons: [],
});
it("merges ask answers and history without duplicates or reverting a newer edit", () => {
  const result = mergeWidgetMessages(
    [message("a", 3)],
    [message("a", 1), message("b", 1)],
  );
  expect(result.map((m) => [m.eventId, m.text])).toEqual([
    ["a", "3"],
    ["b", "1"],
  ]);
  expect(mergeWidgetMessages(result, [message("a", 4)])[0].text).toBe("4");
});
it("bounds reads and rejects conflicting cursors and unsafe button URLs", () => {
  for (const input of [
    { dialogId, limit: 201 },
    { dialogId, before: "a", after: "b" },
    { dialogId: "foreign" },
  ])
    expect(() => parseChatCommand({ method: "getMessages", input })).toThrow();
  expect(() =>
    parseChatCommand({
      method: "clickButton",
      input: {
        dialogId,
        eventId: dialogId,
        button: {
          text: "Unsafe",
          action: { type: "open_url", url: "javascript:alert(1)" },
        },
      },
    }),
  ).toThrow();
  expect(
    parseChatCommand({ method: "getMessages", input: { dialogId, limit: 20 } }),
  ).toMatchObject({ input: { dialogId, limit: 20 } });
});
it("keeps queue edits versioned and validates a welcome reaction before sending", () => {
  expect(() =>
    parseChatCommand({
      method: "updateQueuedQuestion",
      input: { dialogId, questionId: crypto.randomUUID(), text: "new" },
    }),
  ).toThrow();
  expect(() =>
    normalizeWelcomeReaction({ draftId: "welcome", token: "signed" }, false),
  ).toThrow();
  expect(
    normalizeWelcomeReaction({ draftId: "welcome", token: "signed" }, true),
  ).toMatchObject({ draftId: "welcome", token: "signed" });
});
