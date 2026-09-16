"use client";

import { createContext, createElement, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { createSenlerWidgetSession } from "./session.js";
import type { SenlerWidgetApi, SenlerWidgetInitConfig, SenlerWidgetPersistentRuntimeConfig } from "./types.js";

export interface SenlerWidgetControllerOptions {
  src: string;
  /** Keep this object stable with useMemo. null defers initialization. */
  config: SenlerWidgetInitConfig | null;
  timeoutMs?: number;
  nonce?: string;
  /** Changing this value retries initialization, including after a failure. */
  retryKey?: string | number;
}
export interface SenlerWidgetState {
  status: "idle" | "loading" | "ready" | "failed";
  api: SenlerWidgetApi | null;
  error: Error | null;
}

function createWidgetStore({ src, config, timeoutMs, nonce }: SenlerWidgetControllerOptions) {
  const initial: SenlerWidgetState = { status: config ? "loading" : "idle", api: null, error: null };
  let state = initial;
  const listeners = new Set<() => void>();
  const setState = (next: SenlerWidgetState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  const start = () => {
    if (!config) return;
    let active = true;
    setState(initial);
    const fail = (error: unknown) => {
      if (active) setState({ status: "failed", api: null, error: error instanceof Error ? error : new Error(String(error)) });
    };
    try {
      const session = createSenlerWidgetSession({ src, config, timeoutMs, nonce });
      void session.ready.then((api) => {
        if (active) setState({ status: "ready", api, error: null });
      }, fail);
      return () => {
        active = false;
        session.destroy();
      };
    } catch (error) {
      fail(error);
    }
  };
  return {
    start,
    getSnapshot: () => state,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

/** Owns initialization and cleanup, including React StrictMode and delayed script loads. */
export function useSenlerWidgetController({ src, config, timeoutMs, nonce, retryKey }: SenlerWidgetControllerOptions): SenlerWidgetState {
  const store = useMemo(() => createWidgetStore({ src, config, timeoutMs, nonce, retryKey }),
    [src, config, timeoutMs, nonce, retryKey]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => store.start(), [store]);
  return state;
}

const WidgetContext = createContext<SenlerWidgetState | null>(null);
export interface SenlerWidgetProviderProps extends SenlerWidgetControllerOptions {
  children?: ReactNode;
  runtime?: SenlerWidgetPersistentRuntimeConfig;
}

export function SenlerWidgetProvider({ children, runtime, ...options }: SenlerWidgetProviderProps) {
  const state = useSenlerWidgetController(options);
  useEffect(() => {
    if (runtime) state.api?.updateRuntime(runtime);
  }, [state.api, runtime]);
  return createElement(WidgetContext.Provider, { value: state }, children);
}

/** Access the nearest provider. One-shot commands (open/message) use the returned API. */
export function useSenlerWidget(): SenlerWidgetState {
  const state = useContext(WidgetContext);
  if (!state) throw new Error("useSenlerWidget requires a SenlerWidgetProvider");
  return state;
}

export interface SenlerWidgetProps extends Omit<SenlerWidgetProviderProps, "children" | "config"> {
  config: Omit<SenlerWidgetInitConfig, "container" | "display_mode"> | null;
  containerProps?: Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML">;
  children?: ReactNode;
}

/** Embedded widget with a React-owned container. Children can consume useSenlerWidget(). */
export function SenlerWidget({ config, containerProps, children, ...options }: SenlerWidgetProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const embeddedConfig = useMemo<SenlerWidgetInitConfig | null>(() =>
    config && container ? { ...config, container, display_mode: "embedded" } : null,
  [config, container]);
  return createElement(SenlerWidgetProvider, { ...options, config: embeddedConfig },
    createElement("div", { ...containerProps, ref: setContainer }), children);
}
