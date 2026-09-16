import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createElement, StrictMode, act, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { loadSenlerWidget, createSenlerWidgetSession } from '../dist/index.js';
import { SenlerWidget, useSenlerWidgetController } from '../dist/react.js';

let dom;
function browser() {
  dom = new JSDOM('<html><head></head><body><div id="root"></div></body></html>', { url: 'https://host.example/' });
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

function runtime() {
  const calls = [];
  const api = { runtimeProtocolVersion: 4 };
  for (const name of ['init', 'open', 'close', 'toggle', 'isOpen', 'selectDialog', 'setPageContext', 'updateRuntime', 'createInlineTextEdit', 'destroy']) {
    api[name] = (...args) => { calls.push([name, ...args]); };
  }
  return { api, calls };
}
const src = 'https://widget.example/widget-loader.js';

test('core and React component import/render without a browser', async () => {
  assert.match(renderToString(createElement(SenlerWidget, { src, config: { channel_id: 'channel' } })), /<div/);
  await assert.rejects(loadSenlerWidget({ src }), /requires a browser/);
});

test('one script is shared; aborting a caller does not cancel another', async () => {
  const target = browser();
  const controller = new AbortController();
  const first = loadSenlerWidget({ src, signal: controller.signal });
  const second = loadSenlerWidget({ src });
  assert.equal(document.scripts.length, 1);
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  const { api } = runtime();
  target.SenlerWidget = api;
  assert.equal(await second, api);
  assert.equal(document.scripts.length, 1);
  await assert.rejects(loadSenlerWidget({ src: 'https://other.example/loader.js' }), /different.*loader/);
});

test('a failed script can be retried and bootstrap stubs are not treated as ready', async () => {
  const target = browser();
  const failed = loadSenlerWidget({ src });
  document.scripts[0].dispatchEvent(new target.Event('error'));
  await assert.rejects(failed, /Failed to load/);
  assert.equal(document.scripts.length, 0);
  target.SenlerWidget = { __isBootstrapStub: true, init() {} };
  const retry = loadSenlerWidget({ src });
  const { api } = runtime();
  target.SenlerWidget = api;
  assert.equal(await retry, api);
});

test('timeout removes an injected script; protocol mismatch fails before init', async () => {
  const target = browser();
  await assert.rejects(loadSenlerWidget({ src, timeoutMs: 10 }), /Failed to load/);
  assert.equal(document.scripts.length, 0);
  const { api, calls } = runtime();
  api.runtimeProtocolVersion = 3;
  target.SenlerWidget = api;
  const session = createSenlerWidgetSession({ src, config: { channel_id: 'test' } });
  await assert.rejects(session.ready, /protocol 4/);
  assert.deepEqual(calls, []);
});

test('a stalled bootstrap runtime does not leave its fixed script id blocking retries', async () => {
  const target = browser();
  const failed = loadSenlerWidget({ src, timeoutMs: 10 });
  target.SenlerWidget = { __isBootstrapStub: true, init() {} };
  const nested = document.createElement('script');
  nested.id = 'senler-widget-loader-runtime';
  nested.src = 'https://widget.example/assets/widget-loader.js';
  document.head.appendChild(nested);
  await assert.rejects(failed, /Failed to load/);
  assert.equal(document.scripts.length, 0);
  const retry = loadSenlerWidget({ src });
  const { api } = runtime();
  target.SenlerWidget = api;
  assert.equal(await retry, api);
});

test('session cancellation prevents late init and stale cleanup preserves the new owner', async () => {
  const target = browser();
  const options = { src, config: { channel_id: 'test' } };
  const first = createSenlerWidgetSession(options);
  assert.throws(() => createSenlerWidgetSession(options), /active.*session/);
  first.destroy();
  await assert.rejects(first.ready, { name: 'AbortError' });
  const second = createSenlerWidgetSession(options);
  const { api, calls } = runtime();
  target.SenlerWidget = api;
  await second.ready;
  first.destroy();
  assert.deepEqual(calls, [['init', options.config]]);
  second.destroy();
  second.destroy();
  assert.equal(calls.filter(([name]) => name === 'destroy').length, 1);
});

test('StrictMode mounts once after asynchronous loading and destroys once on unmount', async () => {
  const target = browser();
  const { api, calls } = runtime();
  const statuses = [];
  function Host() {
    const config = useMemo(() => ({ channel_id: 'test' }), []);
    const state = useSenlerWidgetController({ src, config });
    statuses.push(state.status);
    return null;
  }
  const root = createRoot(document.getElementById('root'));
  await act(async () => { root.render(createElement(StrictMode, null, createElement(Host))); });
  assert.equal(document.scripts.length, 1);
  await act(async () => {
    target.SenlerWidget = api;
    await new Promise((resolve) => setTimeout(resolve, 35));
  });
  assert.ok(statuses.includes('ready'));
  assert.equal(calls.filter(([name]) => name === 'init').length, 1);
  await act(async () => { root.unmount(); });
  assert.equal(calls.filter(([name]) => name === 'destroy').length, 1);
});

test('embedded component passes the mounted element and updates runtime without reinit', async () => {
  const target = browser();
  const { api, calls } = runtime();
  target.SenlerWidget = api;
  const config = { channel_id: 'test' };
  const root = createRoot(document.getElementById('root'));
  await act(async () => { root.render(createElement(SenlerWidget, { src, config, runtime: { theme_mode: 'dark' } })); });
  const init = calls.find(([name]) => name === 'init');
  assert.equal(init[1].container.tagName, 'DIV');
  assert.equal(init[1].display_mode, 'embedded');
  await act(async () => { root.render(createElement(SenlerWidget, { src, config, runtime: { theme_mode: 'light' } })); });
  assert.equal(calls.filter(([name]) => name === 'init').length, 1);
  assert.deepEqual(calls.at(-1), ['updateRuntime', { theme_mode: 'light' }]);
  await act(async () => { root.unmount(); });
});
