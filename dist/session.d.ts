import { type LoadSenlerWidgetOptions } from "./loader.js";
import type { SenlerWidgetInstanceApi, SenlerWidgetInitConfig } from "./types.js";
export interface SenlerWidgetSession {
    ready: Promise<SenlerWidgetInstanceApi>;
    destroy(): void;
}
/** A session owns only the instance it creates; the loader script is shared. */
export declare function createSenlerWidgetSession(options: Omit<LoadSenlerWidgetOptions, "signal"> & {
    config: SenlerWidgetInitConfig;
}): SenlerWidgetSession;
