const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const runtimePath = path.join(
  __dirname,
  "..",
  "solvronix_desk",
  "public",
  "js",
  "chart_runtime.js"
);

function schema() {
  return {
    version: 1,
    groups: {
      chart: { height: { default: 240 } },
      surface: { background: { default: "#FFFFFF" } },
      series_defaults: { palette: { default: ["#111111", "#222222"] } },
      axes: {}, legend: {}, labels: {}, tooltip: {},
      animation: {
        enabled: { default: true },
        duration: { default: 400 },
        easing: { default: "ease" },
      },
      interaction: {}, advanced: {},
    },
  };
}

function loadRuntime(options = {}) {
  const listeners = {};
  const warnings = [];
  class MutationObserver {
    constructor(callback) { this.callback = callback; }
    observe() {}
    disconnect() {}
  }
  const document = {
    readyState: "complete",
    body: {},
    documentElement: {
      getAttribute(name) { return name === "data-theme" && options.dark ? "dark" : "light"; },
    },
    addEventListener(type, callback) { listeners[type] = callback; },
    dispatchEvent(event) { warnings.push(event.detail); },
    querySelectorAll() { return options.nodes || []; },
  };
  const window = {
    document,
    frappe: {
      boot: {
        st_theme_config: options.config || {
          chart_system_version: 1,
          chart_defaults: { chart: { height: 300 } },
          chart_overrides: {},
        },
        st_chart_schema: schema(),
      },
      router: { on() {} },
    },
    matchMedia: () => ({ matches: !!options.reducedMotion }),
    addEventListener(type, callback) { listeners[type] = callback; },
    dispatchEvent(event) { warnings.push(event.detail); },
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {},
  };
  const context = {
    console,
    document,
    window,
    frappe: window.frappe,
    MutationObserver,
    CustomEvent: class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init && init.detail; }
    },
    Map,
    Set,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(runtimePath, "utf8"), context);
  return { runtime: window.solvronixChartRuntime, listeners, warnings };
}

function chartRoot() {
  const values = {};
  return {
    isConnected: true,
    dataset: {},
    style: {
      setProperty(name, value) { values[name] = String(value); },
      removeProperty(name) { delete values[name]; },
      values,
    },
    querySelectorAll() { return []; },
    classList: { toggle() {}, add() {}, remove() {} },
  };
}

test("individual values retain ownership even when equal to global", () => {
  const chartId = "v1|dashboard_chart|4:Test";
  const { runtime } = loadRuntime({
    config: {
      chart_system_version: 1,
      chart_defaults: { chart: { height: 300 } },
      chart_overrides: { [chartId]: { chart: { height: 300 } } },
    },
  });

  const effective = runtime.resolveEffective(chartId);

  assert.equal(effective.values.chart.height, 300);
  assert.equal(effective.ownership["chart.height"], "individual");
});

test("dark mode derives readable system colors without replacing explicit chart colors", () => {
  const chartId = "v1|dashboard_chart|4:Test";
  const { runtime } = loadRuntime({
    dark: true,
    config: {
      chart_system_version: 1,
      chart_defaults: { tooltip: { background: "#550000" } },
      chart_overrides: { [chartId]: { surface: { background: "#123456" } } },
    },
  });

  const effective = runtime.resolveEffective(chartId);

  assert.equal(effective.values.surface.background, "#123456");
  assert.equal(effective.values.tooltip.background, "#550000");
  assert.deepEqual(Array.from(effective.values.series_defaults.palette), [
    "#7AA2F7", "#FF9E64", "#73DACA", "#7DCFFF", "#BB9AF7",
  ]);
  assert.equal(effective.ownership["series_defaults.palette"], "system");
});

test("registration applies once per configuration revision", () => {
  const { runtime } = loadRuntime();
  const calls = [];
  const root = { isConnected: true, dataset: {}, style: { setProperty() {} } };
  runtime.register({
    id: "v1|dashboard_chart|4:Test",
    family: "dashboard_chart",
    root,
    adapter: { apply(record, effective) { calls.push([record.id, effective.values.chart.height]); } },
  });

  runtime.refresh();
  runtime.setConfig({
    chart_system_version: 1,
    chart_defaults: { chart: { height: 420 } },
    chart_overrides: {},
  });

  assert.deepEqual(calls, [
    ["v1|dashboard_chart|4:Test", 300],
    ["v1|dashboard_chart|4:Test", 420],
  ]);
});

test("detached registrations are removed and adapter failures are isolated", () => {
  const { runtime, warnings } = loadRuntime();
  const root = { isConnected: true, dataset: {}, style: { setProperty() {} } };
  runtime.register({
    id: "v1|dashboard_chart|4:Test",
    family: "dashboard_chart",
    root,
    adapter: { apply() { throw new Error("broken chart"); } },
  });

  assert.equal(warnings.length, 1);
  root.isConnected = false;
  runtime.refresh({ force: true });

  assert.equal(runtime.describe("v1|dashboard_chart|4:Test"), null);
});

