# @senlerio/widget

Typed browser integration for Senler Widget: the `window.SenlerWidget` contract,
a shared script loader and an optional React integration. No runtime dependencies.
The widget application is loaded from your widget host, separately from this package.

**Currently published 2.x package (not the v3 API documented below):**

```sh
npm install @senlerio/widget@https://github.com/SenlerBot/senler-widget/archive/refs/tags/v2.3.0.tar.gz
```

**v3 preview for development:**

```sh
npm install @senlerio/widget@https://github.com/SenlerBot/senler-widget/archive/refs/tags/v3.0.0-next.0.tar.gz
```

`3.0.0-next.0` is a prerelease requiring a matching v3 loader/iframe (protocol 10)
and the updated API on your development host. Publishing this package does not
deploy those services. The production `/v3/` host is not available at the time
of this preview; do not switch production sites to it.
Public 2.x integrations must remain on a matching 2.x loader until they migrate.
The preview is published only as its version tag; GitHub `main` stays on v2.

### Compatibility and public releases

The production host keeps `/widget-loader.js`, `/widget-loader.min.js` and the
root iframe application on the supported v2 release (runtime protocol 4).
Existing sites can continue using `open({ message })`, `updateRuntime()` and
`senler-widget:runtime-message-result` without changing their embed code.

New integrations use `/v3/widget-loader.js` (or its `.min.js` variant) and the
matching `/v3/` iframe (runtime protocol 10). Cabinet also uses this line.
Both lines share the API, which must continue accepting v2 requests.
The development server serves the new application at `/v3/`.

The hosting path is a compatible major line, not a frozen package release:
an installed SDK 3.0 must keep working after the host updates to 3.1.
Compatible fixes and optional additions stay on `/v3/`; removing a method,
requiring a new argument or changing existing behavior incompatibly requires a
new major package and hosting path.

The package version, runtime protocol and release commit identify different things.
The protocol describes communication between the loader and iframe; do not bump
it for every release or for backward-compatible additions. Runtime protocol checks
remain strict: accepting any larger number would hide incompatible changes.
Ship hosted support before publishing a stable SDK that needs new capabilities.
A prerelease may be published as a separate tag for a matching development host;
it must document the required services and leave the stable branch unchanged.
Rollbacks must also preserve capabilities used by already published SDKs.
Published package versions and their artifacts are immutable.

One page loads one major SDK line. Multiple widget instances on that page use
that same line; v2 and v3 cannot share the `window.SenlerWidget` global.

The build and activation checks verify the preserved v2 files; upgrading the
current SDK cannot silently replace them. See the repository README for the
archived distribution and compatibility tests. A compatible v2 patch is a
separate verified release that replaces the pinned archive, not a rebuild on
every v3 update.

## Browser / TypeScript

### Promise API

This API is available in the v3 preview. It requires the updated SDK,
hosted loader, iframe and API together. Published v2.3.0 does not yet contain it.

```ts
import { createSenlerWidget } from "@senlerio/widget";

const widget = await createSenlerWidget({
  src: "https://YOUR_WIDGET_HOST/v3/widget-loader.js",
  channelId: "YOUR_CHANNEL_ID",
  lang: "ru",
});
widget.open();
widget.close();
widget.toggle();
widget.isOpen();
widget.configure({ lang: "ru", themeMode: "dark" });
widget.setContext({ page: "product", productId: "42" });

const result = await widget.ask({ text: "Explain this product briefly" });
console.log(result.answers.map((answer) => answer.text));
await widget.ask({ dialogId: result.dialogId, text: "Make that shorter" });
await widget.ask({ newDialog: true, text: "A separate question" });
widget.selectDialog(result.dialogId); // Explicitly show a particular conversation.
widget.selectDialog(result.dialogId, { contextItems: [], focusInput: true }); // Replace the next message's context when reopening a discussion.
const dialogId = await widget.startNewDialog(); // Create and select a saved chat.
await widget.ask({ text: "Hello", dialogId }); // Send to that exact chat.
```

`configure()` accepts presentation settings only and rejects message/dialog
commands. `setContext()` replaces host context; each `ask()` captures its own
snapshot, shallow-merged with its optional `context` object. Requests omit the
visible chat's composer drafts and attachments. Without `dialogId` or `newDialog`,
`ask()` sends to the current chat (creating it on the first message). Explicit
`dialogId` and `newDialog: true` do not change the visible chat and cannot be combined.
The normal agent settings, billing, authorization and chat processing rules apply.
`ask()` accepts the same message content as the composer: `text`, `attachments`,
`replyToEventId`, and `contextItems`. Attachments are confirmed file references
(`{ id: fileId }`), up to 10 per message, uploaded for the current widget lead.
Pass `text: ''` for an attachment-only message. Context alone cannot be sent as
an empty message. `hidden: true` on a context item hides its chip only in the
visitor widget; the complete item is stored and sent to the agent. Operators
see the item in Dialogs, with “Hidden in widget” inside its expanded dropdown.

