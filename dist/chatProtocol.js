export const WIDGET_CHAT_PROTOCOL = 2;
export const WIDGET_CHAT_MESSAGE = "SENLER_WIDGET_CHAT";
export function isChatRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
const identifier = (value) => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
const optionalText = (value, max) => value === undefined || (typeof value === "string" && value.length <= max);
/** Validate at both ends; untrusted postMessage input never reaches the API. */
export function parseChatCommand(value) {
    if (!isChatRecord(value) || !isChatRecord(value.input))
        throw new TypeError("Invalid chat command");
    const p = value.input;
    const method = value.method;
    if (method === "getSettings" || method === "getWelcome")
        return { method, input: {} };
    if (method === "getDialogs") {
        if ((p.limit !== undefined &&
            (!Number.isInteger(p.limit) ||
                Number(p.limit) < 1 ||
                Number(p.limit) > 100)) ||
            !optionalText(p.before, 256) ||
            !optionalText(p.query, 500) ||
            (p.query !== undefined && String(p.query).length < 2) ||
            (p.offset !== undefined &&
                (!Number.isInteger(p.offset) || Number(p.offset) < 0)))
            throw new TypeError("Invalid dialog list options");
        return {
            method,
            input: {
                limit: p.limit,
                before: p.before,
                query: p.query,
                offset: p.offset,
            },
        };
    }
    if (!identifier(p.dialogId))
        throw new TypeError("Invalid dialogId");
    const dialogId = p.dialogId;
    if (method === "getScheduledActions") {
        if (!optionalText(p.cursor, 1024))
            throw new TypeError("Invalid scheduled action cursor");
        return {
            method,
            input: { dialogId, cursor: p.cursor },
        };
    }
    if (method === "cancelScheduledAction") {
        if (typeof p.actionId !== "string" ||
            !/^(short:)?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(p.actionId))
            throw new TypeError("Invalid scheduled action ID");
        return { method, input: { dialogId, actionId: p.actionId } };
    }
    if (method === "getMessages") {
        if ((p.limit !== undefined &&
            (!Number.isInteger(p.limit) ||
                Number(p.limit) < 1 ||
                Number(p.limit) > 200)) ||
            !optionalText(p.before, 256) ||
            !optionalText(p.after, 256) ||
            (p.before !== undefined && p.after !== undefined))
            throw new TypeError("Invalid message page options");
        return {
            method,
            input: {
                dialogId,
                limit: p.limit,
                before: p.before,
                after: p.after,
            },
        };
    }
    if (method === "getDialogState") {
        if (!optionalText(p.ref, 128) ||
            (typeof p.ref === "string" && !p.ref.trim()))
            throw new TypeError("Invalid ref");
        return { method, input: { dialogId, ref: p.ref } };
    }
    if (method === "markRead")
        return { method, input: { dialogId } };
    if (method === "setTyping") {
        if (typeof p.typing !== "boolean")
            throw new TypeError("typing must be boolean");
        return { method, input: { dialogId, typing: p.typing } };
    }
    if (method === "clickButton") {
        const button = p.button;
        if (!identifier(p.eventId) ||
            !isChatRecord(button) ||
            typeof button.text !== "string" ||
            !isChatRecord(button.action))
            throw new TypeError("Invalid button");
        const action = button.action;
        let parsedAction;
        if (action.type === "callback") {
            if (typeof button.instanceId !== "string" ||
                !/^[A-Za-z0-9_-]{22}$/.test(button.instanceId) ||
                typeof action.data !== "string")
                throw new TypeError("Invalid callback button");
            parsedAction = { type: "callback", data: action.data };
        }
        else if (action.type === "open_url") {
            if (typeof action.url !== "string" ||
                !/^https?:\/\//i.test(action.url) ||
                (action.target !== undefined &&
                    action.target !== "blank" &&
                    action.target !== "self"))
                throw new TypeError("Invalid button URL");
            parsedAction = {
                type: "open_url",
                url: action.url,
                target: action.target,
            };
        }
        else if (action.type === "custom_action") {
            if (typeof action.name !== "string" ||
                !action.name ||
                (action.payload !== undefined && !isChatRecord(action.payload)))
                throw new TypeError("Invalid custom action");
            parsedAction = {
                type: "custom_action",
                name: action.name,
                payload: structuredClone(action.payload),
            };
        }
        else
            throw new TypeError("Unknown button action");
        if (button.disabled !== undefined && typeof button.disabled !== "boolean")
            throw new TypeError("Invalid button state");
        if (p.pollSelectedInstanceIds !== undefined &&
            (!Array.isArray(p.pollSelectedInstanceIds) ||
                p.pollSelectedInstanceIds.length < 1 ||
                p.pollSelectedInstanceIds.length > 8 ||
                p.pollSelectedInstanceIds.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{22}$/.test(id))))
            throw new TypeError("Invalid poll selection");
        return {
            method,
            input: {
                dialogId,
                eventId: p.eventId,
                button: {
                    text: button.text,
                    disabled: button.disabled,
                    action: parsedAction,
                    instanceId: typeof button.instanceId === "string"
                        ? button.instanceId
                        : undefined,
                },
                pollSelectedInstanceIds: p.pollSelectedInstanceIds,
            },
        };
    }
    if (typeof p.questionId !== "string" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(p.questionId))
        throw new TypeError("Invalid questionId");
    if (method === "cancelQueuedQuestion" || method === "sendQueuedQuestion")
        return { method, input: { dialogId, questionId: p.questionId } };
    if (method === "updateQueuedQuestion") {
        if (!Number.isInteger(p.revision) ||
            Number(p.revision) < 0 ||
            typeof p.text !== "string" ||
            p.text.length > 50000)
            throw new TypeError("Invalid queued question");
        return {
            method,
            input: {
                dialogId,
                questionId: p.questionId,
                revision: p.revision,
                text: p.text,
            },
        };
    }
    throw new TypeError("Unknown chat command");
}
