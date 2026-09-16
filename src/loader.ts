import "./global.js";
import { SENLER_WIDGET_RUNTIME_PROTOCOL_VERSION, WIDGET_PUBLIC_API_METHOD_NAMES } from "./contract.js";
import type { SenlerWidgetApi } from "./types.js";

export interface LoadSenlerWidgetOptions {
  /** Absolute or page-relative URL of widget-loader.js on your widget host. */
  src: string;
  timeoutMs?: number;
  nonce?: string;
  signal?: AbortSignal;
}

const loads = new WeakMap<Window, { src: string; promise: Promise<SenlerWidgetApi> }>();

export function assertSenlerWidgetRuntime(value: unknown): asserts value is SenlerWidgetApi {
  if (typeof value !== "object" || value === null
    || Reflect.get(value, "runtimeProtocolVersion") !== SENLER_WIDGET_RUNTIME_PROTOCOL_VERSION
    || ["init", ...WIDGET_PUBLIC_API_METHOD_NAMES].some((key) => typeof Reflect.get(value, key) !== "function")) {
    throw new Error(`Incompatible SenlerWidget runtime; expected protocol ${SENLER_WIDGET_RUNTIME_PROTOCOL_VERSION}`);
  }
}

function abortError() {
  return new DOMException("SenlerWidget loading was cancelled", "AbortError");
}

function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/** Imports are SSR-safe; call this function only in a browser. Concurrent calls share one script. */
export function loadSenlerWidget(options: LoadSenlerWidgetOptions): Promise<SenlerWidgetApi> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("SenlerWidget requires a browser"));
  }
  if (options.signal?.aborted) return Promise.reject(abortError());
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !options.src.trim()) {
    return Promise.reject(new Error("SenlerWidget requires a non-empty src and a positive timeoutMs"));
  }
  let src: string;
  try {
    const url = new URL(options.src, document.baseURI);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("SenlerWidget src must use HTTP or HTTPS");
    src = url.href;
  } catch (error) {
    return Promise.reject(error);
  }
  const pending = loads.get(window);
  if (pending) {
    if (pending.src !== src) return Promise.reject(new Error("A different SenlerWidget loader is already in use on this page"));
    return withAbort(pending.promise, options.signal);
  }
  const target = window;
  const promise = new Promise<SenlerWidgetApi>((resolve, reject) => {
    let script: HTMLScriptElement | undefined;
    let ownedScript = false;
    let interval: ReturnType<typeof setInterval> | undefined = undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined = undefined;
    const clean = () => {
      clearInterval(interval);
      clearTimeout(timeout);
      script?.removeEventListener("error", fail);
    };
    const fail = () => {
      clean();
      if (ownedScript) {
        script?.remove();
        // The bootstrap adds a second script. A failed one must not block a retry
        // through its fixed DOM id; leave scripts belonging to another host alone.
        const runtimeScript = document.getElementById("senler-widget-loader-runtime");
        if (target.SenlerWidget && Reflect.get(target.SenlerWidget, "__isBootstrapStub")
          && runtimeScript instanceof target.HTMLScriptElement
          && runtimeScript.src.startsWith(new URL(".", src).href)) {
          runtimeScript.remove();
        }
      }
      reject(new Error(`Failed to load SenlerWidget from ${src}`));
    };
    const check = () => {
      const api = target.SenlerWidget;
      if (!api || Reflect.get(api, "__isBootstrapStub")) return false;
      clean();
      try {
        assertSenlerWidgetRuntime(api);
        resolve(api);
      } catch (error) {
        if (ownedScript) script?.remove();
        reject(error);
      }
      return true;
    };
    if (check()) return;
    script = Array.from(document.scripts).find((candidate) => candidate.src === src);
    if (!script) {
      ownedScript = true;
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      if (options.nonce) script.nonce = options.nonce;
    }
    script.addEventListener("error", fail, { once: true });
    interval = setInterval(check, 25);
    timeout = setTimeout(fail, timeoutMs);
    if (ownedScript) document.head.appendChild(script);
  });
  loads.set(target, { src, promise });
  void promise.catch(() => {
    if (loads.get(target)?.promise === promise) loads.delete(target);
  });
  return withAbort(promise, options.signal);
}
