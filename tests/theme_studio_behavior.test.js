const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const pagePath = path.join(
  __dirname,
  "..",
  "solvronix_desk",
  "solvronix_desk",
  "page",
  "theme_studio",
  "theme_studio.js"
);

function loadThemeStudio() {
  const context = {
    console,
    CustomEvent: class CustomEvent {
      constructor(type, options) { this.type = type; this.detail = options && options.detail; }
    },
    clearTimeout() {},
    setTimeout(callback) { callback(); return 1; },
    document: {
      documentElement: { getAttribute: () => "light" },
      getElementById: () => null,
      createElement: () => ({ parentNode: null, textContent: "" }),
      head: { appendChild(element) { element.parentNode = this; } },
    },
    frappe: {
      pages: { "theme-studio": {} },
      provide() {},
      ui: { make_app_page() {} },
    },
    solvronix_desk: {},
    window: {
      location: { origin: "https://desk.solvronix.local" },
      matchMedia: () => ({ matches: true }),
      dispatchEvent() {},
    },
    __: (value) => value,
    $: () => ({}),
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(pagePath, "utf8"), context, { filename: pagePath });
  const studio = Object.create(context.solvronix_desk.ThemeStudio.prototype);
  studio._context = context;
  studio.state = {
    defaults: {
      navbar_background: "#102750",
      sidebar_background: "#FFFFFF",
      sidebar_text_color: "",
      sidebar_icon_color: "",
      toolbar_text_color: "",
      sidebar_hover_color: "#F1F3F6",
      page_background: "#F5F6F8",
      card_background: "#FFFFFF",
      text_color: "#19202D",
      muted_text_color: "#697386",
      link_color: "#1B5EA7",
      border_color: "#E1E5EA",
      secondary_button_color: "#FFFFFF",
      secondary_button_text: "#273142",
      input_background: "#FFFFFF",
      input_border_color: "#C9CDD4",
      dropdown_background: "#FFFFFF",
      readonly_background: "#F3F5F7",
      alternate_row_color: "#FAFBFC",
      table_header_color: "#F1F3F6",
      selected_row_color: "#FFF1E4",
      row_hover_color: "#F7F8FA",
      report_grid_color: "#E4E7EB",
      workspace_card_color: "#FFFFFF",
      number_card_color: "#FFFFFF",
      chart_background: "#FFFFFF",
    },
  };
  return studio;
}

test("dark preview derives untouched defaults but preserves edited colors", () => {
  const studio = loadThemeStudio();
  const config = {
    ...studio.state.defaults,
    preferred_mode: "Dark",
    brand_color: "#1B3F7E",
    navbar_background: "#5A214F",
    page_background: "#203040",
    text_color: "#FCEEDD",
    sidebar_hover_color: "#F4F7FB",
  };

  const resolved = studio._resolved_visual_config(config, true);

  assert.equal(resolved.navbar_background, "#5A214F");
  assert.equal(resolved.page_background, "#203040");
  assert.equal(resolved.text_color, "#FCEEDD");
  assert.equal(resolved.card_background, "#1A1D27");
  assert.equal(resolved.sidebar_hover_color, "#242A37");
});

