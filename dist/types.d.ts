/** Public host-page API. It has no dependency on React or the Senler API SDK. */
import type { SenlerWidgetInitializationError } from "./initialization.js";
import type { SenlerWidgetClientMethods } from "./clientTypes.js";
import type { WIDGET_PAGE_ELEMENT_ACTIONS, WIDGET_PAGE_ELEMENT_ACTION_RESULT_STATUSES } from "./contract.js";
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
    /** Hide this item in the widget UI while preserving it in storage and AI context. Defaults to false. */
    hidden?: boolean;
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
    /** Absolute HTTP(S) URL. An empty string restores the default welcome icon. */
    welcome_icon_url?: string;
    /** Defaults to circle; the image is clipped with CSS. */
    welcome_icon_shape?: "circle" | "square";
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
    /** Optional HEX window colors. Omitted or built-in values keep the original palette. */
    colors?: {
        light?: {
            background?: string;
            accent?: string;
        };
        dark?: {
            background?: string;
            accent?: string;
        };
    };
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
    /** Set by the history UI for an explicit user request, never by the agent. */
    user_initiated?: boolean;
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
    /** Host-owned preparation for a user clicking Show on page. Call execute after layout changes. */
    navigate?: (payload: SenlerWidgetPageElementActionPayload, context: {
        element: Element | null;
        signal: AbortSignal;
        execute: () => Promise<SenlerWidgetPageElementActionResult>;
    }) => Promise<SenlerWidgetPageElementActionResult>;
}
export interface SenlerWidgetReadyDetail {
    channel_id: string;
    display_mode: SenlerWidgetDisplayMode;
    button_only: boolean;
}
export type SenlerWidgetWelcome = {
    mode: "centered_text";
} | {
    mode: "automation_message";
    automation_id: string;
    node_id: string;
};
/** Facts about this visitor in this channel, available after server initialization. */
export interface SenlerWidgetRuntimeContext {
    readonly channelId: string;
    readonly visitor: {
        /** The visitor record was created during this initialization. */
        readonly isNew: boolean;
        readonly identityVerified: boolean;
    };
    readonly dialogs: {
        readonly count: number;
    };
    /** null until a real dialog is selected or created; a new chat has no ID. */
    readonly currentDialog: {
        readonly id: string;
    } | null;
}
/** A replacement override layer. Omitted fields inherit the current base settings. */
export type SenlerWidgetResolvedRuntimeConfig = Pick<SenlerWidgetRuntimeConfig, "welcome" | "lang" | "theme_mode" | "border_radius" | "shell">;
export type SenlerWidgetRuntimeResolver = (context: SenlerWidgetRuntimeContext) => SenlerWidgetResolvedRuntimeConfig & {
    [Key in Exclude<keyof SenlerWidgetRuntimeConfig | keyof SenlerWidgetClientMethods, keyof SenlerWidgetResolvedRuntimeConfig>]?: never;
};
export interface SenlerWidgetInitConfig {
    channel_id: string;
    user?: SenlerWidgetUser;
    theme?: SenlerWidgetTheme;
    features?: SenlerWidgetFeatures;
    /** Overrides this instance's greeting. Omit to inherit channel settings. */
    welcome?: SenlerWidgetWelcome;
    lang?: SenlerWidgetLanguage;
    display_mode?: SenlerWidgetDisplayMode;
    button_only?: boolean;
    /** Runs the authenticated SDK without rendering the ready-made chat. Immutable. */
    headless?: boolean;
    container?: string | Element;
    /** Whether the host shows the widget's container. Defaults to true; does not open the panel. */
    surfaceVisible?: boolean;
    shell?: SenlerWidgetShellConfig;
    onCollapse?: (detail: SenlerWidgetCollapseDetail) => void;
    onReady?: (detail: SenlerWidgetReadyDetail) => void;
    onError?: (error: SenlerWidgetInitializationError) => void;
    contextProvider?: () => SenlerWidgetContextItem[];
    /** Synchronous presentation settings, evaluated before the greeting and on context changes. */
    resolveRuntime?: SenlerWidgetRuntimeResolver;
    pageElementActions?: SenlerWidgetPageElementActions;
    customActions?: Record<string, SenlerWidgetCustomActionDefinition>;
    customActionsLanguage?: "ru" | "en";
    debug?: boolean;
}
export interface SenlerWidgetRuntimeConfig {
    /** Report a host-controlled panel/tab's visibility without reinitializing or pausing the widget. */
    surfaceVisible?: boolean;
    /** Select an allowed greeting for an unstarted dialog. null restores the channel default. */
    welcome?: SenlerWidgetWelcome | null;
    lang?: SenlerWidgetLanguage;
    display_mode?: SenlerWidgetDisplayMode;
    theme_mode?: SenlerWidgetThemeMode;
    border_radius?: number;
    shell?: SenlerWidgetShellConfig;
    customActions?: Record<string, SenlerWidgetCustomActionDefinition>;
    customActionsLanguage?: "ru" | "en";
    dialogId?: string;
    focusInput?: boolean;
    pageContextItems?: SenlerWidgetContextItem[];
    contextItems?: SenlerWidgetContextItem[];
}
export interface SenlerWidgetApi extends SenlerWidgetClientMethods {
    readonly runtimeProtocolVersion: number;
    init(config: SenlerWidgetInitConfig): void;
    create(config: SenlerWidgetInitConfig): SenlerWidgetInstanceApi;
    open(): void;
    close(): void;
    toggle(): void;
    isOpen(): boolean;
    setPageContext(items: SenlerWidgetContextItem[]): void;
    /** Re-evaluate resolveRuntime after host-page conditions change. */
    refreshRuntime(): void;
    destroy(): void;
}
export type SenlerWidgetInstanceApi = Omit<SenlerWidgetApi, "init" | "create">;
export interface SenlerWidgetEventMap {
    "senler-widget:collapse-request": SenlerWidgetCollapseDetail;
    "senler-widget:mobile-edge-swipe": SenlerWidgetMobileEdgeSwipeDetail;
    "senler-widget:credit-purchase-requested": SenlerWidgetLeadCreditPurchaseRequestDetail;
}
