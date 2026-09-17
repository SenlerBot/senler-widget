import { loadSenlerWidget } from "./loader.js";
const ownerKey = Symbol.for("@senlerio/widget/session-owner");
/** One session owns the page's singleton. A stale cleanup cannot destroy a newer session. */
export function createSenlerWidgetSession(options) {
    if (typeof window === "undefined")
        throw new Error("SenlerWidget requires a browser");
    const target = window;
    if (Reflect.get(target, ownerKey))
        throw new Error("This page already has an active SenlerWidget session");
    const owner = {};
    Reflect.set(target, ownerKey, owner);
    const controller = new AbortController();
    let api;
    const destroy = () => {
        controller.abort();
        if (Reflect.get(target, ownerKey) !== owner)
            return;
        Reflect.deleteProperty(target, ownerKey);
        const active = api;
        api = undefined;
        active?.destroy();
    };
    const ready = loadSenlerWidget({ ...options, signal: controller.signal })
        .then((loaded) => {
        if (controller.signal.aborted)
            throw new DOMException("SenlerWidget session was cancelled", "AbortError");
        api = loaded;
        return new Promise((resolve, reject) => {
            const onAbort = () => reject(new DOMException("SenlerWidget session was cancelled", "AbortError"));
            controller.signal.addEventListener("abort", onAbort, { once: true });
            const removeAbortListener = () => controller.signal.removeEventListener("abort", onAbort);
            try {
                loaded.init({
                    ...options.config,
                    onReady(detail) {
                        if (controller.signal.aborted)
                            return;
                        try {
                            options.config.onReady?.(detail);
                        }
                        finally {
                            removeAbortListener();
                            if (!controller.signal.aborted)
                                resolve(loaded);
                        }
                    },
                    onError(error) {
                        if (controller.signal.aborted)
                            return;
                        removeAbortListener();
                        reject(error);
                        options.config.onError?.(error);
                    },
                });
            }
            catch (error) {
                removeAbortListener();
                reject(error);
            }
        });
    })
        .catch((error) => {
        destroy();
        throw error;
    });
    return { ready, destroy };
}
