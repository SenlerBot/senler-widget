# @senlerio/widget

Typed browser integration for Senler Widget: the `window.SenlerWidget` contract,
a shared script loader and an optional React integration. No runtime dependencies.
The widget application is loaded from your widget host, separately from this package.

```sh
npm install @senlerio/widget@https://github.com/SenlerBot/senler-widget/archive/refs/tags/v2.0.0.tar.gz
```

## Browser / TypeScript

```ts
import { createSenlerWidgetSession } from '@senlerio/widget';

const session = createSenlerWidgetSession({
  src: 'https://YOUR_WIDGET_HOST/widget-loader.js',
  config: { channel_id: 'YOUR_CHANNEL_ID', lang: 'ru' },
});
const widget = await session.ready;
widget.open();
// When the host page integration is removed:
session.destroy();
```

`session.ready` waits for successful chat initialization and authentication. It
rejects on the first initialization failure and destroys that session. Create a
new session to retry (or change `retryKey` in React). Destroying a pending session
rejects with `AbortError`. In `button_only` mode, readiness means the button is
initialized; no chat is loaded.

The optional `config.onReady(detail)` callback receives `channel_id`,
`display_mode`, and `button_only` once per instance. `config.onError(error)`
receives the first startup failure as a `SenlerWidgetInitializationError` with
`code`, `message`, and `retryable`. Startup without a result times out after 90 s.
Invalid configuration also throws synchronously from `init`.

For direct `init` integrations, existing retries continue after `onError`, so
`onReady` may follow if initialization recovers. Destroying or replacing an
instance suppresses its later callbacks. Message errors and reconnects after
readiness do not trigger these callbacks. Script-loading failures reject the
loader/session Promise before `init` can run.

`loadSenlerWidget({ src, timeoutMs?, nonce?, signal? })` only loads and validates
the runtime. Use it when you own initialization yourself. It shares one script
between concurrent callers, waits for the bootstrap stub to become ready, and
rejects on a load error, timeout, or incompatible protocol. An aborted caller does
not cancel other callers. The first call supplies the shared load's timeout (15 s
by default) and CSP nonce. One loader URL and one active session are supported per
page. Session cleanup is idempotent and cancels initialization while loading.

Use type-only imports when a script is already managed by your page:

```ts
import type { SenlerWidgetInitConfig } from '@senlerio/widget';
const config: SenlerWidgetInitConfig = { channel_id: 'YOUR_CHANNEL_ID' };
window.SenlerWidget?.init(config);
```

The root declaration includes the optional global `window.SenlerWidget`. For a
script-only integration, add `@senlerio/widget/global` to `compilerOptions.types`.
The global is undefined until the loader is present. Imports are safe during SSR;
loading and initialization require a browser.

## Configuration priority

For `theme` and `features`, explicitly supplied `init` fields override saved
channel settings, which override defaults. Nested objects merge field by field;
omitted fields and `undefined` inherit. Explicit `false`, a valid `0`, and empty
arrays are preserved; arrays replace the whole list for that language. For
example, `theme: { height: 700 }` fixes only the popup height. Other settings
continue to inherit from the channel on each initialization.

The Static / Dynamic selector and `config_source` option have been removed.
Remove `config_source` from existing integrations before updating the runtime.
Generated embed code contains connection settings without a full theme/features
snapshot. Language and placement are separate options in the integration code.

## React

React 18 or 19 is an optional peer and is imported only by `@senlerio/widget/react`.
There is no dependency on `@senlerio/ui`, React DOM, or CSS.

```tsx
import { useMemo } from 'react';
import { SenlerWidget, useSenlerWidget } from '@senlerio/widget/react';

function OpenButton() {
  const { api, status, error } = useSenlerWidget();
  if (error) return <span role="alert">{error.message}</span>;
  return <button disabled={status !== 'ready'} onClick={() => api?.open()}>Chat</button>;
}

export function Chat() {
  const config = useMemo(() => ({ channel_id: 'YOUR_CHANNEL_ID' }), []);
  return <SenlerWidget
    src="https://YOUR_WIDGET_HOST/widget-loader.js"
    config={config}
    containerProps={{ style: { height: 600 } }}
  >
    <OpenButton />
  </SenlerWidget>;
}
```

`SenlerWidget` owns an embedded container. For a popup or an existing container,
use `SenlerWidgetProvider` and `useSenlerWidget`, or the standalone
`useSenlerWidgetController` hook. They return `{ api, status, error }` and clean up
on unmount, including StrictMode's extra setup/cleanup cycle. Keep `config` stable
with `useMemo`: changing it deliberately destroys and initializes the session.
Pass `null` to defer initialization, and change `retryKey` to retry a failed load.

The `runtime` prop updates persistent settings without reinitialization. Send
messages and navigation commands through `api.open()` / `api.updateRuntime()`;
they are intentionally excluded from persistent props to avoid replaying them.

## Contract and development

Version 2 requires runtime protocol 4 with initialization-result callbacks
(`onReady` and `onError`). Update both the loader and iframe before upgrading
the host integration from version 1; earlier protocol-4 runtimes without these
callbacks are incompatible. The `@senlerio/widget/contract` entry exports the protocol version and
field lists used by the widget loader, checked against the TypeScript interfaces.
The loader and iframe use the canonical package sources in this repository, so
local contract changes can be tested before publishing a package version.

Canonical sources live in `aibot-widget/packages/widget`; the public GitHub
repository contains this package and its compiled `dist`. Run `npm ci` and
`npm run build` to check declarations, compile, and test loader/React lifecycles.
No installation or import downloads the iframe runtime; only an explicit load does.
