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

export function normalizeLeadUpdate(value: unknown): SenlerWidgetLeadUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TypeError("Lead update must be an object");
  const limits = {
    email: 254,
    phone: 64,
    firstName: 256,
    lastName: 256,
    avatarUrl: 2048,
  };
  const result: Record<string, string> = {};
  for (const [key, input] of Object.entries(value)) {
    if (!Object.prototype.hasOwnProperty.call(limits, key))
      throw new TypeError(`Unsupported lead field: ${key}`);
    if (input === undefined) continue;
    const limit = limits[key as keyof typeof limits];
    if (
      typeof input !== "string" ||
      !input.trim() ||
      input.trim().length > limit
    )
      throw new TypeError(`Invalid lead field: ${key}`);
    result[key] = input.trim();
  }
  if (!Object.keys(result).length)
    throw new TypeError("Provide at least one lead field");
  if (result.avatarUrl && !/^https:\/\//i.test(result.avatarUrl))
    throw new TypeError("avatarUrl must be an HTTPS URL");
  return result;
}

export function normalizeDraft(value: unknown): SenlerWidgetDraftOptions {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("text" in value) ||
    typeof value.text !== "string" ||
    value.text.length > 50_000 ||
    Object.keys(value).some((key) => key !== "text" && key !== "replace") ||
    ("replace" in value &&
      value.replace !== undefined &&
      typeof value.replace !== "boolean")
  )
    throw new TypeError("setDraft requires text and optional replace");
  return {
    text: value.text,
    replace: "replace" in value && value.replace === true,
  };
}