```ts
await widget.ask({
  text: "Check this file",
  attachments: [{ id: confirmedUpload.fileId }],
  replyToEventId: eventId,
  contextItems: [
    {
      id: "order:123",
      kind: "order",
      role: "business_context",
      hidden: true,
      display: { label: "Order 123" },
      payload: { orderId: 123 },
    },
  ],
});
```

For an existing dialog, `ask()` also uses the answering agent's message-queue
setting (including an agent selected by `ref`). With the queue enabled, each
call is a separate queued question and its Promise waits for that question's
answers. With it disabled, normal chat interruption/coalescing rules apply;
a replaced question can finish as `superseded`. Parallel Promises do not force
parallel agent runs in one dialog. Independent dialogs can run concurrently.

```ts
// No ID needs to be stored by your site, even after a reload.
const editorDialog = await widget.getOrCreateDialog({
  ref: "text-edit",
  showInWidgetHistory: false,
});
const result = await widget.ask({
  dialogId: editorDialog.id,
  includeHistory: false,
  includeActions: false,
  text: JSON.stringify({
    instruction: "Improve the wording",
    text: field.value,
  }),
});
if (result.status === "completed" && result.answers.length === 1) {
  showSuggestion(result.answers[0].text);
}
```

The resolver atomically reuses one dialog per widget channel, authenticated lead
and `ref`, including concurrent calls from different tabs. Visibility is applied
only on creation: `false` excludes it from the widget list/search; Cabinet still
shows it as an ordinary dialog. All messages are stored. `includeHistory: false`
omits previous messages from model input. `includeActions: false` omits registered
host actions; configure the chosen agent's other tools separately.

The resolved dialog remembers its default `ref`. A per-message `ref` overrides
routing for that message without reassigning the current chat. Configure the
editor's published keyword `text-edit`, restrict it to the widget channel, and
leave assignment to all messages off. A `ref` matches published keyword routes
exactly; existing start-payload prefix routes also apply. Unknown or conflicting
routes are errors. A new independent dialog never replaces the resolver binding.

```ts
const [first, second] = await Promise.all([
  widget.ask({
    dialogId: editorDialog.id,
    includeHistory: false,
    text: "First task",
  }),
  widget.ask({ newDialog: true, text: "Another task" }),
]);
```

Every call has its own Promise and request identity. Up to four requests execute
concurrently, with at most 64 pending calls. Messages in the same dialog follow
ordinary server ordering/coalescing; a newer message can supersede a waiting
response. Different dialogs keep independent conversations. Recovery uses exact
source-message and request IDs, never the latest message.

`onAnswer` is called once per completed visible agent answer, as soon as observed.
Each callback includes `agentId`, `answersReceived`, `respondersTotal`, `hasMore`.
The final result contains all `answers` and each responder's terminal status.
Background agents with user replies disabled are excluded from the expected count.
A responder that deliberately stays silent finishes with `no_answer`.
Optional `onChunk` receives live text fragments when streaming is enabled in the
agent settings; it does not enable or disable streaming. Each fragment contains
`requestId`, `dialogId`, `agentId`, `streamId`, optional `iterationId`, `index`
(zero-based within that iteration), and `text` (only the new fragment). A tool
call can start another iteration whose index restarts at zero. Separate text by
request, stream and iteration, since agents and requests can answer concurrently.
A reconnect or late subscription
can miss fragments; `onAnswer` supplies the complete authoritative reply even
when no chunks arrive. Streaming fragments are not replayed through HTTP.
Final request statuses are `completed`, `partial`, `failed`, `cancelled`, or
`superseded`; `partial` retains successful replies alongside failed responders.

```ts
const controller = new AbortController();
const pending = widget.ask({
  text: "Rewrite this paragraph",
  signal: controller.signal,
  timeoutMs: 60_000,
  onChunk({ agentId, streamId, iterationId, index, text }) {
    // Append text to the preview for this stream. index can reveal gaps.
    appendLiveText(agentId, streamId, iterationId, index, text);
  },
  onAnswer(answer) {
    // Replace any partial preview with the complete answer.
    console.log(
      `${answer.answersReceived}/${answer.respondersTotal}`,
      answer.text,
    );
  },
  onStatus({ requestId, dialogId, status }) {
    // status: queued | sending | waiting
  },
});
try {
  const result = await pending;
} catch (error) {
  // AbortError for cancellation; SenlerWidgetRequestError exposes code,
  // requestId and, once known, dialogId. Invalid input throws TypeError.
}
// In your cancel button: controller.abort();
```

