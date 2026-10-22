import type {
  SenlerWidgetCustomActionDefinition,
  SenlerWidgetContextItem,
  SenlerWidgetDisplayMode,
  SenlerWidgetJsonObject,
  SenlerWidgetRuntimeConfig,
  SenlerWidgetLanguage,
  SenlerWidgetThemeMode,
} from "./types.js";
import type { SenlerWidgetMessageContent } from "./messageContent.js";
import type { SenlerWidgetChatMethods } from "./chatTypes.js";
import type {
  SenlerWidgetLeadUpdate,
  SenlerWidgetDraftOptions,
} from "./profile.js";
import type {
  SenlerWidgetMessage,
  SenlerWidgetMessageReceived,
  SenlerWidgetUploadedFile,
  SenlerWidgetUploadOptions,
} from "./messageResult.js";

export type SenlerWidgetRequestStatus = "queued" | "sending" | "waiting";
export interface SenlerWidgetRequestProgress {
  requestId: string;
  dialogId?: string;
  status: SenlerWidgetRequestStatus;
  /** Server reason for waiting, for example a paused agent queue. */
  reason?: string;
}
/** A user message accepted by the server, including a durable queued question. */
export interface SenlerWidgetMessageSent {
  readonly requestId: string;
  readonly dialogId: string;
  readonly source: "widget" | "api";
  /** Present for immediate delivery. A queued question has queueId instead. */
  readonly eventId?: string;
  readonly queueId?: string;
}
export interface SenlerWidgetClientEventMap {
  connectionChanged: import("./chatTypes.js").SenlerWidgetConnectionState;
  dialogsChanged: void;
  settingsChanged: void;
  open: void;
  close: void;
  destroy: void;
  messageSent: SenlerWidgetMessageSent;
  messageReceived: SenlerWidgetMessageReceived;
  unreadCountChanged: number;
}
export interface SenlerWidgetAnswer extends SenlerWidgetMessage {
  requestId: string;
  agentId: string;
  answersReceived: number;
  respondersTotal: number;
  hasMore: boolean;
}

/** One live text fragment. The completed onAnswer reply remains authoritative. */
export interface SenlerWidgetChunk {
  requestId: string;
  dialogId: string;
  agentId: string;
  streamId: string;
  /** A tool call can start another generation within the same stream. */
  iterationId?: string;
  /** Zero-based fragment index within the generation iteration. */
  index: number;
  text: string;
}
export interface SenlerWidgetResult {
  requestId: string;
  dialogId: string;
  status: "completed" | "partial" | "failed" | "cancelled" | "superseded";
  answers: SenlerWidgetAnswer[];
  responders: {
    agentId: string;
    status: "answered" | "no_answer" | "failed" | "cancelled" | "superseded";
  }[];
  errorCode?: string;
}
export interface SenlerWidgetDialog {
  id: string;
  ref: string;
  showInWidgetHistory: boolean;
}
export interface SenlerWidgetResolveDialogOptions {
  ref: string;
  /** Applied when the dialog is created. Does not change an existing dialog. */
  showInWidgetHistory?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}
