/** Updating a profile never changes the authenticated visitor's identity. */
export interface SenlerWidgetLeadUpdate {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
}
export interface SenlerWidgetDraftOptions {
    text: string;
    /** Explicitly replace existing composer text. Defaults to false. */
    replace?: boolean;
}
export declare function normalizeLeadUpdate(value: unknown): SenlerWidgetLeadUpdate;
export declare function normalizeDraft(value: unknown): SenlerWidgetDraftOptions;
