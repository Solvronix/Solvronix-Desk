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
  studio.page_active = true;
  studio.lifecycle_generation = 1;
  studio.state_request_active = false;
  studio.state_request_generation = 0;
  studio.preview_timer = null;
  studio.workspace_preview_css = "";
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

const workspaceTargetSelectors = {
  button: 'button,.btn,[role="button"],.shortcut-widget-box,.widget-control,.dropdown-toggle',
  text: 'a,h1,h2,h3,h4,h5,h6,p,label,small,.widget-title,.widget-subtitle,.link-content,.text-muted',
  numberCard: '.number-card,.number-widget-box,.number-card-widget-box',
  card: '.widget,.widget-group,.number-card,.dashboard-widget-box,.card,.onboarding-widget-box,.links-widget-box,.quick-list-widget-box,.custom-block',
  background: '.workspace-container,.layout-main-section,.page-container,.page-body,body',
};

function workspaceTargetElement(matches = {}) {
  const calls = [];
  return {
    calls,
    closest(selector) {
      calls.push(selector);
      return matches[selector] || null;
    },
  };
}

function bindThemeStudio(studio) {
  const rootHandlers = {};
  const frameHandlers = {};
  const windowHandlers = { off: [] };
  const stageHandlers = {};
  const chain = {
    length: 1,
    0: {},
    off() { return this; },
    on(event, selector, handler) {
      if (typeof selector === "function") handler = selector;
      return this;
    },
    find() { return this; },
    removeClass() { return this; },
    addClass() { return this; },
    filter() { return this; },
    attr() { return this; },
    toggleClass() { return this; },
    val() { return this; },
    show() { return this; },
    data(name) { return this[0] && this[0].__data && this[0].__data[name]; },
  };
  const stage = Object.assign({}, chain, {
    on(event, handler) { stageHandlers[event] = handler; return this; },
  });
  studio.$root = Object.assign({}, chain, {
    on(event, selector, handler) {
      rootHandlers[`${event}|${selector}`] = handler;
      return this;
    },
    find(selector) { return selector === ".sts-stage,.sts-preview-page" ? stage : chain; },
  });
  studio.$workspace_iframe = Object.assign({}, chain, {
    on(event, handler) { frameHandlers[event] = handler; return this; },
  });
  studio._context.$ = (value) => {
    if (value === studio._context.window) {
      return {
        off(event) { windowHandlers.off.push(event); return this; },
        on(event, handler) { windowHandlers[event] = handler; return this; },
      };
    }
    if (value && value.__query) return value.__query;
    return Object.assign({}, chain, { 0: value });
  };
  studio.bind();
  return { rootHandlers, frameHandlers, windowHandlers, stageHandlers, chain };
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

function installChartState(studio) {
  studio.state.chart_schema = {
    version: 1,
    groups: {
      chart: {
        type: { type: "enum", default: "source", values: ["source", "bar", "line", "area", "pie", "donut", "percentage"], applies_to: ["full"], label: "Chart type" },
        height: { type: "integer", default: 240, min: 80, max: 900, unit: "px", applies_to: ["full", "sparkline"], label: "Height" },
        responsive: { type: "boolean", default: true, applies_to: ["full", "sparkline"], label: "Responsive sizing" },
      },
      surface: {
        background: { type: "color", default: "#FFFFFF", applies_to: ["full", "sparkline"], label: "Chart background" },
      },
      series_defaults: {
        palette: { type: "palette", default: ["#1B3F7E", "#F57C00"], max_items: 8, applies_to: ["full", "sparkline"], label: "Chart palette" },
      },
    },
  };
  studio.state.chart_registry = [
    { id: "chart-1", title: "Sales", family: "dashboard_chart", capability: "full" },
    { id: "card-1", title: "Revenue", family: "number_card", capability: "sparkline" },
  ];
  studio.config = {
    chart_system_version: 1,
    chart_defaults: { chart: { height: 300 } },
    chart_overrides: { "chart-1": { surface: { background: "#112233" } } },
    chart_background: "#FFFFFF",
    chart_palette: ["#1B3F7E", "#F57C00"],
  };
  studio.saved = JSON.parse(JSON.stringify(studio.config));
  studio.history = [];
  studio.future = [];
  studio.$root = { toggleClass() {}, find() { return { val() {}, prop() {}, toggleClass() {}, text() {} }; } };
  studio.page = {};
  studio.apply = () => {};
}

test("chart editor resolves system then global then individual ownership", () => {
  const studio = loadThemeStudio();
  installChartState(studio);

  const resolved = studio._chart_effective_state("chart-1");

  assert.equal(resolved.values.chart.height, 300);
  assert.equal(resolved.values.surface.background, "#112233");
  assert.equal(resolved.values.chart.responsive, true);
  assert.equal(resolved.ownership["chart.height"], "global");
  assert.equal(resolved.ownership["surface.background"], "individual");
  assert.equal(resolved.ownership["chart.responsive"], "system");
});

test("Theme Studio draft keeps light and dark palettes ready for toolbar switching", () => {
  const studio = loadThemeStudio();
  let draftStyle = null;
  studio._context.document.createElement = () => (draftStyle = { parentNode: null, textContent: "" });
  studio.config = {
    ...studio.state.defaults,
    preferred_mode: "Dark",
    brand_color: "#1B3F7E",
    accent_color: "#F57C00",
    corner_radius: 8,
    sidebar_width: 240,
    shadow_style: "Soft",
  };

  studio._apply_draft_to_desk();

  assert.ok(draftStyle);
  assert.match(draftStyle.textContent, /html:not\(\[data-theme="dark"\]\)\{/);
  assert.match(draftStyle.textContent, /--st-page-bg:#F5F6F8/);
  assert.match(draftStyle.textContent, /html\[data-theme="dark"\]\{/);
  assert.match(draftStyle.textContent, /--st-page-bg:#0F1117/);
  assert.match(draftStyle.textContent, /--fg-color:#FFFFFF/);
  assert.match(draftStyle.textContent, /--fg-color:#1A1D27/);
});

test("dark chart preview derives system colors and preserves explicit overrides", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  studio.workspace_preview_theme = "dark";

  const individual = studio._chart_effective_state("chart-1");
  const global = studio._chart_effective_state("");

  assert.equal(individual.values.surface.background, "#112233");
  assert.equal(individual.ownership["surface.background"], "individual");
  assert.deepEqual(Array.from(global.values.series_defaults.palette), [
    "#7AA2F7", "#FF9E64", "#73DACA", "#7DCFFF", "#BB9AF7",
  ]);
  assert.equal(global.ownership["series_defaults.palette"], "system");
});

test("chart resets fall back from individual to global and global to system", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  studio._set_chart_value("individual", "chart-1", "chart.height", 420);
  assert.equal(studio.config.chart_overrides["chart-1"].chart.height, 420);
  studio.chart_invalid = {
    "individual:chart-1:chart.height": "invalid",
    "individual:chart-1:surface.background": "invalid",
    "global::chart.height": "invalid",
  };

  studio._reset_chart_property("individual", "chart-1", "chart.height");
  assert.equal(studio._chart_effective_state("chart-1").values.chart.height, 300);
  assert.equal(studio.chart_invalid["individual:chart-1:chart.height"], undefined);
  assert.equal(studio.chart_invalid["individual:chart-1:surface.background"], "invalid");

  studio._reset_chart("chart-1");
  assert.equal(studio.config.chart_overrides["chart-1"], undefined);
  assert.equal(studio.chart_invalid["individual:chart-1:surface.background"], undefined);
  studio._reset_global_charts();
  assert.equal(Object.keys(studio.config.chart_defaults).length, 0);
  assert.equal(studio._chart_effective_state("chart-1").values.chart.height, 240);
  assert.equal(studio.chart_invalid["global::chart.height"], undefined);
});

test("chart editor refresh rerenders both gallery and workspace chart inspectors", () => {
  ["charts.chart", "workspace.chart"].forEach((inspector) => {
    const studio = loadThemeStudio();
    installChartState(studio);
    studio.selected_inspector = inspector;
    const calls = [];
    studio._chart_system_html = () => "<div>charts</div>";
    studio._render_inspector = () => calls.push("render");
    studio._restore_inspector_highlight = () => calls.push("restore");
    studio.$root = {
      find() { return { length: 1, replaceWith(html) { calls.push(["replace", html]); } }; },
    };

    studio._refresh_chart_editor();

    assert.deepEqual(calls, [["replace", "<div>charts</div>"], "render", "restore"]);
  });
});

test("chart controls are generated from schema and filtered by capability", () => {
  const studio = loadThemeStudio();
  installChartState(studio);

  const full = studio._chart_controls_html("individual", "chart-1", "full");
  const sparkline = studio._chart_controls_html("individual", "card-1", "sparkline");

  assert.match(full, /data-chart-path="chart\.height"/);
  assert.match(full, /data-chart-path="surface\.background"/);
  assert.match(full, /data-chart-reset-property="surface\.background"/);
  assert.doesNotMatch(sparkline, /data-chart-path="axes\./);
  assert.match(full, /Quick settings/);
  assert.match(full, /Advanced settings/);
  assert.doesNotMatch(full, /class="sts-chart-group" open/);
});

test("workspace chart classification takes precedence and preserves runtime identity", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  const chartElement = { classList: { add() {}, remove() {} } };
  const hit = workspaceTargetElement({ [workspaceTargetSelectors.card]: { name: "generic-card" } });
  const frameDocument = {
    defaultView: {
      solvronixChartRuntime: {
        describe(element) {
          assert.equal(element, hit);
          return { id: "chart-1", family: "dashboard_chart", capability: "full", element: chartElement };
        },
      },
    },
  };

  const target = studio._classify_workspace_target(hit, frameDocument);

  assert.equal(target.id, "workspace.chart");
  assert.equal(target.chart_id, "chart-1");
  assert.equal(target.element, chartElement);
});

test("chart editor panel exposes global controls and permission-filtered registry", () => {
  const studio = loadThemeStudio();
  installChartState(studio);

  const html = studio._chart_system_html();

  assert.match(html, /Defaults for all charts/);
  assert.match(html, /Sales/);
  assert.match(html, /Revenue/);
  assert.match(html, /data-select-chart="chart-1"/);
  assert.match(html, /data-reset-global-charts/);
});

test("Theme Studio pushes chart config and schema into the workspace runtime", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  const calls = [];
  studio.$workspace_iframe = {
    length: 1,
    0: { contentWindow: { solvronixChartRuntime: { setConfig(config, schema) { calls.push([config, schema]); } } } },
  };

  assert.equal(studio._apply_chart_runtime_to_workspace(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], studio.config);
  assert.equal(calls[0][1], studio.state.chart_schema);
});

test("invalid chart input blocks draft and publish requests", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  let calls = 0;
  studio._context.frappe.call = () => { calls += 1; };
  studio._context.frappe.show_alert = () => {};
  studio.chart_invalid = { "global::chart.height": "invalid" };
  studio.dirty = true;

  assert.equal(studio.save_draft(), false);
  assert.equal(studio.save(), false);
  assert.equal(calls, 0);
});

test("chart mutation rejects unknown and prototype paths", () => {
  const studio = loadThemeStudio();
  installChartState(studio);

  assert.equal(studio._set_chart_value("global", "", "__proto__.polluted", true), false);
  assert.equal(studio._set_chart_value("global", "", "surface.unknown", "x"), false);
  assert.equal({}.polluted, undefined);
});

test("selected runtime series expose individual line and bar overrides", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  studio.state.chart_schema.groups.series_defaults.line_width = {
    type: "number", default: 2, min: 0, max: 12, step: 0.5, unit: "px", applies_to: ["line", "area"], label: "Line width",
  };
  studio.state.chart_schema.groups.series_defaults.bar_radius = {
    type: "integer", default: 4, min: 0, max: 30, unit: "px", applies_to: ["bar"], label: "Bar radius",
  };
  const html = studio._chart_series_controls_html("chart-1", [
    { key: "dataset:net_total", label: "Net Total" },
  ]);

  assert.match(html, /Net Total/);
  assert.match(html, /data-chart-path="series\.dataset:net_total\.line_width"/);
  assert.match(html, /data-chart-path="series\.dataset:net_total\.bar_radius"/);
});

test("individual chart registry selection opens the Charts scene and keeps stable identity", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  const calls = [];
  studio._activate_preview_scene = (scene) => calls.push(["scene", scene]);
  studio._render_inspector = () => calls.push(["render", studio.selected_inspector]);
  studio._restore_inspector_highlight = () => calls.push(["restore"]);
  studio._load_chart_preview = (id) => calls.push(["load", id]);

  assert.equal(studio._select_registry_chart("chart-1"), true);
  assert.equal(studio.selected_chart_id, "chart-1");
  assert.equal(studio.selected_chart_preview_kind, "line");
  assert.equal(studio.selected_inspector, "charts.chart");
  assert.deepEqual(calls, [["scene", "charts"], ["render", "charts.chart"], ["restore"], ["load", "chart-1"]]);
});

test("individual chart selection loads its real ERPNext preview data", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  const requests = [];
  studio._context.frappe.call = (options) => requests.push(options);
  studio._activate_preview_scene = () => {};
  studio._render_inspector = () => {};
  studio._restore_inspector_highlight = () => {};
  studio._apply_charts_preview = () => {};

  assert.equal(studio._select_registry_chart("chart-1"), true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "solvronix_desk.theme_api.get_chart_preview");
  assert.equal(requests[0].args.chart_id, "chart-1");
  assert.equal(studio.selected_chart_preview_data.status, "loading");

  requests[0].callback({
    message: {
      status: "ready",
      kind: "bar",
      labels: ["Jan", "Feb"],
      datasets: [{ name: "Sales", values: [10, 20] }],
    },
  });

  assert.equal(studio.selected_chart_preview_kind, "bar");
  assert.equal(studio.selected_chart_preview_data.status, "ready");
  assert.deepEqual(studio.selected_chart_preview_data.labels, ["Jan", "Feb"]);
});

