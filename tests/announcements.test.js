const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const modulePath = path.join(__dirname, "..", "solvronix_desk", "public", "js", "announcements.js");

function load({ pathname = "/desk/stock", modalOpen = false, announcements = [], blocks = [] } = {}) {
  const byId = {};
  const calls = [];
  const element = () => ({
    id: "", className: "", innerHTML: "", parentNode: null, listeners: {},
    setAttribute() {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
  });
  const document = {
    readyState: "loading",
    body: { appendChild(el) { el.parentNode = { removeChild() { delete byId[el.id]; } }; byId[el.id] = el; } },
    createElement: () => element(),
    getElementById: (id) => byId[id] || null,
    querySelector: (sel) => (sel === ".modal.show" && modalOpen ? {} : null),
    querySelectorAll: (sel) => (sel === ".modal.show .app-change-log" ? blocks : []),
  };
  const window = {
    location: { pathname, reload() { calls.push("reload"); } },
    frappe: {
      boot: { st_announcements: announcements },
      call(opts) { calls.push(opts.args.action); },
      set_route(name) { calls.push("route:" + name); },
      utils: {},
    },
    addEventListener() {},
    dispatchEvent() {},
    console,
  };
  window.window = window;
  window.top = window;
  const context = vm.createContext({
    window, document, frappe: window.frappe, setTimeout() {}, console,
    CustomEvent: function () {},
  });
  vm.runInContext(fs.readFileSync(modulePath, "utf8"), context);
  return { api: window.solvronix_desk.announcements, byId, calls, window };
}

const CARD = { id: "workspace-classic-3", mode: "card", profile: "builtin-workspace", profile_name: "Workspace Classic", can_try: true, manager: true };

test("the card shows once and never twice", () => {
  const { api, byId } = load({ announcements: [CARD] });
  assert.equal(api.render(), true);
  assert.ok(byId["st-ann-card"]);
  delete byId["st-ann-card"];
  api.render();
  assert.equal(byId["st-ann-card"], undefined);
});

test("it waits behind an open dialog and never shows in Theme Studio", () => {
  assert.equal(load({ announcements: [CARD], modalOpen: true }).api.render(), null);
  assert.equal(load({ announcements: [CARD], pathname: "/desk/solvronix-desk/theme-studio" }).api.render(), null);
});

test("a click hides the card first, then reports the choice", () => {
  const { api, byId, calls } = load({ announcements: [CARD] });
  api.render();
  const card = byId["st-ann-card"];
  const btn = { getAttribute: () => "dismiss" };
  card.listeners.click({ target: { closest: () => btn }, preventDefault() {} });
  assert.equal(byId["st-ann-card"], undefined);
  assert.deepEqual(calls, ["dismiss"]);
});

test("make-default opens Theme Studio with the profile requested", () => {
  const { api, byId, calls, window } = load({ announcements: [CARD] });
  api.render();
  const btn = { getAttribute: () => "default" };
  byId["st-ann-card"].listeners.click({ target: { closest: () => btn }, preventDefault() {} });
  assert.deepEqual(calls, ["snooze", "route:theme-studio"]);
  assert.equal(window.frappe.route_options.st_profile, "builtin-workspace");
});

test("only managers get the make-default link, only choosers get Try it", () => {
  const { api } = load();
  assert.ok(api.cardHtml(CARD).includes('data-ann-action="default"'));
  assert.ok(!api.cardHtml(Object.assign({}, CARD, { manager: false })).includes('data-ann-action="default"'));
  assert.ok(!api.cardHtml(Object.assign({}, CARD, { can_try: false })).includes('data-ann-action="try"'));
});

test("after a try the keep / switch back bar shows", () => {
  const { api, byId } = load({ announcements: [Object.assign({}, CARD, { mode: "tried" })] });
  api.render();
  assert.ok(byId["st-ann-tried"]);
  assert.ok(byId["st-ann-tried"].innerHTML.includes('data-ann-action="switch_back"'));
});

test("Frappe's update dialog gets the same choices under this app's notes", () => {
  const section = (title) => {
    const children = [];
    return {
      children,
      querySelector: (sel) => (sel === "h2" ? { firstChild: { textContent: title } } : (sel === ".st-ann-inline" ? children[0] || null : null)),
      appendChild: (el) => children.push(el),
    };
  };
  const erpnext = section("ERPNext");
  const ours = section(" Solvronix Desk ");
  const { api, calls } = load({
    announcements: [Object.assign({}, CARD, { app_title: "Solvronix Desk" })],
    modalOpen: true,
    blocks: [erpnext, ours],
  });
  assert.equal(api.render(), null); // the corner card still waits for the dialog
  assert.equal(erpnext.children.length, 0);
  assert.equal(ours.children.length, 1);
  const row = ours.children[0];
  assert.ok(row.innerHTML.includes('data-ann-action="try"'));
  assert.ok(row.innerHTML.includes('data-ann-action="snooze"'));
  api.render(); // repeat polls never add a second row
  assert.equal(ours.children.length, 1);
  // "Not now" answers in place and records the choice.
  row.listeners.click({ target: { closest: () => ({ getAttribute: () => "snooze" }) }, preventDefault() {} });
  assert.deepEqual(calls, ["snooze"]);
  assert.ok(row.innerHTML.includes("All Options"));
});

test("the dialog still gets the choices when the corner card showed first", () => {
  const children = [];
  const ours = {
    querySelector: (sel) => (sel === "h2" ? { firstChild: { textContent: "Solvronix Desk" } } : (sel === ".st-ann-inline" ? children[0] || null : null)),
    appendChild: (el) => children.push(el),
  };
  const item = Object.assign({}, CARD, { app_title: "Solvronix Desk" });
  const env = load({ announcements: [item], blocks: [ours] });
  env.api.render(); // no dialog yet: the corner card shows
  assert.ok(env.byId["st-ann-card"]);
  assert.equal(env.api.injectIntoChangeLog(), true); // dialog opens later
  assert.equal(children.length, 1);
  children[0].listeners.click({ target: { closest: () => ({ getAttribute: () => "snooze" }) }, preventDefault() {} });
  assert.equal(env.byId["st-ann-card"], undefined); // a choice in the dialog drops the card
});
