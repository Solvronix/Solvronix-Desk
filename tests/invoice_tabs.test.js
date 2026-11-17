const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const modulePath = path.join(__dirname, "..", "solvronix_desk", "public", "js", "invoice_tabs.js");

function load() {
  const win = { frappe: { boot: { st_theme_config: {} } }, __: (s) => s };
  win.window = win;
  vm.runInNewContext(fs.readFileSync(modulePath, "utf8"), win);
  return win.solvronix_desk.invoiceTabs;
}

test("both invoice lists get a Sales | Purchase strip with the open one active", () => {
  const api = load();
  const sales = api.tabsFor("Sales Invoice");
  assert.equal(sales.map((t) => t.label + (t.active ? "*" : "")).join(","), "Sales*,Purchase");
  const purchase = api.tabsFor("Purchase Invoice");
  assert.equal(purchase.map((t) => t.label + (t.active ? "*" : "")).join(","), "Sales,Purchase*");
});

test("other doctypes get no strip", () => {
  const api = load();
  assert.equal(api.tabsFor("Customer").length, 0);
  assert.equal(api.tabsFor(undefined).length, 0);
});

test("a tab for a doctype the user cannot read is left out", () => {
  const api = load();
  const out = api.tabsFor("Sales Invoice", (dt) => dt === "Sales Invoice");
  assert.equal(out.length, 1);
  assert.equal(out[0].label, "Sales");
});