test("older ERPNext chart response cannot replace the newest selection", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  studio.state.chart_registry.push({ id: "chart-2", family: "dashboard_chart", label: "Revenue", context: "Line", available: true });
  const requests = [];
  studio._context.frappe.call = (options) => requests.push(options);
  studio._activate_preview_scene = () => {};
  studio._render_inspector = () => {};
  studio._restore_inspector_highlight = () => {};
  studio._apply_charts_preview = () => {};

  studio._select_registry_chart("chart-1");
  studio._select_registry_chart("chart-2");
  requests[0].callback({ message: { status: "ready", kind: "bar", labels: ["Old"], datasets: [] } });
  requests[1].callback({ message: { status: "ready", kind: "line", labels: ["New"], datasets: [] } });

  assert.equal(studio.selected_chart_id, "chart-2");
  assert.deepEqual(studio.selected_chart_preview_data.labels, ["New"]);
});

test("real ERPNext values generate selected chart SVG geometry", () => {
  const studio = loadThemeStudio();
  const svg = studio._chart_data_svg("bar", {
    status: "ready",
    labels: ["Jan", "Feb"],
    datasets: [{ name: "Sales", values: [10, 20] }],
  });

  assert.match(svg, /data-chart-point="0"/);
  assert.match(svg, /data-chart-point="1"/);
  assert.match(svg, /aria-label="Jan: 10"/);
  assert.doesNotMatch(svg, /42,800/);
});

test("Charts preview restores its sample plot while a different source is loading", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  studio.selected_chart_id = "chart-1";
  studio.selected_chart_preview_kind = "bar";
  studio.selected_chart_preview_data = { status: "loading", kind: "bar" };
  let plotHtml = "ORIGINAL SAMPLE";
  const plot = {
    data(name, value) {
      if (value === undefined) return this[`_${name}`];
      this[`_${name}`] = value;
      return this;
    },
    html(value) {
      if (value === undefined) return plotHtml;
      plotHtml = value;
      return this;
    },
  };
  const empty = { text() { return this; } };
  const cardNode = { kind: "bar" };
  const card = {
    data(name) { return name === "chart-preview-kind" ? "bar" : undefined; },
    css() { return this; },
    attr() { return this; },
    find(selector) { return selector === ".sts-chart-preview-plot" ? plot : empty; },
  };
  studio._context.$ = (node) => node === cardNode ? card : node;
  studio.$preview = {
    find(selector) {
      if (selector === "[data-chart-preview-card]") {
        return { each(callback) { callback.call(cardNode); } };
      }
      return empty;
    },
  };

  studio._apply_charts_preview();
  studio.selected_chart_preview_data = { status: "ready", kind: "bar", labels: ["Jan"], datasets: [{ values: [5] }] };
  studio._apply_charts_preview();
  assert.match(plotHtml, /data-chart-point="0"/);
  studio.selected_chart_preview_data = { status: "loading", kind: "bar" };
  studio._apply_charts_preview();

  assert.equal(plotHtml, "ORIGINAL SAMPLE");
});

test("Charts inspector uses a local preview card and never Workspace re-anchor", () => {
  const studio = loadThemeStudio();
  const card = { name: "line-preview" };
  let positioned = null;
  studio.selected_inspector = "charts.chart";
  studio.selected_chart_preview_kind = "line";
  studio._schedule_workspace_reanchor = () => { throw new Error("must not use iframe re-anchor"); };
  studio._position_inspector = (element) => { positioned = element; };
  studio.$preview = {
    find(selector) {
      if (selector === ".is-inspected") return { removeClass() { return this; } };
      assert.match(selector, /data-chart-preview-kind="line"/);
      return {
        removeClass() { return this; },
        first() { return { addClass() { return { 0: card }; } }; },
      };
    },
  };

  studio._restore_inspector_highlight();

  assert.equal(positioned, card);
});

test("Charts scene follows Workspace and renders four editable visual families", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  const source = fs.readFileSync(pagePath, "utf8");
  const scene = studio._charts_scene_html();

  assert.match(source, /data-preview-scene="workspace"[\s\S]{0,180}data-preview-scene="charts"/);
  assert.match(scene, /data-scene="charts"/);
  for (const kind of ["line", "bar", "donut", "sparkline"]) {
    assert.match(scene, new RegExp(`data-chart-preview-kind="${kind}"`));
  }
  assert.match(scene, /<svg/);
  assert.match(scene, /data-chart-sample-status/);
  assert.match(scene, /Sample data/);
});

test("registry click delegates to the persistent Charts preview selector", () => {
  const studio = loadThemeStudio();
  const selected = [];
  studio._select_registry_chart = (id) => selected.push(id);
  const bindings = bindThemeStudio(studio);
  const button = { __data: { "select-chart": "chart-1" } };
  button.__query = Object.assign({}, bindings.chain, { 0: button });

  bindings.rootHandlers["click|[data-select-chart]"].call(button);

  assert.deepEqual(selected, ["chart-1"]);
});

test("hybrid preview model maps canonical individual and global chart values", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  studio.state.chart_schema.groups.series_defaults.line_width = { type: "number", default: 2, applies_to: ["line"], label: "Line width" };
  studio.state.chart_schema.groups.series_defaults.fill_opacity = { type: "integer", default: 28, applies_to: ["line", "area"], label: "Fill opacity" };
  studio.state.chart_schema.groups.axes = {
    axis_color: { type: "color", default: "#A8B0BC", applies_to: ["axis"], label: "Axis color" },
    grid_color: { type: "color", default: "#E4E7EB", applies_to: ["axis"], label: "Grid color" },
  };
  studio.selected_chart_id = "chart-1";
  studio.selected_chart_preview_kind = "line";

  const selected = studio._chart_preview_model("line");
  const sample = studio._chart_preview_model("bar");

  assert.equal(selected.chart_id, "chart-1");
  assert.equal(selected.title, "Sales");
  assert.equal(selected.status, "Sample data");
  assert.equal(selected.styles["--sts-chart-surface"], "#112233");
  assert.equal(selected.styles["--sts-chart-series-1"], "#1B3F7E");
  assert.equal(selected.styles["--sts-chart-line-width"], "2px");
  assert.equal(selected.styles["--sts-chart-grid"], "#E4E7EB");
  assert.equal(selected.attributes["data-chart-height"], "300");
  assert.equal(sample.chart_id, "");
  assert.equal(sample.title, "Bars");
  assert.equal(sample.styles["--sts-chart-surface"], "#FFFFFF");
});

test("registry source family chooses the matching sample unless type is explicitly overridden", () => {
  const studio = loadThemeStudio();

  assert.equal(studio._chart_preview_kind({ family: "dashboard_chart", context: "Bar" }, { chart: { type: "source" } }), "bar");
  assert.equal(studio._chart_preview_kind({ family: "dashboard_chart", context: "Bar" }, { chart: { type: "donut" } }), "donut");
  assert.equal(studio._chart_preview_kind({ family: "number_card" }, { chart: { type: "source" } }), "sparkline");
});

test("clicking an unbound sample edits globals without creating an override", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  studio.selected_chart_id = "chart-1";
  studio.selected_chart_preview_kind = "line";
  studio._render_inspector = () => {};
  studio._restore_inspector_highlight = () => {};
  const before = JSON.stringify(studio.config.chart_overrides);

  studio._select_chart_preview("bar", {});

  assert.equal(studio.selected_chart_id, null);
  assert.equal(studio.selected_inspector, "charts.chart");
  assert.equal(JSON.stringify(studio.config.chart_overrides), before);
});

