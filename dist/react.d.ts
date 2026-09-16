import type { HTMLAttributes, ReactNode } from "react";
import type { SenlerWidgetApi, SenlerWidgetInitConfig, SenlerWidgetPersistentRuntimeConfig } from "./types.js";
export interface SenlerWidgetControllerOptions {
    src: string;
    /** Keep this object stable with useMemo. null defers initialization. */
    config: SenlerWidgetInitConfig | null;
    timeoutMs?: number;
    nonce?: string;
    /** Changing this value retries initialization, including after a failure. */
    retryKey?: string | number;
}
export interface SenlerWidgetState {
    status: "idle" | "loading" | "ready" | "failed";
    api: SenlerWidgetApi | null;
    error: Error | null;
}
/** Owns initialization and cleanup, including React StrictMode and delayed script loads. */
export declare function useSenlerWidgetController({ src, config, timeoutMs, nonce, retryKey }: SenlerWidgetControllerOptions): SenlerWidgetState;
export interface SenlerWidgetProviderProps extends SenlerWidgetControllerOptions {
    children?: ReactNode;
    runtime?: SenlerWidgetPersistentRuntimeConfig;
}
export declare function SenlerWidgetProvider({ children, runtime, ...options }: SenlerWidgetProviderProps): import("react").FunctionComponentElement<import("react").ProviderProps<SenlerWidgetState | null>>;
/** Access the nearest provider. One-shot commands (open/message) use the returned API. */
export declare function useSenlerWidget(): SenlerWidgetState;
export interface SenlerWidgetProps extends Omit<SenlerWidgetProviderProps, "children" | "config"> {
    config: Omit<SenlerWidgetInitConfig, "container" | "display_mode"> | null;
    containerProps?: Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML">;
    children?: ReactNode;
}
/** Embedded widget with a React-owned container. Children can consume useSenlerWidget(). */
export declare function SenlerWidget({ config, containerProps, children, ...options }: SenlerWidgetProps): import("react").FunctionComponentElement<SenlerWidgetProviderProps>;
