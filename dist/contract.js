export const SENLER_WIDGET_RUNTIME_PROTOCOL_VERSION = 10;
export const WIDGET_PAGE_ELEMENT_ACTIONS = Object.freeze([
    "highlight",
    "scroll_to",
    "focus",
    "click",
    "fill",
    "clear",
    "select",
    "toggle",
]);
export const WIDGET_PAGE_ELEMENT_ACTION_RESULT_STATUSES = Object.freeze([
    "success",
    "not_found",
    "failed",
    "blocked",
]);
// The loader consumes these lists; Record requires every public field exactly once.
export const WIDGET_PUBLIC_INIT_CONFIG_FIELDS = {
    channel_id: true,
    user: true,
    theme: true,
    features: true,
    welcome: true,
    lang: true,
    display_mode: true,
    button_only: true,
    headless: true,
    container: true,
    surfaceVisible: true,
    shell: true,
    onCollapse: true,
    onReady: true,
    onError: true,
    contextProvider: true,
    resolveRuntime: true,
    pageElementActions: true,
    customActions: true,
    customActionsLanguage: true,
    debug: true,
};
export const WIDGET_PUBLIC_RUNTIME_CONFIG_FIELDS = {
    surfaceVisible: true,
    welcome: true,
    lang: true,
    display_mode: true,
    theme_mode: true,
    border_radius: true,
    shell: true,
    customActions: true,
    customActionsLanguage: true,
    dialogId: true,
    focusInput: true,
    pageContextItems: true,
    contextItems: true,
};
export const WIDGET_RESOLVED_RUNTIME_CONFIG_FIELDS = {
    welcome: true,
    lang: true,
    theme_mode: true,
    border_radius: true,
    shell: true,
};
export const WIDGET_PUBLIC_USER_FIELDS = {
    external_id: true,
    user_hash: true,
    email: true,
    phone: true,
    first_name: true,
    last_name: true,
    avatar_url: true,
    data: true,
};
export const WIDGET_PUBLIC_SHELL_FIELDS = {
    collapse_button: true,
    mobile_edge_swipe: true,
};
export const WIDGET_PUBLIC_CUSTOM_ACTION_FIELDS = {
    title: true,
    description: true,
    payloadSchema: true,
    returnsResult: true,
    handler: true,
};
export const WIDGET_PUBLIC_PAGE_ELEMENT_ACTION_FIELDS = {
    execute: true,
    clear: true,
    navigate: true,
};
export const WIDGET_PUBLIC_API_INSTANCE_METHODS = {
    getSettings: true,
    getDialogs: true,
    getMessages: true,
    getDialogState: true,
    getWelcome: true,
    getScheduledActions: true,
    cancelScheduledAction: true,
    subscribeDialog: true,
    markRead: true,
    setTyping: true,
    clickButton: true,
    updateQueuedQuestion: true,
    cancelQueuedQuestion: true,
    sendQueuedQuestion: true,
    updateLead: true,
    setDraft: true,
    uploadFile: true,
    resetSession: true,
    getOrCreateDialog: true,
    ask: true,
    configure: true,
    setContext: true,
    setAnalytics: true,
    startNewDialog: true,
    createTextEdit: true,
    registerAction: true,
    on: true,
    open: true,
    close: true,
    toggle: true,
    isOpen: true,
    destroy: true,
    selectDialog: true,
    setPageContext: true,
    refreshRuntime: true,
};
export const WIDGET_PUBLIC_CONTEXT_ITEM_ROLE_FIELDS = {
    technical: true,
    user_selected: true,
    business_context: true,
    action_target: true,
};
export const WIDGET_PUBLIC_THEME_FIELDS = {
    colors: true,
    welcome_icon_url: true,
    welcome_icon_shape: true,
    chat_title: true,
    default_dialog_title: true,
    theme_mode: true,
    position: true,
    width: true,
    height: true,
    border_radius: true,
    shadow_enabled: true,
    welcome_message: true,
    empty_state_message: true,
    welcome_buttons: true,
    button: true,
};
export const WIDGET_PUBLIC_FEATURE_FIELDS = {
    file_upload: true,
    voice_messages: true,
    emoji: true,
    split_view: true,
    element_selection: true,
};
export const WIDGET_PUBLIC_INIT_CONFIG_KEYS = Object.freeze(Object.keys(WIDGET_PUBLIC_INIT_CONFIG_FIELDS));
export const WIDGET_PUBLIC_RUNTIME_CONFIG_KEYS = Object.freeze(Object.keys(WIDGET_PUBLIC_RUNTIME_CONFIG_FIELDS));
export const WIDGET_RESOLVED_RUNTIME_CONFIG_KEYS = Object.freeze(Object.keys(WIDGET_RESOLVED_RUNTIME_CONFIG_FIELDS));
export const WIDGET_PUBLIC_USER_KEYS = Object.freeze(Object.keys(WIDGET_PUBLIC_USER_FIELDS));
export const WIDGET_PUBLIC_SHELL_KEYS = Object.freeze(Object.keys(WIDGET_PUBLIC_SHELL_FIELDS));
export const WIDGET_PUBLIC_CUSTOM_ACTION_KEYS = Object.freeze(Object.keys(WIDGET_PUBLIC_CUSTOM_ACTION_FIELDS));
export const WIDGET_PUBLIC_PAGE_ELEMENT_ACTION_KEYS = Object.freeze(Object.keys(WIDGET_PUBLIC_PAGE_ELEMENT_ACTION_FIELDS));
export const WIDGET_PUBLIC_API_METHOD_NAMES = Object.freeze(Object.keys(WIDGET_PUBLIC_API_INSTANCE_METHODS));
export const WIDGET_PUBLIC_CONTEXT_ITEM_ROLES = Object.freeze(Object.keys(WIDGET_PUBLIC_CONTEXT_ITEM_ROLE_FIELDS));
export const WIDGET_PUBLIC_THEME_KEYS = Object.freeze(Object.keys(WIDGET_PUBLIC_THEME_FIELDS));
export const WIDGET_PUBLIC_FEATURE_KEYS = Object.freeze(Object.keys(WIDGET_PUBLIC_FEATURE_FIELDS));