test("reduced motion forces effective chart animation duration to zero", () => {
  const { runtime } = loadRuntime({ reducedMotion: true });

  const effective = runtime.resolveEffective("v1|dashboard_chart|4:Test");

  assert.equal(effective.values.animation.duration, 0);
  assert.equal(effective.values.animation.enabled, false);
});

test("full chart adapter maps surface axes legend tooltip and series tokens", () => {
  const chartId = "v1|dashboard_chart|5:Sales";
  const { runtime } = loadRuntime({
    config: {
      chart_system_version: 1,
      chart_defaults: {
        surface: { background: "#123456", border_color: "#654321", radius: 14 },
        axes: { axis_color: "#111111", grid_color: "#222222", grid_width: 2 },
        legend: { text_color: "#333333", text_size: 15, visible: false },
        tooltip: { background: "#444444", text_color: "#EEEEEE" },
        series_defaults: { palette: ["#AAAAAA", "#BBBBBB"], line_width: 3, bar_radius: 7 },
      },
      chart_overrides: {
        [chartId]: { series: { "dataset:revenue": { color: "#ABCDEF", line_width: 5 } } },
      },
    },
  });
  const root = chartRoot();

  runtime.register({
    id: chartId,
    family: "dashboard_chart",
    root,
    series: [{ key: "dataset:revenue" }, { key: "dataset:cost" }],
    source: { data: { datasets: [{ name: "revenue" }, { name: "cost" }] } },
  });

  assert.equal(root.style.values["--st-chart-surface"], "#123456");
  assert.equal(root.style.values["--st-chart-axis"], "#111111");
  assert.equal(root.style.values["--st-chart-grid"], "#222222");
  assert.equal(root.style.values["--st-chart-legend"], "#333333");
  assert.equal(root.style.values["--st-chart-tooltip-bg"], "#444444");
  assert.equal(root.style.values["--st-chart-series-0"], "#ABCDEF");
  assert.equal(root.style.values["--st-chart-series-width-0"], "5px");
  assert.equal(root.dataset.stChartLegend, "hidden");
});

test("structural adapter rebuilds without replacing source data or callbacks", () => {
  const chartId = "v1|dashboard_chart|5:Sales";
  const callback = () => "kept";
  const source = { data: { labels: ["Jan"], datasets: [{ name: "revenue", values: [5] }] }, callback };
  const builds = [];
  const { runtime } = loadRuntime({
    config: {
      chart_system_version: 1,
      chart_defaults: { chart: { type: "bar", height: 360, stacked: true } },
      chart_overrides: {},
    },
  });

  runtime.register({
    id: chartId,
    family: "dashboard_chart",
    root: chartRoot(),
    source,
    rebuild(options) { builds.push(options); },
  });

  assert.equal(builds.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(builds[0])), { type: "bar", height: 360, orientation: "vertical", stacked: true, responsive: true });
  assert.deepEqual(source.data.labels, ["Jan"]);
  assert.equal(source.callback, callback);
});

test("incompatible pie conversion keeps the original chart and warns", () => {
  const chartId = "v1|report_chart|6:Profit|4:main";
  const builds = [];
  const { runtime, warnings } = loadRuntime({
    config: {
      chart_system_version: 1,
      chart_defaults: { chart: { type: "pie" } },
      chart_overrides: {},
    },
  });

  runtime.register({
    id: chartId,
    family: "report_chart",
    root: chartRoot(),
    source: { data: { datasets: [{ name: "income" }, { name: "expense" }] } },
    rebuild(options) { builds.push(options); },
  });

  assert.equal(builds.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].message, /one dataset/i);
});

test("number card adapter exposes a sparkline-only capability subset", () => {
  const { runtime } = loadRuntime();
  const root = chartRoot();
  const id = "v1|number_card|11:Open Orders";

  runtime.register({ id, family: "number_card", root, source: { data: {} } });
  const descriptor = runtime.describe(id);

  assert.deepEqual(Array.from(descriptor.capabilities.groups), ["chart", "surface", "series_defaults", "animation", "interaction"]);
  assert.equal(descriptor.capabilities.kind, "sparkline");
});

test("runtime description exposes stable editable series metadata", () => {
  const { runtime } = loadRuntime();
  const root = chartRoot();
  runtime.register({
    id: "v1|dashboard_chart|5:Sales",
    family: "dashboard_chart",
    root,
    instance: { data: { datasets: [{ name: "Net Total", source_key: "net_total" }] } },
  });

  const descriptor = runtime.describe(root);

  assert.equal(descriptor.series[0].key, "dataset:net_total");
  assert.equal(descriptor.series[0].label, "Net Total");
});

test("scan auto-registers a workspace chart with stable source metadata", () => {
  const root = chartRoot();
  root.dataset.chartName = "Sales Overview";
  root.matches = selector => selector === ".chart-container";
  root.closest = () => null;
  const { runtime } = loadRuntime({ nodes: [root] });

  runtime.scan();

  assert.equal(root.dataset.stChartFamily, "dashboard_chart");
  assert.match(root.dataset.stChartId, /^v1\|dashboard_chart\|14:Sales Overview$/);
  assert.equal(runtime.describe(root).id, root.dataset.stChartId);
});
