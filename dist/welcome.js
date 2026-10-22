import { isChatRecord } from "./chatProtocol.js";
export function normalizeWelcomeReaction(value, newDialog) {
    if (value === undefined)
        return undefined;
    if (!isChatRecord(value) ||
        newDialog !== true ||
        typeof value.draftId !== "string" ||
        !value.draftId ||
        value.draftId.length > 200 ||
        typeof value.token !== "string" ||
        !value.token ||
        value.token.length > 32000 ||
        (value.buttonId !== undefined &&
            (typeof value.buttonId !== "string" ||
                !/^[A-Za-z0-9_-]{22}$/.test(value.buttonId))))
        throw new TypeError("welcome requires newDialog, draftId, token and an optional buttonId");
    return {
        draftId: value.draftId,
        token: value.token,
        buttonId: value.buttonId,
    };
}
