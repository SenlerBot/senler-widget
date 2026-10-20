import { loadSenlerWidget } from "./loader.js";
/** A session owns only the instance it creates; the loader script is shared. */
export function createSenlerWidgetSession(options) {
    if (typeof window === "undefined")
        throw new Error("SenlerWidget requires a browser");
    const controller = new AbortController();
    let api;
    const destroy = () => {
        controller.abort();
        const active = api;
        api = undefined;
        active?.destroy();
    };
    const ready = loadSenlerWidget({ ...options, signal: controller.signal })
        .then((loaded) => {
        if (controller.signal.aborted)
            throw new DOMException("SenlerWidget session was cancelled", "AbortError");
        return new Promise((resolve, reject) => {
            const onAbort = () => reject(new DOMException("SenlerWidget session was cancelled", "AbortError"));
            controller.signal.addEventListener("abort", onAbort, { once: true });
            const removeAbortListener = () => controller.signal.removeEventListener("abort", onAbort);
            try {
                api = loaded.create({
                    ...options.config,
                    onReady(detail) {
                        if (controller.signal.aborted)
                            return;
                        try {
                            options.config.onReady?.(detail);
                        }
                        finally {
                            removeAbortListener();
                            // Readiness may be synchronous in a host runtime.
                            if (!controller.signal.aborted)
                                queueMicrotask(() => api && resolve(api));
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
