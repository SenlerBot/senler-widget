import "./global.js";
import type { SenlerWidgetApi } from "./types.js";
export interface LoadSenlerWidgetOptions {
    /** Absolute or page-relative URL of widget-loader.js on your widget host. */
    src: string;
    timeoutMs?: number;
    nonce?: string;
    signal?: AbortSignal;
}
export declare function assertSenlerWidgetRuntime(value: unknown): asserts value is SenlerWidgetApi;
/** Imports are SSR-safe; call this function only in a browser. Concurrent calls share one script. */
export declare function loadSenlerWidget(options: LoadSenlerWidgetOptions): Promise<SenlerWidgetApi>;
