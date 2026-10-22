export interface SenlerWidgetReceivedAttachment {
  id: string;
  type: "photo" | "video" | "document" | "voice" | "audio" | "sticker";
  status:
    | "deferred"
    | "pending"
    | "fetching"
    | "uploading"
    | "ready"
    | "quota_pending"
    | "failed";
  url?: string;
  previewUrl?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  errorCode?: string;
}
export interface SenlerWidgetButton {
  text: string;
  instanceId?: string;
  repeatable?: boolean;
  disabled?: boolean;
  appearance?: "neutral" | "primary" | "positive" | "negative";
  pollOption?: { multiple: boolean };
  action:
    | { type: "open_url"; url: string; target?: "blank" | "self" }
    | { type: "callback"; data: string }
    | {
        type: "custom_action";
        name: string;
        payload?: Record<string, unknown>;
      };
}
/** Visible message data. Empty text is valid for a message containing attachments. */
export interface SenlerWidgetMessage {
  kind: "message" | "error";
  /** Public, localized error; never an internal exception or stack trace. */
  error?: { message?: string };
  dialogId: string;
  eventId: string;
  version: number;
  timestamp: string;
  sender: "visitor" | "assistant" | "operator" | "system";
  senderId?: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  sendingStatus?: string;
  deleted: boolean;
  text: string;
  format: "plain_text" | "markdown";
  attachments: SenlerWidgetReceivedAttachment[];
  buttons: { buttons: SenlerWidgetButton[] }[];
}
export interface SenlerWidgetMessageReceived extends SenlerWidgetMessage {
  sender: "assistant" | "operator";
  agentId?: string;
}
/** Confirmed server attachment. Pass it directly in ask({ attachments: [file] }). */
export interface SenlerWidgetUploadedFile {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  durationSeconds?: number;
}
export interface SenlerWidgetUploadOptions {
  dialogId: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** 0–100; 100 means the server has confirmed the upload. */
  onProgress?: (percent: number) => void;
}
