import { type LoadSenlerWidgetOptions } from "./loader.js";
import type { SenlerWidgetApi, SenlerWidgetInitConfig } from "./types.js";
export interface SenlerWidgetSession {
    ready: Promise<SenlerWidgetApi>;
    destroy(): void;
}
/** One session owns the page's singleton. A stale cleanup cannot destroy a newer session. */
export declare function createSenlerWidgetSession(options: Omit<LoadSenlerWidgetOptions, "signal"> & {
    config: SenlerWidgetInitConfig;
}): SenlerWidgetSession;
