const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const modulePath = path.join(__dirname, "..", "solvronix_desk", "public", "js", "stat_buttons.js");

function load(config = {}) {
  const win = { frappe: { boot: { st_theme_config: config } }, __: (s) => s, setTimeout: (fn) => fn() };
  win.window = win;
  win.document = {};
  win.$ = () => ({ on() { return this; } });
  vm.runInNewContext(fs.readFileSync(modulePath, "utf8"), win);
  return win.solvronix_desk.statButtons;
}

test("toNumber reads Frappe's count text", () => {
  const api = load();
  assert.equal(api.toNumber("12"), 12);
  assert.equal(api.toNumber("99+"), 99);
  assert.equal(api.toNumber("?"), 1);
  assert.equal(api.toNumber(""), 0);
  assert.equal(api.toNumber(null), 0);
  assert.equal(api.toNumber("abc"), 0);
});

test("only linked documents that have records become buttons, biggest first", () => {
  const api = load();
  const out = api.buttonsFrom([
    { key: 0, label: "Sales Order", count: "" },
    { key: 1, label: "Sales Invoice", count: "3" },
    { key: 2, label: "Payment Entry", count: "12", open: "2" },
    { key: 3, label: "Quotation", count: "0" },
    { key: 4, label: "", count: "5" },
  ]);
  assert.equal(out.map((b) => b.label).join(","), "Payment Entry,Sales Invoice");
  assert.equal(out[0].open, "2");
  assert.equal(out[1].open, "");
});

test("the bar is capped", () => {
  const api = load();
  const many = Array.from({ length: 20 }, (_, i) => ({ key: i, label: "DT" + i, count: String(i + 1) }));
  const out = api.buttonsFrom(many);
  assert.equal(out.length, api.MAX);
  assert.equal(out[0].label, "DT19");
});

test("no links means no buttons", () => {
  const api = load();
  assert.equal(api.buttonsFrom([]).length, 0);
  assert.equal(api.buttonsFrom(undefined).length, 0);
});

test("counts are requested once for a saved record whose doctype has connections", () => {
  const api = load();
  const calls = [];
  const frm = { is_new: () => false, dashboard: { data: { transactions: [{ items: ["Sales Invoice"] }] }, _fetched_counts: false, set_open_count() { calls.push(1); } } };
  assert.equal(api.requestCounts(frm), true);
  assert.equal(calls.length, 1);
  frm.dashboard._fetched_counts = true;
  assert.equal(api.requestCounts(frm), false);
});

test("no count request for new records or doctypes without connections", () => {
  const api = load();
  const make = (isNew, transactions) => ({ is_new: () => isNew, dashboard: { data: { transactions }, set_open_count() {} } });
  assert.equal(api.requestCounts(make(true, [{ items: ["X"] }])), false);
  assert.equal(api.requestCounts(make(false, [])), false);
  assert.equal(api.requestCounts({}), false);
});
