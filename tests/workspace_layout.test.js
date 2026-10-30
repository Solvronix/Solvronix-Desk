const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const modulePath = path.join(
  __dirname, "..", "solvronix_desk", "public", "js", "workspace_layout.js"
);

/* Values built inside the vm context have foreign prototypes. */
const plain = (value) => JSON.parse(JSON.stringify(value));

function loadModule(config = {}) {
  const attrs = {};
  const removed = [];
  const documentElement = {
    setAttribute(name, value) { attrs[name] = String(value); },
    removeAttribute(name) { delete attrs[name]; },
    classList: { add() {}, remove() {}, toggle() {} },
  };
  const document = {
    documentElement,
    getElementById(id) {
      return id === "st-ws-nav" ? { id, parentNode: { removeChild() { removed.push(id); } } } : null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
  };
  const window = {
    frappe: {
      boot: { st_theme_config: config },
      utils: {},
    },
    $: () => {},
    console,
  };
  window.window = window;
  const context = vm.createContext({ window, document, frappe: window.frappe, $: window.$, setTimeout, console });
  vm.runInContext(fs.readFileSync(modulePath, "utf8"), context);
  return { api: window.solvronix_desk.workspaceLayout, attrs, removed, window };
}

test("layout is off by default and only Workspace turns it on", () => {
  assert.equal(loadModule({}).api.isOn(), false);
  assert.equal(loadModule({ desk_layout: "Standard" }).api.isOn(), false);
  assert.equal(loadModule({ desk_layout: "Workspace" }).api.isOn(), true);
});

test("apply sets the html attribute and switching back tears the bar down", () => {
  const { api, attrs, removed, window } = loadModule({ desk_layout: "Workspace" });
  window.frappe.get_route = () => ["List", "Customer"];
  api.apply();
  assert.equal(attrs["data-st-layout"], "workspace");

  window.frappe.boot.st_theme_config.desk_layout = "Standard";
  api.apply();
  assert.equal(attrs["data-st-layout"], undefined);
  assert.deepEqual(removed, ["st-ws-nav"]);
});

test("sidebar items become direct links and section dropdowns", () => {
  const { api } = loadModule();
  const menus = api.buildMenus([
    { type: "Link", label: "Home", link_type: "Workspace", link_to: "Selling" },
    { type: "Section Break", label: "Sales" },
    { type: "Link", label: "Quotation", link_type: "DocType", link_to: "Quotation", child: 1 },
    { type: "Link", label: "Sales Order", link_type: "DocType", link_to: "Sales Order", child: 1 },
    { type: "Section Break", label: "Empty" },
    { type: "Link", label: "Customer", link_type: "DocType", link_to: "Customer" },
    { type: "Spacer", label: "ignored" },
  ]);
  assert.deepEqual(plain(menus.map((m) => m.label)), ["Home", "Sales", "Customer"]);
  assert.equal(menus[0].link.link_to, "Selling");
  assert.deepEqual(plain(menus[1].items.map((i) => i.label)), ["Quotation", "Sales Order"]);
});

test("menus past the fitted count fold into More, sections keep a header", () => {
  const { api } = loadModule();
  const menus = [
    { label: "A", link: { label: "A" }, items: [] },
    { label: "B", link: { label: "B" }, items: [] },
    { label: "Reports", items: [{ label: "R1" }, { label: "R2" }] },
    { label: "C", link: { label: "C" }, items: [] },
  ];
  assert.deepEqual(plain(api.foldMenus(menus, 4).map((m) => m.label)), ["A", "B", "Reports", "C"]);
  const folded = api.foldMenus(menus, 2);
  assert.deepEqual(plain(folded.map((m) => m.label)), ["A", "B", "More"]);
  assert.deepEqual(plain(folded[2].items), [
    { label: "Reports", header: true }, { label: "R1" }, { label: "R2" }, { label: "C" },
  ]);
  assert.equal(folded[2].more, true);
});

test("status steps prefer workflow states, then docstatus, then a short Status select", () => {
  const { api } = loadModule();
  const workflow = {
    workflow_state_field: "workflow_state",
    states: [
      { state: "Draft", doc_status: "0" },
      { state: "Approved", doc_status: "1" },
      { state: "Rejected", doc_status: "2" },
    ],
  };
  const wf = api.statusSteps({ workflow_state: "Approved" }, { fields: [] }, workflow, null);
  assert.deepEqual(plain(wf), { steps: ["Draft", "Approved"], current: "Approved" });

  const submitted = api.statusSteps({ docstatus: 1 }, { is_submittable: 1 }, null, ["Paid", "green"]);
  assert.deepEqual(plain(submitted), { steps: ["Draft", "Paid"], current: "Paid" });

  const cancelled = api.statusSteps({ docstatus: 2 }, { is_submittable: 1 }, null, null);
  assert.deepEqual(plain(cancelled), { steps: ["Draft", "Cancelled"], current: "Cancelled" });

  const meta = { fields: [{ fieldname: "status", fieldtype: "Select", options: "Open\nWorking\nClosed" }] };
  assert.deepEqual(plain(api.statusSteps({ status: "Working" }, meta, null, null)),
    { steps: ["Open", "Working", "Closed"], current: "Working" });

  const long = { fields: [{ fieldname: "status", fieldtype: "Select", options: "a\nb\nc\nd\ne\nf\ng" }] };
  assert.equal(api.statusSteps({ status: "a" }, long, null, null), null);
});

test("ribbons only mark final states", () => {
  const { api } = loadModule();
  assert.deepEqual(plain(api.ribbonFor({ docstatus: 2 }, null)), { label: "Cancelled", tone: "danger" });
  assert.deepEqual(plain(api.ribbonFor({ docstatus: 1 }, ["Paid", "green"])), { label: "Paid", tone: "success" });
  assert.equal(api.ribbonFor({ docstatus: 1 }, ["Unpaid", "orange"]), null);
  assert.deepEqual(plain(api.ribbonFor({ docstatus: 0, disabled: 1 }, null)), { label: "Disabled", tone: "muted" });
  assert.equal(api.ribbonFor({ docstatus: 0 }, ["Draft", "red"]), null);
});

function loadWithDom(route) {
  const byId = {};
  const classSet = () => {
    const set = new Set();
    return {
      add(c) { set.add(c); }, remove(c) { set.delete(c); }, contains(c) { return set.has(c); },
      toggle(c, on) { if (on === undefined ? !set.has(c) : on) set.add(c); else set.delete(c); },
    };
  };
  const element = () => ({
    classList: classSet(), style: {}, innerHTML: "", value: "", listeners: {},
    setAttribute() {}, focus() {},
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    querySelector() { return element(); },
    querySelectorAll() { return []; },
  });
  const document = {
    documentElement: { setAttribute() {}, removeAttribute() {}, classList: classSet() },
    body: { appendChild(el) { if (el.id) byId[el.id] = el; } },
    createElement: () => element(),
    getElementById: (id) => byId[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
  };
  const state = { route, routes: [], now: 10000 };
  const window = {
    frappe: {
      boot: { st_theme_config: { desk_layout: "Workspace" } },
      utils: {},
      get_route: () => state.route,
      set_route: (name) => { state.routes.push(name); state.route = [name]; },
    },
    location: { pathname: "/desk/x" },
    history: { back() { state.routes.push("back"); } },
    $: () => {},
    console,
  };
  window.window = window;
  const clock = { now: () => state.now };
  const context = vm.createContext({ window, document, frappe: window.frappe, $: window.$, setTimeout() {}, console, Date: clock });
  vm.runInContext(fs.readFileSync(modulePath, "utf8"), context);
  const isOpen = () => !!byId["st-ws-home"] && byId["st-ws-home"].classList.contains("is-open");
  return { api: window.solvronix_desk.workspaceLayout, state, window, isOpen, byId };
}

test("apps button opens the grid at once and moves to the all-apps route", () => {
  const { api, state, window, isOpen } = loadWithDom(["theme-studio"]);
  api.goHome();
  assert.equal(isOpen(), true);
  assert.deepEqual(state.routes, ["all-apps"]);

  // A theme refresh on the all-apps route keeps the grid open.
  window.location.pathname = "/desk/solvronix-desk/all-apps";
  api.apply();
  api.apply();
  assert.equal(isOpen(), true);

  // Closing goes back to where the user came from.
  state.now += 1000;
  api.leaveHome();
  assert.deepEqual(state.routes, ["all-apps", "back"]);
});

test("a close request right after opening is ignored", () => {
  const { api, state, window, isOpen } = loadWithDom(["List", "Item"]);
  api.goHome();
  window.location.pathname = "/desk/solvronix-desk/all-apps";
  state.now += 100;
  api.leaveHome();
  assert.equal(isOpen(), true);
  assert.deepEqual(state.routes, ["all-apps"]);
});

test("a refresh while the all-apps route is still parsing keeps the grid open", () => {
  const { api, state, window, isOpen } = loadWithDom(["Form", "Sales Invoice", "SINV-1"]);
  api.goHome();
  // URL already pushed, frappe.get_route() not resolved yet.
  state.route = ["Form", "Sales Invoice", "SINV-1"];
  window.location.pathname = "/desk/all-apps";
  api.apply();
  assert.equal(isOpen(), true);
  state.route = ["all-apps"];
  window.location.pathname = "/desk/solvronix-desk/all-apps";
  api.apply();
  assert.equal(isOpen(), true);
  assert.deepEqual(state.routes, ["all-apps"]);
});

test("a theme refresh outside the home route never reopens or bounces", () => {
  const { api, state, isOpen } = loadWithDom(["theme-studio"]);
  api.apply();
  assert.equal(isOpen(), false);
  assert.deepEqual(state.routes, []);
});

test("clicking empty space on the app grid never navigates back", () => {
  const { api, state, window, isOpen, byId } = loadWithDom(["Form", "Sales Invoice", "SINV-1"]);
  api.goHome();
  window.location.pathname = "/desk/solvronix-desk/all-apps";
  state.now += 5000;
  const home = byId["st-ws-home"];
  ["pointerdown", "mousedown", "click"].forEach((type) => {
    (home.listeners[type] || []).forEach((fn) => fn({ target: home, key: "" }));
  });
  assert.equal(isOpen(), true);
  assert.deepEqual(state.routes, ["all-apps"]);
});

test("leaving a directly opened app grid goes to the last desk page, never the bare page", () => {
  const { api, state, window, isOpen } = loadWithDom(["List", "Item"]);
  window.location.pathname = "/desk/stock/item";
  api.apply();
  // Back/forward lands on all-apps without the apps button.
  state.route = ["all-apps"];
  window.location.pathname = "/desk/solvronix-desk/all-apps";
  api.apply();
  assert.equal(isOpen(), true);
  api.leaveHome();
  assert.deepEqual(state.routes, ["/desk/stock/item"]);
});

test("with no desk page to return to, the grid stays open", () => {
  const { api, state, window, isOpen } = loadWithDom(["all-apps"]);
  window.location.pathname = "/desk/solvronix-desk/all-apps";
  api.apply();
  api.leaveHome();
  assert.equal(isOpen(), true);
  assert.deepEqual(state.routes, []);
});

test("a refresh on the all-apps route reopens a hidden grid", () => {
  const { api, window, isOpen } = loadWithDom(["all-apps"]);
  window.location.pathname = "/desk/solvronix-desk/all-apps";
  api.apply();
  api.toggleHome(false);
  assert.equal(isOpen(), false);
  api.apply();
  assert.equal(isOpen(), true);
});