Timeout defaults to 120 seconds (maximum 300 seconds), including queue time.
Abort/timeout stop waiting and remove calls still queued inside this SDK instance.
Work already accepted by the server, including questions in its message queue,
may continue, including tools and billing. Other requests
remain usable. `destroy()` aborts this instance's pending callers, releases its
listeners and destroys only its own UI.

For a safe retry after a connection failure, supply a stable `requestId`:

```ts
const request = { requestId: crypto.randomUUID(), text: "Rewrite this paragraph", newDialog: true };
const send = () => widget.ask(request);
const result = await send();
// Your Retry button calls send() again with the same request.
```

Within the same channel and lead, the server restores the original accepted send
or queued question and its selected dialog. It does not send a second message,
even with `newDialog: true`. Different content under that ID fails with
`request_conflict`; keep text, attachments, ref, context and processing options
unchanged. Multiple waiters remain independent. To recover after a reload,
retain the request and ID on your website and restore the same visitor session.
IDs are 1–128 characters matching `[A-Za-z0-9][A-Za-z0-9._:-]*`.
Omitting `requestId` generates a new ID on every call.

Several calls to `createSenlerWidget()` may use the same or different channel IDs.
Each has its own current dialog and pending requests. Use separate embedded
containers when displaying more than one widget. The script loader is shared.

```ts
const field = document.querySelector<HTMLTextAreaElement>("#description")!;
const editor = widget.createTextEdit({
  fieldId: "description",
  getValue: () => field.value,
  setValue: (value) => {
    field.value = value;
  },
  getSelection: () => ({
    start: field.selectionStart,
    end: field.selectionEnd,
  }),
});
const preview = await editor.generatePreview({
  instruction: "Make the wording clearer",
  dialogId: editorDialog.id,
  scope: "field", // Or "selection" for a non-empty selected range.
});
showPreview(preview.sourceText, preview.replacementText); // Your review UI.
acceptButton.onclick = () => editor.apply(preview);
// On unmount: editor.destroy(); widget.destroy();
```

The helper requests an ordinary text answer; no preview action/button tool is
required. It defaults to no history and no host actions, requires exactly one
successful answer, and does not disable other agent tools or shorten its system
instruction. A short instruction and a suitable agent/model remain separate
channel configuration choices. No speedup factor is guaranteed by the SDK.

`apply()` rejects a changed field (`stale_preview`), a forged/foreign preview and
an already-applied preview. Rich editors should supply `getRevision()` to detect
edit-and-undo changes too. Selection offsets are UTF-16 positions in **exactly the
string returned by `getValue()`**. Adapt rich-editor selections to Markdown source
offsets when returning Markdown; rendered-text offsets cannot index escaped
Markdown. Repeated edits capture the newly applied value.

```ts
const unregister = widget.registerAction("getCartCount", {
  description: "Return the number of items in the cart",
  returnsResult: true,
  handler: () => ({ count: cart.items.length }),
});
const unsubscribe = widget.on("close", () => saveDraft());
// Events: open | close | destroy | messageSent.
unsubscribe();
unregister();
```

Actions retain the existing claim/result protocol. Duplicate names are rejected;
removing one registration preserves other actions. `ask()` is unavailable in `button_only` mode, which has no chat iframe.

### Events and website analytics

Use instance events for website goals; `senler-widget:stage` is a diagnostic
stream and must not drive conversion tracking. To observe even the first launcher
click while the iframe is loading, subscribe immediately after the synchronous
`create()` call. Load the matching 3.x script first, then create the instance:

```js
import { loadSenlerWidget } from "@senlerio/widget";

const sdk = await loadSenlerWidget({
  src: "https://YOUR_WIDGET_HOST/v3/widget-loader.js",
});
const widget = sdk.create({ channel_id: "YOUR_CHANNEL_ID" });
const counterId = 12345678; // Your site's configured Yandex Metrica counter.

const stopOpen = widget.on("open", () => {
  window.ym?.(counterId, "reachGoal", "widget_opened");
});
const stopMessages = widget.on("messageSent", ({ source }) => {
  if (source === "widget") {
    window.ym?.(counterId, "reachGoal", "chat_message_sent");
  }
});

// When removing this integration: stopOpen(); stopMessages(); widget.destroy();
```

`open`/`close` describe panel state transitions, including launcher clicks,
API commands and display-mode changes. Repeated `open()` on an open panel emits
nothing. An initially embedded panel emits no opening event. These events do not
mean that the chat is authenticated or that a visitor deliberately opened it;
sites with automatic opening decide whether to count those transitions. The
Promise returned by `createSenlerWidget()` and `session.ready` waits for readiness,
so subscriptions installed after awaiting it cannot observe earlier transitions.

