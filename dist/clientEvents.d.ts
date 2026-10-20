import type { SenlerWidgetMessageSent } from "./clientTypes.js";
/** The host accepts notifications only after validating the owning iframe and payload. */
export declare function isWidgetMessageSent(value: unknown): value is SenlerWidgetMessageSent;
export declare function isWidgetMessageReceived(value: unknown): value is import("./messageResult.js").SenlerWidgetMessageReceived;
