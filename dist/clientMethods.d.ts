import type { SenlerWidgetRuntimeConfig, SenlerWidgetContextItem, SenlerWidgetCustomActionDefinition } from "./types.js";
import type { SenlerWidgetAskOptions, SenlerWidgetResult, SenlerWidgetDialog, SenlerWidgetResolveDialogOptions, SenlerWidgetNewDialogOptions, SenlerWidgetClientMethods, SenlerWidgetMessageSent } from "./clientTypes.js";
import type { createChatTransport } from "./chatTransport.js";
import { type SenlerWidgetAnalytics } from "./analytics.js";
import { type SenlerWidgetLeadUpdate, type SenlerWidgetDraftOptions } from "./profile.js";
import type { SenlerWidgetMessageReceived, SenlerWidgetUploadedFile, SenlerWidgetUploadOptions } from "./messageResult.js";
interface RuntimeOperations {
    updateRuntime(config: SenlerWidgetRuntimeConfig): void;
    setPageContext(items: SenlerWidgetContextItem[]): void;
    isOpen(): boolean;
}
export declare function createClientMethods({ runtime, execute, resolveDialog, createDialog, setAnalytics, uploadFile, resetSession, updateLead, setDraft, getActions, reportError, chat, }: {
    runtime: RuntimeOperations;
    execute(options: SenlerWidgetAskOptions): Promise<SenlerWidgetResult>;
    resolveDialog(options: SenlerWidgetResolveDialogOptions): Promise<SenlerWidgetDialog>;
    createDialog(options: SenlerWidgetNewDialogOptions): Promise<string>;
    setAnalytics(analytics: SenlerWidgetAnalytics): Promise<void>;
    uploadFile(file: File, options: SenlerWidgetUploadOptions): Promise<SenlerWidgetUploadedFile>;
    resetSession(): Promise<void>;
    updateLead(profile: SenlerWidgetLeadUpdate): Promise<void>;
    setDraft(options: SenlerWidgetDraftOptions): Promise<void>;
    getActions(): Record<string, SenlerWidgetCustomActionDefinition>;
    reportError(error: unknown): void;
    chat?: ReturnType<typeof createChatTransport>;
}): {
    methods: SenlerWidgetClientMethods;
    notifyUnreadCount(count: number): void;
    notifyMessageReceived(detail: SenlerWidgetMessageReceived): void;
    notifyMessageSent(detail: SenlerWidgetMessageSent): void;
    syncVisibility(): void;
    destroy(): void;
};
export {};
