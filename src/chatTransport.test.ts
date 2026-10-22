import { afterEach, expect, it, vi } from "vitest";
import { MessageChannel } from "node:worker_threads";
import { createChatTransport } from "./chatTransport";

vi.stubGlobal("MessageChannel", MessageChannel);
const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  vi.useRealTimers();
});
const dialogId = "507f1f77bcf86cd799439011";
function fixture() {
  const calls: { message: unknown; port: MessagePort }[] = [];
  const transport = createChatTransport({
    postMessage: (message, port) => {
      calls.push({ message, port });
      disposers.push(() => port.close());
    },
    reportError: vi.fn(),
  });
  disposers.push(transport.destroy);
  return { transport, calls };
}
it("isolates parallel requests and cancellation on separate reply ports", async () => {
  const { transport, calls } = fixture();
  const controller = new AbortController();
  const first = transport.methods.getMessages({
    dialogId,
    signal: controller.signal,
  });
  const second = transport.methods.getMessages({
    dialogId: "507f1f77bcf86cd799439012",
  });
  const failed = expect(first).rejects.toMatchObject({ code: "aborted" });
  controller.abort();
  calls[1].port.postMessage({
    type: "result",
    value: { items: [], hasMore: false },
  });
  await failed;
  expect(await second).toEqual({ items: [], hasMore: false });
});
it("keeps subscriptions open for updates and cancels them on disposal", async () => {
  const { transport, calls } = fixture();
  const updated = new Promise<void>((resolve) => {
    transport.methods.subscribeDialog({
      dialogId,
      onUpdate: () => resolve(),
      onError: vi.fn(),
    });
  });
  calls[0].port.postMessage({
    type: "update",
    value: {
      type: "snapshot",
      messages: { items: [], hasMore: false },
      state: {
        dialogId,
        unreadCount: 0,
        revision: 0,
        typing: [],
        pending: [],
        queueEnabled: false,
      },
    },
  });
  await updated;
  const cancelled = new Promise<void>((resolve) => {
    calls[0].port.onmessage = ({ data }) => {
      if (data.type === "cancel") resolve();
    };
  });
  transport.destroy();
  await cancelled;
  await expect(
    transport.methods.getMessages({ dialogId }),
  ).rejects.toMatchObject({ code: "destroyed" });
});

it("keeps the initial snapshot deadline while transient chunks arrive", async () => {
  vi.useFakeTimers();
  const { transport, calls } = fixture();
  const onError = vi.fn();
  const received = new Promise<void>((resolve) => {
    transport.methods.subscribeDialog({
      dialogId,
      timeoutMs: 100,
      onUpdate: () => resolve(),
      onError,
    });
  });
  calls[0].port.postMessage({
    type: "update",
    value: { type: "chunk", dialogId, text: "part" },
  });
  await received;
  await vi.advanceTimersByTimeAsync(100);
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ code: "timeout" }),
  );
});
