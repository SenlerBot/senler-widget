export function normalizeAnalytics(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new TypeError("analytics must be an object");
    const item = Object.fromEntries(Object.entries(value));
    const map = (data) => {
        if (!data ||
            typeof data !== "object" ||
            Array.isArray(data) ||
            Object.keys(data).length > 8)
            throw new TypeError("analytics identifiers/visit must contain at most 8 named strings");
        const result = {};
        for (const [key, entry] of Object.entries(data)) {
            if (!/^[a-z][a-z0-9_]{0,63}$/.test(key) ||
                ["constructor", "prototype", "__proto__"].includes(key) ||
                typeof entry !== "string" ||
                entry.length < 1 ||
                entry.length > 256 ||
                // This validation deliberately rejects ASCII control characters in visitor IDs.
                // eslint-disable-next-line no-control-regex
                /[\u0000-\u001f\u007f]/.test(entry))
                throw new TypeError("Invalid analytics identifier or visit value");
            result[key] = entry;
        }
        return result;
    };
    if (Object.keys(item).some((key) => !["provider", "sourceId", "identifiers", "visit"].includes(key)) ||
        typeof item.provider !== "string" ||
        !/^[a-z][a-z0-9_]{0,63}$/.test(item.provider) ||
        typeof item.sourceId !== "string" ||
        !/^[A-Za-z0-9._:-]{1,128}$/.test(item.sourceId))
        throw new TypeError("Invalid analytics provider or sourceId");
    return {
        provider: item.provider,
        sourceId: item.sourceId,
        identifiers: map(item.identifiers),
        ...(item.visit !== undefined ? { visit: map(item.visit) } : {}),
    };
}
