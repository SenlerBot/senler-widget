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

function definedProperties<T extends object>(value?: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key) && value[key] !== undefined) {
      result[key] = value[key];
    }
  }
  return result;
}

function mergeShallowOptional<T extends object>(
  base?: Partial<T>,
  override?: Partial<T>,
): T | undefined {
  if (!base && !override) {
    return undefined;
  }

  return {
    ...(base ?? {}),
    ...definedProperties(override),
  } as T;
}

function mergeButtonSettingsConfig<T extends ButtonSettingsLike>(
  base?: T,
  override?: T,
): T | undefined {
  if (!base && !override) {
    return undefined;
  }

  return {
    ...(base ?? {}),
    ...definedProperties(override),
    light: mergeShallowOptional(base?.light, override?.light),
    dark: mergeShallowOptional(base?.dark, override?.dark),
  } as T;
}

export function mergeThemeConfig<T extends WidgetThemeLike>(
  base?: T,
  override?: T,
): T | undefined {
  if (!base && !override) {
    return undefined;
  }

  return {
    ...(base ?? {}),
    ...definedProperties(override),
    chat_title: mergeShallowOptional(base?.chat_title, override?.chat_title),
    default_dialog_title: mergeShallowOptional(
      base?.default_dialog_title,
      override?.default_dialog_title,
    ),
    welcome_message: mergeShallowOptional(
      base?.welcome_message,
      override?.welcome_message,
    ),
    empty_state_message: mergeShallowOptional(
      base?.empty_state_message,
      override?.empty_state_message,
    ),
    welcome_buttons: mergeShallowOptional(
      base?.welcome_buttons,
      override?.welcome_buttons,
    ),
    button: mergeButtonSettingsConfig(base?.button, override?.button),
    colors:
      base?.colors || override?.colors
        ? {
            light: mergeShallowOptional(
              base?.colors?.light,
              override?.colors?.light,
            ),
            dark: mergeShallowOptional(
              base?.colors?.dark,
              override?.colors?.dark,
            ),
          }
        : undefined,
  } as T;
}

export const WIDGET_DEFAULT_BUTTON_COLORS = {
  light: { background: "#3B82F6", icon: "#ffffff" },
  dark: { background: "#18181B", icon: "#ffffff" },
} as const;

export const WIDGET_DEFAULT_COLORS = {
  light: { background: "#ffffff", accent: "#3b82f6" },
  dark: { background: "#020817", accent: "#60a5fa" },
} as const;

/** Shared by the runtime and editors; host-page placement is not part of a theme. */
export const WIDGET_APPEARANCE_DEFAULTS = {
  position: "bottom-right",
  width: 400,
  height: 600,
  theme_mode: "light",
  border_radius: 12,
  shadow_enabled: true,
  chat_title: { ru: "Чат поддержки", en: "Support chat" },
  default_dialog_title: { ru: "Поддержка", en: "Support" },
  welcome_message: { ru: "Здравствуйте! Чем могу помочь?", en: "Hello! How can I help you?" },
  empty_state_message: {
    ru: "Напишите сообщение, чтобы начать общение с поддержкой",
    en: "Send a message to start chatting with support",
  },
  welcome_buttons: { ru: Array<string>(), en: Array<string>() },
  button: { position: "bottom-right", ...WIDGET_DEFAULT_BUTTON_COLORS },
} satisfies SenlerWidgetTheme;

export const WIDGET_WINDOW_MARGIN = 20;
export const WIDGET_BUTTON_SIZE = 60;
export const WIDGET_WINDOW_SHADOWS = {
  light: "0 4px 12px rgba(0, 0, 0, 0.15)",
  dark: "0 4px 12px rgba(0, 0, 0, 0.5)",
};

export function getWidgetCornerStyles(
  position: SenlerWidgetPosition = WIDGET_APPEARANCE_DEFAULTS.position,
  inset = WIDGET_WINDOW_MARGIN,
) {
  return {
    top: position.startsWith("top") ? `${inset}px` : "",
    bottom: position.startsWith("bottom") ? `${inset}px` : "",
    left: position.endsWith("left") ? `${inset}px` : "",
    right: position.endsWith("right") ? `${inset}px` : "",
  };
}

export interface WidgetViewport {
  width: number;
  height: number;
  offsetLeft?: number;
  offsetTop?: number;
}

/** Window position is independent of the launcher's corner. */
export function getWidgetWindowLayout(theme: SenlerWidgetTheme, viewport: WidgetViewport) {
  const position = theme.position ?? WIDGET_APPEARANCE_DEFAULTS.position;
  const margin = WIDGET_WINDOW_MARGIN;
  const width = Math.min(theme.width ?? WIDGET_APPEARANCE_DEFAULTS.width, Math.max(0, viewport.width - margin * 2));
  const height = Math.min(theme.height ?? WIDGET_APPEARANCE_DEFAULTS.height, Math.max(0, viewport.height - margin * 2));
  return {
    width,
    height,
    left: (viewport.offsetLeft ?? 0) + (position.endsWith("left") ? margin : Math.max(margin, viewport.width - width - margin)),
    top: (viewport.offsetTop ?? 0) + (position.startsWith("top") ? margin : Math.max(margin, viewport.height - height - margin)),
  };
}

