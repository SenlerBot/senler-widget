import assert from "node:assert/strict";
import { test } from "node:test";
import { createClientMethods } from "../dist/clientMethods.js";
import { createTextEditor } from "../dist/textEdit.js";

const answer = (text, requestId = "request") => ({
  requestId,
  dialogId: "dialog",
  status: "completed",
  answers: [
    {
      text,
      requestId,
      dialogId: "dialog",
      eventId: "event",
      agentId: "agent",
      answersReceived: 1,
      respondersTotal: 1,
      hasMore: false,
    },
  ],
  responders: [{ agentId: "agent", status: "answered" }],
});
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

test("a repeated field edit captures the newly applied value", async () => {
  let value = "first";
  const inputs = [];
  const editor = createTextEditor(
    {
      fieldId: "title",
      getValue: () => value,
      setValue: (next) => {
        value = next;
      },
    },
    async (options) => {
      inputs.push(options);
      return answer(inputs.length === 1 ? "second" : "third");
    },
  );
  editor.apply(await editor.generatePreview({ instruction: "Improve" }));
  const preview = await editor.generatePreview({
    instruction: "Improve again",
  });
  assert.equal(preview.sourceText, "second");
  editor.apply(preview);
  assert.equal(value, "third");
  assert.match(inputs[1].text, /second/);
});

test("preview forwards request context and callbacks without leaking editor-only options", async () => {
  let forwarded;
  const editor = createTextEditor(
    { fieldId: "body", getValue: () => "source", setValue() {} },
    async (options) => {
      forwarded = options;
      return answer("edited");
    },
  );
  const contextItems = [
    {
      id: "selection",
      kind: "text",
      role: "user_selected",
      display: { label: "Selection" },
      payload: { surroundingText: "paragraph" },
    },
  ];
  const onAnswer = () => {};
  await editor.generatePreview({
    instruction: "Improve",
    scope: "field",
    dialogId: "selected",
    contextItems,
    context: { tone: "formal" },
    ref: "editing",
    onAnswer,
  });
  assert.deepEqual(forwarded.contextItems, contextItems);
  assert.deepEqual(forwarded.context, { tone: "formal" });
  assert.equal(forwarded.onAnswer, onAnswer);
  assert.equal(forwarded.dialogId, "selected");
  assert.equal(forwarded.ref, "editing");
  assert.equal(forwarded.includeHistory, false);
  assert.equal(forwarded.includeActions, false);
  assert.equal("instruction" in forwarded, false);
  assert.equal("scope" in forwarded, false);
});

test("selection offsets refer to Markdown source, including escaped underscores and duplicate text", async () => {
  let value = "hello\\_world\n\nhello\\_world";
  const start = value.lastIndexOf("hello");
  const editor = createTextEditor(
    {
      fieldId: "body",
      getValue: () => value,
      setValue: (next) => {
        value = next;
      },
      getSelection: () => ({ start, end: value.length }),
    },
    async () => answer("changed"),
  );
  const preview = await editor.generatePreview({
    instruction: "Improve",
    scope: "selection",
  });
  assert.equal(preview.selectedText, "hello\\_world");
  editor.apply(preview);
  assert.equal(value, "hello\\_world\n\nchanged");
});

test("apply rejects changed, foreign, forged and already-applied previews", async () => {
  let value = "old";
  const editor = createTextEditor(
    {
      fieldId: "one",
      getValue: () => value,
      setValue: (next) => {
        value = next;
      },
    },
    async () => answer("new"),
  );
  const preview = await editor.generatePreview({ instruction: "Improve" });
  value = "user changed";
  assert.throws(() => editor.apply(preview), { code: "stale_preview" });
  value = "old";
  assert.throws(() => editor.apply({ ...preview }), {
    code: "invalid_preview",
  });
  editor.apply(preview);
  assert.throws(() => editor.apply(preview), { code: "invalid_preview" });
});

