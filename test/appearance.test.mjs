import assert from "node:assert/strict";
import test from "node:test";
import {
  WIDGET_APPEARANCE_DEFAULTS,
  getWidgetWindowLayout,
  getWidgetCornerStyles,
  mergeThemeConfig,
} from "../dist/appearance.js";

test("partial overrides preserve nested channel settings, false and empty values", () => {
  const base = { button: { position: "top-left", dark: { background: "#123456", icon: "#abcdef" } }, chat_title: { ru: "Чат", en: "Chat" } };
  const merged = mergeThemeConfig(base, { button: { dark: { background: undefined, icon: "#000000" } }, chat_title: { ru: "" }, shadow_enabled: false, welcome_buttons: { ru: [] } });
  assert.deepEqual(merged.button, { position: "top-left", light: undefined, dark: { background: "#123456", icon: "#000000" } });
  assert.deepEqual(merged.chat_title, { ru: "", en: "Chat" });
  assert.equal(merged.shadow_enabled, false);
  assert.deepEqual(merged.welcome_buttons.ru, []);
  assert.equal(base.button.dark.icon, "#abcdef");
});

test("default dark launcher and theme mode match the widget runtime", () => {
  assert.equal(WIDGET_APPEARANCE_DEFAULTS.theme_mode, "light");
  assert.equal(WIDGET_APPEARANCE_DEFAULTS.button.dark.background, "#18181B");
});

test("all window corners fit a small viewport independently from the launcher", () => {
  for (const position of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
    assert.deepEqual(getWidgetWindowLayout({ position, button: { position: "hidden" } }, { width: 360, height: 500, offsetTop: 40 }), { width: 320, height: 460, left: 20, top: 60 });
    const layout = getWidgetWindowLayout({ position, width: 400, height: 600, button: { position: "top-left" } }, { width: 1000, height: 800 });
    assert.equal(layout.left, position.endsWith("left") ? 20 : 580);
    assert.equal(layout.top, position.startsWith("top") ? 20 : 180);
    const corner = getWidgetCornerStyles(position);
    assert.equal(corner[position.startsWith("top") ? "top" : "bottom"], "20px");
    assert.equal(corner[position.endsWith("left") ? "left" : "right"], "20px");
  }
});