test("apply refreshes the hybrid Charts gallery in the same preview cycle", () => {
  const studio = loadThemeStudio();
  installChartState(studio);
  const source = fs.readFileSync(pagePath, "utf8");

  assert.match(source, /this\._apply_preview_vars\(this\.\$preview[\s\S]{0,500}this\._apply_charts_preview\(\)/);
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

test("light preview repairs mixed dark tokens individually", () => {
  const studio = loadThemeStudio();
  const resolved = studio._resolved_visual_config({
    ...studio.state.defaults,
    preferred_mode: "Light",
    page_background: "#1A1D27",
    card_background: "#FFFFFF",
    muted_text_color: "#FFFFFF",
  }, false);

  assert.equal(resolved.page_background, studio.state.defaults.page_background);
  assert.equal(resolved.card_background, "#FFFFFF");
  assert.equal(resolved.muted_text_color, studio.state.defaults.muted_text_color);
});

test("workspace document state writes live and synthetic shortcut style attributes", () => {
  const studio = loadThemeStudio();
  const attributes = {};
  const frameDocument = {
    documentElement: { setAttribute(name, value) { attributes[name] = value; } },
  };

  studio.config = { shortcut_style: "Outline" };
  assert.equal(studio._sync_workspace_document_state(frameDocument), true);
  assert.equal(attributes["data-shortcuts"], "outline");
  assert.equal(attributes["data-st-shortcuts"], "outline");

  studio.config.shortcut_style = "Solid";
  assert.equal(studio._sync_workspace_document_state(frameDocument), true);
  assert.equal(attributes["data-shortcuts"], "solid");
  assert.equal(attributes["data-st-shortcuts"], "solid");
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
  const workspaceAttributes = {};
  studio.$workspace_iframe = {
    length: 1,
    0: {
      contentDocument: {
        documentElement: { setAttribute(name, value) { workspaceAttributes[name] = value; } },
      },
    },
  };
  let workspaceStateSyncs = 0;
  const syncWorkspaceDocumentState = studio._sync_workspace_document_state.bind(studio);
  studio._sync_workspace_document_state = () => {
    workspaceStateSyncs += 1;
    return syncWorkspaceDocumentState();
  };
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
    assert.equal(workspaceAttributes["data-shortcuts"], "soft", `${mode} synthetic shortcut attribute`);
    assert.equal(workspaceAttributes["data-st-shortcuts"], "soft", `${mode} live shortcut attribute`);
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

test("page lifecycle invalidates initial load and clean refresh callbacks after hide", async (t) => {
  await t.test("initial load cannot render after hide", () => {
    const studio = loadThemeStudio();
    const requests = [];
    let renders = 0;
    studio.page_active = true;
    studio.lifecycle_generation = 1;
    studio.state = null;
    studio.page = { set_primary_action() {}, add_menu_item() {} };
    studio.wrapper = { find() { return {}; } };
    studio._context.$ = () => ({ appendTo() { return this; } });
    studio._context.frappe.call = (options) => requests.push(options);
    studio.render = () => { renders += 1; };
    studio.remove_draft = () => {};
    studio._pause_workspace_preview = () => {};
    studio._context.frappe.pages["theme-studio"].studio = studio;

    studio.load();
    studio._context.frappe.pages["theme-studio"].on_page_hide();
    requests[0].callback({ message: { config: {}, published: {}, flags: {} } });

    assert.equal(renders, 0);
    assert.equal(studio.state, null);
  });

  await t.test("clean refresh cannot apply after hide", () => {
    const studio = loadThemeStudio();
    const requests = [];
    let applies = 0;
    studio.page_active = true;
    studio.lifecycle_generation = 4;
    studio.config = { brand_color: "#111111" };
    studio.saved = { brand_color: "#111111" };
    studio.dirty = false;
    studio._context.frappe.call = (options) => requests.push(options);
    studio.apply = () => { applies += 1; };
    studio.remove_draft = () => {};
    studio._pause_workspace_preview = () => {};
    studio._context.frappe.pages["theme-studio"].studio = studio;

    studio.refresh_if_clean();
    studio._context.frappe.pages["theme-studio"].on_page_hide();
    requests[0].callback({ message: { config: { brand_color: "#222222" }, published: {}, flags: {} } });

    assert.equal(applies, 0);
    assert.equal(studio.config.brand_color, "#111111");
  });
});

test("preview lifecycle clears and invalidates a pending debounce on page hide", () => {
  const studio = loadThemeStudio();
  const timers = [];
  const cleared = [];
  let requests = 0;
  studio.page_active = true;
  studio.lifecycle_generation = 2;
  studio.preview_timer = null;
  studio.config = { preferred_mode: "Light" };
  studio._context.setTimeout = (callback) => { timers.push(callback); return 77; };
  studio._context.clearTimeout = (timer) => { cleared.push(timer); };
  studio._context.frappe.call = () => { requests += 1; };
  studio.remove_draft = () => {};
  studio._pause_workspace_preview = () => {};
  studio._context.frappe.pages["theme-studio"].studio = studio;

  studio._refresh_server_preview();
  studio._context.frappe.pages["theme-studio"].on_page_hide();
  timers[0]();

  assert.equal(studio.page_active, false);
  assert.equal(studio.lifecycle_generation, 3);
  assert.deepEqual(cleared, [null, 77]);
  assert.equal(studio.preview_timer, null);
  assert.equal(requests, 0);
});

test("preview lifecycle ignores an in-flight CSS response after page hide", () => {
  const studio = loadThemeStudio();
  const timers = [];
  const requests = [];
  const effects = [];
  studio.page_active = true;
  studio.lifecycle_generation = 6;
  studio.preview_timer = null;
  studio.workspace_preview_css = "";
  studio.config = { preferred_mode: "Light" };
  studio.saved = null;
  studio._context.setTimeout = (callback) => { timers.push(callback); return 88; };
  studio._context.clearTimeout = () => {};
  studio._context.frappe.call = (options) => requests.push(options);
  studio._inject_workspace_css = () => { effects.push("inject"); };
  studio._update_wcag = () => { effects.push("wcag"); };
  studio._context.document.getElementById = () => { effects.push("lookup"); return null; };
  studio._context.document.createElement = () => { effects.push("create"); return { parentNode: null }; };
  studio._context.document.head.appendChild = () => { effects.push("append"); };
  studio._context.window.dispatchEvent = () => { effects.push("dispatch"); };
  studio._pause_workspace_preview = () => {};
  studio._context.frappe.pages["theme-studio"].studio = studio;

  studio._refresh_server_preview();
  timers[0]();
  assert.equal(requests.length, 1);
  studio._context.frappe.pages["theme-studio"].on_page_hide();
  effects.length = 0;
  requests[0].callback({
    message: { css: "body{color:red}", config: { preferred_mode: "Light" }, wcag_failures: [] },
  });

  assert.deepEqual(effects, []);
  assert.equal(studio.workspace_preview_css, "");
});

test("page lifecycle show reactivates a new generation and accepts fresh callbacks", () => {
  const studio = loadThemeStudio();
  const requests = [];
  let applies = 0;
  let resumes = 0;
  studio.page_active = true;
  studio.lifecycle_generation = 9;
  studio.config = { preferred_mode: "Light" };
  studio.saved = { preferred_mode: "Light" };
  studio.dirty = false;
  studio._context.frappe.call = (options) => requests.push(options);
  studio.apply = () => { applies += 1; };
  studio.remove_draft = () => {};
  studio._pause_workspace_preview = () => {};
  studio._resume_workspace_preview = () => { resumes += 1; };
  studio._context.frappe.pages["theme-studio"].studio = studio;

  studio._context.frappe.pages["theme-studio"].on_page_hide();
  studio._context.frappe.pages["theme-studio"].on_page_show();
  assert.equal(studio.page_active, true);
  assert.equal(studio.lifecycle_generation, 11);
  assert.equal(resumes, 1);
  assert.equal(requests.length, 1);

  requests[0].callback({ message: { config: { preferred_mode: "Dark" }, published: {}, flags: {} } });
  assert.equal(applies, 1);
  assert.equal(studio.config.preferred_mode, "Dark");
});

test("page lifecycle recovery replaces a hidden initial request without duplicating setup", async (t) => {
  await t.test("stale success is ignored and one replacement renders and applies", () => {
    const studio = loadThemeStudio();
    const requests = [];
    const setup = [];
    let renders = 0;
    let applies = 0;
    studio.state = null;
    studio.config = null;
    studio.saved = null;
    studio.page_active = true;
    studio.lifecycle_generation = 1;
    studio.state_request_active = false;
    studio.state_request_generation = 0;
    studio.page = {
      set_primary_action() { setup.push("primary"); },
      add_menu_item() { setup.push("menu"); },
    };
    studio.wrapper = { find() { setup.push("content"); return {}; } };
    studio._context.$ = () => ({ appendTo() { setup.push("root"); return this; } });
    studio._context.frappe.call = (options) => requests.push(options);
    studio.render = () => { renders += 1; studio.apply(); };
    studio.apply = () => { applies += 1; };
    studio.remove_draft = () => {};
    studio._pause_workspace_preview = () => {};
    studio._resume_workspace_preview = () => {};
    studio._context.frappe.pages["theme-studio"].studio = studio;

    studio.load();
    assert.equal(requests.length, 1);
    studio._context.frappe.pages["theme-studio"].on_page_show();
    assert.equal(requests.length, 1, "ordinary first show must reuse the active constructor request");

    studio._context.frappe.pages["theme-studio"].on_page_hide();
    requests[0].callback({ message: { config: { marker: "stale" }, published: {}, flags: {} } });
    assert.equal(studio.state, null);
    assert.equal(renders, 0);

    studio._context.frappe.pages["theme-studio"].on_page_show();
    assert.equal(requests.length, 2);
    assert.deepEqual(setup, ["primary", "menu", "menu", "content", "root"]);
    requests[1].callback({ message: { config: { marker: "fresh" }, published: {}, flags: {} } });

    assert.equal(studio.config.marker, "fresh");
    assert.equal(renders, 1);
    assert.equal(applies, 1);
    assert.equal(studio.state_request_active, false);
    assert.deepEqual(setup, ["primary", "menu", "menu", "content", "root"]);
  });

  await t.test("stale error cannot cancel the replacement request", () => {
    const studio = loadThemeStudio();
    const requests = [];
    let renders = 0;
    let errors = 0;
    studio.state = null;
    studio.config = null;
    studio.page_active = true;
    studio.lifecycle_generation = 3;
    studio.state_request_active = false;
    studio.state_request_generation = 0;
    studio.page = { set_primary_action() {}, add_menu_item() {} };
    studio.wrapper = { find() { return {}; } };
    studio._context.$ = () => ({ appendTo() { return this; }, html() { errors += 1; return this; } });
    studio._context.frappe.call = (options) => requests.push(options);
    studio.render = () => { renders += 1; };
    studio.remove_draft = () => {};
    studio._pause_workspace_preview = () => {};
    studio._resume_workspace_preview = () => {};
    studio._context.frappe.pages["theme-studio"].studio = studio;

    studio.load();
    studio._context.frappe.pages["theme-studio"].on_page_hide();
    studio._context.frappe.pages["theme-studio"].on_page_show();
    assert.equal(requests.length, 2);
    requests[0].error();
    assert.equal(studio.state_request_active, true);
    assert.equal(errors, 0);

    requests[1].callback({ message: { config: { marker: "recovered" }, published: {}, flags: {} } });
    assert.equal(studio.config.marker, "recovered");
    assert.equal(renders, 1);
    assert.equal(studio.state_request_active, false);
  });
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

test("workspace inspector catalog exposes only styling controls", () => {
  const studio = loadThemeStudio();
  const catalog = studio._inspector_catalog();
  const workspaceKeys = Object.keys(catalog).filter((key) => key.startsWith("workspace."));
  const expected = {
    "workspace.background": {
      title: "Workspace background",
      keys: ["page_background", "text_color", "muted_text_color"],
    },
    "workspace.card": {
      title: "Workspace card",
      keys: ["workspace_card_color", "text_color", "muted_text_color", "border_color", "card_radius", "shadow_style"],
    },
    "workspace.text": {
      title: "Workspace text",
      keys: ["text_color", "muted_text_color", "link_color"],
    },
    "workspace.button": {
      title: "Workspace button",
      keys: ["primary_button_color", "secondary_button_color", "secondary_button_text", "button_radius", "shadow_style"],
    },
  };

  assert.deepEqual(workspaceKeys, Object.keys(expected));
  workspaceKeys.forEach((key) => {
    assert.equal(catalog[key].scene, "Workspace");
    assert.equal(catalog[key].title, expected[key].title);
    assert.deepEqual(Array.from(catalog[key].keys), expected[key].keys);
  });
});

test("workspace inspector catalog specializes shortcut and number-card variants without new IDs", () => {
  const studio = loadThemeStudio();

  studio.workspace_selection = { id: "workspace.button", variant: "shortcut", element: {} };
  let catalog = studio._inspector_catalog();
  assert.deepEqual(Object.keys(catalog).filter((key) => key.startsWith("workspace.")), [
    "workspace.background", "workspace.card", "workspace.text", "workspace.button",
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(catalog["workspace.button"])), {
    title: "Workspace shortcut",
    scene: "Workspace",
    keys: ["brand_color", "shortcut_style", "card_background", "card_radius", "shadow_style"],
  });

  studio.workspace_selection = { id: "workspace.card", variant: "number-card", element: {} };
  catalog = studio._inspector_catalog();
  assert.deepEqual(JSON.parse(JSON.stringify(catalog["workspace.card"])), {
    title: "Number card",
    scene: "Workspace",
    keys: ["number_card_color", "text_color", "muted_text_color", "border_color", "card_radius", "shadow_style"],
  });
});

test("workspace target button wins when button text and card all match", () => {
  const studio = loadThemeStudio();
  const button = { name: "button" };
  const element = workspaceTargetElement({
    [workspaceTargetSelectors.button]: button,
    [workspaceTargetSelectors.text]: { name: "text" },
    [workspaceTargetSelectors.card]: { name: "card" },
  });

  const target = studio._classify_workspace_target(element, {});

  assert.equal(target.id, "workspace.button");
  assert.equal(target.element, button);
  assert.deepEqual(element.calls, [workspaceTargetSelectors.button]);
});

test("workspace target text inside a card and link selects workspace text", () => {
  const studio = loadThemeStudio();
  const link = { name: "link" };
  const element = workspaceTargetElement({
    [workspaceTargetSelectors.text]: link,
    [workspaceTargetSelectors.card]: { name: "card" },
  });

  const target = studio._classify_workspace_target(element, {});

  assert.equal(target.id, "workspace.text");
  assert.equal(target.element, link);
  assert.deepEqual(element.calls, [workspaceTargetSelectors.button, workspaceTargetSelectors.text]);
});

test("workspace target card padding selects workspace card", () => {
  const studio = loadThemeStudio();
  const card = { name: "card" };
  const element = workspaceTargetElement({ [workspaceTargetSelectors.card]: card });

  const target = studio._classify_workspace_target(element, {});

  assert.equal(target.id, "workspace.card");
  assert.equal(target.element, card);
  assert.deepEqual(element.calls, [
    workspaceTargetSelectors.button,
    workspaceTargetSelectors.text,
    workspaceTargetSelectors.numberCard,
    workspaceTargetSelectors.card,
  ]);
});

test("workspace target reports shortcut and number-card variants with stable inspector IDs", () => {
  const studio = loadThemeStudio();
  const shortcut = {
    matches(selector) { return selector === ".shortcut-widget-box"; },
  };
  const shortcutHit = workspaceTargetElement({ [workspaceTargetSelectors.button]: shortcut });
  let target = studio._classify_workspace_target(shortcutHit, {});
  assert.equal(target.id, "workspace.button");
  assert.equal(target.element, shortcut);
  assert.equal(target.variant, "shortcut");
  assert.deepEqual(shortcutHit.calls, [workspaceTargetSelectors.button]);

  const numberCard = {
    matches(selector) { return selector === ".number-card"; },
  };
  const numberHit = workspaceTargetElement({ [workspaceTargetSelectors.numberCard]: numberCard });
  target = studio._classify_workspace_target(numberHit, {});
  assert.equal(target.id, "workspace.card");
  assert.equal(target.element, numberCard);
  assert.equal(target.variant, "number-card");
  assert.deepEqual(numberHit.calls, [
    workspaceTargetSelectors.button,
    workspaceTargetSelectors.text,
    workspaceTargetSelectors.numberCard,
  ]);
});

test("workspace target recognizes real outer number-card classes", () => {
  const studio = loadThemeStudio();

  [".number-widget-box", ".number-card-widget-box"].forEach((classSelector) => {
    const outer = { classSelector };
    const hit = workspaceTargetElement({ [workspaceTargetSelectors.numberCard]: outer });
    const target = studio._classify_workspace_target(hit, {});

    assert.equal(target.id, "workspace.card");
    assert.equal(target.element, outer);
    assert.equal(target.variant, "number-card");
    assert.deepEqual(hit.calls, [
      workspaceTargetSelectors.button,
      workspaceTargetSelectors.text,
      workspaceTargetSelectors.numberCard,
    ]);
  });
});

test("workspace subtype selection preserves variant and renders its actual controls", async (t) => {
  const cases = [
    [
      "shortcut", "workspace.button", "Workspace shortcut",
      ["brand_color", "shortcut_style", "card_background", "card_radius", "shadow_style"],
    ],
    [
      "number-card", "workspace.card", "Number card",
      ["number_card_color", "text_color", "muted_text_color", "border_color", "card_radius", "shadow_style"],
    ],
  ];

  for (const [variant, id, title, expectedKeys] of cases) {
    await t.test(variant, () => {
      const studio = loadThemeStudio();
      const selected = { classList: { add() {}, remove() {} } };
      const frameDocument = { elementFromPoint() { return {}; } };
      studio.$workspace_iframe = {
        length: 1,
        0: {
          contentDocument: frameDocument,
          getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
        },
      };
      studio._classify_workspace_target = () => ({ id, element: selected, variant });
      studio._install_workspace_inspector_css = () => true;
      const renderedKeys = [];
      let markup = "";
      studio.$inspector = {
        length: 1,
        addClass() { return this; },
        html(value) { markup = value; return this; },
      };
      studio._definition_for = (key) => [key, key, "text"];
      studio._render_control = (definition) => {
        renderedKeys.push(definition[0]);
        return `<i data-rendered-key="${definition[0]}"></i>`;
      };
      studio._section_for_key = () => "workspace";
      studio._restore_inspector_highlight = () => {};
      studio._schedule_workspace_reanchor = () => true;

      assert.equal(studio._select_workspace_target({ clientX: 10, clientY: 20 }), true);
      assert.equal(studio.workspace_selection.id, id);
      assert.equal(studio.workspace_selection.element, selected);
      assert.equal(studio.workspace_selection.variant, variant);
      assert.equal(studio.selected_inspector, id);
      assert.deepEqual(renderedKeys, expectedKeys);
      assert.match(markup, new RegExp(title));
      expectedKeys.forEach((key) => assert.match(markup, new RegExp(`data-rendered-key="${key}"`)));
    });
  }
});

test("workspace target nearest page surface selects workspace background", () => {
  const studio = loadThemeStudio();
  const surface = { name: "page surface" };
  const element = workspaceTargetElement({ [workspaceTargetSelectors.background]: surface });

  const target = studio._classify_workspace_target(element, {});

  assert.equal(target.id, "workspace.background");
  assert.equal(target.element, surface);
  assert.deepEqual(element.calls, Object.values(workspaceTargetSelectors));
});

test("workspace target background falls back to body then document element then null", () => {
  const studio = loadThemeStudio();
  const body = { name: "body" };
  const root = { name: "root" };

  let target = studio._classify_workspace_target(workspaceTargetElement(), { body, documentElement: root });
  assert.equal(target.id, "workspace.background");
  assert.equal(target.element, body);

  target = studio._classify_workspace_target(workspaceTargetElement(), { body: null, documentElement: root });
  assert.equal(target.id, "workspace.background");
  assert.equal(target.element, root);

  assert.equal(studio._classify_workspace_target(workspaceTargetElement(), {}), null);
});

test("workspace target missing input returns null", () => {
  const studio = loadThemeStudio();

  assert.equal(studio._classify_workspace_target(null, { body: {} }), null);
});

test("workspace target inaccessible document fallbacks return null without throwing", () => {
  const studio = loadThemeStudio();
  const throwingBody = {};
  Object.defineProperty(throwingBody, "body", { get() { throw new Error("blocked body"); } });
  const throwingRoot = { body: null };
  Object.defineProperty(throwingRoot, "documentElement", { get() { throw new Error("blocked root"); } });

  [throwingBody, throwingRoot].forEach((frameDocument) => {
    const classify = () => studio._classify_workspace_target(workspaceTargetElement(), frameDocument);
    assert.doesNotThrow(classify);
    assert.equal(classify(), null);
  });
});

test("workspace target throwing closest call fails closed without background fallback", () => {
  const studio = loadThemeStudio();
  const element = {
    closest() { throw new Error("detached node"); },
  };

  assert.equal(studio._classify_workspace_target(element, { body: { name: "body" } }), null);
});

test("workspace target throwing closest getter fails closed without throwing", () => {
  const studio = loadThemeStudio();
  const element = {};
  Object.defineProperty(element, "closest", { get() { throw new Error("blocked closest"); } });

  const classify = () => studio._classify_workspace_target(element, { body: { name: "body" } });
  assert.doesNotThrow(classify);
  assert.equal(classify(), null);
});

test("workspace click selection converts shield coordinates and selects without activation", () => {
  const studio = loadThemeStudio();
  const elementFromPointCalls = [];
  const classifierCalls = [];
  const highlightCalls = [];
  const hit = {
    click() { throw new Error("workspace hit must not be activated"); },
    focus() { throw new Error("workspace hit must not be focused"); },
    dispatchEvent() { throw new Error("workspace hit must not receive events"); },
  };
  const selected = {
    classList: {
      add(name) { highlightCalls.push(["add", name]); },
      remove(name) { highlightCalls.push(["remove", name]); },
    },
    click() { throw new Error("workspace selection must not be activated"); },
    focus() { throw new Error("workspace selection must not be focused"); },
    dispatchEvent() { throw new Error("workspace selection must not receive events"); },
  };
  const frameDocument = {
    elementFromPoint(x, y) {
      elementFromPointCalls.push([x, y]);
      return hit;
    },
  };
  studio.$workspace_iframe = {
    length: 1,
    0: {
      contentDocument: frameDocument,
      getBoundingClientRect() { return { left: 100, top: 40, width: 320, height: 180 }; },
    },
  };
  studio._classify_workspace_target = (element, document) => {
    classifierCalls.push([element, document]);
    return { id: "workspace.card", element: selected };
  };
  studio._install_workspace_inspector_css = (document) => document === frameDocument;
  let renders = 0;
  studio._render_inspector = () => { renders += 1; };
  let reanchorSchedules = 0;
  studio._schedule_workspace_reanchor = () => { reanchorSchedules += 1; return true; };

  assert.equal(studio._select_workspace_target({ clientX: 135, clientY: 88 }), true);
  assert.deepEqual(elementFromPointCalls, [[35, 48]]);
  assert.equal(classifierCalls.length, 1);
  assert.equal(classifierCalls[0][0], hit);
  assert.equal(classifierCalls[0][1], frameDocument);
  assert.deepEqual(highlightCalls, [["add", "st-theme-workspace-inspected"]]);
  assert.equal(studio.workspace_selection.id, "workspace.card");
  assert.equal(studio.workspace_selection.element, selected);
  assert.equal(studio.selected_inspector, "workspace.card");
  assert.equal(renders, 1);
  assert.equal(reanchorSchedules, 1);
});

test("workspace click selection removes the previous highlight on successful replacement", () => {
  const studio = loadThemeStudio();
  const highlightCalls = [];
  const previous = {
    classList: { remove(name) { highlightCalls.push(["remove", name]); } },
  };
  const replacement = {
    classList: { add(name) { highlightCalls.push(["add", name]); } },
  };
  const frameDocument = { elementFromPoint() { return {}; } };
  studio.$workspace_iframe = {
    length: 1,
    0: {
      contentDocument: frameDocument,
      getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    },
  };
  studio.workspace_selection = { id: "workspace.text", element: previous };
  studio.selected_inspector = "workspace.text";
  studio._classify_workspace_target = () => ({ id: "workspace.button", element: replacement });
  studio._install_workspace_inspector_css = () => true;
  studio._render_inspector = () => {};
  studio._schedule_workspace_reanchor = () => true;

  assert.equal(studio._select_workspace_target({ clientX: 10, clientY: 20 }), true);
  assert.deepEqual(highlightCalls, [
    ["remove", "st-theme-workspace-inspected"],
    ["add", "st-theme-workspace-inspected"],
  ]);
  assert.equal(studio.workspace_selection.element, replacement);
  assert.equal(Object.hasOwn(studio.workspace_selection, "variant"), false);
});

test("workspace click selection rolls back post-classification failures", async (t) => {
  const cases = [
    ["previous highlight removal throws", "remove"],
    ["new highlight addition throws after previous removal", "add"],
    ["inspector render throws after state update", "render"],
  ];

  for (const [name, failure] of cases) {
    await t.test(name, () => {
      const studio = loadThemeStudio();
      const previousClasses = new Set(["st-theme-workspace-inspected"]);
      const replacementClasses = new Set();
      const previous = {
        classList: {
          add(name) { previousClasses.add(name); },
          remove(name) {
            if (failure === "remove") throw new Error("previous highlight is inaccessible");
            previousClasses.delete(name);
          },
        },
      };
      const replacement = {
        classList: {
          add(name) {
            if (failure === "add") throw new Error("replacement highlight is inaccessible");
            replacementClasses.add(name);
          },
          remove(name) { replacementClasses.delete(name); },
        },
      };
      const frameDocument = { elementFromPoint() { return {}; } };
      studio.$workspace_iframe = {
        length: 1,
        0: {
          contentDocument: frameDocument,
          getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
        },
      };
      const previousSelection = { id: "workspace.text", element: previous };
      studio.workspace_selection = previousSelection;
      studio.selected_inspector = "workspace.text";
      studio._classify_workspace_target = () => ({ id: "workspace.card", element: replacement });
      studio._install_workspace_inspector_css = () => true;
      let renderCalls = 0;
      studio._render_inspector = () => {
        renderCalls += 1;
        if (failure === "render" && renderCalls === 1) throw new Error("render interrupted");
      };

      let result;
      assert.doesNotThrow(() => { result = studio._select_workspace_target({ clientX: 10, clientY: 20 }); });
      assert.equal(result, false);
      assert.equal(studio.workspace_selection, previousSelection);
      assert.equal(studio.selected_inspector, "workspace.text");
      assert.equal(previousClasses.has("st-theme-workspace-inspected"), true);
      assert.equal(replacementClasses.has("st-theme-workspace-inspected"), false);
      assert.equal(renderCalls, failure === "render" ? 2 : 1);
    });
  }
});

test("workspace click selection fails closed without mutating selection or rendering", async (t) => {
  const frameDocument = { elementFromPoint() { return {}; } };
  const validFrame = () => ({
    contentDocument: frameDocument,
    getBoundingClientRect() { return { left: 10, top: 20, width: 100, height: 80 }; },
  });
  const malformedRect = (rect) => (studio) => {
    const frame = validFrame();
    let hitTests = 0;
    frame.contentDocument = { elementFromPoint() { hitTests += 1; return {}; } };
    frame.getBoundingClientRect = () => rect;
    studio.$workspace_iframe = { length: 1, 0: frame };
    studio._verifyMalformedRect = () => { assert.equal(hitTests, 0); };
  };
  const cases = [
    ["missing iframe collection", (studio) => { studio.$workspace_iframe = null; }],
    ["missing iframe element", (studio) => { studio.$workspace_iframe = { length: 1, 0: null }; }],
    ["throwing document access", (studio) => {
      const frame = validFrame();
      Object.defineProperty(frame, "contentDocument", { get() { throw new Error("blocked document"); } });
      studio.$workspace_iframe = { length: 1, 0: frame };
    }],
    ["missing document", (studio) => {
      const frame = validFrame();
      frame.contentDocument = null;
      studio.$workspace_iframe = { length: 1, 0: frame };
    }],
    ["throwing fallback document access", (studio) => {
      const frame = validFrame();
      frame.contentDocument = null;
      frame.contentWindow = {};
      Object.defineProperty(frame.contentWindow, "document", { get() { throw new Error("blocked fallback"); } });
      studio.$workspace_iframe = { length: 1, 0: frame };
    }],
    ["missing rectangle method", (studio) => {
      const frame = validFrame();
      frame.getBoundingClientRect = null;
      studio.$workspace_iframe = { length: 1, 0: frame };
    }],
    ["throwing rectangle invocation", (studio) => {
      const frame = validFrame();
      frame.getBoundingClientRect = () => { throw new Error("detached frame"); };
      studio.$workspace_iframe = { length: 1, 0: frame };
    }],
    ["missing rectangle", (studio) => {
      const frame = validFrame();
      frame.getBoundingClientRect = () => null;
      studio.$workspace_iframe = { length: 1, 0: frame };
    }],
    ["NaN rectangle left", malformedRect({ left: NaN, top: 20, width: 100, height: 80 })],
    ["infinite rectangle top", malformedRect({ left: 10, top: Infinity, width: 100, height: 80 })],
    ["NaN rectangle width", malformedRect({ left: 10, top: 20, width: NaN, height: 80 })],
    ["infinite rectangle height", malformedRect({ left: 10, top: 20, width: 100, height: Infinity })],
    ["zero rectangle width", malformedRect({ left: 10, top: 20, width: 0, height: 80 })],
    ["negative rectangle width", malformedRect({ left: 10, top: 20, width: -1, height: 80 })],
    ["zero rectangle height", malformedRect({ left: 10, top: 20, width: 100, height: 0 })],
    ["negative rectangle height", malformedRect({ left: 10, top: 20, width: 100, height: -1 })],
    ["missing elementFromPoint", (studio) => {
      const frame = validFrame();
      frame.contentDocument = {};
      studio.$workspace_iframe = { length: 1, 0: frame };
    }],
    ["non-finite x coordinate", (studio) => { studio.$workspace_iframe = { length: 1, 0: validFrame() }; }, { clientX: NaN, clientY: 30 }],
    ["non-finite y coordinate", (studio) => { studio.$workspace_iframe = { length: 1, 0: validFrame() }; }, { clientX: 20, clientY: Infinity }],
    ["left outside coordinate", (studio) => { studio.$workspace_iframe = { length: 1, 0: validFrame() }; }, { clientX: 9, clientY: 30 }],
    ["top outside coordinate", (studio) => { studio.$workspace_iframe = { length: 1, 0: validFrame() }; }, { clientX: 20, clientY: 19 }],
    ["right boundary coordinate", (studio) => { studio.$workspace_iframe = { length: 1, 0: validFrame() }; }, { clientX: 110, clientY: 30 }],
    ["bottom boundary coordinate", (studio) => { studio.$workspace_iframe = { length: 1, 0: validFrame() }; }, { clientX: 20, clientY: 100 }],
    ["no hit", (studio) => {
      const frame = validFrame();
      frame.contentDocument = { elementFromPoint() { return null; } };
      studio.$workspace_iframe = { length: 1, 0: frame };
    }],
    ["throwing elementFromPoint", (studio) => {
      const frame = validFrame();
      frame.contentDocument = { elementFromPoint() { throw new Error("hit test blocked"); } };
      studio.$workspace_iframe = { length: 1, 0: frame };
    }],
    ["no classification", (studio) => {
      studio.$workspace_iframe = { length: 1, 0: validFrame() };
      studio._classify_workspace_target = () => null;
    }],
    ["throwing classifier", (studio) => {
      studio.$workspace_iframe = { length: 1, 0: validFrame() };
      studio._classify_workspace_target = () => { throw new Error("classification failed"); };
    }],
  ];

  for (const [name, arrange, event = { clientX: 20, clientY: 30 }] of cases) {
    await t.test(name, () => {
      const studio = loadThemeStudio();
      const highlightCalls = [];
      const priorElement = {
        classList: {
          add(value) { highlightCalls.push(["add", value]); },
          remove(value) { highlightCalls.push(["remove", value]); },
        },
      };
      const priorSelection = { id: "workspace.text", element: priorElement };
      studio.workspace_selection = priorSelection;
      studio.selected_inspector = "workspace.text";
      studio._classify_workspace_target = () => ({ id: "workspace.card", element: {} });
      let renders = 0;
      studio._render_inspector = () => { renders += 1; };
      arrange(studio);

      let result;
      assert.doesNotThrow(() => { result = studio._select_workspace_target(event); });
      assert.equal(result, false);
      assert.equal(studio.workspace_selection, priorSelection);
      assert.equal(studio.selected_inspector, "workspace.text");
      assert.deepEqual(highlightCalls, []);
      assert.equal(renders, 0);
      if (studio._verifyMalformedRect) studio._verifyMalformedRect();
    });
  }
});

test("workspace anchor translates rectangle into the parent viewport", () => {
  const studio = loadThemeStudio();
  const element = {
    isConnected: true,
    getBoundingClientRect() {
      return { left: 20, top: 30, right: 120, bottom: 90, width: 100, height: 60 };
    },
  };
  studio.workspace_selection = { id: "workspace.card", element };
  studio.$workspace_iframe = {
    length: 1,
    0: {
      getBoundingClientRect() {
        return { left: 100, top: 40, right: 420, bottom: 220, width: 320, height: 180 };
      },
    },
  };
  studio._context.window.innerWidth = 800;
  studio._context.window.innerHeight = 600;

  const anchor = studio._workspace_target_anchor();

  assert.deepEqual(
    JSON.parse(JSON.stringify(anchor.getBoundingClientRect())),
    { left: 120, top: 70, right: 220, bottom: 130, width: 100, height: 60 }
  );
});

test("workspace anchor clips a partially visible translated rectangle", () => {
  const studio = loadThemeStudio();
  studio.workspace_selection = {
    id: "workspace.card",
    element: {
      isConnected: true,
      getBoundingClientRect() {
        return { left: -25, top: 20, right: 80, bottom: 130, width: 105, height: 110 };
      },
    },
  };
  studio.$workspace_iframe = {
    length: 1,
    0: {
      getBoundingClientRect() {
        return { left: 100, top: 50, right: 300, bottom: 150, width: 200, height: 100 };
      },
    },
  };
  studio._context.window.innerWidth = 260;
  studio._context.window.innerHeight = 140;

  const rect = studio._workspace_target_anchor().getBoundingClientRect();

  assert.deepEqual(
    JSON.parse(JSON.stringify(rect)),
    { left: 100, top: 70, right: 180, bottom: 140, width: 80, height: 70 }
  );
});

test("workspace anchor returns null for disconnected, clipped, malformed, or inaccessible geometry", async (t) => {
  const validElementRect = { left: 10, top: 10, right: 50, bottom: 50, width: 40, height: 40 };
  const validFrameRect = { left: 100, top: 100, right: 300, bottom: 300, width: 200, height: 200 };
  const cases = [
    ["missing selection", (studio) => { studio.workspace_selection = null; }],
    ["missing frame", (studio) => { studio.$workspace_iframe = null; }],
    ["disconnected element", (studio, element) => { element.isConnected = false; }],
    ["fully clipped element", (studio, element) => {
      element.getBoundingClientRect = () => ({ left: 210, top: 10, right: 250, bottom: 50, width: 40, height: 40 });
    }],
    ["throwing selected rect", (studio, element) => {
      element.getBoundingClientRect = () => { throw new Error("detached selection"); };
    }],
    ["throwing frame rect", (studio) => {
      studio.$workspace_iframe[0].getBoundingClientRect = () => { throw new Error("detached frame"); };
    }],
    ["non-finite selected rect", (studio, element) => {
      element.getBoundingClientRect = () => ({ ...validElementRect, right: Infinity });
    }],
    ["inconsistent selected rect", (studio, element) => {
      element.getBoundingClientRect = () => ({ ...validElementRect, width: 39 });
    }],
    ["zero selected rect", (studio, element) => {
      element.getBoundingClientRect = () => ({ left: 10, top: 10, right: 10, bottom: 50, width: 0, height: 40 });
    }],
    ["non-finite frame rect", (studio) => {
      studio.$workspace_iframe[0].getBoundingClientRect = () => ({ ...validFrameRect, top: NaN });
    }],
    ["zero frame rect", (studio) => {
      studio.$workspace_iframe[0].getBoundingClientRect = () => ({ left: 100, top: 100, right: 100, bottom: 300, width: 0, height: 200 });
    }],
  ];

  for (const [name, arrange] of cases) {
    await t.test(name, () => {
      const studio = loadThemeStudio();
      studio._context.window.innerWidth = 800;
      studio._context.window.innerHeight = 600;
      const element = {
        isConnected: true,
        getBoundingClientRect: () => validElementRect,
      };
      studio.workspace_selection = { id: "workspace.card", element };
      studio.$workspace_iframe = {
        length: 1,
        0: { getBoundingClientRect: () => validFrameRect },
      };
      arrange(studio, element);

      assert.doesNotThrow(() => studio._workspace_target_anchor());
      assert.equal(studio._workspace_target_anchor(), null);
    });
  }
});

test("workspace selection cleanup removes highlight and workspace inspector state", () => {
  const studio = loadThemeStudio();
  const removals = [];
  studio.workspace_selection = {
    id: "workspace.text",
    element: { classList: { remove(name) { removals.push(name); } } },
  };
  studio.selected_inspector = "workspace.text";
  let renders = 0;
  studio._render_inspector = () => { renders += 1; };

  studio._clear_workspace_selection();

  assert.deepEqual(removals, ["st-theme-workspace-inspected"]);
  assert.equal(studio.workspace_selection, null);
  assert.equal(studio.selected_inspector, null);
  assert.equal(renders, 1);
});

test("workspace selection cleanup false preserves inspector and skips render", () => {
  const studio = loadThemeStudio();
  studio.workspace_selection = {
    id: "workspace.card",
    element: { classList: { remove() {} } },
  };
  studio.selected_inspector = "workspace.card";
  studio._render_inspector = () => { throw new Error("must not render"); };

  studio._clear_workspace_selection(false);

  assert.equal(studio.workspace_selection, null);
  assert.equal(studio.selected_inspector, "workspace.card");
});

test("workspace selection cleanup closes only workspace inspectors", () => {
  const studio = loadThemeStudio();
  studio.workspace_selection = { element: { classList: { remove() {} } } };
  studio.selected_inspector = "dashboard.metrics";
  studio._render_inspector = () => { throw new Error("must not render"); };

  studio._clear_workspace_selection();

  assert.equal(studio.workspace_selection, null);
  assert.equal(studio.selected_inspector, "dashboard.metrics");
});

test("workspace selection cleanup tolerates inaccessible removal and rendering", () => {
  const studio = loadThemeStudio();
  const selection = {};
  Object.defineProperty(selection, "element", { get() { throw new Error("frame gone"); } });
  studio.workspace_selection = selection;
  studio.selected_inspector = "workspace.card";
  studio._render_inspector = () => { throw new Error("inspector gone"); };

  assert.doesNotThrow(() => studio._clear_workspace_selection());
  assert.equal(studio.workspace_selection, null);
  assert.equal(studio.selected_inspector, null);
});

test("workspace reanchor coalesces two schedules to one RAF and resets pending", () => {
  const studio = loadThemeStudio();
  const callbacks = [];
  studio._context.window.requestAnimationFrame = (callback) => { callbacks.push(callback); return 7; };
  let reanchors = 0;
  const originalReanchor = studio._reanchor_workspace_inspector.bind(studio);
  studio._reanchor_workspace_inspector = () => { reanchors += 1; originalReanchor(); };
  studio._workspace_target_anchor = () => null;
  studio._clear_workspace_selection = () => {};

  assert.equal(studio._schedule_workspace_reanchor(), true);
  assert.equal(studio._schedule_workspace_reanchor(), false);
  assert.equal(callbacks.length, 1);
  assert.equal(studio.workspace_reanchor_pending, true);

  callbacks[0]();

  assert.equal(reanchors, 1);
  assert.equal(studio.workspace_reanchor_pending, false);
});

test("workspace reanchor positions a valid anchor and clears an invalid anchor", () => {
  const studio = loadThemeStudio();
  const anchor = { getBoundingClientRect() { return {}; } };
  const positions = [];
  let clears = 0;
  studio.workspace_reanchor_pending = true;
  studio._position_inspector = (value) => { positions.push(value); };
  studio._clear_workspace_selection = () => { clears += 1; };
  studio._workspace_target_anchor = () => anchor;

  assert.doesNotThrow(() => studio._reanchor_workspace_inspector());
  assert.equal(studio.workspace_reanchor_pending, false);
  assert.deepEqual(positions, [anchor]);
  assert.equal(clears, 0);

  studio._workspace_target_anchor = () => null;
  assert.doesNotThrow(() => studio._reanchor_workspace_inspector());
  assert.equal(clears, 1);
});

test("workspace reanchor has a setTimeout fallback and fails safely", () => {
  const studio = loadThemeStudio();
  const callbacks = [];
  Object.defineProperty(studio._context.window, "requestAnimationFrame", {
    configurable: true,
    get() { throw new Error("RAF unavailable"); },
  });
  studio._context.setTimeout = (callback) => { callbacks.push(callback); return 9; };
  let reanchors = 0;
  studio._reanchor_workspace_inspector = () => { reanchors += 1; studio.workspace_reanchor_pending = false; };

  assert.doesNotThrow(() => studio._schedule_workspace_reanchor());
  assert.equal(callbacks.length, 1);
  assert.equal(studio.workspace_reanchor_pending, true);
  callbacks[0]();
  assert.equal(reanchors, 1);
  assert.equal(studio.workspace_reanchor_pending, false);

  studio._workspace_target_anchor = () => { throw new Error("frame removed"); };
  studio._clear_workspace_selection = () => { throw new Error("inspector removed"); };
  assert.doesNotThrow(() => studio._reanchor_workspace_inspector());
});

test("workspace restore schedules reanchor without using the regular preview path", () => {
  const studio = loadThemeStudio();
  studio.selected_inspector = "workspace.card";
  studio.$preview = {
    find() { throw new Error("workspace must not query regular preview"); },
  };
  let schedules = 0;
  studio._schedule_workspace_reanchor = () => { schedules += 1; return true; };

  assert.doesNotThrow(() => studio._restore_inspector_highlight());
  assert.equal(schedules, 1);
});

test("workspace restore preserves the non-workspace highlight path", () => {
  const studio = loadThemeStudio();
  studio.selected_inspector = "dashboard.metrics";
  const calls = [];
  const element = {};
  const selected = {
    removeClass(name) { calls.push(["removeClass", name]); return this; },
    first() { calls.push(["first"]); return this; },
    addClass(name) { calls.push(["addClass", name]); return this; },
    0: element,
  };
  studio.$preview = {
    find(selector) { calls.push(["find", selector]); return selected; },
  };
  studio._position_inspector = (value) => { calls.push(["position", value]); };
  studio._schedule_workspace_reanchor = () => { throw new Error("must not schedule"); };

  studio._restore_inspector_highlight();

  assert.deepEqual(calls, [
    ["find", ".is-inspected"],
    ["removeClass", "is-inspected"],
    ["find", '[data-inspector="dashboard.metrics"]:visible'],
    ["first"],
    ["addClass", "is-inspected"],
    ["position", element],
  ]);
});

test("workspace CSS injection creates one style, updates it, and fails soft", () => {
  const studio = loadThemeStudio();
  const styles = [];
  const appendCalls = [];
  const frameDocument = {
    head: {
      appendChild(element) {
        const existing = styles.indexOf(element);
        if (existing !== -1) styles.splice(existing, 1);
        element.parentNode = this;
        styles.push(element);
        appendCalls.push(element.id);
      },
    },
    createElement: () => {
      const attributes = {};
      return {
        tagName: "STYLE", id: "", textContent: "", parentNode: null,
        getAttribute(name) { return attributes[name] || null; },
        setAttribute(name, value) { attributes[name] = value; },
      };
    },
    getElementById: (id) => styles.find((element) => element.id === id) || null,
  };
  studio.$workspace_iframe = { length: 1, 0: { contentDocument: frameDocument } };
  studio._schedule_workspace_reanchor = () => true;

  assert.equal(studio._inject_workspace_css(":root{--brand:red}"), true);
  assert.equal(studio._inject_workspace_css(":root{--brand:blue}"), true);
  assert.equal(styles.length, 2);
  assert.deepEqual(styles.map((element) => element.id), [
    "st-studio-workspace-draft", "st-studio-workspace-inspector",
  ]);
  assert.equal(styles[0].textContent, ":root{--brand:blue}");
  assert.deepEqual(appendCalls, [
    "st-studio-workspace-draft",
    "st-studio-workspace-inspector",
    "st-studio-workspace-inspector",
  ]);

  studio.$workspace_iframe = { length: 1, 0: {} };
  Object.defineProperty(studio.$workspace_iframe[0], "contentDocument", {
    get() { throw new Error("Blocked by CSP"); },
  });
  assert.doesNotThrow(() => studio._inject_workspace_css("body{}"));
  assert.equal(studio._inject_workspace_css("body{}"), false);
});

test("workspace CSS injection clears an active selection when authoritative style installation fails", () => {
  const studio = loadThemeStudio();
  const removals = [];
  const draft = { id: "st-studio-workspace-draft", textContent: "", parentNode: {} };
  const frameDocument = {
    head: draft.parentNode,
    createElement() { throw new Error("draft already exists"); },
    getElementById(id) { return id === draft.id ? draft : null; },
  };
  studio.$workspace_iframe = { length: 1, 0: { contentDocument: frameDocument } };
  studio.workspace_selection = {
    id: "workspace.card",
    element: { classList: { remove(name) { removals.push(name); } } },
  };
  studio.selected_inspector = "workspace.card";
  studio._install_workspace_inspector_css = () => false;
  studio._render_inspector = () => {};
  studio._schedule_workspace_reanchor = () => true;

  assert.equal(studio._inject_workspace_css("body{color:red}"), true);
  assert.equal(draft.textContent, "body{color:red}");
  assert.deepEqual(removals, ["st-theme-workspace-inspected"]);
  assert.equal(studio.workspace_selection, null);
  assert.equal(studio.selected_inspector, null);
});

test("workspace inspector style creates one separate style and reuses it", () => {
  const studio = loadThemeStudio();
  const styles = [];
  const appendCalls = [];
  const frameDocument = {
    head: {
      appendChild(element) {
        const existing = styles.indexOf(element);
        if (existing !== -1) styles.splice(existing, 1);
        element.parentNode = this;
        styles.push(element);
        appendCalls.push(element.id);
      },
    },
    createElement(tagName) {
      assert.equal(tagName, "style");
      const attributes = {};
      return {
        tagName: "STYLE",
        id: "",
        textContent: "",
        parentNode: null,
        getAttribute(name) { return attributes[name] || null; },
        setAttribute(name, value) { attributes[name] = value; },
      };
    },
    getElementById(id) { return styles.find((element) => element.id === id) || null; },
  };
  studio.$workspace_iframe = { length: 1, 0: { contentDocument: frameDocument } };

  assert.equal(studio._install_workspace_inspector_css(frameDocument), true);
  assert.equal(styles.length, 1);
  const inspectorStyle = styles[0];
  inspectorStyle.textContent = "stale";
  assert.equal(studio._install_workspace_inspector_css(frameDocument), true);
  assert.equal(styles.length, 1);
  assert.equal(inspectorStyle.id, "st-studio-workspace-inspector");
  assert.equal(inspectorStyle.getAttribute("data-st-theme-owner"), "solvronix-desk");
  assert.match(inspectorStyle.textContent, /\.st-theme-workspace-inspected/);
  assert.match(inspectorStyle.textContent, /outline\s*:[^;]+!important/);
  assert.match(inspectorStyle.textContent, /outline-offset\s*:[^;]+!important/);
  assert.deepEqual(appendCalls, [
    "st-studio-workspace-inspector", "st-studio-workspace-inspector",
  ]);

  assert.equal(studio._inject_workspace_css(":root{--draft:1}"), true);
  assert.equal(studio._inject_workspace_css(":root{--draft:2}"), true);
  assert.deepEqual(styles.map((element) => element.id), [
    "st-studio-workspace-draft",
    "st-studio-workspace-inspector",
  ]);
  assert.equal(styles[1], inspectorStyle);
  assert.equal(styles[0].textContent, ":root{--draft:2}");
});

test("workspace inspector style selection moves the owned rule last before highlighting", () => {
  const studio = loadThemeStudio();
  const owner = "solvronix-desk";
  const attributes = { "data-st-theme-owner": owner };
  const inspectorStyle = {
    tagName: "STYLE", id: "st-studio-workspace-inspector", textContent: "stale", parentNode: null,
    getAttribute(name) { return attributes[name] || null; },
  };
  const customStyle = { tagName: "STYLE", id: "custom-theme", parentNode: null };
  const styles = [];
  const head = {
    appendChild(element) {
      const existing = styles.indexOf(element);
      if (existing !== -1) styles.splice(existing, 1);
      element.parentNode = this;
      styles.push(element);
    },
  };
  head.appendChild(inspectorStyle);
  head.appendChild(customStyle);
  const frameDocument = {
    head,
    createElement() { throw new Error("owned inspector style already exists"); },
    getElementById(id) { return id === inspectorStyle.id ? inspectorStyle : null; },
    elementFromPoint() { return {}; },
  };
  const selected = {
    classList: {
      add() { assert.equal(styles.at(-1), inspectorStyle); },
      remove() {},
    },
  };
  studio.$workspace_iframe = {
    length: 1,
    0: {
      contentDocument: frameDocument,
      getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    },
  };
  studio._classify_workspace_target = () => ({ id: "workspace.card", element: selected });
  studio._render_inspector = () => {};
  studio._schedule_workspace_reanchor = () => true;

  assert.equal(studio._select_workspace_target({ clientX: 10, clientY: 20 }), true);
  assert.deepEqual(styles, [customStyle, inspectorStyle]);
});

test("workspace inspector style reattaches an owned detached style but rejects a foreign parent", () => {
  const studio = loadThemeStudio();
  const owner = "solvronix-desk";
  const makeOwnedStyle = (parentNode) => ({
    nodeName: "STYLE",
    id: "st-studio-workspace-inspector",
    textContent: "stale",
    parentNode,
    getAttribute(name) { return name === "data-st-theme-owner" ? owner : null; },
    setAttribute() { throw new Error("owned reuse must not rewrite ownership"); },
  });
  const appended = [];
  const head = { appendChild(element) { element.parentNode = this; appended.push(element); } };
  const detached = makeOwnedStyle(null);
  let current = detached;
  const frameDocument = {
    head,
    createElement() { throw new Error("owned style must be reused"); },
    getElementById() { return current; },
  };

  assert.equal(studio._install_workspace_inspector_css(frameDocument), true);
  assert.deepEqual(appended, [detached]);
  assert.match(detached.textContent, /!important/);

  const foreignParent = {};
  const foreignAttached = makeOwnedStyle(foreignParent);
  current = foreignAttached;
  assert.equal(studio._install_workspace_inspector_css(frameDocument), false);
  assert.equal(foreignAttached.textContent, "stale");
  assert.equal(foreignAttached.parentNode, foreignParent);
  assert.deepEqual(appended, [detached]);
});

test("workspace inspector style collisions fail closed without mutation or selection changes", async (t) => {
  const cases = [
    ["non-style reserved id", "DIV", "solvronix-desk"],
    ["unowned style reserved id", "STYLE", null],
  ];

  for (const [name, tagName, owner] of cases) {
    await t.test(name, () => {
      const studio = loadThemeStudio();
      const appended = [];
      const head = { appendChild(element) { appended.push(element); } };
      const attributes = owner ? { "data-st-theme-owner": owner } : {};
      const collision = {
        tagName,
        id: "st-studio-workspace-inspector",
        textContent: "foreign content",
        parentNode: head,
        getAttribute(attribute) { return attributes[attribute] || null; },
        setAttribute(attribute, value) { attributes[attribute] = value; },
      };
      const oldClasses = new Set(["st-theme-workspace-inspected"]);
      const newClasses = new Set();
      const previousElement = {
        classList: {
          add(value) { oldClasses.add(value); },
          remove(value) { oldClasses.delete(value); },
        },
      };
      const replacement = {
        classList: {
          add(value) { newClasses.add(value); },
          remove(value) { newClasses.delete(value); },
        },
      };
      const frameDocument = {
        head,
        createElement() { throw new Error("collision must not create a replacement"); },
        getElementById() { return collision; },
        elementFromPoint() { return {}; },
      };
      studio.$workspace_iframe = {
        length: 1,
        0: {
          contentDocument: frameDocument,
          getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
        },
      };
      const previousSelection = { id: "workspace.text", element: previousElement };
      studio.workspace_selection = previousSelection;
      studio.selected_inspector = "workspace.text";
      studio._classify_workspace_target = () => ({ id: "workspace.card", element: replacement });
      let renders = 0;
      studio._render_inspector = () => { renders += 1; };

      assert.equal(studio._install_workspace_inspector_css(frameDocument), false);
      assert.equal(collision.id, "st-studio-workspace-inspector");
      assert.equal(collision.textContent, "foreign content");
      assert.deepEqual(attributes, owner ? { "data-st-theme-owner": owner } : {});
      assert.deepEqual(appended, []);
      assert.equal(studio._select_workspace_target({ clientX: 10, clientY: 20 }), false);
      assert.deepEqual(oldClasses, new Set(["st-theme-workspace-inspected"]));
      assert.deepEqual(newClasses, new Set());
      assert.equal(studio.workspace_selection, previousSelection);
      assert.equal(studio.selected_inspector, "workspace.text");
      assert.equal(renders, 0);
    });
  }
});

test("workspace inspector style fails soft for missing or inaccessible document APIs", async (t) => {
  const studio = loadThemeStudio();
  const throwingHead = {};
  Object.defineProperty(throwingHead, "head", { get() { throw new Error("blocked head"); } });
  const cases = [
    ["missing document", null],
    ["missing head", { createElement() {}, getElementById() {} }],
    ["missing createElement", { head: {}, getElementById() {} }],
    ["missing getElementById", { head: {}, createElement() {} }],
    ["throwing head getter", throwingHead],
    ["throwing lookup", { head: {}, createElement() {}, getElementById() { throw new Error("blocked lookup"); } }],
    ["throwing create", { head: {}, createElement() { throw new Error("blocked create"); }, getElementById() { return null; } }],
    ["throwing append", {
      head: { appendChild() { throw new Error("blocked append"); } },
      createElement() {
        const attributes = {};
        return {
          tagName: "STYLE", id: "", textContent: "", parentNode: null,
          getAttribute(name) { return attributes[name] || null; },
          setAttribute(name, value) { attributes[name] = value; },
        };
      },
      getElementById() { return null; },
    }],
  ];

  for (const [name, frameDocument] of cases) {
    await t.test(name, () => {
      let result;
      assert.doesNotThrow(() => { result = studio._install_workspace_inspector_css(frameDocument); });
      assert.equal(result, false);
    });
  }
});

test("workspace inspector style selection dependency fails closed before mutation", async (t) => {
  for (const [name, install] of [
    ["returns false", () => false],
    ["returns a non-boolean truthy value", () => ({})],
    ["throws", () => { throw new Error("style access blocked"); }],
  ]) {
    await t.test(name, () => {
      const studio = loadThemeStudio();
      const oldClasses = new Set(["st-theme-workspace-inspected"]);
      const newClasses = new Set();
      const previousElement = {
        classList: {
          add(value) { oldClasses.add(value); },
          remove(value) { oldClasses.delete(value); },
        },
      };
      const replacement = {
        classList: {
          add(value) { newClasses.add(value); },
          remove(value) { newClasses.delete(value); },
        },
      };
      const frameDocument = { elementFromPoint() { return {}; } };
      studio.$workspace_iframe = {
        length: 1,
        0: {
          contentDocument: frameDocument,
          getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
        },
      };
      const previousSelection = { id: "workspace.text", element: previousElement };
      studio.workspace_selection = previousSelection;
      studio.selected_inspector = "workspace.text";
      studio._classify_workspace_target = () => ({ id: "workspace.card", element: replacement });
      studio._install_workspace_inspector_css = install;
      let renders = 0;
      studio._render_inspector = () => { renders += 1; };

      assert.equal(studio._select_workspace_target({ clientX: 10, clientY: 20 }), false);
      assert.deepEqual(oldClasses, new Set(["st-theme-workspace-inspected"]));
      assert.deepEqual(newClasses, new Set());
      assert.equal(studio.workspace_selection, previousSelection);
      assert.equal(studio.selected_inspector, "workspace.text");
      assert.equal(renders, 0);
    });
  }
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
  const inspectorDocuments = [];
  studio._set_workspace_state = (state) => states.push(state);
  studio._inject_workspace_css = (css) => { injected.push(css); return true; };
  studio._install_workspace_inspector_css = (document) => { inspectorDocuments.push(document); return false; };

  assert.equal(studio._workspace_iframe_loaded(), true);
  assert.deepEqual(states, ["ready"]);
  assert.deepEqual(injected, [":root{--draft:1}"]);
  assert.deepEqual(inspectorDocuments, [frameDocument]);
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

test("workspace inspector style is last without duplication after allowlisted iframe load", () => {
  const studio = loadThemeStudio();
  const styles = [];
  const head = {
    appendChild(element) {
      const existing = styles.indexOf(element);
      if (existing !== -1) styles.splice(existing, 1);
      element.parentNode = this;
      styles.push(element);
    },
  };
  const frameDocument = {
    head,
    documentElement: { setAttribute() {} },
    body: { setAttribute() {} },
    addEventListener() {},
    createElement() {
      const attributes = {};
      return {
        tagName: "STYLE", id: "", textContent: "", parentNode: null,
        getAttribute(name) { return attributes[name] || null; },
        setAttribute(name, value) { attributes[name] = value; },
      };
    },
    getElementById(id) { return styles.find((element) => element.id === id) || null; },
  };
  studio.workspace_routes = { "/desk/selling": true };
  studio.workspace_url = "/desk/selling";
  studio.workspace_preview_css = ":root{--draft:1}";
  studio.config = {};
  studio.$workspace_iframe = {
    length: 1,
    0: { contentDocument: frameDocument, contentWindow: { location: { pathname: "/desk/selling" } } },
    attr() { return this; },
  };
  studio._set_workspace_state = () => {};
  studio._schedule_workspace_reanchor = () => true;

  assert.equal(studio._workspace_iframe_loaded(), true);
  assert.deepEqual(styles.map((element) => element.id), [
    "st-studio-workspace-draft", "st-studio-workspace-inspector",
  ]);
  assert.equal(styles.filter((element) => element.id === "st-studio-workspace-inspector").length, 1);
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

test("workspace wiring shield click selects styling target and preserves wheel forwarding", () => {
  const studio = loadThemeStudio();
  const calls = [];
  studio._select_workspace_target = (event) => { calls.push(["select", event]); };
  studio._forward_workspace_wheel = (event) => { calls.push(["wheel", event]); };
  const bindings = bindThemeStudio(studio);
  const clickEvent = { type: "native-click" };
  const wheelEvent = { type: "native-wheel" };

  bindings.rootHandlers["click|.sts-workspace-shield"]({ originalEvent: clickEvent });
  bindings.rootHandlers["wheel|.sts-workspace-shield"]({ originalEvent: wheelEvent });

  assert.deepEqual(calls, [["select", clickEvent], ["wheel", wheelEvent]]);
});

test("workspace lifecycle clears stale selections at every document boundary", async (t) => {
  await t.test("inspector close clears before selected state and render", () => {
    const studio = loadThemeStudio();
    const order = [];
    let selected = "workspace.card";
    Object.defineProperty(studio, "selected_inspector", {
      configurable: true,
      get() { return selected; },
      set(value) { order.push(["selected", value]); selected = value; },
    });
    studio._clear_workspace_selection = (closeInspector) => order.push(["clear", closeInspector]);
    studio._render_inspector = () => order.push(["render"]);
    const bindings = bindThemeStudio(studio);

    bindings.rootHandlers["click|[data-inspector-close]"]();

    assert.deepEqual(order, [["clear", false], ["selected", null], ["render"]]);
  });

  await t.test("scene changes clear first and Workspace has no default inspector", () => {
    const studio = loadThemeStudio();
    const order = [];
    const bindings = bindThemeStudio(studio);
    studio._clear_workspace_selection = () => order.push("clear");
    studio._render_inspector = () => order.push(["render", studio.selected_inspector]);
    studio._select_inspector = (id) => order.push(["select", id]);
    studio.$preview = {
      attr(name, value) { order.push(["attr", name, value]); return this; },
      find() {
        return {
          removeClass() { return this; }, filter() { return this; }, addClass() { return this; },
          first() { return { 0: {} }; },
        };
      },
    };
    const workspaceButton = { __data: { "preview-scene": "workspace" } };
    workspaceButton.__query = Object.assign({}, bindings.chain, { 0: workspaceButton });
    bindings.rootHandlers["click|[data-preview-scene]"].call(workspaceButton);
    assert.equal(order[0], "clear");
    assert.equal(studio.selected_inspector, null);
    assert.equal(order.some((entry) => Array.isArray(entry) && entry[0] === "select"), false);

    order.length = 0;
    const dashboardButton = { __data: { "preview-scene": "dashboard" } };
    dashboardButton.__query = Object.assign({}, bindings.chain, { 0: dashboardButton });
    bindings.rootHandlers["click|[data-preview-scene]"].call(dashboardButton);
    assert.equal(order[0], "clear");
    assert.deepEqual(order.find((entry) => Array.isArray(entry) && entry[0] === "select"), ["select", "dashboard.heading"]);
  });

  await t.test("iframe load clears before its first guard and iframe error clears before state", () => {
    const studio = loadThemeStudio();
    const loadOrder = [];
    studio.workspace_url = "";
    studio._clear_workspace_selection = () => loadOrder.push("clear");
    assert.equal(studio._workspace_iframe_loaded(), false);
    assert.deepEqual(loadOrder, ["clear"]);

    const bindings = bindThemeStudio(studio);
    const errorOrder = [];
    studio._clear_workspace_selection = () => errorOrder.push("clear");
    studio._set_workspace_state = (state) => errorOrder.push(state);
    bindings.frameHandlers["error.stsWorkspace"]();
    assert.deepEqual(errorOrder, ["clear", "error"]);
  });

  await t.test("pause rejection and selecting a new workspace clear", () => {
    const studio = loadThemeStudio();
    const clears = [];
    studio._clear_workspace_selection = () => clears.push("clear");
    studio.workspace_paused = false;
    studio.workspace_url = "/desk/old";
    studio.workspace_routes = { "/desk/new": true };
    studio.$workspace_iframe = { length: 1, 0: {}, attr() { return this; } };
    studio._set_workspace_state = () => {};

    assert.equal(studio._pause_workspace_preview(), true);
    studio.workspace_paused = false;
    assert.equal(studio._reject_workspace_iframe(), false);
    assert.equal(studio._select_workspace("/desk/new"), true);
    assert.equal(clears.length, 3);
  });

  await t.test("API unavailable empty and error outcomes clear before state", () => {
    const scenarios = [
      ["unavailable", (options) => options.callback({ message: { unavailable: true } }), "error"],
      ["empty", (options) => options.callback({ message: { pages: [], private_pages: [] } }), "empty"],
      ["error", (options) => options.error(), "error"],
    ];
    for (const [name, respond, outcome] of scenarios) {
      const studio = loadThemeStudio();
      const order = [];
      studio._clear_workspace_selection = () => order.push("clear");
      studio._set_workspace_state = (state) => order.push(state);
      studio._render_workspace_selector = () => {};
      studio._context.frappe.call = respond;
      studio._load_workspaces();
      assert.deepEqual(order, ["loading", "clear", outcome], name);
    }
  });
});

test("workspace reanchor wiring covers successful movement and coalesces rapid sources", () => {
  const studio = loadThemeStudio();
  let schedules = 0;
  studio._schedule_workspace_reanchor = () => { schedules += 1; return true; };
  studio.$workspace_iframe = {
    length: 1,
    0: { contentWindow: { scrollBy() {} } },
  };
  assert.equal(studio._forward_workspace_wheel({ deltaY: 4, preventDefault() {} }), true);
  assert.equal(schedules, 1);

  studio.$workspace_iframe = { length: 0 };
  assert.equal(studio._forward_workspace_wheel({ preventDefault() {} }), false);
  assert.equal(schedules, 1);

  const queued = [];
  studio._context.window.requestAnimationFrame = (callback) => { queued.push(callback); return 1; };
  studio._schedule_workspace_reanchor = Object.getPrototypeOf(studio)._schedule_workspace_reanchor.bind(studio);
  studio._reanchor_workspace_inspector = () => { studio.workspace_reanchor_pending = false; };
  assert.equal(studio._schedule_workspace_reanchor(), true);
  assert.equal(studio._schedule_workspace_reanchor(), false);
  assert.equal(studio._schedule_workspace_reanchor(), false);
  assert.equal(queued.length, 1);
});

test("workspace reanchor sources include stage scroll window resize and device transition", () => {
  const studio = loadThemeStudio();
  studio.selected_inspector = "workspace.card";
  let schedules = 0;
  studio._schedule_workspace_reanchor = () => { schedules += 1; return true; };
  const delayed = [];
  studio._context.setTimeout = (callback) => { delayed.push(callback); return 1; };
  const bindings = bindThemeStudio(studio);
  studio.$preview = { attr() { return this; } };
  const device = { __data: { device: "mobile" } };
  device.__query = Object.assign({}, bindings.chain, { 0: device });

  bindings.stageHandlers["scroll.stsInspector"]();
  bindings.windowHandlers["resize.stsInspector"]();
  bindings.rootHandlers["click|[data-device]"].call(device);
  delayed[0]();

  assert.deepEqual(bindings.windowHandlers.off, [
    "resize.stsInspector",
    "st-theme-os-mode-change.stsThemeMode",
    "st:user-theme-mode-changed.stsThemeMode",
  ]);
  assert.equal(schedules, 4);
});

test("toolbar theme choice updates Theme Studio mode and draft", () => {
  const studio = loadThemeStudio();
  studio.config = { preferred_mode: "Dark" };
  let checkpoints = 0;
  let changes = 0;
  let selected = null;
  studio._checkpoint = () => { checkpoints += 1; };
  studio.changed = () => { changes += 1; };
  const bindings = bindThemeStudio(studio);
  studio.$root.find = () => ({ val(value) { selected = value; return this; } });

  bindings.windowHandlers["st:user-theme-mode-changed.stsThemeMode"]({
    originalEvent: { detail: { mode: "light", dark: false } },
  });

  assert.equal(studio.config.preferred_mode, "Light");
  assert.equal(selected, "Light");
  assert.equal(checkpoints, 1);
  assert.equal(changes, 1);
});

test("workspace reanchor apply CSS injection and server callback schedule exactly once per update", () => {
  const studio = loadThemeStudio();
  let schedules = 0;
  studio._schedule_workspace_reanchor = () => { schedules += 1; return true; };
  studio.config = { preferred_mode: "Light", density: "Compact", shortcut_style: "Soft", sidebar_mode: "Compact", shadow_style: "Soft" };
  studio.history = [];
  studio.future = [];
  studio.$preview = {
    attr() { return this; },
    find() { return { toggleClass() { return this; } }; },
  };
  studio.$root = { find() { return { removeClass() { return this; }, filter() { return this; }, addClass() { return this; }, prop() { return this; } }; } };
  studio._resolved_visual_config = () => ({});
  studio._sync_effective_color_inputs = () => {};
  studio._apply_preview_vars = () => {};
  studio._update_wcag = () => {};
  studio._apply_draft_to_desk = () => {};
  studio._sync_workspace_document_state = () => {};
  studio._refresh_server_preview = () => {};
  studio.apply();
  assert.equal(schedules, 1);

  const styles = [];
  studio.$workspace_iframe = {
    length: 1,
    0: { contentDocument: {
      head: { appendChild(element) { element.parentNode = this; styles.push(element); } },
      getElementById(id) { return styles.find((element) => element.id === id) || null; },
      createElement() { return { parentNode: null }; },
    } },
  };
  assert.equal(studio._inject_workspace_css("draft"), true);
  assert.equal(schedules, 2);

  studio._context.frappe.call = (options) => options.callback({
    message: { css: "server", config: { preferred_mode: "Light" }, wcag_failures: [] },
  });
  studio._context.setTimeout = (callback) => { callback(); return 1; };
  studio._refresh_server_preview = Object.getPrototypeOf(studio)._refresh_server_preview.bind(studio);
  studio._refresh_server_preview();
  assert.equal(schedules, 3);

  studio.$workspace_iframe = { length: 0 };
  assert.equal(studio._inject_workspace_css("blocked"), false);
  assert.equal(schedules, 3);
});

test("non-workspace inspector selection remains unchanged", () => {
  const studio = loadThemeStudio();
  const calls = [];
  const element = {};
  const selected = {
    removeClass(name) { calls.push(["removeClass", name]); return this; },
    first() { calls.push(["first"]); return this; },
    addClass(name) { calls.push(["addClass", name]); return this; },
    0: element,
  };
  studio.$preview = { find(selector) { calls.push(["find", selector]); return selected; } };
  studio._context.$ = (target) => target === element ? selected : {};
  studio._render_inspector = () => calls.push(["render"]);
  studio._position_inspector = (target) => calls.push(["position", target]);
  studio._schedule_workspace_reanchor = () => { throw new Error("regular inspector must not use workspace helper"); };

  studio._select_inspector("dashboard.metrics", element);
  studio._restore_inspector_highlight();

  assert.equal(studio.selected_inspector, "dashboard.metrics");
  assert.deepEqual(calls, [
    ["find", ".is-inspected"], ["removeClass", "is-inspected"], ["addClass", "is-inspected"], ["render"], ["position", element],
    ["find", ".is-inspected"], ["removeClass", "is-inspected"], ["find", '[data-inspector="dashboard.metrics"]:visible'],
    ["first"], ["addClass", "is-inspected"], ["position", element],
  ]);
});