`messageSent` means the server has accepted a user message, before an agent
answers. It includes `requestId`, `dialogId`, `source: 'widget' | 'api'`, and
either `eventId` (immediate send) or `queueId` (durable queued question). Queue
acceptance counts even if the agent has not started; later queue processing does
not emit it again. Failed submissions, agent replies, opening a panel and creating
an empty dialog do not emit this event. `widget` covers the composer and greeting
buttons; `api` covers `ask()`, including text-edit requests. A site implementing
its own chat through `ask()` may intentionally count `api` too.

Notifications belong to one widget instance. Duplicate acknowledgements for the
last 1024 `(dialogId, requestId)` pairs are suppressed; a reload does not replay
history. The payload is read-only and contains no message text or contacts.
Handlers return no result, and a handler exception does not prevent other handlers
from running. `on()` returns an unsubscribe function; destroying the instance
removes all listeners. JavaScript and React's `api.on()` share this contract.

Create the matching goals in the site's analytics service. Count goal visitors
or visits to measure people who started a chat; counting goal occurrences counts
messages instead. Contact conversion must follow successful saving by the site's
action or server automation; `messageSent` does not recognize or save contacts.
Browser `reachGoal` calls use the site's counter and need no ClientID in the
widget. The SDK does not automatically collect analytics identifiers or configure
server-side conversions.

### Visitor identifiers and visit attribution

