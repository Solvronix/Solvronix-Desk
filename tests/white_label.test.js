const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const modulePath = path.join(__dirname, "..", "solvronix_desk", "public", "js", "white_label.js");

const CFG = {
  enabled: true,
  hosts: ["frappe.io", "frappeframework.com", "frappe.school", "frappecloud.com", "erpnext.com", "frappehr.com"],
  github_prefix: "/frappe",
  legal_hints: ["license", "licence", "copyright", "attribution", "notice"],
};
const ORIGIN = "https://erp.example.com";

function load() {
  const win = { frappe: {}, location: { origin: ORIGIN }, URL };
  win.window = win;
  vm.runInNewContext(fs.readFileSync(modulePath, "utf8"), win);
  return win.solvronix_desk.whiteLabel;
}

test("vendor hosts, subdomains and the vendor's GitHub are vendor links", () => {
  const api = load();
  for (const url of ["https://frappe.io/crm", "https://support.frappe.io/help", "https://docs.erpnext.com/x", "https://frappecloud.com/dashboard/sites/a", "https://github.com/frappe/erpnext/issues", "https://github.com/frappe"]) {
    assert.equal(api.isVendorUrl(url, CFG, ORIGIN), true, url);
  }
});

test("internal, relative, other owners, lookalike hosts and legal pages are not", () => {
  const api = load();
  for (const url of ["/desk/x", "https://erp.example.com/desk", "https://github.com/solvronix/app", "https://myfrappe.io/", "mailto:a@b.c", "javascript:alert(1)", "", "https://frappe.io/license", "https://github.com/frappe/erpnext/blob/develop/license.txt"]) {
    assert.equal(api.isVendorUrl(url, CFG, ORIGIN), false, url);
  }
});

test("contextual help links drop vendor entries and empty groups", () => {
  const api = load();
  const out = api.filterHelpLinks({
    "List/User": [{ label: "Adding Users", url: "https://docs.erpnext.com/adding-users" }],
    "modules/Setup": [{ label: "Ours", url: "https://docs.acme.com" }, { label: "System Settings", url: "https://docs.erpnext.com/s" }],
  }, CFG, ORIGIN);
  assert.equal(Object.keys(out).join(","), "modules/Setup");
  assert.equal(out["modules/Setup"].length, 1);
  assert.equal(out["modules/Setup"][0].label, "Ours");
});

test("the About dialog keeps its source-code link and nothing else of the vendor's", () => {
  const api = load();
  assert.equal(api.keepsLink("https://github.com/frappe", true, CFG, ORIGIN), true);
  assert.equal(api.keepsLink("https://github.com/frappe/", true, CFG, ORIGIN), true);
  assert.equal(api.keepsLink("https://github.com/frappe", false, CFG, ORIGIN), false); // only inside About
  assert.equal(api.keepsLink("https://frappe.io/", true, CFG, ORIGIN), false);
  assert.equal(api.keepsLink("https://discuss.frappe.io", true, CFG, ORIGIN), false);
});

test("script-only menu rows are recognised by their label, in English or translated", () => {
  const api = load();
  assert.equal(api.isVendorLabel(" Frappe Support ", api.VENDOR_LABELS), true);
  assert.equal(api.isVendorLabel("Edit Profile", api.VENDOR_LABELS), false);
  assert.equal(api.isVendorLabel("Frappe-Hilfe", api.VENDOR_LABELS, (s) => (s === "Frappe Support" ? "Frappe-Hilfe" : s)), true);
  assert.equal(api.isVendorLabel("", api.VENDOR_LABELS), false);
});

test("Help menu: vendor rows (by route or action script) go, the site's own stay, own links are appended", () => {
  const api = load();
  const items = [
    { item_label: "Documentation", item_type: "Route", route: "https://docs.erpnext.com/" },
    { item_label: "User Forum", item_type: "Route", route: "https://discuss.frappe.io" },
    { item_label: "Frappe School", item_type: "Route", route: "https://frappe.io/school?utm_source=in_app" },
    { item_label: "Report an Issue", item_type: "Route", route: "https://github.com/frappe/erpnext/issues" },
    { item_label: "About", item_type: "Action", action: "frappe.ui.toolbar.show_about()" },
    { item_label: "System Health", item_type: "Route", route: "/desk/system-health-report" },
    { item_label: "Frappe Support", item_type: "Route", route: "https://frappe.io/support" },
    { item_label: "Open", item_type: "Action", action: "window.open('https://support.frappe.io/help', '_blank')" },
    { item_label: "Our docs", item_type: "Route", route: "https://docs.mycompany.com" },
  ];
  const own = [{ item_label: "Documentation", item_type: "Route", route: "https://docs.acme.com" }];
  const out = api.cleanHelpMenu(items, own, CFG, ORIGIN);
  assert.equal(out.map((i) => i.item_label).join(","), "About,System Health,Our docs,Documentation");
  assert.equal(api.cleanHelpMenu(undefined, undefined, CFG, ORIGIN).length, 0);
});
