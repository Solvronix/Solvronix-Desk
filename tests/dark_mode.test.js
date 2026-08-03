const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const darkModePath = path.join(__dirname, "..", "solvronix_desk", "public", "js", "dark_mode.js");
const runtimePath = path.join(__dirname, "..", "solvronix_desk", "public", "js", "theme_runtime.js");
const studioPath = path.join(
  __dirname, "..", "solvronix_desk", "solvronix_desk", "page", "theme_studio", "theme_studio.js"
);

function loadDarkMode({ storedMode = null, osDark = false } = {}) {
  const values = new Map();
  if (storedMode) values.set("st_theme_mode", storedMode);
  const attributes = {};
  const calls = [];
  const events = [];
  let osListener = null;
  const media = {
    matches: osDark,
    addEventListener(name, callback) { if (name === "change") osListener = callback; },
  };
  const document = {
    documentElement: {
      style: {},
      setAttribute(name, value) { attributes[name] = value; },
      getAttribute(name) { return attributes[name] || null; },
    },
    getElementById() { return null; },
    querySelector() { return null; },
  };
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
  const frappe = {
    boot: { st_theme_mode_default: "light" },
    session: { user: "manager@example.com" },
    call(options) { calls.push(options); },
  };
  const context = {
    CustomEvent: class CustomEvent {
      constructor(type, options) { this.type = type; this.detail = options && options.detail; }
    },
    console,
    document,
    frappe,
    localStorage,
    setInterval() { return 1; },
    clearInterval() {},
    window: {
      document, frappe, localStorage, matchMedia: () => media,
      dispatchEvent(event) { events.push(event); },
    },
    $: () => ({ ready() {}, on() {} }),
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(darkModePath, "utf8"), context, { filename: darkModePath });
  return { context, attributes, calls, events, media, values, triggerOsChange(matches) { media.matches = matches; osListener({ matches }); } };
}

test("temporary Auto mode follows live operating-system changes", () => {
  const runtime = loadDarkMode({ storedMode: "light", osDark: false });

  runtime.context.stApplyThemeMode("auto");
  assert.equal(runtime.attributes["data-theme-mode"], "automatic");
  assert.equal(runtime.attributes["data-theme"], "light");
  runtime.triggerOsChange(true);

  assert.equal(runtime.attributes["data-theme"], "dark");
  assert.equal(runtime.values.get("st_theme_mode"), "light");
});

test("resolved site mode does not overwrite an explicit user preference", () => {
  const runtime = loadDarkMode({ storedMode: "light", osDark: false });

  runtime.context.stApplyResolvedThemeMode("dark");

  assert.equal(runtime.attributes["data-theme-mode"], "light");
  assert.equal(runtime.attributes["data-theme"], "light");
  assert.equal(runtime.calls.length, 0);
});

test("explicit toolbar mode persists locally and to the Frappe user", () => {
  const runtime = loadDarkMode({ osDark: false });

  runtime.context.stSetThemeMode("auto");

  assert.equal(runtime.values.get("st_theme_mode"), "auto");
  assert.equal(runtime.attributes["data-theme-mode"], "automatic");
  assert.equal(runtime.calls.length, 1);
  assert.equal(runtime.calls[0].args.theme, "Automatic");
  const userEvent = runtime.events.find((event) => event.type === "st:user-theme-mode-changed");
  assert.equal(userEvent && userEvent.detail.mode, "auto");
  assert.equal(userEvent && userEvent.detail.dark, false);
});

test("Theme Studio and theme runtime use non-persisting mode helpers", () => {
  const studio = fs.readFileSync(studioPath, "utf8");
  const themeRuntime = fs.readFileSync(runtimePath, "utf8");

  assert.match(studio, /window\.stApplyThemeMode\(c\.preferred_mode\)/);
  assert.doesNotMatch(studio, /preferred_mode: response\.message\.config\.preferred_mode/);
  assert.match(studio, /st-theme-os-mode-change\.stsThemeMode/);
  assert.match(themeRuntime, /window\.stApplyResolvedThemeMode\(preferredMode\)/);
  assert.doesNotMatch(themeRuntime, /stSetThemeMode\(preferredMode\)/);
});

test("Auto uses Frappe's native automatic DOM value while helpers stay normalized", () => {
  const runtime = loadDarkMode({ storedMode: "auto", osDark: false });

  assert.equal(runtime.attributes["data-theme-mode"], "automatic");
  assert.equal(runtime.attributes["data-theme"], "light");
  assert.equal(runtime.context.stGetAppliedThemeMode(), "auto");
});
