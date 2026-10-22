import { createSenlerWidgetSession } from "./session.js";
/** Creates an independent widget and resolves after authenticated initialization. */
export async function createSenlerWidget(options) {
    const { src, nonce, timeoutMs, channelId, ...config } = options;
    const session = createSenlerWidgetSession({
        src,
        nonce,
        timeoutMs,
        config: { ...config, channel_id: channelId },
    });
    const api = await session.ready;
    const open = api.open;
    // A facade keeps session ownership cleanup out of the shared global runtime object.
    return {
        getSettings: api.getSettings,
        getDialogs: api.getDialogs,
        getMessages: api.getMessages,
        getDialogState: api.getDialogState,
        getWelcome: api.getWelcome,
        getScheduledActions: api.getScheduledActions,
        cancelScheduledAction: api.cancelScheduledAction,
        subscribeDialog: api.subscribeDialog,
        markRead: api.markRead,
        setTyping: api.setTyping,
        clickButton: api.clickButton,
        updateQueuedQuestion: api.updateQueuedQuestion,
        cancelQueuedQuestion: api.cancelQueuedQuestion,
        sendQueuedQuestion: api.sendQueuedQuestion,
        ask: api.ask,
        updateLead: api.updateLead,
        setDraft: api.setDraft,
        uploadFile: api.uploadFile,
        resetSession: async () => {
            await api.resetSession();
            session.destroy();
        },
        getOrCreateDialog: api.getOrCreateDialog,
        configure: api.configure,
        setContext: api.setContext,
        setAnalytics: api.setAnalytics,
        startNewDialog: api.startNewDialog,
        createTextEdit: api.createTextEdit,
        registerAction: api.registerAction,
        on: api.on,
        open: () => open(),
        close: api.close,
        toggle: api.toggle,
        isOpen: api.isOpen,
        selectDialog: api.selectDialog,
        setPageContext: api.setPageContext,
        refreshRuntime: api.refreshRuntime,
        destroy: session.destroy,
    };
}
