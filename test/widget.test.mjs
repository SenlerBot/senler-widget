import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement, StrictMode, act, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
  loadSenlerWidget,
  createSenlerWidgetSession,
  createSenlerWidget,
  SenlerWidgetInitializationError,
  SENLER_WIDGET_RUNTIME_PROTOCOL_VERSION,
} from "../dist/index.js";
import { SenlerWidget, useSenlerWidgetController } from "../dist/react.js";

let dom;
function browser() {
  dom = new JSDOM(
    '<html><head></head><body><div id="root"></div></body></html>',
    { url: "https://host.example/" },
  );
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return dom.window;
}
afterEach(() => {
  dom?.window.close();
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

function runtime({ autoReady = true } = {}) {
  const calls = [];
  const api = {
    runtimeProtocolVersion: SENLER_WIDGET_RUNTIME_PROTOCOL_VERSION,
  };
  for (const name of [
    "init",
    "create",
    "getSettings",
    "getDialogs",
    "getMessages",
    "getDialogState",
    "getWelcome",
    "getScheduledActions",
    "cancelScheduledAction",
    "subscribeDialog",
    "markRead",
    "setTyping",
    "clickButton",
    "updateQueuedQuestion",
    "cancelQueuedQuestion",
    "sendQueuedQuestion",
    "getOrCreateDialog",
    "open",
    "close",
    "toggle",
    "isOpen",
    "selectDialog",
    "setPageContext",
    "refreshRuntime",
    "destroy",
    "ask",
    "configure",
    "setContext",
    "setAnalytics",
    "updateLead",
    "setDraft",
    "uploadFile",
    "resetSession",
    "startNewDialog",
    "createTextEdit",
    "registerAction",
    "on",
  ]) {
    api[name] = (...args) => {
      calls.push([name, ...args]);
      if ((name === "create" || name === "init") && autoReady)
        queueMicrotask(() =>
          args[0].onReady?.({
            channel_id: args[0].channel_id,
            display_mode: args[0].display_mode ?? "popup",
            button_only: args[0].button_only === true,
          }),
        );
      if (name === "create") return api;
    };
  }
  return { api, calls };
}
const src = "https://widget.example/widget-loader.js";

test("async factory maps channelId and releases singleton ownership on destroy", async () => {
  const target = browser();
  const { api, calls } = runtime();
  target.SenlerWidget = api;
  const widget = await createSenlerWidget({
    src,
    channelId: "channel",
    lang: "ru",
  });
  assert.equal(calls[0][1].channel_id, "channel");
  assert.equal(calls[0][1].lang, "ru");
  widget.open({ message: { text: "must not send" } });
  assert.deepEqual(calls.at(-1), ["open"]);
  widget.destroy();
  let nextOpened = 0;
  api.open = () => {
    nextOpened++;
  };
  const next = await createSenlerWidget({ src, channelId: "second" });
  widget.open();
  assert.equal(nextOpened, 0);
  next.open();
  assert.equal(nextOpened, 1);
  widget.destroy();
  assert.equal(calls.filter(([name]) => name === "destroy").length, 1);
  next.destroy();
});

test("core and React component import/render without a browser", async () => {
  assert.match(
    renderToString(
      createElement(SenlerWidget, { src, config: { channel_id: "channel" } }),
    ),
    /<div/,
  );
  await assert.rejects(loadSenlerWidget({ src }), /requires a browser/);
});

test("one script is shared; aborting a caller does not cancel another", async () => {
  const target = browser();
  const controller = new AbortController();
  const first = loadSenlerWidget({ src, signal: controller.signal });
  const second = loadSenlerWidget({ src });
  assert.equal(document.scripts.length, 1);
  controller.abort();
  await assert.rejects(first, { name: "AbortError" });
  const { api } = runtime();
  target.SenlerWidget = api;
  assert.equal(await second, api);
  assert.equal(document.scripts.length, 1);
  await assert.rejects(
    loadSenlerWidget({ src: "https://other.example/loader.js" }),
    /different.*loader/,
  );
});

test("a failed script can be retried and bootstrap stubs are not treated as ready", async () => {
  const target = browser();
  const failed = loadSenlerWidget({ src });
  document.scripts[0].dispatchEvent(new target.Event("error"));
  await assert.rejects(failed, /Failed to load/);
  assert.equal(document.scripts.length, 0);
  target.SenlerWidget = { __isBootstrapStub: true, init() {} };
  const retry = loadSenlerWidget({ src });
  const { api } = runtime();
  target.SenlerWidget = api;
  assert.equal(await retry, api);
});

test("timeout removes an injected script; protocol mismatch fails before init", async () => {
  const target = browser();
  await assert.rejects(
    loadSenlerWidget({ src, timeoutMs: 10 }),
    /Failed to load/,
  );
  assert.equal(document.scripts.length, 0);
  const { api, calls } = runtime();
  api.runtimeProtocolVersion = 3;
  target.SenlerWidget = api;
  const session = createSenlerWidgetSession({
    src,
    config: { channel_id: "test" },
  });
  await assert.rejects(
    session.ready,
    new RegExp(`protocol ${SENLER_WIDGET_RUNTIME_PROTOCOL_VERSION}`),
  );
  assert.deepEqual(calls, []);
});

test("a stalled bootstrap runtime does not leave its fixed script id blocking retries", async () => {
  const target = browser();
  const failed = loadSenlerWidget({ src, timeoutMs: 10 });
  target.SenlerWidget = { __isBootstrapStub: true, init() {} };
  const nested = document.createElement("script");
  nested.id = "senler-widget-loader-runtime";
  nested.src = "https://widget.example/assets/widget-loader.js";
  document.head.appendChild(nested);
  await assert.rejects(failed, /Failed to load/);
  assert.equal(document.scripts.length, 0);
  const retry = loadSenlerWidget({ src });
  const { api } = runtime();
  target.SenlerWidget = api;
  assert.equal(await retry, api);
});

test("session cancellation prevents late init and stale cleanup preserves the new owner", async () => {
  const target = browser();
  const options = { src, config: { channel_id: "test" } };
  const first = createSenlerWidgetSession(options);
  first.destroy();
  await assert.rejects(first.ready, { name: "AbortError" });
  const second = createSenlerWidgetSession(options);
  const { api, calls } = runtime();
  target.SenlerWidget = api;
  await second.ready;
  first.destroy();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "create");
  assert.equal(calls[0][1].channel_id, options.config.channel_id);
  second.destroy();
  second.destroy();
  assert.equal(calls.filter(([name]) => name === "destroy").length, 1);
});

test("StrictMode mounts once after asynchronous loading and destroys once on unmount", async () => {
  const target = browser();
  const { api, calls } = runtime();
  const statuses = [];
  function Host() {
    const config = useMemo(() => ({ channel_id: "test" }), []);
    const state = useSenlerWidgetController({ src, config });
    statuses.push(state.status);
    return null;
  }
  const root = createRoot(document.getElementById("root"));
  await act(async () => {
    root.render(createElement(StrictMode, null, createElement(Host)));
  });
  assert.equal(document.scripts.length, 1);
  await act(async () => {
    target.SenlerWidget = api;
    await new Promise((resolve) => setTimeout(resolve, 35));
  });
  assert.ok(statuses.includes("ready"));
  assert.equal(calls.filter(([name]) => name === "create").length, 1);
  await act(async () => {
    root.unmount();
  });
  assert.equal(calls.filter(([name]) => name === "destroy").length, 1);
});

test("session readiness waits for the initialized chat and preserves the host callback", async () => {
  const target = browser();
  const { api, calls } = runtime({ autoReady: false });
  target.SenlerWidget = api;
  const details = [];
  const config = {
    channel_id: "test",
    onReady: (detail) => details.push(detail),
  };
  const session = createSenlerWidgetSession({ src, config });
  let resolved = false;
  void session.ready.then(() => {
    resolved = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls[0][0], "create");
  assert.equal(resolved, false);
  const detail = {
    channel_id: "test",
    display_mode: "popup",
    button_only: false,
  };
  calls[0][1].onReady(detail);
  assert.equal(await session.ready, api);
  assert.deepEqual(details, [detail]);
  assert.notEqual(calls[0][1], config);
  session.destroy();
});

test("an initialization error rejects readiness with the same error and cleans up", async () => {
  const target = browser();
  const { api, calls } = runtime({ autoReady: false });
  target.SenlerWidget = api;
  const errors = [];
  const session = createSenlerWidgetSession({
    src,
    config: { channel_id: "test", onError: (error) => errors.push(error) },
  });
  const error = new SenlerWidgetInitializationError(
    "authentication_failed",
    "Access denied",
    false,
  );
  const rejected = assert.rejects(
    session.ready,
    (received) => received === error,
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  calls[0][1].onError(error);
  await rejected;
  assert.deepEqual(errors, [error]);
  assert.equal(calls.filter(([name]) => name === "destroy").length, 1);
});

test("destroy cancels readiness after init and ignores a late ready callback", async () => {
  const target = browser();
  const { api, calls } = runtime({ autoReady: false });
  target.SenlerWidget = api;
  let callbacks = 0;
  const session = createSenlerWidgetSession({
    src,
    config: { channel_id: "test", onReady: () => callbacks++ },
  });
  const rejected = assert.rejects(session.ready, { name: "AbortError" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  session.destroy();
  calls[0][1].onReady({
    channel_id: "test",
    display_mode: "popup",
    button_only: false,
  });
  await rejected;
  assert.equal(callbacks, 0);
  assert.equal(calls.filter(([name]) => name === "destroy").length, 1);
});

test("React remains loading after the script loads until chat initialization succeeds", async () => {
  const target = browser();
  const { api, calls } = runtime({ autoReady: false });
  target.SenlerWidget = api;
  const statuses = [];
  function Host() {
    const config = useMemo(() => ({ channel_id: "test" }), []);
    statuses.push(useSenlerWidgetController({ src, config }).status);
    return null;
  }
  const root = createRoot(document.getElementById("root"));
  await act(async () => root.render(createElement(Host)));
  assert.equal(statuses.at(-1), "loading");
  await act(async () =>
    calls[0][1].onReady({
      channel_id: "test",
      display_mode: "popup",
      button_only: false,
    }),
  );
  assert.equal(statuses.at(-1), "ready");
  await act(async () => root.unmount());
});

test("embedded component passes initial visibility and updates the panel without reinit", async () => {
  const target = browser();
  const { api, calls } = runtime();
  target.SenlerWidget = api;
  const config = { channel_id: "test", surfaceVisible: false };
  const root = createRoot(document.getElementById("root"));
  await act(async () => {
    root.render(
      createElement(SenlerWidget, {
        src,
        config,
        settings: { themeMode: "dark", surfaceVisible: false },
      }),
    );
  });
  const init = calls.find(([name]) => name === "create");
  assert.equal(init[1].container.tagName, "DIV");
  assert.equal(init[1].display_mode, "embedded");
  assert.equal(init[1].surfaceVisible, false);
  assert.deepEqual(calls.at(-1), [
    "configure",
    { themeMode: "dark", surfaceVisible: false },
  ]);
  await act(async () => {
    root.render(
      createElement(SenlerWidget, {
        src,
        config,
        settings: { themeMode: "light", surfaceVisible: true },
      }),
    );
  });
  assert.equal(calls.filter(([name]) => name === "create").length, 1);
  assert.deepEqual(calls.at(-1), [
    "configure",
    { themeMode: "light", surfaceVisible: true },
  ]);
  await act(async () => {
    root.render(
      createElement(SenlerWidget, {
        src,
        config,
        settings: { surfaceVisible: false },
      }),
    );
  });
  assert.equal(calls.filter(([name]) => name === "create").length, 1);
  assert.deepEqual(calls.at(-1), ["configure", { surfaceVisible: false }]);
  await act(async () => {
    root.unmount();
  });
});

test("two widget sessions own independent instances and cleanup", async () => {
  const target = browser();
  const { api } = runtime();
  const created = [];
  api.create = (config) => {
    const instance = {
      ...api,
      destroyed: 0,
      destroy() {
        this.destroyed++;
      },
    };
    created.push(instance);
    queueMicrotask(() => config.onReady({ channel_id: config.channel_id }));
    return instance;
  };
  target.SenlerWidget = api;
  const first = createSenlerWidgetSession({
    src,
    config: { channel_id: "same" },
  });
  const second = createSenlerWidgetSession({
    src,
    config: { channel_id: "same" },
  });
  const instances = await Promise.all([first.ready, second.ready]);
  assert.notEqual(instances[0], instances[1]);
  first.destroy();
  assert.deepEqual(
    created.map((item) => item.destroyed),
    [1, 0],
  );
  second.destroy();
  assert.deepEqual(
    created.map((item) => item.destroyed),
    [1, 1],
  );
});

test("React clears its ready API when resetSession destroys the runtime", async () => {
  const target = browser();
  const { api } = runtime();
  let onDestroy;
  api.on = (event, handler) => {
    if (event === "destroy") onDestroy = handler;
    return () => {
      onDestroy = undefined;
    };
  };
  api.resetSession = async () => onDestroy?.();
  target.SenlerWidget = api;
  let state;
  const config = { channel_id: "channel" };
  function Harness() {
    state = useSenlerWidgetController({ src, config });
    return createElement("span", null, state.status);
  }
  const root = createRoot(document.getElementById("root"));
  await act(async () => root.render(createElement(Harness)));
  assert.equal(state.status, "ready");
  await act(async () => state.api.resetSession());
  assert.equal(state.status, "idle");
  assert.equal(state.api, null);
  await act(async () => root.unmount());
});
