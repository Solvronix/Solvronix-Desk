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
    documentElement: {},
    addEventListener(type, callback) { listeners[type] = callback; },
    dispatchEvent(event) { warnings.push(event.detail); },
    querySelectorAll() { return []; },
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
