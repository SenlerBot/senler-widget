import type {
  SenlerWidgetRuntimeConfig,
  SenlerWidgetContextItem,
  SenlerWidgetCustomActionDefinition,
  SenlerWidgetJsonObject,
} from "./types.js";
import type {
  SenlerWidgetAskOptions,
  SenlerWidgetResult,
  SenlerWidgetDialog,
  SenlerWidgetResolveDialogOptions,
  SenlerWidgetNewDialogOptions,
  SenlerWidgetClientMethods,
  SenlerWidgetTextEditor,
  SenlerWidgetMessageSent,
  SenlerWidgetClientEventMap,
} from "./clientTypes.js";
import { SenlerWidgetRequestError } from "./clientTypes.js";
import { createTextEditor } from "./textEdit.js";
import { unsupportedChatMethods } from "./chatTransport.js";
import type { createChatTransport } from "./chatTransport.js";
import type { SenlerWidgetConnectionState } from "./chatTypes.js";
import { normalizeAnalytics, type SenlerWidgetAnalytics } from "./analytics.js";
import {
  normalizeLeadUpdate,
  normalizeDraft,
  type SenlerWidgetLeadUpdate,
  type SenlerWidgetDraftOptions,
} from "./profile.js";
import type {
  SenlerWidgetMessageReceived,
  SenlerWidgetUploadedFile,
  SenlerWidgetUploadOptions,
} from "./messageResult.js";

interface RuntimeOperations {
  updateRuntime(config: SenlerWidgetRuntimeConfig): void;
  setPageContext(items: SenlerWidgetContextItem[]): void;
  isOpen(): boolean;
}

