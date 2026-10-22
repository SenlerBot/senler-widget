import type { SenlerWidgetMessage } from "./messageResult.js";
/** Merge history, ask answers and subscriptions without duplicates or version rollback. */
export declare function mergeWidgetMessages(previous: readonly SenlerWidgetMessage[], incoming: readonly SenlerWidgetMessage[]): SenlerWidgetMessage[];