test("revision prevents an edit followed by undo from accepting an old preview", async () => {
  let revision = 1;
  const editor = createTextEditor(
    {
      fieldId: "one",
      getValue: () => "same",
      setValue() {
        assert.fail();
      },
      getRevision: () => revision,
    },
    async () => answer("new"),
  );
  const preview = await editor.generatePreview({ instruction: "Improve" });
  revision++;
  assert.throws(() => editor.apply(preview), { code: "stale_preview" });
});

test("destroy aborts this editor and prevents late previews", async () => {
  const pending = deferred();
  let signal;
  const editor = createTextEditor(
    { fieldId: "one", getValue: () => "old", setValue() {} },
    (options) => {
      signal = options.signal;
      return pending.promise;
    },
  );
  const result = editor.generatePreview({ instruction: "Improve" });
  editor.destroy();
  assert.equal(signal.aborted, true);
  pending.resolve(answer("late"));
  await assert.rejects(result, { code: "destroyed" });
});

function client(
  execute = async () => answer("ok"),
  createDialog = async () => "0123456789abcdef01234567",
  setAnalytics = async () => undefined,
) {
  const updates = [];
  let actions = {};
  let open = false;
  const c = createClientMethods({
    runtime: {
      isOpen: () => open,
      setPageContext(value) {
        updates.push(value);
      },
      updateRuntime(value) {
        updates.push(value);
        if (value.customActions) actions = value.customActions;
      },
    },
    execute,
    createDialog,
    setAnalytics,
    getActions: () => actions,
    reportError() {},
  });
  return {
    ...c,
    updates,
    setOpen: (value) => {
      open = value;
      c.syncVisibility();
    },
  };
}

test("selectDialog restores the next message context without creating a chat or sending", () => {
  const c = client(
    () => assert.fail("unexpected message"),
    () => assert.fail("unexpected creation"),
  );
  const contextItems = [
    {
      id: "field",
      kind: "text",
      role: "user_selected",
      display: { label: "Field" },
      payload: { text: "new value" },
    },
  ];
  c.methods.selectDialog("discussion", { contextItems, focusInput: true });
  assert.deepEqual(c.updates, [
    { dialogId: "discussion", contextItems, focusInput: true },
  ]);
  c.destroy();
  assert.throws(() => c.methods.selectDialog("discussion"), {
    code: "destroyed",
  });
});

test("startNewDialog waits for a saved dialog, selects it, clears old context, and returns its ID", async () => {
  const creation = deferred();
  const sent = [];
  const c = client(
    async (options) => {
      sent.push(options);
      return answer("ok");
    },
    () => creation.promise,
  );
  const pending = c.methods.startNewDialog();
  assert.equal(c.updates.length, 0);
  assert.equal(sent.length, 0);
  creation.resolve("0123456789abcdef01234567");
  const dialogId = await pending;
  assert.equal(dialogId, "0123456789abcdef01234567");
  assert.deepEqual(c.updates, [
    { dialogId, contextItems: [], focusInput: undefined },
  ]);
  await c.methods.ask({ text: "Hello", dialogId });
  assert.equal(sent[0].dialogId, dialogId);
  c.destroy();
});

test("failed or cancelled dialog creation does not switch the visible chat", async () => {
  const failure = client(undefined, async () => {
    throw new Error("creation failed");
  });
  await assert.rejects(failure.methods.startNewDialog(), /creation failed/);
  assert.deepEqual(failure.updates, []);
  const creation = deferred();
  const cancelled = client(undefined, () => creation.promise);
  const controller = new AbortController();
  const pending = cancelled.methods.startNewDialog({
    signal: controller.signal,
  });
  controller.abort();
  creation.resolve("0123456789abcdef01234567");
  await assert.rejects(pending, { name: "AbortError" });
  assert.deepEqual(cancelled.updates, []);
  failure.destroy();
  cancelled.destroy();
});

test("dialog creation captures context before waiting for the server", async () => {
  const creation = deferred();
  const c = client(undefined, () => creation.promise);
  const contextItems = [
    { id: "field", kind: "text", display: { label: "Before" } },
  ];
  const pending = c.methods.startNewDialog({ contextItems, focusInput: true });
  contextItems[0].display.label = "Changed by caller";
  creation.resolve("0123456789abcdef01234567");
  await pending;
  assert.equal(c.updates[0].contextItems[0].display.label, "Before");
  assert.equal(c.updates[0].focusInput, true);
  c.destroy();
});

