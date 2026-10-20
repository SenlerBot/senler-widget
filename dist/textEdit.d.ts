import type { SenlerWidgetAskOptions, SenlerWidgetResult, SenlerWidgetTextEditConfig, SenlerWidgetTextEditor } from "./clientTypes.js";
/** The host owns rendering and formatting. Offsets always refer to its source string. */
export declare function createTextEditor(config: SenlerWidgetTextEditConfig, ask: (options: SenlerWidgetAskOptions) => Promise<SenlerWidgetResult>): SenlerWidgetTextEditor;
