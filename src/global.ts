import type { SenlerWidgetApi, SenlerWidgetEventMap } from "./types.js";

declare global {
  interface WindowEventMap {
    "senler-widget:collapse-request": CustomEvent<SenlerWidgetEventMap["senler-widget:collapse-request"]>;
    "senler-widget:mobile-edge-swipe": CustomEvent<SenlerWidgetEventMap["senler-widget:mobile-edge-swipe"]>;
    "senler-widget:credit-purchase-requested": CustomEvent<SenlerWidgetEventMap["senler-widget:credit-purchase-requested"]>;
    "senler-widget:runtime-message-result": CustomEvent<SenlerWidgetEventMap["senler-widget:runtime-message-result"]>;
  }
  interface Window {
    /** Undefined until the loader script has executed. */
    SenlerWidget?: SenlerWidgetApi;
  }
}

export {};