test("each concurrent ask gets its own merged context snapshot", async () => {
  const calls = [];
  const c = client((options) => {
    const d = deferred();
    calls.push({ options, ...d });
    return d.promise;
  });
  const context = { nested: { value: "before" }, shared: 1 };
  c.methods.setContext(context);
  const first = c.methods.ask({ text: "one", context: { shared: 2 } });
  context.nested.value = "external mutation";
  c.methods.setContext({ nested: { value: "after" } });
  const second = c.methods.ask({ text: "two" });
  assert.deepEqual(calls[0].options.context, {
    nested: { value: "before" },
    shared: 2,
  });
  assert.deepEqual(calls[1].options.context, { nested: { value: "after" } });
  calls[1].resolve(answer("two", "2"));
  calls[0].resolve(answer("one", "1"));
  assert.deepEqual(
    (await Promise.all([first, second])).map((a) => a.answers[0].text),
    ["one", "two"],
  );
  c.destroy();
});

test("configure cannot send messages; action cleanup preserves other registrations", () => {
  const c = client();
  assert.throws(
    () => c.methods.configure({ message: { text: "oops" } }),
    /presentation/,
  );
  assert.equal(c.updates.length, 0);
  c.methods.configure({ lang: "ru", themeMode: "dark" });
  assert.equal(c.updates[0].theme_mode, "dark");
  const remove = c.methods.registerAction("one", { handler() {} });
  c.methods.registerAction("two", { handler() {} });
  assert.throws(
    () => c.methods.registerAction("one", { handler() {} }),
    /already registered/,
  );
  remove();
  assert.deepEqual(Object.keys(c.updates.at(-1).customActions), ["two"]);
  c.destroy();
});

test("visibility events follow transitions and unsubscribe; destroy rejects future requests", async () => {
  const c = client();
  let opened = 0;
  const off = c.methods.on("open", () => opened++);
  c.setOpen(true);
  c.setOpen(true);
  c.setOpen(false);
  c.setOpen(true);
  assert.equal(opened, 2);
  off();
  c.setOpen(false);
  c.setOpen(true);
  assert.equal(opened, 2);
  c.destroy();
  await assert.rejects(c.methods.ask({ text: "late" }), { code: "destroyed" });
});

test("messageSent deduplicates acknowledgements per instance and dialog, preserves source, and unsubscribes", () => {
  const first = client();
  const second = client();
  const received = [];
  const elsewhere = [];
  const off = first.methods.on("messageSent", (event) => received.push(event));
  second.methods.on("messageSent", (event) => elsewhere.push(event));
  const accepted = {
    requestId: "request-1",
    dialogId: "chat-1",
    eventId: "event-1",
    source: "widget",
  };
  first.notifyMessageSent(accepted);
  first.notifyMessageSent({ ...accepted });
  first.notifyMessageSent({
    requestId: "request-2",
    dialogId: "chat-1",
    queueId: "queued-2",
    source: "api",
  });
  first.notifyMessageSent({
    ...accepted,
    dialogId: "chat-2",
    eventId: "event-3",
  });
  assert.equal(received.length, 3);
  assert.deepEqual(received[0], accepted);
  assert.equal(Object.isFrozen(received[0]), true);
  assert.equal(received[1].source, "api");
  assert.equal(received[1].queueId, "queued-2");
  assert.equal(elsewhere.length, 0);
  second.notifyMessageSent(accepted);
  assert.equal(elsewhere.length, 1);
  off();
  first.notifyMessageSent({ ...accepted, requestId: "after-unsubscribe" });
  assert.equal(received.length, 3);
  second.destroy();
  second.notifyMessageSent({ ...accepted, requestId: "after-destroy" });
  assert.equal(elsewhere.length, 1);
  first.destroy();
});