test("preview variables and state attributes consume component controls", () => {
  const studio = loadThemeStudio();
  const styles = {};
  const attributes = {};
  const emptyNode = {
    attr() { return this; }, off() { return this; }, on() { return this; },
    prop() { return this; }, removeAttr() { return this; }, text() { return this; },
  };
  const target = {
    css(values) { Object.assign(styles, values); return this; },
    attr(name, value) { attributes[name] = value; return this; },
    find() { return emptyNode; },
  };
  const config = {
    brand_color: "#123456", accent_color: "#654321",
    sidebar_background: "#FFFFFF", navbar_background: "#123456",
    page_background: "#F0F0F0", card_background: "#FFFFFF",
    workspace_card_color: "#FFFFFF", number_card_color: "#FFFFFF", chart_background: "#FFFFFF",
    text_color: "#111111", muted_text_color: "#666666", border_color: "#DDDDDD", link_color: "#123456",
    primary_button_color: "#123456", secondary_button_color: "#EEEEEE", secondary_button_text: "#111111",
    button_radius: 8, button_height: 38, button_padding: 14, header_height: 42,
    input_background: "#FFFFFF", input_border_color: "#CCCCCC", focus_color: "#0055FF",
    checkbox_color: "#AA5500", dropdown_background: "#FAFAFA", readonly_background: "#EEEEEE", disabled_opacity: 45,
    card_radius: 12, section_spacing: 18, form_column_gap: 16, list_row_height: 44,
    table_header_color: "#EEEEEE", alternate_row_color: "#FAFAFA", selected_row_color: "#FFF0DD", row_hover_color: "#F5F5F5", report_grid_color: "#ABCDEF",
    success_color: "#008800", warning_color: "#AA7700", error_color: "#BB0000", info_color: "#0066AA",
    font_family: "Inter", base_font_px: 14, heading_scale: 120, label_font_size: 12, table_font_size: 13,
    font_weight: 600, line_height: 165, focus_outline_width: 4,
    corner_radius: 10, sidebar_width: 280, logo_size: 48, workspace_width: 1180, page_margin: 36,
    shadow_style: "Soft", sidebar_text_color: "", sidebar_icon_color: "", sidebar_active_color: "#654321", sidebar_active_text_color: "", sidebar_hover_color: "#EEEEEE", toolbar_text_color: "",
    chart_palette: ["#111111", "#222222"], login_background: "#123456", login_gradient_to: "#654321", login_gradient_angle: 120, login_card_opacity: 90,
    login_bg_image: "", login_heading: "Welcome", login_description: "Description", company_logo: "", app_title: "App", hide_powered: false, footer_text: "",
    layout_mode: "Boxed", logo_position: "Center", module_icon_style: "Solid", empty_state_style: "Illustrated",
    compact_forms: true, high_contrast: true, large_text: true, sticky_navbar: true, sticky_form_toolbar: true,
  };

  studio._apply_preview_vars(target, config, config);

  assert.equal(styles["--studio-checkbox"], "#AA5500");
  assert.equal(styles["--studio-dropdown-bg"], "#FAFAFA");
  assert.equal(styles["--studio-disabled-opacity"], "0.45");
  assert.equal(styles["--studio-font-weight"], "600");
  assert.equal(styles["--studio-line-height"], "1.65");
  assert.equal(styles["--studio-report-grid"], "#ABCDEF");
  assert.equal(styles["--studio-focus-width"], "4px");
  assert.equal(styles["--studio-logo-size"], "48px");
  assert.equal(styles["--studio-workspace-width"], "1180px");
  assert.equal(styles["--studio-page-margin"], "36px");
  assert.equal(attributes["data-layout"], "boxed");
  assert.equal(attributes["data-logo-position"], "center");
  assert.equal(attributes["data-module-icons"], "solid");
  assert.equal(attributes["data-empty-state"], "illustrated");
  assert.equal(attributes["data-compact-forms"], "true");
  assert.equal(attributes["data-high-contrast"], "true");
  assert.equal(attributes["data-large-text"], "true");
});

test("color-blind palette updates semantic preview colors", () => {
  const studio = loadThemeStudio();
  Object.assign(studio.state.defaults, {
    success_color: "#2E8B57",
    warning_color: "#D98E04",
    error_color: "#C83D4A",
    info_color: "#2C7BE5",
  });
  const resolved = studio._resolved_visual_config({
    ...studio.state.defaults,
    preferred_mode: "Light",
    colorblind_palette: "Deuteranopia",
  }, false);

  assert.equal(resolved.success_color, "#0072B2");
  assert.equal(resolved.warning_color, "#E69F00");
  assert.equal(resolved.error_color, "#D55E00");
  assert.equal(resolved.info_color, "#56B4E9");
});