export function createClientMethods({
  runtime,
  execute,
  resolveDialog,
  createDialog,
  setAnalytics,
  uploadFile,
  resetSession,
  updateLead,
  setDraft,
  getActions,
  reportError,
  chat,
}: {
  runtime: RuntimeOperations;
  execute(options: SenlerWidgetAskOptions): Promise<SenlerWidgetResult>;
  resolveDialog(
    options: SenlerWidgetResolveDialogOptions,
  ): Promise<SenlerWidgetDialog>;
  createDialog(options: SenlerWidgetNewDialogOptions): Promise<string>;
  setAnalytics(analytics: SenlerWidgetAnalytics): Promise<void>;
  uploadFile(
    file: File,
    options: SenlerWidgetUploadOptions,
  ): Promise<SenlerWidgetUploadedFile>;
  resetSession(): Promise<void>;
  updateLead(profile: SenlerWidgetLeadUpdate): Promise<void>;
  setDraft(options: SenlerWidgetDraftOptions): Promise<void>;
  getActions(): Record<string, SenlerWidgetCustomActionDefinition>;
  reportError(error: unknown): void;
  chat?: ReturnType<typeof createChatTransport>;
}) {
  let context: SenlerWidgetJsonObject = {};
  let destroyed = false;
  let analyticsUpdate: Promise<void> = Promise.resolve();
  let leadUpdate: Promise<void> = Promise.resolve();
  let visible = runtime.isOpen();
  let unreadCount: number | undefined;
  let resetting: Promise<void> | undefined;
  let connectionState: SenlerWidgetConnectionState | undefined;
  let unsubscribeSession: (() => void) | undefined;
  const controllers = new Set<AbortController>();
  const editors = new Set<SenlerWidgetTextEditor>();
  const listeners: {
    [Event in keyof SenlerWidgetClientEventMap]: Set<
      (detail: SenlerWidgetClientEventMap[Event]) => void
    >;
  } = {
    open: new Set(),
    close: new Set(),
    destroy: new Set(),
    messageSent: new Set(),
    messageReceived: new Set(),
    unreadCountChanged: new Set(),
    connectionChanged: new Set(),
    dialogsChanged: new Set(),
    settingsChanged: new Set(),
  };
  // Bound duplicate acknowledgements to this instance, never retain message text.
  const sentRequests = new Set<string>();
  const receivedMessages = new Set<string>();
  const assertAlive = () => {
    if (destroyed)
      throw new SenlerWidgetRequestError("destroyed", "Widget was destroyed");
  };
  const snapshot = (value: SenlerWidgetJsonObject): SenlerWidgetJsonObject => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new TypeError("context must be a JSON object");
    // Validate before cloning: JSON serialization must not silently remove non-JSON values.
    const visit = (item: unknown, depth: number): void => {
      if (depth > 8) throw new TypeError("context is too deeply nested");
      if (
        item === null ||
        typeof item === "string" ||
        typeof item === "boolean"
      )
        return;
      if (typeof item === "number" && Number.isFinite(item)) return;
      if (
        typeof item !== "object" ||
        item === null ||
        (!Array.isArray(item) &&
          Object.getPrototypeOf(item) !== Object.prototype &&
          Object.getPrototypeOf(item) !== null)
      )
        throw new TypeError("context must contain only JSON values");
      for (const child of Array.isArray(item) ? item : Object.values(item))
        visit(child, depth + 1);
    };
    visit(value, 0);
    const json = JSON.stringify(value);
    if (new TextEncoder().encode(json).length > 16_000)
      throw new TypeError("context is too large");
    return structuredClone(value);
  };
  const emit = <Event extends keyof SenlerWidgetClientEventMap>(
    event: Event,
    detail: SenlerWidgetClientEventMap[Event],
  ) => {
    for (const handler of listeners[event]) {
      try {
        handler(detail);
      } catch (error) {
        reportError(error);
      }
    }
  };
  const methods: SenlerWidgetClientMethods = {
    ...(chat?.methods ?? unsupportedChatMethods()),
    updateLead(value) {
      assertAlive();
      const profile = normalizeLeadUpdate(value);
      const pending = leadUpdate.then(() => {
        assertAlive();
        return updateLead(profile);
      });
      leadUpdate = pending.catch(() => undefined);
      return pending;
    },
    setDraft(options) {
      assertAlive();
      return setDraft(normalizeDraft(options));
    },
    uploadFile(file, options) {
      assertAlive();
      return uploadFile(file, options);
    },
    resetSession() {
      assertAlive();
      return (resetting ??= resetSession().finally(() => {
        resetting = undefined;
      }));
    },
    setAnalytics(value) {
      assertAlive();
      const source = normalizeAnalytics(value);
      const update = analyticsUpdate.then(() => {
        assertAlive();
        return setAnalytics(source);
      });
      // A failed observation must not block later updates or normal chat.
      analyticsUpdate = update.catch(() => undefined);
      return update;
    },
    selectDialog(dialogId, options = {}) {
      assertAlive();
      runtime.updateRuntime({
        dialogId,
        contextItems: options.contextItems,
        focusInput: options.focusInput,
      });
    },
    async getOrCreateDialog(options) {
      assertAlive();
      return resolveDialog(options);
    },
    async ask(options) {
      assertAlive();
      const requestContext = snapshot({
        ...context,
        ...(options.context === undefined ? {} : snapshot(options.context)),
      });
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (options.signal?.aborted) abort();
      else options.signal?.addEventListener("abort", abort, { once: true });
      controllers.add(controller);
      try {
        return await execute({
          ...options,
          context: requestContext,
          signal: controller.signal,
        });
      } finally {
        controllers.delete(controller);
        options.signal?.removeEventListener("abort", abort);
      }
    },
    configure(settings) {
      assertAlive();
      const {
        lang,
        themeMode,
        borderRadius,
        welcome,
        shell,
        surfaceVisible,
        displayMode,
        customActionsLanguage,
        ...unknown
      } = settings;
      if (Object.keys(unknown).length)
        throw new TypeError("configure accepts presentation settings only");
      runtime.updateRuntime({
        lang,
        surfaceVisible,
        display_mode: displayMode,
        customActionsLanguage,
        theme_mode: themeMode,
        border_radius: borderRadius,
        welcome,
        shell,
      });
    },
    setContext(value) {
      assertAlive();
      const next = snapshot(value);
      runtime.setPageContext(
        Object.keys(next).length
          ? [
              {
                id: "sdk:context",
                kind: "host_context",
                role: "business_context",
                display: { label: "Context" },
                payload: next,
              },
            ]
          : [],
      );
      context = next;
    },
    async startNewDialog(options = {}) {
      assertAlive();
      const { signal, timeoutMs, focusInput } = options;
      if (focusInput !== undefined && typeof focusInput !== "boolean")
        throw new TypeError("focusInput must be boolean");
      const contextItems = structuredClone(options.contextItems ?? []);
      const dialogId = await createDialog({ signal, timeoutMs, contextItems });
      assertAlive();
      signal?.throwIfAborted();
      runtime.updateRuntime({
        dialogId,
        contextItems,
        focusInput,
      });
      return dialogId;
    },
    createTextEdit(config) {
      assertAlive();
      const editor = createTextEditor(config, methods.ask);
      const dispose = editor.destroy;
      editor.destroy = () => {
        dispose();
        editors.delete(editor);
      };
      editors.add(editor);
      return editor;
    },
    registerAction(name, definition) {
      assertAlive();
      if (Object.prototype.hasOwnProperty.call(getActions(), name))
        throw new TypeError(`Action ${name} is already registered`);
      runtime.updateRuntime({
        customActions: { ...getActions(), [name]: definition },
      });
      let removed = false;
      return () => {
        if (destroyed || removed) return;
        removed = true;
        const actions = { ...getActions() };
        if (actions[name]?.handler !== definition.handler) return;
        delete actions[name];
        runtime.updateRuntime({ customActions: actions });
      };
    },
    on(event, handler) {
      assertAlive();
      if (
        !Object.prototype.hasOwnProperty.call(listeners, event) ||
        typeof handler !== "function"
      )
        throw new TypeError("Unknown widget event or invalid handler");
      const handlers = listeners[event];
      handlers.add(handler);
      if (
        chat &&
        ["connectionChanged", "dialogsChanged", "settingsChanged"].includes(
          event,
        )
      ) {
        unsubscribeSession ??= chat.subscribeSession((notification) => {
          if (notification.type === "connectionChanged") {
            connectionState = notification.state;
            emit("connectionChanged", notification.state);
          } else emit(notification.type, undefined);
        });
        if (event === "connectionChanged" && connectionState !== undefined) {
          try {
            (handler as (state: SenlerWidgetConnectionState) => void)(
              connectionState,
            );
          } catch (error) {
            reportError(error);
          }
        }
      }
      if (event === "unreadCountChanged" && unreadCount !== undefined) {
        try {
          (handler as (count: number) => void)(unreadCount);
        } catch (error) {
          reportError(error);
        }
      }
      return () => {
        handlers.delete(handler);
        if (
          !listeners.connectionChanged.size &&
          !listeners.dialogsChanged.size &&
          !listeners.settingsChanged.size
        ) {
          unsubscribeSession?.();
          unsubscribeSession = undefined;
          connectionState = undefined;
        }
      };
    },
  };
  return {
    methods,
    notifyUnreadCount(count: number) {
      if (destroyed || count === unreadCount) return;
      unreadCount = count;
      emit("unreadCountChanged", count);
    },
    notifyMessageReceived(detail: SenlerWidgetMessageReceived) {
      if (destroyed || receivedMessages.has(detail.eventId)) return;
      receivedMessages.add(detail.eventId);
      if (receivedMessages.size > 1024) {
        const oldest = receivedMessages.values().next().value;
        if (oldest !== undefined) receivedMessages.delete(oldest);
      }
      // Each listener receives its own snapshot, including nested buttons and attachments.
      for (const handler of listeners.messageReceived) {
        try {
          handler(structuredClone(detail));
        } catch (error) {
          reportError(error);
        }
      }
    },
    notifyMessageSent(detail: SenlerWidgetMessageSent) {
      const key = JSON.stringify([detail.dialogId, detail.requestId]);
      if (destroyed || sentRequests.has(key)) return;
      sentRequests.add(key);
      if (sentRequests.size > 1024) {
        const oldest = sentRequests.values().next().value;
        if (oldest !== undefined) sentRequests.delete(oldest);
      }
      emit(
        "messageSent",
        Object.freeze({
          requestId: detail.requestId,
          dialogId: detail.dialogId,
          source: detail.source,
          ...(detail.eventId
            ? { eventId: detail.eventId }
            : { queueId: detail.queueId }),
        }),
      );
    },
    syncVisibility() {
      const next = runtime.isOpen();
      if (next === visible || destroyed) return;
      visible = next;
      emit(next ? "open" : "close", undefined);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeSession?.();
      for (const editor of editors) editor.destroy();
      for (const controller of controllers) controller.abort();
      controllers.clear();
      emit("destroy", undefined);
      for (const handlers of Object.values(listeners)) handlers.clear();
      sentRequests.clear();
      receivedMessages.clear();
    },
  };
}
