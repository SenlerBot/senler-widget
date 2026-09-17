export declare const SENLER_WIDGET_RUNTIME_PROTOCOL_VERSION = 4;
export declare const WIDGET_PAGE_ELEMENT_ACTIONS: readonly ["highlight", "scroll_to", "focus", "click", "fill", "clear", "select", "toggle"];
export declare const WIDGET_PAGE_ELEMENT_ACTION_RESULT_STATUSES: readonly ["success", "not_found", "failed", "blocked"];
export declare const WIDGET_RUNTIME_MESSAGE_RESULT_STATUS: Readonly<{
    ACCEPTED: "accepted";
    SENDING: "sending";
    MESSAGE_SENT: "message_sent";
    ANSWERED: "answered";
    MESSAGE_SEND_FAILED: "message_send_failed";
    MESSAGE_ANSWER_FAILED: "message_answer_failed";
    PREVIEW_FAILED: "preview_failed";
}>;
export declare const WIDGET_INLINE_TEXT_EDIT_STATUS: Readonly<{
    SENDING: "sending";
    MESSAGE_SENT: "message_sent";
    ANSWERED: "answered";
    MESSAGE_SEND_FAILED: "message_send_failed";
    MESSAGE_ANSWER_FAILED: "message_answer_failed";
    PREVIEW_READY: "preview_ready";
    PREVIEW_FAILED: "preview_failed";
}>;
export declare const WIDGET_PUBLIC_INIT_CONFIG_FIELDS: {
    channel_id: true;
    user: true;
    theme: true;
    features: true;
    lang: true;
    display_mode: true;
    button_only: true;
    container: true;
    shell: true;
    onCollapse: true;
    onReady: true;
    onError: true;
    contextProvider: true;
    pageElementActions: true;
    customActions: true;
    customActionsLanguage: true;
    debug: true;
};
export declare const WIDGET_PUBLIC_RUNTIME_CONFIG_FIELDS: {
    lang: true;
    display_mode: true;
    theme_mode: true;
    border_radius: true;
    shell: true;
    customActions: true;
    customActionsLanguage: true;
    autoExecuteCustomActionNames: true;
    dialogId: true;
    startNewDialog: true;
    focusInput: true;
    pageContextItems: true;
    contextItems: true;
    message: true;
};
export declare const WIDGET_PUBLIC_RUNTIME_MESSAGE_FIELDS: {
    text: true;
    requestId: true;
    startNewDialog: true;
    autoSend: true;
};
export declare const WIDGET_PUBLIC_USER_FIELDS: {
    external_id: true;
    user_hash: true;
    email: true;
    phone: true;
    first_name: true;
    last_name: true;
    avatar_url: true;
    data: true;
};
export declare const WIDGET_PUBLIC_SHELL_FIELDS: {
    collapse_button: true;
    mobile_edge_swipe: true;
};
export declare const WIDGET_PUBLIC_CUSTOM_ACTION_FIELDS: {
    title: true;
    description: true;
    payloadSchema: true;
    returnsResult: true;
    handler: true;
};
export declare const WIDGET_PUBLIC_PAGE_ELEMENT_ACTION_FIELDS: {
    execute: true;
    clear: true;
};
export declare const WIDGET_PUBLIC_API_INSTANCE_METHODS: {
    open: true;
    close: true;
    toggle: true;
    isOpen: true;
    destroy: true;
    selectDialog: true;
    setPageContext: true;
    updateRuntime: true;
    createInlineTextEdit: true;
};
export declare const WIDGET_PUBLIC_CONTEXT_ITEM_ROLE_FIELDS: {
    technical: true;
    user_selected: true;
    business_context: true;
    action_target: true;
};
export declare const WIDGET_PUBLIC_THEME_FIELDS: {
    chat_title: true;
    default_dialog_title: true;
    theme_mode: true;
    position: true;
    width: true;
    height: true;
    border_radius: true;
    shadow_enabled: true;
    welcome_message: true;
    empty_state_message: true;
    welcome_buttons: true;
    button: true;
};
export declare const WIDGET_PUBLIC_FEATURE_FIELDS: {
    file_upload: true;
    voice_messages: true;
    emoji: true;
    split_view: true;
    element_selection: true;
};
export declare const WIDGET_PUBLIC_INIT_CONFIG_KEYS: readonly string[];
export declare const WIDGET_PUBLIC_RUNTIME_CONFIG_KEYS: readonly string[];
export declare const WIDGET_PUBLIC_RUNTIME_MESSAGE_KEYS: readonly string[];
export declare const WIDGET_PUBLIC_USER_KEYS: readonly string[];
export declare const WIDGET_PUBLIC_SHELL_KEYS: readonly string[];
export declare const WIDGET_PUBLIC_CUSTOM_ACTION_KEYS: readonly string[];
export declare const WIDGET_PUBLIC_PAGE_ELEMENT_ACTION_KEYS: readonly string[];
export declare const WIDGET_PUBLIC_API_METHOD_NAMES: readonly string[];
export declare const WIDGET_PUBLIC_CONTEXT_ITEM_ROLES: readonly string[];
export declare const WIDGET_PUBLIC_THEME_KEYS: readonly string[];
export declare const WIDGET_PUBLIC_FEATURE_KEYS: readonly string[];