test("dark preview derives each untouched token even with custom dark surfaces", () => {
  const studio = loadThemeStudio();
  const resolved = studio._resolved_visual_config({
    ...studio.state.defaults,
    preferred_mode: "Dark",
    brand_color: "#1B3F7E",
    page_background: "#101820",
    card_background: "#18232E",
  }, true);

  assert.equal(resolved.page_background, "#101820");
  assert.equal(resolved.card_background, "#18232E");
  assert.equal(resolved.text_color, "#E8EDF5");
  assert.notEqual(resolved.navbar_background, studio.state.defaults.navbar_background);
});

test("apply synchronizes every schema color control to the exact effective preview color", () => {
  const studio = loadThemeStudio();
  const styles = {};
  const makeCollection = (nodes = []) => ({
    length: nodes.length,
    each(callback) { nodes.forEach((node, index) => callback.call(node, index, node)); return this; },
    val(value) { if (value === undefined) return nodes[0] && nodes[0].value; nodes.forEach((node) => { node.value = value; }); return this; },
    attr() { return this; }, addClass() { return this; }, removeClass() { return this; },
    filter() { return this; }, prop() { return this; }, toggleClass() { return this; },
    text() { return this; }, off() { return this; }, on() { return this; }, removeAttr() { return this; },
  });
  const cssVariableByKey = {
    brand_color: "--studio-brand", accent_color: "--studio-accent",
    page_background: "--studio-page", card_background: "--studio-card",
    text_color: "--studio-text", muted_text_color: "--studio-muted",
    link_color: "--studio-link", border_color: "--studio-border",
    success_color: "--studio-success", warning_color: "--studio-warning",
    error_color: "--studio-error", info_color: "--studio-info",
    navbar_background: "--studio-navbar", toolbar_text_color: "--studio-toolbar-text",
    sidebar_background: "--studio-sidebar", sidebar_text_color: "--studio-sidebar-text",
    sidebar_icon_color: "--studio-sidebar-icon", sidebar_active_color: "--studio-sidebar-active",
    sidebar_active_text_color: "--studio-sidebar-active-text", sidebar_hover_color: "--studio-sidebar-hover",
    primary_button_color: "--studio-primary-btn", secondary_button_color: "--studio-secondary-btn",
    secondary_button_text: "--studio-secondary-text", input_background: "--studio-input-bg",
    input_border_color: "--studio-input-border", focus_color: "--studio-focus",
    checkbox_color: "--studio-checkbox", dropdown_background: "--studio-dropdown-bg",
    readonly_background: "--studio-readonly", alternate_row_color: "--studio-row-alt",
    table_header_color: "--studio-table-header", selected_row_color: "--studio-row-selected",
    row_hover_color: "--studio-row-hover", report_grid_color: "--studio-report-grid",
    workspace_card_color: "--studio-workspace-card", number_card_color: "--studio-number-card",
    chart_background: "--studio-chart-bg", login_background: "--studio-login-bg",
    login_gradient_to: "--studio-login-to",
  };
  const definitions = studio._context.solvronix_desk.theme_studio_sections
    .flatMap((section) => section.controls)
    .filter((definition) => definition[2] === "color" || definition[2] === "optional-color");
  const optionalKeys = Array.from(definitions
    .filter((definition) => definition[2] === "optional-color")
    .map((definition) => definition[0]));
  assert.equal(definitions.length, 39);
  assert.equal(Object.keys(cssVariableByKey).length, 39);
  assert.deepEqual(optionalKeys, ["toolbar_text_color", "sidebar_text_color", "sidebar_icon_color", "sidebar_active_text_color"]);

  const inputsByKey = {};
  const controls = {};
  definitions.forEach(([key]) => {
    const native = [{ type: "color", value: "#FFFFFF" }, { type: "color", value: "#FFFFFF" }];
    const hex = [{ type: "text", value: "" }, { type: "text", value: "" }];
    inputsByKey[key] = { native, hex };
    controls[`[data-setting="${key}"]`] = native;
    controls[`[data-hex="${key}"]`] = hex;
  });
  studio.$root = { find(selector) { return makeCollection(controls[selector]); } };
  studio.$preview = {
    css(values) { Object.assign(styles, values); return this; },
    attr() { return this; },
    find() { return makeCollection(); },
  };
  studio.config = {
    ...studio.state.defaults,
    preferred_mode: "Dark",
    brand_color: "#1B3F7E",
    accent_color: "#F57C00",
    sidebar_active_color: "#F57C00",
  };
  definitions.forEach(([key]) => {
    if (studio.config[key] === undefined) studio.config[key] = "#336699";
  });
  optionalKeys.forEach((key) => { studio.config[key] = ""; });
  studio.config.navbar_background = "";
  studio.config.sidebar_hover_color = "";
  studio.history = [];
  studio.future = [];
  studio._update_wcag = () => {};
  studio._apply_draft_to_desk = () => {};
  studio._refresh_server_preview = () => {};
  let workspaceStateSyncs = 0;
  studio._sync_workspace_document_state = () => { workspaceStateSyncs += 1; };
  const activeHex = inputsByKey.card_background.hex[1];
  activeHex.value = "#ABC";
  studio._context.document.activeElement = activeHex;

  ["Light", "Dark", "Auto"].forEach((mode) => {
    studio.config.preferred_mode = mode;
    const canonical = JSON.stringify(studio.config);
    studio.apply();

    definitions.forEach(([key, label]) => {
      const expected = styles[cssVariableByKey[key]];
      assert.match(expected, /^#[0-9A-F]{6}$/, `${mode} preview ${key} must resolve to a hex color`);
      assert.deepEqual(inputsByKey[key].native.map((input) => input.value), [expected, expected], `${mode} native ${key}`);
      assert.equal(inputsByKey[key].hex[0].value, expected, `${mode} full-settings hex ${key}`);
      if (key === "card_background") assert.equal(inputsByKey[key].hex[1].value, "#ABC", `${mode} active hex ${key}`);
      else assert.equal(inputsByKey[key].hex[1].value, expected, `${mode} inspector hex ${key}`);
      assert.match(
        studio._color_control(key, label, optionalKeys.includes(key), "inspector"),
        new RegExp(`type="color" value="${expected}"`),
        `${mode} newly rendered inspector ${key}`
      );
    });
    optionalKeys.forEach((key) => assert.equal(studio.config[key], "", `${mode} optional canonical ${key}`));
    assert.equal(JSON.stringify(studio.config), canonical, `${mode} canonical config`);
  });
  assert.equal(workspaceStateSyncs, 3);
  assert.equal(studio.workspace_preview_theme, "dark");
});

test("branding values update visible preview consumers", () => {
  const studio = loadThemeStudio();
  const nodes = {};
  const nodeFor = (selector) => nodes[selector] || (nodes[selector] = {
    attributes: {},
    textValue: "",
    attr(name, value) { this.attributes[name] = value; return this; },
    text(value) { this.textValue = value; return this; },
    off() { return this; }, on() { return this; }, prop() { return this; },
    removeAttr(name) { delete this.attributes[name]; return this; },
  });
  const target = {
    css() { return this; }, attr() { return this; }, find(selector) { return nodeFor(selector); },
  };
  const config = {
    ...studio.state.defaults,
    app_title: "Northstar Desk",
    tagline: "Work without friction",
    favicon: "/files/northstar-icon.png",
    chart_palette: [],
  };

  studio._apply_preview_vars(target, config, config);

  assert.equal(nodes["[data-app-title]"].textValue, "Northstar Desk");
  assert.equal(nodes["[data-app-tagline]"].textValue, "Work without friction");
  assert.equal(nodes["[data-favicon-preview]"].attributes.src, "/files/northstar-icon.png");
});

test("workspace normalization groups visible system and custom pages and de-duplicates routes", () => {
  const studio = loadThemeStudio();
  const groups = studio._normalize_workspaces({
    pages: [
      { title: "Sales", route: "selling", is_hidden: 0 },
      { name: "Support Team", is_hidden: false },
      { title: "Hidden system", route: "hidden-system", is_hidden: 1 },
    ],
    private_pages: [
      { title: "Sales duplicate", route: "/desk/selling" },
      { title: "My Workspace", route: "my-workspace", hidden: false },
      { title: "Hidden custom", route: "hidden-custom", hidden: true },
    ],
  });

  assert.deepEqual(JSON.parse(JSON.stringify(groups)), [
    {
      id: "system",
      label: "System workspaces",
      pages: [
        { title: "Sales", url: "/desk/selling", source: "system" },
        { title: "Support Team", url: "/desk/support-team", source: "system" },
      ],
    },
    {
      id: "custom",
      label: "Custom workspaces",
      pages: [
        { title: "My Workspace", url: "/desk/my-workspace", source: "custom" },
      ],
    },
  ]);
});

test("workspace route helper accepts local Desk routes and rejects unsafe or recursive routes", () => {
  const studio = loadThemeStudio();

  assert.equal(studio._workspace_route({ route: "selling" }), "/desk/selling");
  assert.equal(studio._workspace_route({ route: "/desk/sales/reports" }), "/desk/sales/reports");
  assert.equal(studio._workspace_route({ title: "Quality Management" }), "/desk/quality-management");
  assert.equal(studio._workspace_route({ name: "R&D Workspace" }), "/desk/r-d-workspace");
  [
    "https://evil.example/workspace",
    "//evil.example/workspace",
    "javascript:alert(1)",
    "/outside-desk",
    "../theme-studio",
    "theme-studio",
    "/desk/theme-studio",
    "selling?redirect=https://evil.example",
  ].forEach((route) => assert.equal(studio._workspace_route({ route }), "", route));
});

test("workspace toolbar and scene markup are grouped, accessible, and read-only", () => {
  const studio = loadThemeStudio();
  const groups = studio._normalize_workspaces({
    pages: [{ title: "Sales", route: "selling" }],
    private_pages: [{ title: "Private HQ", route: "private-hq" }],
  });
  const selector = studio._workspace_selector_html(groups);
  const scene = studio._workspace_scene_html();
  const source = fs.readFileSync(pagePath, "utf8");

  assert.match(source, /data-preview-scene="workspace"[^>]*>[^<]*Workspace/);
  assert.match(selector, /<label[^>]*for="sts-workspace-select"/);
  assert.match(selector, /<select[^>]*id="sts-workspace-select"[^>]*aria-label="Workspace"/);
  assert.match(selector, /<optgroup label="System workspaces">/);
  assert.match(selector, /<optgroup label="Custom workspaces">/);
  assert.match(scene, /data-scene="workspace"/);
  assert.match(scene, /<iframe[^>]*tabindex="-1"[^>]*aria-hidden="true"/);
  assert.match(scene, /class="sts-workspace-shield"/);
  assert.match(scene, /data-workspace-state="loading"/);
  assert.match(scene, /data-workspace-state="empty"/);
  assert.match(scene, /data-workspace-state="error"/);
  assert.doesNotMatch(scene, /data-inspector=/);
});

test("workspace loader exposes loading, empty, and error states", () => {
  const studio = loadThemeStudio();
  const states = [];
  studio._set_workspace_state = (state) => states.push(state);
  studio._render_workspace_selector = () => {};
  studio._context.frappe.call = (options) => options.callback({ message: { pages: [], private_pages: [] } });

  studio._load_workspaces();
  assert.deepEqual(states, ["loading", "empty"]);

  states.length = 0;
  studio._context.frappe.call = (options) => options.error();
  studio._load_workspaces();
  assert.deepEqual(states, ["loading", "error"]);

  states.length = 0;
  studio._context.frappe.call = (options) => options.callback({
    message: { pages: [], private_pages: [], unavailable: true },
  });
  studio._load_workspaces();
  assert.deepEqual(states, ["loading", "error"]);
});

test("newest workspace request wins when callbacks resolve out of order", () => {
  const studio = loadThemeStudio();
  const requests = [];
  const selected = [];
  studio.workspace_load_generation = 0;
  studio.workspace_paused = false;
  studio._set_workspace_state = () => {};
  studio._render_workspace_selector = () => {};
  studio._select_workspace = (url) => { selected.push(url); return true; };
  studio._context.frappe.call = (options) => requests.push(options);

  studio._load_workspaces();
  studio._load_workspaces();
  requests[1].callback({ message: { pages: [{ title: "Newest", route: "newest" }] } });
  requests[0].callback({ message: { pages: [{ title: "Stale", route: "stale" }] } });

  assert.deepEqual(Object.keys(studio.workspace_routes), ["/desk/newest"]);
  assert.deepEqual(selected, ["/desk/newest"]);
});

test("workspace preview pause invalidates requests and resume reloads only once", () => {
  const studio = loadThemeStudio();
  const assigned = [];
  let loads = 0;
  studio.workspace_load_generation = 4;
  studio.workspace_paused = false;
  studio.workspace_url = "/desk/selling";
  studio.$workspace_iframe = {
    length: 1,
    attr(name, value) { if (name === "src") assigned.push(value); return this; },
  };
  studio._load_workspaces = () => { loads += 1; };

  studio._pause_workspace_preview();
  assert.equal(studio.workspace_paused, true);
  assert.equal(studio.workspace_load_generation, 5);
  assert.equal(studio.workspace_url, "");
  assert.deepEqual(assigned, ["about:blank"]);

  studio._resume_workspace_preview();
  studio._resume_workspace_preview();
  assert.equal(studio.workspace_paused, false);
  assert.equal(loads, 1);
});

test("page lifecycle pauses and resumes workspace preview", () => {
  const studio = loadThemeStudio();
  const lifecycle = [];
  studio._context.frappe.pages["theme-studio"].studio = {
    dirty: false,
    refresh_if_clean() { lifecycle.push("refresh"); },
    apply() { lifecycle.push("apply"); },
    remove_draft() { lifecycle.push("remove-draft"); },
    _pause_workspace_preview() { lifecycle.push("pause"); },
    _resume_workspace_preview() { lifecycle.push("resume"); },
  };

  studio._context.frappe.pages["theme-studio"].on_page_hide();
  studio._context.frappe.pages["theme-studio"].on_page_show();

  assert.deepEqual(lifecycle, ["remove-draft", "pause", "refresh", "resume"]);
});

test("workspace selection only loads an allowlisted API-derived route", () => {
  const studio = loadThemeStudio();
  const assigned = [];
  studio.workspace_routes = { "/desk/selling": true };
  studio.$workspace_iframe = {
    length: 1,
    attr(name, value) { if (name === "src") assigned.push(value); return this; },
  };
  studio._set_workspace_state = () => {};

  assert.equal(studio._select_workspace("/desk/selling"), true);
  assert.equal(studio._select_workspace("/desk/users"), false);
  assert.deepEqual(assigned, ["/desk/selling"]);
});

test("read-only shield prefers Frappe's scrollable main section", () => {
  const studio = loadThemeStudio();
  const mainScrolls = [];
  const windowScrolls = [];
  let prevented = false;
  const mainSection = {
    clientHeight: 1031,
    scrollHeight: 2035,
    scrollBy(left, top) { mainScrolls.push([left, top]); },
  };
  studio.$workspace_iframe = {
    length: 1,
    0: {
      contentDocument: { querySelector: (selector) => selector === ".main-section" ? mainSection : null },
      contentWindow: { scrollBy(left, top) { windowScrolls.push([left, top]); } },
    },
  };

  studio._forward_workspace_wheel({
    deltaX: 7,
    deltaY: 42,
    preventDefault() { prevented = true; },
  });

  assert.equal(prevented, true);
  assert.deepEqual(mainScrolls, [[7, 42]]);
  assert.deepEqual(windowScrolls, []);
});

test("workspace wheel forwarding falls back to the document root and window", () => {
  const studio = loadThemeStudio();
  const root = { clientHeight: 200, scrollHeight: 400, scrollLeft: 3, scrollTop: 10 };
  studio.$workspace_iframe = {
    length: 1,
    0: {
      contentDocument: { querySelector: () => null, scrollingElement: root },
      contentWindow: { scrollBy() { throw new Error("window fallback should not be used"); } },
    },
  };
  assert.equal(studio._forward_workspace_wheel({ deltaX: 4, deltaY: 15, preventDefault() {} }), true);
  assert.equal(root.scrollLeft, 7);
  assert.equal(root.scrollTop, 25);

  const windowScrolls = [];
  studio.$workspace_iframe = {
    length: 1,
    0: {
      contentDocument: { querySelector: () => null, scrollingElement: { clientHeight: 100, scrollHeight: 100 } },
      contentWindow: { scrollBy(left, top) { windowScrolls.push([left, top]); } },
    },
  };
  assert.equal(studio._forward_workspace_wheel({ deltaX: 2, deltaY: 8, preventDefault() {} }), true);
  assert.deepEqual(windowScrolls, [[2, 8]]);
});

test("workspace CSS injection creates one style, updates it, and fails soft", () => {
  const studio = loadThemeStudio();
  const styles = [];
  const frameDocument = {
    head: { appendChild(element) { element.parentNode = this; styles.push(element); } },
    createElement: () => ({ id: "", textContent: "", parentNode: null }),
    getElementById: (id) => styles.find((element) => element.id === id) || null,
  };
  studio.$workspace_iframe = { length: 1, 0: { contentDocument: frameDocument } };

  assert.equal(studio._inject_workspace_css(":root{--brand:red}"), true);
  assert.equal(studio._inject_workspace_css(":root{--brand:blue}"), true);
  assert.equal(styles.length, 1);
  assert.equal(styles[0].id, "st-studio-workspace-draft");
  assert.equal(styles[0].textContent, ":root{--brand:blue}");

  studio.$workspace_iframe = { length: 1, 0: {} };
  Object.defineProperty(studio.$workspace_iframe[0], "contentDocument", {
    get() { throw new Error("Blocked by CSP"); },
  });
  assert.doesNotThrow(() => studio._inject_workspace_css("body{}"));
  assert.equal(studio._inject_workspace_css("body{}"), false);
});

test("allowlisted iframe load syncs draft state, injects CSS, and installs capture guards", () => {
  const studio = loadThemeStudio();
  const attributes = {};
  const guards = {};
  const inert = [];
  const frameDocument = {
    documentElement: { setAttribute(name, value) { attributes[name] = value; } },
    body: { setAttribute(name, value) { inert.push([name, value]); } },
    addEventListener(type, handler, capture) { guards[type] = { handler, capture }; },
  };
  studio.workspace_routes = { "/desk/selling": true };
  studio.workspace_url = "/desk/selling";
  studio.workspace_preview_css = ":root{--draft:1}";
  studio.workspace_preview_theme = "dark";
  studio.config = {
    density: "Compact", layout_mode: "Boxed", shortcut_style: "Outlined",
    compact_forms: true, high_contrast: true, large_text: false,
  };
  studio.$workspace_iframe = {
    length: 1,
    0: { contentDocument: frameDocument, contentWindow: { location: { pathname: "/desk/selling" } } },
    attr() { return this; },
  };
  const states = [];
  const injected = [];
  studio._set_workspace_state = (state) => states.push(state);
  studio._inject_workspace_css = (css) => { injected.push(css); return true; };

  assert.equal(studio._workspace_iframe_loaded(), true);
  assert.deepEqual(states, ["ready"]);
  assert.deepEqual(injected, [":root{--draft:1}"]);
  assert.equal(attributes["data-theme"], "dark");
  assert.equal(attributes["data-density"], "compact");
  assert.equal(attributes["data-layout"], "boxed");
  assert.deepEqual(inert, [["inert", ""]]);
  assert.equal(guards.click.capture, true);
  assert.equal(guards.submit.capture, true);
  assert.equal(guards.keydown.capture, true);

  ["click", "submit"].forEach((type) => {
    const calls = [];
    guards[type].handler({
      preventDefault() { calls.push("prevent"); },
      stopImmediatePropagation() { calls.push("stop"); },
    });
    assert.deepEqual(calls, ["prevent", "stop"]);
  });
  const keyCalls = [];
  guards.keydown.handler({
    key: "Enter",
    preventDefault() { keyCalls.push("prevent"); },
    stopImmediatePropagation() { keyCalls.push("stop"); },
  });
  assert.deepEqual(keyCalls, ["prevent", "stop"]);
});

test("non-allowlisted iframe navigation is blanked before ready or CSS injection", () => {
  const studio = loadThemeStudio();
  const assigned = [];
  const states = [];
  let injected = false;
  studio.workspace_routes = { "/desk/selling": true };
  studio.workspace_url = "/desk/selling";
  studio.$workspace_iframe = {
    length: 1,
    0: { contentDocument: {}, contentWindow: { location: { pathname: "/desk/users" } } },
    attr(name, value) { if (name === "src") assigned.push(value); return this; },
  };
  studio._set_workspace_state = (state) => states.push(state);
  studio._inject_workspace_css = () => { injected = true; };

  assert.equal(studio._workspace_iframe_loaded(), false);
  assert.deepEqual(assigned, ["about:blank"]);
  assert.deepEqual(states, ["error"]);
  assert.equal(injected, false);
  assert.equal(studio.workspace_url, "");
});

test("allowlisted workspace pathname with query or hash is rejected", () => {
  [
    { search: "?redirect=/desk/users", hash: "" },
    { search: "", hash: "#document-action" },
  ].forEach((location) => {
    const studio = loadThemeStudio();
    const assigned = [];
    const states = [];
    let injected = false;
    studio.workspace_routes = { "/desk/selling": true };
    studio.workspace_url = "/desk/selling";
    studio.$workspace_iframe = {
      length: 1,
      0: {
        contentDocument: {},
        contentWindow: { location: { pathname: "/desk/selling", ...location } },
      },
      attr(name, value) { if (name === "src") assigned.push(value); return this; },
    };
    studio._set_workspace_state = (state) => states.push(state);
    studio._inject_workspace_css = () => { injected = true; };

    assert.equal(studio._workspace_iframe_loaded(), false);
    assert.deepEqual(assigned, ["about:blank"]);
    assert.deepEqual(states, ["error"]);
    assert.equal(injected, false);
  });
});

test("server preview response propagates full generated CSS to the workspace iframe", () => {
  const studio = loadThemeStudio();
  const injected = [];
  studio.config = { preferred_mode: "Light", brand_color: "#123456" };
  studio._inject_workspace_css = (css) => { injected.push(css); return true; };
  studio._update_wcag = () => {};
  studio._context.frappe.call = (options) => options.callback({
    message: {
      css: ":root{--st-brand:#123456}.workspace{color:var(--st-brand)}",
      config: { preferred_mode: "Light" },
      wcag_failures: [],
    },
  });

  studio._refresh_server_preview();

  assert.equal(studio.workspace_preview_css, ":root{--st-brand:#123456}.workspace{color:var(--st-brand)}");
  assert.deepEqual(injected, [":root{--st-brand:#123456}.workspace{color:var(--st-brand)}"]);
});