export interface SenlerWidgetDialogSelectionOptions {
  /** Context for the next message typed in the selected chat. */
  contextItems?: SenlerWidgetContextItem[];
  focusInput?: boolean;
}
export interface SenlerWidgetNewDialogOptions extends SenlerWidgetDialogSelectionOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}
export interface SenlerWidgetAskOptions extends SenlerWidgetMessageContent {
  /** First reaction to getWelcome(); use with newDialog: true. */
  welcome?: { draftId: string; token: string; buttonId?: string };
  /** Reuse for retries of the same question; different content is rejected. */
  requestId?: string;
  /** Omit to send to the currently selected chat. */
  dialogId?: string;
  /** Create an independent dialog without changing the visible chat. */
  newDialog?: boolean;
  /** Request routing; defaults to the dialog's ref. */
  ref?: string;
  /** Previous messages remain stored even when omitted from the model context. */
  includeHistory?: boolean;
  /** Expose registered host actions to this request. Defaults to true. */
  includeActions?: boolean;
  /** Shallow merge with the context captured by setContext(). */
  context?: SenlerWidgetJsonObject;
  signal?: AbortSignal;
  /** Includes time in the queue. Default 120 seconds, maximum 5 minutes. */
  timeoutMs?: number;
  onStatus?: (progress: SenlerWidgetRequestProgress) => void;
  onAnswer?: (answer: SenlerWidgetAnswer) => void;
  /** Receives text fragments when streaming is enabled in the agent settings. */
  onChunk?: (chunk: SenlerWidgetChunk) => void;
}
export interface SenlerWidgetSettings {
  surfaceVisible?: boolean;
  displayMode?: SenlerWidgetDisplayMode;
  customActionsLanguage?: "ru" | "en";
  lang?: SenlerWidgetLanguage;
  themeMode?: SenlerWidgetThemeMode;
  borderRadius?: number;
  welcome?: SenlerWidgetRuntimeConfig["welcome"];
  shell?: SenlerWidgetRuntimeConfig["shell"];
}
export interface SenlerWidgetTextRange {
  /** UTF-16 offsets into exactly the string returned by getValue(). */
  start: number;
  end: number;
}
export interface SenlerWidgetTextEditConfig {
  fieldId: string;
  getValue(): string;
  setValue(value: string): void;
  getSelection?(): SenlerWidgetTextRange | null;
  /** Use an editor revision to detect edits followed by undo as well. */
  getRevision?(): string | number;
}
export interface SenlerWidgetPreviewOptions extends Omit<
  SenlerWidgetAskOptions,
  "text"
> {
  instruction: string;
  scope?: "field" | "selection";
}
export interface SenlerWidgetTextPreview {
  readonly fieldId: string;
  readonly requestId: string;
  readonly dialogId: string;
  readonly sourceText: string;
  /** The full field value after replacing the requested range. */
  readonly replacementText: string;
  readonly selectedText: string;
  readonly selectedTextReplacement: string;
}
export interface SenlerWidgetTextEditor {
  generatePreview(
    options: SenlerWidgetPreviewOptions,
  ): Promise<SenlerWidgetTextPreview>;
  apply(preview: SenlerWidgetTextPreview): void;
  destroy(): void;
}
export interface SenlerWidgetClientMethods extends SenlerWidgetChatMethods {
  updateLead(profile: SenlerWidgetLeadUpdate): Promise<void>;
  /** Fill the current composer without sending or creating a dialog. */
  setDraft(options: SenlerWidgetDraftOptions): Promise<void>;
  /** Upload to an existing dialog; sends no message. */
  uploadFile(
    file: File,
    options: SenlerWidgetUploadOptions,
  ): Promise<SenlerWidgetUploadedFile>;
  /** Clear this site's visitor credentials and destroy this instance. Initialize again to sign in. */
  resetSession(): Promise<void>;
  /** Save visitor IDs for the authenticated lead and replace this source's current visit context. Creates no dialog. */
  setAnalytics(
    analytics: import("./analytics.js").SenlerWidgetAnalytics,
  ): Promise<void>;
  selectDialog(
    dialogId: string,
    options?: SenlerWidgetDialogSelectionOptions,
  ): void;
  ask(options: SenlerWidgetAskOptions): Promise<SenlerWidgetResult>;
  getOrCreateDialog(
    options: SenlerWidgetResolveDialogOptions,
  ): Promise<SenlerWidgetDialog>;
  configure(settings: SenlerWidgetSettings): void;
  setContext(context: SenlerWidgetJsonObject): void;
  /** Creates a server dialog, selects it, and returns its ID. Sends no message. */
  startNewDialog(options?: SenlerWidgetNewDialogOptions): Promise<string>;
  createTextEdit(config: SenlerWidgetTextEditConfig): SenlerWidgetTextEditor;
  registerAction(
    name: string,
    action: SenlerWidgetCustomActionDefinition,
  ): () => void;
  on<Event extends keyof SenlerWidgetClientEventMap>(
    event: Event,
    handler: (detail: SenlerWidgetClientEventMap[Event]) => void,
  ): () => void;
}

/** The new facade exposes commands separately from configuration. */
export interface SenlerWidgetClient extends SenlerWidgetClientMethods {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  setPageContext(items: SenlerWidgetContextItem[]): void;
  refreshRuntime(): void;
  destroy(): void;
}

export class SenlerWidgetRequestError extends Error {
  readonly name = "SenlerWidgetRequestError";
  constructor(
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly dialogId?: string,
    readonly retryable?: boolean,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}
