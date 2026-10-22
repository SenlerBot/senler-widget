import type { LoadSenlerWidgetOptions } from "./loader.js";
import type { SenlerWidgetInitConfig } from "./types.js";
import type { SenlerWidgetClient } from "./clientTypes.js";
export type CreateSenlerWidgetOptions = Omit<LoadSenlerWidgetOptions, "signal"> & Omit<SenlerWidgetInitConfig, "channel_id"> & {
    channelId: string;
};
/** Creates an independent widget and resolves after authenticated initialization. */
export declare function createSenlerWidget(options: CreateSenlerWidgetOptions): Promise<SenlerWidgetClient>;
