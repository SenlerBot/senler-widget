"use client";
import { createContext, createElement, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createSenlerWidgetSession } from "./session.js";
function createWidgetStore({ src, config, timeoutMs, nonce }) {
    const initial = { status: config ? "loading" : "idle", api: null, error: null };
    let state = initial;
    const listeners = new Set();
    const setState = (next) => {
        state = next;
        listeners.forEach((listener) => listener());
    };
    const start = () => {
        if (!config)
            return;
        let active = true;
        setState(initial);
        const fail = (error) => {
            if (active)
                setState({ status: "failed", api: null, error: error instanceof Error ? error : new Error(String(error)) });
        };
        try {
            const session = createSenlerWidgetSession({ src, config, timeoutMs, nonce });
            void session.ready.then((api) => {
                if (active)
                    setState({ status: "ready", api, error: null });
            }, fail);
            return () => {
                active = false;
                session.destroy();
            };
        }
        catch (error) {
            fail(error);
        }
    };
    return {
        start,
        getSnapshot: () => state,
        getServerSnapshot: () => initial,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    };
}
/** Owns initialization and cleanup, including React StrictMode and delayed script loads. */
export function useSenlerWidgetController({ src, config, timeoutMs, nonce, retryKey }) {
    const store = useMemo(() => createWidgetStore({ src, config, timeoutMs, nonce, retryKey }), [src, config, timeoutMs, nonce, retryKey]);
    const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
    useEffect(() => store.start(), [store]);
    return state;
}
const WidgetContext = createContext(null);
export function SenlerWidgetProvider({ children, runtime, ...options }) {
    const state = useSenlerWidgetController(options);
    useEffect(() => {
        if (runtime)
            state.api?.updateRuntime(runtime);
    }, [state.api, runtime]);
    return createElement(WidgetContext.Provider, { value: state }, children);
}
/** Access the nearest provider. One-shot commands (open/message) use the returned API. */
export function useSenlerWidget() {
    const state = useContext(WidgetContext);
    if (!state)
        throw new Error("useSenlerWidget requires a SenlerWidgetProvider");
    return state;
}
/** Embedded widget with a React-owned container. Children can consume useSenlerWidget(). */
export function SenlerWidget({ config, containerProps, children, ...options }) {
    const [container, setContainer] = useState(null);
    const embeddedConfig = useMemo(() => config && container ? { ...config, container, display_mode: "embedded" } : null, [config, container]);
    return createElement(SenlerWidgetProvider, { ...options, config: embeddedConfig }, createElement("div", { ...containerProps, ref: setContainer }), children);
}
