import type { SenlerWidgetTheme } from "./types.js";
import type { SenlerWidgetPosition } from "./types.js";
type LocalizedTextLike = {
    ru?: string;
    en?: string;
};
type LocalizedButtonsLike = {
    ru?: string[];
    en?: string[];
};
type ButtonColorsLike = {
    background?: string;
    icon?: string;
};
type ButtonSettingsLike = {
    position?: string;
    light?: ButtonColorsLike;
    dark?: ButtonColorsLike;
};
type WidgetThemeLike = {
    colors?: SenlerWidgetTheme["colors"];
    welcome_icon_url?: string;
    welcome_icon_shape?: string;
    chat_title?: LocalizedTextLike;
    default_dialog_title?: LocalizedTextLike;
    shadow_enabled?: boolean;
    welcome_message?: LocalizedTextLike;
    empty_state_message?: LocalizedTextLike;
    welcome_buttons?: LocalizedButtonsLike;
    button?: ButtonSettingsLike;
};
export declare function mergeThemeConfig<T extends WidgetThemeLike>(base?: T, override?: T): T | undefined;
export declare const WIDGET_DEFAULT_BUTTON_COLORS: {
    readonly light: {
        readonly background: "#3B82F6";
        readonly icon: "#ffffff";
    };
    readonly dark: {
        readonly background: "#18181B";
        readonly icon: "#ffffff";
    };
};
export declare const WIDGET_DEFAULT_COLORS: {
    readonly light: {
        readonly background: "#ffffff";
        readonly accent: "#3b82f6";
    };
    readonly dark: {
        readonly background: "#020817";
        readonly accent: "#60a5fa";
    };
};
/** Shared by the runtime and editors; host-page placement is not part of a theme. */
export declare const WIDGET_APPEARANCE_DEFAULTS: {
    position: "bottom-right";
    width: number;
    height: number;
    theme_mode: "light";
    border_radius: number;
    shadow_enabled: true;
    chat_title: {
        ru: string;
        en: string;
    };
    default_dialog_title: {
        ru: string;
        en: string;
    };
    welcome_message: {
        ru: string;
        en: string;
    };
    empty_state_message: {
        ru: string;
        en: string;
    };
    welcome_buttons: {
        ru: string[];
        en: string[];
    };
    button: {
        light: {
            readonly background: "#3B82F6";
            readonly icon: "#ffffff";
        };
        dark: {
            readonly background: "#18181B";
            readonly icon: "#ffffff";
        };
        position: "bottom-right";
    };
};
export declare const WIDGET_WINDOW_MARGIN = 20;
export declare const WIDGET_BUTTON_SIZE = 60;
export declare const WIDGET_WINDOW_SHADOWS: {
    light: string;
    dark: string;
};
export declare function getWidgetCornerStyles(position?: SenlerWidgetPosition, inset?: number): {
    top: string;
    bottom: string;
    left: string;
    right: string;
};
export interface WidgetViewport {
    width: number;
    height: number;
    offsetLeft?: number;
    offsetTop?: number;
}
/** Window position is independent of the launcher's corner. */
export declare function getWidgetWindowLayout(theme: SenlerWidgetTheme, viewport: WidgetViewport): {
    width: number;
    height: number;
    left: number;
    top: number;
};
export {};
