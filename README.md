# @senlerio/widget

Typed browser integration for Senler Widget: the `window.SenlerWidget` contract,
a shared script loader and an optional React integration. No runtime dependencies.
The widget application is loaded from your widget host, separately from this package.

```sh
npm install @senlerio/widget@https://github.com/SenlerBot/senler-widget/archive/refs/tags/v1.0.0.tar.gz
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

Version 1 requires runtime protocol 4. Upgrade the runtime and host integration
together. The `@senlerio/widget/contract` entry exports the protocol version and
field lists used by the widget loader, checked against the TypeScript interfaces.

Canonical sources live in `aibot-widget/packages/widget`; the public GitHub
repository contains this package and its compiled `dist`. Run `npm ci` and
`npm run build` to check declarations, compile, and test loader/React lifecycles.
No installation or import downloads the iframe runtime; only an explicit load does.