`setAnalytics()` works on a ready, authenticated widget (`await session.ready`,
React's `status === 'ready'`, or `onReady`). It does not create a dialog or send
an agent message. The provider namespace is open; no provider SDK is loaded by
this method.

```ts
await widget.setAnalytics({
  provider: "yandex_metrica",
  sourceId: "111",
  identifiers: { client_id: "000123456789" },
  visit: { yclid: "click-from-this-visit" }, // optional
});
await widget.setAnalytics({
  provider: "google_analytics",
  sourceId: "G-ABC123",
  identifiers: { client_id: "123.456" },
  visit: { session_id: "1780000000" },
});
const answer = await widget.ask({ text: "Help me choose a product" });
```

Pass IDs returned by the site's configured tags. Yandex exposes
[`getClientID`](https://yandex.ru/support/metrica/ru/objects/get-client-id);
GA4 exposes [`gtag('get', measurementId, field, callback)`](https://developers.google.com/tag-platform/gtagjs/reference#get).
A site with its own system can use e.g. `provider: 'my_analytics'` and
`identifiers: { visitor_id: '...' }`. `sourceId` identifies the counter/stream
within that provider; self-hosted systems should include their installation in
it, e.g. `analytics.example:42`. Keep IDs as strings, including leading zeroes.

Each successful call replaces **only this provider + sourceId** in this widget
instance. It replaces the entire `identifiers` and `visit` objects; omitting
`visit` removes the previous session/click context for that source. Other counters
and other widget instances are independent. Await the update before an `ask()`
that must include it. Regular composer messages also capture this context.
Queued messages and HTTP retries retain the original snapshot, even if a new
visit is set while the agent is working. Analytics is not part of `setContext()`
and is not included in the agent's instruction or context chips.

```ts
// Stop attaching one counter to future messages in this instance.
await widget.setAnalytics({
  provider: "yandex_metrica",
  sourceId: "111",
  identifiers: {},
});
```

This clears the current source, not historical observations. Context is kept in
the iframe's memory, reset when its authenticated lead changes or it is destroyed,
and must be supplied again on a new page. If tracking is unavailable, omit it or
clear the source; ordinary chat requires no analytics. An unsuccessful update
rejects its promise and does not change the current snapshot.

The server derives the lead from the widget session and binds `site_origin` to
the allowed host-page origin. Each distinct website + provider + source +
identifier type + value is added atomically to `lead.analytics_identifiers`.
Repeated IDs are a no-op; other sites' and browsers' IDs remain separate. No
observation timestamps are written. Session/click values are retained only in
the originating message/subscription snapshot. IDs are browser-reported
observations, not proof of identity and never a reason to merge leads.

The authenticated application API returns `analytics_identifiers` in the normal
lead response (`GET /api/leads/{id}`); an empty list is `[]`. This is an inventory
of known identifiers, not the visit to use for a conversion. For the latter,
read `source_context.analytics` on the originating message or `payload.analytics`
on the subscription event. Funnel sources can match external records using
`analytics_binding: { provider, source_id, identifier_type, site_origin? }` instead
of `identity_binding` lead variables. A match to multiple leads remains ambiguous.
This storage does not automatically send conversions to vendors.

Limits: 8 sources per instance, 8 string entries in each map, 256 characters per
value. Provider and map keys use lower-case letters, digits and underscores;
source IDs accept letters, digits, `.`, `_`, `:`, `-` up to 128 characters.

### Contact details and prepared drafts

```ts
await widget.updateLead({ phone: "+79990000000", email: "visitor@example.com", firstName: "Maria" });
await widget.setDraft({ text: "Please explain the delivery terms." });
widget.open();
// Only when you intend to replace the visitor's existing text:
await widget.setDraft({ text: "Replacement text", replace: true });
```

`updateLead` saves only supplied `phone`, `email`, `firstName`, `lastName` and
`avatarUrl` fields for the authenticated lead. Omitted fields remain unchanged;
empty values and identity fields are rejected. It does not recreate the session,
switch visitors or create a dialog. Profile update calls are serialized per instance.

`setDraft` fills the current composer's text without sending, creating a dialog,
or changing attachments. Closed widgets retain the text for opening. Existing
different text is protected with `draft_not_empty` unless `replace: true` is set.
Use `{ text: "", replace: true }` to clear it. Sending or editing an existing
message rejects with `composer_busy`, even when replacement is requested.

### Files and rich replies

```ts
const dialogId = await widget.startNewDialog();
const attachment = await widget.uploadFile(fileInput.files[0], {
  dialogId,
  signal: abortController.signal,
  onProgress: (percent) => console.log(percent),
});
const result = await widget.ask({ dialogId, text: 'Summarize this file', attachments: [attachment] });
for (const answer of result.answers) {
  console.log(answer.format, answer.text, answer.attachments, answer.buttons);
}
```

`uploadFile()` uploads and confirms the file before resolving. It sends no message;
100% progress means server confirmation. It requires a saved dialog belonging to
the current visitor. `signal` cancels pending transport work, `timeoutMs` defaults
to 120 seconds (maximum 300 seconds). The result contains `id`, `url`, `name`,
`mimeType`, `size` and optional `durationSeconds`.

Answers and incoming messages contain `format: 'plain_text' | 'markdown'`,
`attachments` and rows of `buttons`. Text may be empty for a file-only message.
Receiving a button does not execute it. A custom UI uses `clickButton()` for
callbacks, polls and host actions; URL buttons may be rendered as normal links.

### Visitor session and notifications

```ts
const unsubscribe = widget.on('unreadCountChanged', (count) => { badge.textContent = String(count); });
widget.on('messageReceived', (message) => console.log(message.sender, message.text));
// On logout from your website:
await widget.resetSession();
// Create another widget with the next visitor's identity, or without user for anonymous access.
```

Credentials are stored by site origin, channel and external identity. Reloading
restores the visitor where browser storage is available. Browser privacy settings
can restrict embedded storage; in that case credentials last for the instance.
`destroy()` disposes UI and pending client requests while retaining credentials.
`resetSession()` clears this visitor's local credentials and disposes the widget;
other open instances sharing that stored scope also close. It does not delete
server history, revoke copied tokens, or log the visitor out of your website.

`unreadCountChanged` replays the current known count on subscription and then
emits changes. It totals all visible, non-archived dialogs, independent of history
pagination. `messageReceived` emits new agent/operator messages from visible
chats, including ordinary chat replies; duplicate event IDs are suppressed.
It is a live notification, not a history synchronization API. Hidden SDK dialogs
use `ask().answers`/`onAnswer` instead. Streaming fragments follow the agent's
streaming setting and are available through `onChunk` on the corresponding ask.

Request failures preserve `code`, `requestId`, known `dialogId`, `retryable`, and
optional `retryAfterMs`. Retry an accepted question with its original `requestId`
and identical content. A new ID is a new question and can repeat agent actions.
While a question waits, `onStatus.reason` reports a server queue pause reason.
Terminal results may have `errorCode`; inspect `status` even when the Promise resolves.

### Custom chat UI

All chat-data methods are available in both the normal widget and
`headless: true`. Headless hides the launcher and does not mount the built-in
chat view. The authenticated iframe still runs; this is not an iframe-free HTTP
client. `open()` / `toggle()` do not show a headless instance. This init option
cannot be combined with `button_only` or embedded mode.

```ts
import { createSenlerWidget, mergeWidgetMessages, type SenlerWidgetMessage } from '@senlerio/widget';

const widget = await createSenlerWidget({
  src: 'https://YOUR_WIDGET_HOST/v3/widget-loader.js',
  channelId: 'YOUR_CHANNEL_ID',
  headless: true,
});
const settings = await widget.getSettings();
const dialogs = await widget.getDialogs({ limit: 20 });
const dialogId = dialogs.items[0]?.id ?? await widget.startNewDialog();

let messages: SenlerWidgetMessage[] = [];
const unsubscribe = widget.subscribeDialog({
  dialogId,
  onUpdate(update) {
    if (update.type === 'snapshot') {
      // Replace pages on initial load or a recovery gap. Lossless reconnects retain them.
      messages = update.messages.items;
      renderQueue(update.state.pending);
    } else if (update.type === 'message') {
      messages = mergeWidgetMessages(messages, [update.message]);
    } else if (update.type === 'state') {
      renderQueue(update.state.pending);
    }
    renderMessages(messages);
  },
  onError(error) { showError(error.code, error.message); },
});
await widget.ask({ dialogId, text: 'Hello' });
// When these messages are actually displayed:
await widget.markRead({ dialogId });
// On unmount / switching chats:
unsubscribe();
```

Import `mergeWidgetMessages` and `SenlerWidgetMessage` from `@senlerio/widget`
when maintaining a typed message array. `ask().answers`, history and subscription
messages share `kind` (`message` or a saved public `error`), `eventId`, `dialogId`, `version`, `timestamp`, `sender`,
`senderId`, `senderName`, `senderAvatarUrl`, `sendingStatus`, `deleted`,
`text`, `format`, `attachments`, and `buttons`. `sender` is `visitor`, `assistant`,
`operator`, or `system`. Merge by ID and version; receiving the same answer in
`onAnswer` and a subscription must not create another bubble.

| Method | Purpose |
| --- | --- |
| `getDialogs({ limit?, before?, query?, offset? })` | Visible dialogs. Use `nextCursor` for ordinary history and `nextOffset` for text search; search requires at least two characters. |
| `getMessages({ dialogId, limit?, before?, after? })` | A page ordered oldest first. Use `olderCursor` to load older messages. The page size is 1–200, default 50. |
| `getDialogState({ dialogId, ref? })` | Unread count, typing, queue policy, pending questions and pause reason. Works for an explicitly addressed hidden dialog too. |
| `subscribeDialog({ dialogId, ref?, limit?, onUpdate, onError })` | Initial snapshot, live messages/updates, state, chunks and stream completion. Returns an unsubscribe function immediately. |
| `getSettings()` | Configured file/voice/emoji features, credit availability, localized greeting and starter texts. `remainingCredits` uses server credit units: 10000 units = 1 credit. |
| `getScheduledActions({ dialogId, cursor? })` | Existing server-visible scheduled actions: `enabled`, `items` (`id`, `title`, `scheduledAt`, `status`), `nextCursor`. |
| `cancelScheduledAction({ dialogId, actionId })` | Cancels a pending action under the same server permissions as the built-in chat. Refresh the list after completion. |
| `getWelcome()` | Signed automation greeting preview without creating a dialog. |
| `markRead({ dialogId })` | Explicitly marks the dialog read using the existing server semantics (all current messages). A hidden iframe never marks the host UI read automatically. |
| `setTyping({ dialogId, typing })` | Sends typing start/stop. Throttle repeated starts on the site, and send false after inactivity or blur. |
| `clickButton({ dialogId, eventId, button, pollSelectedInstanceIds? })` | Dispatches a returned button. Callback identity, permissions and repeatability are checked by the server. Multiple-choice polls send selected instance IDs with the confirmation button. |
| `updateQueuedQuestion({ dialogId, questionId, revision, text })` | Changes only a pending question. The version prevents overwriting an edit from another tab. |
| `cancelQueuedQuestion({ dialogId, questionId })` | Removes a question that has not started sending. Does not stop a running agent. |
| `sendQueuedQuestion({ dialogId, questionId })` | Applies the existing “send now” behavior. |

Queries and commands accept `signal` and `timeoutMs` (default 30 seconds, maximum
300 seconds). For `subscribeDialog`, the timeout covers initial synchronization,
then the subscription stays alive until unsubscribe, abort, session reset or
destroy. `onError` reports terminal subscription failures; re-subscribe when
the cause is resolved. A lossless reconnect preserves loaded pages. A recovery gap produces a new
`snapshot` with `reason: "recovery"` (`"initial"` on first load). Previously loaded
older pages must be reloaded after that snapshot. Discard in-flight old-page responses belonging to an earlier snapshot.

Subscribe before rendering history to avoid the history/subscription race.
The SDK buffers messages during the initial fetch and merges their versions.
Snapshots load at most 200 history events; recovery does not scan the entire
conversation. Queue updates use a bounded read of the subscribed dialog's active
queue every five seconds while its queue is enabled and the connection is up.
This also observes edits made by other tabs; unsubscribing stops these reads.
Queue-management commands for one dialog run in order; older reads cannot
overwrite their confirmed results. Different dialogs and `ask()` remain independent.

`subscribeDialog` includes visitor messages from other tabs and operator/agent
messages. It reports changed attachments and button state as a new version of
the same message. `chunk` includes optional `requestId`, `streamId`, `iterationId`,
`index`, and `text`; streaming still follows agent settings. `requestId` always means the SDK question: it is present when this frame has
correlated the stream with an accepted ask; it is never an internal generation ID.
`streamEnded` identifies one `streamId` with `status: completed | failed | skipped | scheduled`,
optional reason/silent flags and a safe public error. It does not complete the whole
question: `ask()` still waits for its server-defined responders. Saved public errors
are `kind: "error"` history entries with `error.message`, including after reload.
Live `message` updates preserve the originating `streamId` and, when available,
the SDK `requestId`. Replace that stream's draft with the saved message. A successful
`streamEnded` can arrive before or after the message: stop the generation indicator,
but keep its draft until replacement. Its optional `eventId` is an additional link,
not a guarantee that persistence has already finished. Discard drafts for failed,
skipped, silent or scheduled endings, and on a recovery snapshot.
Chunks are transient:
after reload or a gap, display typing and wait for the authoritative final
message. Automatic registered host tool execution uses the same claimed-action flow as
the ready-made chat, including recovery, rather than invoking tools on the site
again just because a message is rendered. Built-in page actions also use one session
executor shared by asks, subscriptions and the ready-made chat. Only the initiating
frame executes them automatically; opening history does not replay other tabs' actions.
Headless has no built-in widget navigation targets; attempting one reports unavailable
instead of waiting for a nonexistent UI. The SDK automatically describes the built-in
interface on each message and server callback, separately from host context.
All twelve context slots remain available in headless mode. The interface flag is
saved with the originating event; it does not disable registered site tools or change
other widgets belonging to the same visitor.

```ts
widget.on('connectionChanged', state => showConnection(state));
widget.on('dialogsChanged', () => refreshMyDialogList());
widget.on('settingsChanged', () => refreshMySettings());
```

The connection listener receives the current state, then changes. List/settings
events are invalidations, not lists of private backend records. Refresh the
relevant public query; coalesce frequent invalidations. Ordinary notifications
are still available through `messageReceived` and `unreadCountChanged`.

For a signed automation greeting, pass its identity with the first question:

```ts
const preview = await widget.getWelcome();
if (preview.token) {
  await widget.ask({
    newDialog: true,
    text: 'Tell me more',
    welcome: { draftId: preview.draftId, token: preview.token },
  });
  // For a callback button in that preview use text: '' and
  // welcome: { draftId, token, buttonId: button.instanceId } instead.
}
```

Refresh an expired preview before reacting. Starter texts from
`getSettings().welcomeButtons` are ordinary `ask({ text })` messages. Registered
custom-action buttons dispatch to the host; `clickButton` resolving confirms
dispatch, not completion of a later AI answer. Prefer an actual `<a>` for URL
buttons so browser popup policies and keyboard navigation work naturally.

The working Vite example is `examples/custom-chat/index.html` in the repository:
connect a permitted channel/loader, select or create a dialog, load older history,
send files, use buttons and edit/cancel queued questions. It uses the public SDK
only, including headless mode and subscription cleanup.

### Explicit session lifecycle

```ts
import { createSenlerWidgetSession } from "@senlerio/widget";

const session = createSenlerWidgetSession({
  src: "https://YOUR_WIDGET_HOST/v3/widget-loader.js",
  config: { channel_id: "YOUR_CHANNEL_ID", lang: "ru" },
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
by default) and CSP nonce. One loader URL and multiple independent sessions are supported per
page. Session cleanup is idempotent and cancels initialization while loading.

Use type-only imports when a script is already managed by your page:

```ts
import type { SenlerWidgetInitConfig } from "@senlerio/widget";
const config: SenlerWidgetInitConfig = { channel_id: "YOUR_CHANNEL_ID" };
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

Set `theme.colors.light` and `theme.colors.dark` with optional HEX `background`
and `accent` values to customize the chat window palette. Omitted or built-in
values keep the original palette.

Set `theme.welcome_icon_url` to an absolute HTTP(S) image URL and
`theme.welcome_icon_shape` to `"circle"` (default) or `"square"` to customize the
welcome screen. An empty URL restores the default icon. The Cabinet uploader
includes a square cropper with a circle/square preview; clipping uses CSS.

Set `welcome: { mode: "centered_text" }` in `init` for a centered greeting, or
`welcome: { mode: "automation_message", automation_id: "AUTOMATION_ID", node_id: "MESSAGE_STEP_UUID" }`
to show a published automation message. Omitting `welcome` inherits channel settings.
The pair must match the channel's default message or an additional allowed starting
message. All allowed messages are available to every widget visitor. No greeting
signature is needed; `user_hash` authentication remains unchanged.
The automation must be running in the channel's project with `widget` enabled.
The server supplies the message, buttons, attachments and sender. Displaying it
creates no dialog or run; the first reaction follows the displayed step's reply
and button settings. The server rechecks permission on reaction, including for
previews displayed before a permission was removed. Invalid selections report an error.

Use synchronous `init.resolveRuntime(context)` to choose `welcome`, `lang`,
`theme_mode`, `border_radius`, and `shell` before the first greeting and whenever
visitor/dialog facts change. `SenlerWidgetRuntimeContext` contains `channelId`,
`visitor: { isNew, identityVerified }`, `dialogs: { count }`, and
`currentDialog: { id } | null`. The count covers all accessible dialogs in this
channel, independently of search/pagination. Opening a new chat keeps its ID
null until communication creates a real dialog.

Return `SenlerWidgetResolvedRuntimeConfig`: each result replaces the previous
computed layer over channel/init/manual runtime settings. Omitted fields inherit
the current base; `{}` removes all computed overrides. For a greeting only when
no dialogs exist, use `context.dialogs.count === 0`. Deleting all dialogs makes
that condition true again. Call `api.refreshRuntime()` after site variables
change. In React, keep `config` stable and read changing host values through refs.
Errors, invalid results, and a 3-second response timeout restore base settings
with a console warning. Promises and commands are unsupported; without a resolver
or in `button_only` mode, refreshing is a no-op.

`configure({ welcome: { mode: "automation_message", automation_id, node_id } })`
changes the greeting before the conversation starts. Existing history is preserved;
in an active dialog the selection applies to the next new dialog. Use
`welcome: { mode: "centered_text" }` for centered text or `welcome: null` to restore
the channel default. Omitting the field keeps the current selection. Switching
creates no dialog or run. `open()` only opens the panel.
See the [greeting configuration](../../../aibot-doc/docs/en/site-actions/widget-settings.md#greeting-type).

The Static / Dynamic selector and `config_source` option have been removed.
Remove `config_source` from existing integrations before updating the runtime.
Generated embed code contains connection settings without a full theme/features
snapshot. Language and placement are separate options in the integration code.

## React

React 18 or 19 is an optional peer and is imported only by `@senlerio/widget/react`.
There is no dependency on `@senlerio/ui`, React DOM, or CSS.

```tsx
import { useMemo } from "react";
import { SenlerWidget, useSenlerWidget } from "@senlerio/widget/react";

function OpenButton() {
  const { api, status, error } = useSenlerWidget();
  if (error) return <span role="alert">{error.message}</span>;
  return (
    <button disabled={status !== "ready"} onClick={() => api?.open()}>
      Chat
    </button>
  );
}

export function Chat() {
  const config = useMemo(() => ({ channel_id: "YOUR_CHANNEL_ID" }), []);
  return (
    <SenlerWidget
      src="https://YOUR_WIDGET_HOST/v3/widget-loader.js"
      config={config}
      containerProps={{ style: { height: 600 } }}
    >
      <OpenButton />
    </SenlerWidget>
  );
}
```

`SenlerWidget` owns an embedded container. For a popup or an existing container,
use `SenlerWidgetProvider` and `useSenlerWidget`, or the standalone
`useSenlerWidgetController` hook. They return `{ api, status, error }` and clean up
on unmount, including StrictMode's extra setup/cleanup cycle. Keep `config` stable
with `useMemo`: changing it deliberately destroys and initializes the session.
Pass `null` to defer initialization, and change `retryKey` to retry a failed load.

The `settings` prop updates presentation without reinitialization: `settings={{ themeMode: "dark", surfaceVisible: true }}`. JavaScript and React expose the same commands: `api.ask()`, `api.startNewDialog()`, `api.selectDialog()`, and `api.open()`. Commands are excluded from persistent props to avoid replaying them.

If your site hides an embedded widget inside its own panel or tab, pass
`surfaceVisible: false` in `init` and report changes with
`api.configure({ surfaceVisible: panelIsVisible })`. This controls read
receipts, not the host's layout. The widget marks messages read only while
its surface and browser tab are visible. Built-in popup open/close is handled
automatically. Authentication, explicit background requests and WebMCP remain
available while the panel is hidden.

## Contract and development

Version 2.2 adds `surfaceVisible`, `resolveRuntime` / `refreshRuntime`, and
`pageElementActions.navigate`. These features require the matching loader and
iframe implementation; updating the SDK package alone does not update the
hosted widget runtime.

Version 3 requires the runtime protocol exported as
`SENLER_WIDGET_RUNTIME_PROTOCOL_VERSION` by `@senlerio/widget/contract`.
`updateRuntime`, `open(config)`,
`createInlineTextEdit`, the `runtime` React prop and the runtime-message-result
window event are removed. Use `configure`, explicit navigation, `ask` and
`createTextEdit` instead. The SDK and loader must be upgraded together; this is a
breaking release. Initialization-result callbacks remain supported
(`onReady` and `onError`). Update both the loader and iframe before upgrading
the host integration; earlier runtimes are incompatible. The `@senlerio/widget/contract` entry exports the protocol version and
field lists used by the widget loader, checked against the TypeScript interfaces.
The loader and iframe use the canonical package sources in this repository, so
local contract changes can be tested before publishing a package version.

Canonical sources live in `aibot-widget/packages/widget`; the public GitHub
repository contains this package and its compiled `dist`. Run `npm ci` and
`npm run build` to check declarations, compile, and test loader/React lifecycles.
No installation or import downloads the iframe runtime; only an explicit load does.

