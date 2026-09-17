/** Public host-page API. It has no dependency on React or the Senler API SDK. */
import type { SenlerWidgetInitializationError } from "./initialization.js";
import type { WIDGET_INLINE_TEXT_EDIT_STATUS, WIDGET_PAGE_ELEMENT_ACTIONS, WIDGET_PAGE_ELEMENT_ACTION_RESULT_STATUSES, WIDGET_RUNTIME_MESSAGE_RESULT_STATUS } from "./contract.js";
export type SenlerWidgetLanguage = "ru" | "en" | "auto";
export type SenlerWidgetThemeMode = "light" | "dark" | "auto";
export type SenlerWidgetDisplayMode = "popup" | "embedded";
export type SenlerWidgetPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type SenlerWidgetJsonPrimitive = string | number | boolean | null;
export type SenlerWidgetJsonValue = SenlerWidgetJsonPrimitive | SenlerWidgetJsonValue[] | SenlerWidgetJsonObject;
export type SenlerWidgetJsonObject = {
    [key: string]: SenlerWidgetJsonValue;
};
export type SenlerWidgetLocalizedText = {
    ru?: string;
    en?: string;
};
export type SenlerWidgetContextItemRole = "technical" | "user_selected" | "business_context" | "action_target";
export interface SenlerWidgetContextItem {
    id: string;
    kind: string;
    role: SenlerWidgetContextItemRole;
    display: {
        label: string;
        subtitle?: string;
        icon?: string;
        avatar_url?: string;
    };
    ref?: SenlerWidgetJsonObject;
    snapshot?: SenlerWidgetJsonObject;
    payload?: SenlerWidgetJsonObject;
}
export interface SenlerWidgetUser {
    external_id?: string;
    /** HMAC signature produced by your backend when external_id is supplied. */
    user_hash?: string;
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    data?: SenlerWidgetJsonObject;
}
export interface SenlerWidgetTheme {
    chat_title?: SenlerWidgetLocalizedText;
    default_dialog_title?: SenlerWidgetLocalizedText;
    position?: SenlerWidgetPosition;
    welcome_message?: SenlerWidgetLocalizedText;
    empty_state_message?: SenlerWidgetLocalizedText;
    welcome_buttons?: {
        ru?: string[];
        en?: string[];
    };
    button?: {
        position?: SenlerWidgetPosition | "hidden";
        light?: {
            background?: string;
            icon?: string;
        };
        dark?: {
            background?: string;
            icon?: string;
        };
    };
    width?: number;
    height?: number;
    border_radius?: number;
    theme_mode?: SenlerWidgetThemeMode;
    shadow_enabled?: boolean;
}
export interface SenlerWidgetFeatures {
    file_upload?: boolean;
    voice_messages?: boolean;
    emoji?: boolean;
    split_view?: boolean;
    element_selection?: boolean;
}
export interface SenlerWidgetShellConfig {
    collapse_button?: boolean;
    mobile_edge_swipe?: boolean;
}
export interface SenlerWidgetCollapseDetail {
    channel_id: string;
    display_mode: SenlerWidgetDisplayMode;
}
export type SenlerWidgetMobileEdgeSwipeSide = "left";
export interface SenlerWidgetMobileEdgeSwipeDetail extends SenlerWidgetCollapseDetail {
    side: SenlerWidgetMobileEdgeSwipeSide;
}
export interface SenlerWidgetLeadCreditPurchaseRequestDetail {
    channel_id: string;
    lead_id: string;
}
export interface SenlerWidgetCustomActionDetail {
    name: string;
    payload?: SenlerWidgetJsonObject;
    button_text: string;
}
export interface SenlerWidgetCustomActionRequest {
    name: string;
    payload: SenlerWidgetJsonObject;
    signal: AbortSignal;
}
export type SenlerWidgetCustomActionPayloadSchema = Record<string, unknown>;
export type SenlerWidgetCustomActionDefinition = {
    title?: string;
    description?: string;
    payloadSchema?: SenlerWidgetCustomActionPayloadSchema;
} & ({
    returnsResult?: false;
    handler: (detail: SenlerWidgetCustomActionDetail) => void;
} | {
    returnsResult: true;
    handler: (request: SenlerWidgetCustomActionRequest) => SenlerWidgetJsonValue | Promise<SenlerWidgetJsonValue>;
});
export type SenlerWidgetPageElementAction = (typeof WIDGET_PAGE_ELEMENT_ACTIONS)[number];
export interface SenlerWidgetPageElementActionTarget {
    context_id: string;
    role?: string;
    entity_type?: string;
    entity_id?: string;
}
export type SenlerWidgetPageElementActionPayload = {
    event_id: string;
    attempt_id: string;
    action: SenlerWidgetPageElementAction;
    value?: string;
} & ({
    target: SenlerWidgetPageElementActionTarget;
    target_chain?: undefined;
} | {
    target?: undefined;
    target_chain: SenlerWidgetPageElementActionTarget[];
});
export interface SenlerWidgetPageElementActionResult {
    event_id: string;
    attempt_id: string;
    action: SenlerWidgetPageElementAction;
    status: (typeof WIDGET_PAGE_ELEMENT_ACTION_RESULT_STATUSES)[number];
    executed_at: string;
    duration_ms?: number;
    page_context?: {
        url?: string;
        path?: string;
        title?: string;
        page_instance_id?: string;
    };
    match?: {
        method?: string;
        matched_count?: number;
        matched_context_id?: string;
        matched_step_index?: number;
        target_chain_length?: number;
        next_context_id?: string;
    };
    error_code?: string;
    error_message?: string;
}
export interface SenlerWidgetPageElementActions {
    execute?: (payload: SenlerWidgetPageElementActionPayload) => SenlerWidgetPageElementActionResult | null | Promise<SenlerWidgetPageElementActionResult | null>;
    clear?: (scope: "all" | "tool" | "selected") => void;
}
export interface SenlerWidgetReadyDetail {
    channel_id: string;
    display_mode: SenlerWidgetDisplayMode;
    button_only: boolean;
}
export interface SenlerWidgetInitConfig {
    channel_id: string;
    user?: SenlerWidgetUser;
    theme?: SenlerWidgetTheme;
    features?: SenlerWidgetFeatures;
    lang?: SenlerWidgetLanguage;
    display_mode?: SenlerWidgetDisplayMode;
    button_only?: boolean;
    container?: string | Element;
    shell?: SenlerWidgetShellConfig;
    onCollapse?: (detail: SenlerWidgetCollapseDetail) => void;
    onReady?: (detail: SenlerWidgetReadyDetail) => void;
    onError?: (error: SenlerWidgetInitializationError) => void;
    contextProvider?: () => SenlerWidgetContextItem[];
    pageElementActions?: SenlerWidgetPageElementActions;
    customActions?: Record<string, SenlerWidgetCustomActionDefinition>;
    customActionsLanguage?: "ru" | "en";
    debug?: boolean;
}
export interface SenlerWidgetRuntimeMessage {
    text: string;
    requestId?: string;
    startNewDialog?: boolean;
    autoSend?: boolean;
}
export interface SenlerWidgetRuntimeConfig {
    lang?: SenlerWidgetLanguage;
    display_mode?: SenlerWidgetDisplayMode;
    theme_mode?: SenlerWidgetThemeMode;
    border_radius?: number;
    shell?: SenlerWidgetShellConfig;
    customActions?: Record<string, SenlerWidgetCustomActionDefinition>;
    customActionsLanguage?: "ru" | "en";
    autoExecuteCustomActionNames?: string[];
    dialogId?: string;
    startNewDialog?: boolean;
    focusInput?: boolean;
    pageContextItems?: SenlerWidgetContextItem[];
    contextItems?: SenlerWidgetContextItem[];
    message?: SenlerWidgetRuntimeMessage;
}
/** Persistent props only. Send messages and navigation commands through the API. */
export type SenlerWidgetPersistentRuntimeConfig = Pick<SenlerWidgetRuntimeConfig, "lang" | "theme_mode" | "border_radius" | "shell" | "customActions" | "customActionsLanguage" | "autoExecuteCustomActionNames" | "pageContextItems">;
export interface SenlerWidgetInlineTextEditPreview {
    fieldId: string;
    sourceText: string;
    replacementText: string;
    selectedText: string;
    selectedTextReplacement: string;
    summary?: string;
}
export type SenlerWidgetInlineTextEditStatus = (typeof WIDGET_INLINE_TEXT_EDIT_STATUS)[keyof typeof WIDGET_INLINE_TEXT_EDIT_STATUS];
export type SenlerWidgetInlineTextEditScope = "selection" | "field";
export interface SenlerWidgetInlineTextEditStatusDetail {
    status: SenlerWidgetInlineTextEditStatus;
    requestId?: string;
    dialogId?: string;
    preview?: SenlerWidgetInlineTextEditPreview;
    error?: Error;
}
export interface SenlerWidgetInlineTextEditConfig {
    fieldId: string;
    fieldLabel: string;
    getValue: () => string;
    getSelection?: () => string | {
        text: string;
    };
    contextItems?: SenlerWidgetContextItem[];
    getContextItems?: () => SenlerWidgetContextItem[];
    selectedTextLabel?: string;
    fieldScopeLabel?: string;
    taskLabel?: string;
    taskSubtitle?: string;
    taskInstruction?: string;
    onStatusChange?: (detail: SenlerWidgetInlineTextEditStatusDetail) => void;
    onDialogIdChange?: (dialogId: string) => void;
    onPreview: (preview: SenlerWidgetInlineTextEditPreview) => void;
    onError?: (error: Error) => void;
}
export interface SenlerWidgetInlineTextEditAskRequest {
    text: string;
    actionLabel?: string;
    selectedText?: string;
    scope?: SenlerWidgetInlineTextEditScope;
}
export interface SenlerWidgetInlineTextEditOpenChatRequest {
    selectedText?: string;
    scope?: SenlerWidgetInlineTextEditScope;
}
export interface SenlerWidgetInlineTextEditController {
    ask(request: string | SenlerWidgetInlineTextEditAskRequest): string | undefined;
    openChat(request?: SenlerWidgetInlineTextEditOpenChatRequest): void;
    getDialogId(): string | null;
    destroy(): void;
}
export interface SenlerWidgetApi {
    readonly runtimeProtocolVersion: number;
    init(config: SenlerWidgetInitConfig): void;
    open(config?: SenlerWidgetRuntimeConfig): void;
    close(): void;
    toggle(): void;
    isOpen(): boolean;
    selectDialog(dialogId: string): void;
    setPageContext(items: SenlerWidgetContextItem[]): void;
    updateRuntime(config: SenlerWidgetRuntimeConfig): void;
    createInlineTextEdit(config: SenlerWidgetInlineTextEditConfig): SenlerWidgetInlineTextEditController;
    destroy(): void;
}
export interface SenlerWidgetRuntimeMessageResult {
    request_id: string;
    status: (typeof WIDGET_RUNTIME_MESSAGE_RESULT_STATUS)[keyof typeof WIDGET_RUNTIME_MESSAGE_RESULT_STATUS];
    dialog_id?: string;
    error_message?: string;
}
export interface SenlerWidgetEventMap {
    "senler-widget:collapse-request": SenlerWidgetCollapseDetail;
    "senler-widget:mobile-edge-swipe": SenlerWidgetMobileEdgeSwipeDetail;
    "senler-widget:credit-purchase-requested": SenlerWidgetLeadCreditPurchaseRequestDetail;
    "senler-widget:runtime-message-result": SenlerWidgetRuntimeMessageResult;
}
