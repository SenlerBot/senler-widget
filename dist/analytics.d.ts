export interface SenlerWidgetAnalytics {
    /** Namespace of the analytics system, e.g. yandex_metrica or google_analytics. */
    provider: string;
    /** Counter, measurement stream or pixel ID. */
    sourceId: string;
    /** Visitor identifiers. Empty identifiers with no visit clear this source in this instance. */
    identifiers: Record<string, string>;
    /** Session/click information for this visit, never a permanent lead identity. */
    visit?: Record<string, string>;
}
export declare function normalizeAnalytics(value: unknown): SenlerWidgetAnalytics;
