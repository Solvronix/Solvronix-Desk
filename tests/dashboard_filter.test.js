const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const modulePath = path.join(__dirname, "..", "solvronix_desk", "public", "js", "dashboard_filter.js");

function load({ config = {}, made = [] } = {}) {
  const win = {
    frappe: {
      boot: { st_theme_config: config },
      widget: { make_widget(opts) { const w = made.shift(); w.opts = opts; return w; } },
      get_meta: (dt) => ({ fields: [{ fieldname: "status" }, { fieldname: "posting_date" }, { fieldname: "creation" }].concat(dt === "Sales Order" ? [{ fieldname: "company" }] : []) }),
      model: { with_doctype(dt, cb) { cb(); } },
      router: { on() {} },
    },
    __: (s) => s,
    document: { body: { contains: () => true }, querySelector: () => null, getElementById: () => null },
    sessionStorage: { getItem: () => null, setItem() {} },
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  win.window = win;
  win.$ = () => ({});
  vm.runInNewContext(fs.readFileSync(modulePath, "utf8"), win);
  return { api: win.solvronix_desk.dashboardFilter, win };
}

const NOW = new Date(2026, 10, 17); // Tuesday 17 Nov 2026

test("preset ranges", () => {
  const { api } = load();
  assert.equal(api.rangeFor("today", NOW).join(","), "2026-11-17,2026-11-17");
  assert.equal(api.rangeFor("week", NOW).join(","), "2026-11-16,2026-11-22");
  assert.equal(api.rangeFor("month", NOW).join(","), "2026-11-01,2026-11-30");
  assert.equal(api.rangeFor("last_month", NOW).join(","), "2026-10-01,2026-10-31");
  assert.equal(api.rangeFor("quarter", NOW).join(","), "2026-10-01,2026-12-31");
  assert.equal(api.rangeFor("year", NOW).join(","), "2026-01-01,2026-12-31");
  assert.equal(api.rangeFor("30d", NOW).join(","), "2026-10-19,2026-11-17");
});

test("last month across a year boundary, and a Sunday belongs to the week that started on Monday", () => {
  const { api } = load();
  assert.equal(api.rangeFor("last_month", new Date(2027, 0, 5)).join(","), "2026-12-01,2026-12-31");
  assert.equal(api.rangeFor("week", new Date(2026, 10, 22)).join(","), "2026-11-16,2026-11-22");
});

test("all time, unknown presets and incomplete custom ranges mean no filter", () => {
  const { api } = load();
  assert.equal(api.rangeFor("all", NOW), null);
  assert.equal(api.rangeFor("nope", NOW), null);
  assert.equal(api.rangeFor("custom", NOW, ["2026-01-01", ""]), null);
  assert.equal(api.rangeFor("custom", NOW, ["2026-01-01", "2026-02-01"]).join(","), "2026-01-01,2026-02-01");
});

test("date field: posting/transaction date first, creation as the fallback", () => {
  const { api } = load();
  assert.equal(api.pickDateField(["name", "posting_date", "creation"]), "posting_date");
  assert.equal(api.pickDateField(["transaction_date", "date"]), "transaction_date");
  assert.equal(api.pickDateField(["name", "status"]), "creation");
  assert.equal(api.pickDateField(undefined), "creation");
});

test("a chart takes the range through its own date-range state and refetches; clearing resets it", () => {
  const { api } = load();
  let fetched = 0;
  const chart = { chart_doc: { chart_type: "Count" }, fetch_and_update_chart() { fetched += 1; } };
  api._applyToChart(chart, ["2026-11-01", "2026-11-30"]);
  assert.equal(chart.selected_timespan, "Select Date Range");
  assert.equal(chart.selected_from_date, "2026-11-01");
  assert.equal(chart.selected_to_date, "2026-11-30");
  api._applyToChart(chart, null);
  assert.equal(chart.selected_timespan, null);
  assert.equal(chart.selected_from_date, null);
  assert.equal(fetched, 2);
});

test("report charts and charts without a document are left alone", () => {
  const { api } = load();
  let fetched = 0;
  api._applyToChart({ chart_doc: { chart_type: "Report" }, fetch_and_update_chart() { fetched += 1; } }, ["a", "b"]);
  api._applyToChart({ fetch_and_update_chart() { fetched += 1; } }, ["a", "b"]);
  assert.equal(fetched, 0);
});

test("a document-type card adds a between filter on its date field and keeps its own filters", () => {
  const { api } = load();
  let rendered = 0;
  class Card { get_filters() { return [["Sales Invoice", "status", "=", "Paid"]]; } }
  const card = new Card();
  card.card_doc = { type: "Document Type", document_type: "Sales Invoice" };
  api._applyToCard(card, ["2026-11-01", "2026-11-30"], () => { rendered += 1; });
  const filters = card.get_filters();
  assert.equal(filters.length, 2);
  assert.equal(JSON.stringify(filters[0]), JSON.stringify(["Sales Invoice", "status", "=", "Paid"]));
  assert.equal(JSON.stringify(filters[1]), JSON.stringify(["Sales Invoice", "posting_date", "between", ["2026-11-01", "2026-11-30"]]));
  api._applyToCard(card, null, () => { rendered += 1; });
  assert.equal(Object.prototype.hasOwnProperty.call(card, "get_filters"), false);
  assert.equal(card.get_filters().length, 1);
  assert.equal(rendered, 2);
});

test("report and custom cards are never filtered", () => {
  const { api } = load();
  class Card { get_filters() { return null; } }
  const card = new Card();
  card.card_doc = { type: "Report", document_type: "" };
  api._applyToCard(card, ["2026-11-01", "2026-11-30"], () => { throw new Error("must not render"); });
  assert.equal(Object.prototype.hasOwnProperty.call(card, "get_filters"), false);
});

test("the widget factory is wrapped to remember charts and cards, and still returns the widget", () => {
  const chart = { widget: [{}], chart_doc: { chart_type: "Count" }, fetch_and_update_chart() { this.fetched = (this.fetched || 0) + 1; } };
  const { api, win } = load({ made: [chart] });
  const out = win.frappe.widget.make_widget({ widget_type: "chart" });
  assert.equal(out, chart);
  api._state.preset = "month";
  api._applyAll();
  assert.equal(chart.fetched, 1);
  assert.equal(chart.selected_timespan, "Select Date Range");
});

test("site switch off: widgets are not remembered", () => {
  const chart = { widget: [{}], chart_doc: { chart_type: "Count" }, fetch_and_update_chart() { this.fetched = 1; } };
  const { api, win } = load({ config: { dashboard_filter: false }, made: [chart] });
  win.frappe.widget.make_widget({ widget_type: "chart" });
  api._state.preset = "month";
  api._applyAll();
  assert.equal(chart.fetched, undefined);
});

test("company filter: added once on the document type, existing filters kept, other companies replaced", () => {
  const { api } = load();
  const base = [["Sales Invoice", "status", "=", "Paid"], ["Sales Invoice", "company", "=", "Old Co"]];
  const out = api.companyFilters(base, "Sales Invoice", "New Co");
  assert.equal(out.length, 2);
  assert.equal(JSON.stringify(out[1]), JSON.stringify(["Sales Invoice", "company", "=", "New Co"]));
  assert.equal(api.companyFilters(null, "Sales Invoice", "A Co").length, 1);
  assert.equal(base.length, 2); // input is not modified
});

test("a chart gets the company filter when its document has a company field, and gets its own filters back when cleared", () => {
  const { api } = load();
  const calls = [];
  const original = [["Sales Invoice", "status", "=", "Paid"]];
  const chart = { chart_doc: { chart_type: "Sum", document_type: "Sales Order" }, filters: original, fetch_and_update_chart() { calls.push(1); } };
  api._applyToChart(chart, null, "New Co");
  assert.equal(chart.filters.length, 2);
  api._applyToChart(chart, null, "");
  assert.equal(chart.filters, original);
  assert.equal(calls.length, 2);
});

test("a card takes the company filter only on documents that have a company field", () => {
  const { api } = load();
  class Card { get_filters() { return null; } }
  const card = new Card();
  card.card_doc = { type: "Document Type", document_type: "Sales Invoice" };
  api._applyToCard(card, null, () => {}, "New Co");
  const out = card.get_filters();
  assert.equal(out.length, 0); // the stub doctype has no company field, so nothing is added
});

test("a card on a document with a company field gets the company filter", () => {
  const { api } = load();
  class Card { get_filters() { return [["Sales Order", "status", "=", "To Deliver"]]; } }
  const card = new Card();
  card.card_doc = { type: "Document Type", document_type: "Sales Order" };
  api._applyToCard(card, null, () => {}, "New Co");
  const out = card.get_filters();
  assert.equal(out.length, 2);
  assert.equal(JSON.stringify(out[1]), JSON.stringify(["Sales Order", "company", "=", "New Co"]));
});