test("a failing analytics listener does not prevent other listeners or replay the event", () => {
  const c = client();
  let received = 0;
  c.methods.on("messageSent", () => {
    throw new Error("Counter unavailable");
  });
  c.methods.on("messageSent", () => received++);
  const detail = {
    requestId: "request",
    dialogId: "dialog",
    eventId: "event",
    source: "widget",
  };
  c.notifyMessageSent(detail);
  c.notifyMessageSent(detail);
  assert.equal(received, 1);
  c.destroy();
});

test("analytics updates serialize, snapshot input and recover after a failed observation", async () => {
  const calls = [];
  const first = deferred();
  const c = client(undefined, undefined, async (source) => {
    calls.push(source);
    if (calls.length === 1) await first.promise;
  });
  const input = {
    provider: "yandex_metrica",
    sourceId: "111",
    identifiers: { client_id: "old" },
  };
  const one = c.methods.setAnalytics(input);
  const failed = assert.rejects(one, /offline/);
  input.identifiers.client_id = "mutated";
  const two = c.methods.setAnalytics({ ...input, sourceId: "222" });
  await Promise.resolve();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].identifiers.client_id, "old");
  first.reject(new Error("offline"));
  await failed;
  await two;
  assert.equal(calls.length, 2);
  assert.deepEqual(c.updates, []);
  assert.throws(
    () => c.methods.setAnalytics({ ...input, identifiers: { client_id: 3 } }),
    /Invalid analytics/,
  );
  c.destroy();
  assert.throws(() => c.methods.setAnalytics(input), /destroyed/);
});

test("replays unread state and deduplicates received messages independently of ask", () => {
  const c = client();
  c.notifyUnreadCount(3);
  const counts = [];
  const unsubscribe = c.methods.on("unreadCountChanged", (count) =>
    counts.push(count),
  );
  c.notifyUnreadCount(3);
  c.notifyUnreadCount(2);
  assert.deepEqual(counts, [3, 2]);
  unsubscribe();
  c.notifyUnreadCount(1);
  assert.deepEqual(counts, [3, 2]);
  const message = {
    kind: "message",
    eventId: "one",
    dialogId: "chat",
    sender: "operator",
    timestamp: "2026-10-20T00:00:00Z",
    text: "Hello",
    format: "plain_text",
    attachments: [],
    buttons: [],
  };
  const received = [];
  c.methods.on("messageReceived", (value) => {
    value.text = "changed";
  });
  c.methods.on("messageReceived", (value) => received.push(value));
  c.notifyMessageReceived(message);
  c.notifyMessageReceived(message);
  assert.deepEqual(received, [message]);
  c.destroy();
  c.notifyMessageReceived({ ...message, eventId: "two" });
  assert.equal(received.length, 1);
});

test("profile updates serialize without changing identity, and drafts require explicit replacement", async () => {
  const profileCalls = [];
  const draftCalls = [];
  const { methods } = createClientMethods({
    runtime: { isOpen: () => false, updateRuntime() {}, setPageContext() {} },
    execute: async () => answer("unused"),
    createDialog: async () => "dialog",
    resolveDialog: async () => ({
      id: "dialog",
      ref: "editor",
      showInWidgetHistory: false,
    }),
    setAnalytics: async () => {},
    uploadFile: async () => {},
    resetSession: async () => {},
    updateLead: async (profile) => {
      profileCalls.push(profile);
    },
    setDraft: async (draft) => {
      draftCalls.push(draft);
    },
    getActions: () => ({}),
    reportError() {},
  });
  await Promise.all([
    methods.updateLead({ phone: " +79990000000 " }),
    methods.updateLead({ email: "a@example.com" }),
  ]);
  assert.deepEqual(profileCalls, [
    { phone: "+79990000000" },
    { email: "a@example.com" },
  ]);
  assert.throws(
    () => methods.updateLead({ external_id: "another-person" }),
    /Unsupported lead field/,
  );
  assert.throws(() => methods.updateLead({ phone: "" }), /Invalid lead field/);
  await methods.setDraft({ text: "Prepared" });
  await methods.setDraft({ text: "Replacement", replace: true });
  assert.deepEqual(draftCalls, [
    { text: "Prepared", replace: false },
    { text: "Replacement", replace: true },
  ]);
});
