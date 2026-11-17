const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const modulePath = path.join(__dirname, "..", "solvronix_desk", "public", "js", "activity_panel.js");

function fakeNode(name) {
  const node = {
    name,
    parentNode: null,
    classes: new Set(),
    children: [],
    classList: {
      add(c) { node.classes.add(c); },
      remove(c) { node.classes.delete(c); },
      toggle(c, force) { (force ? node.classes.add(c) : node.classes.delete(c)); },
    },
    appendChild(child) {
      if (child.parentNode) child.parentNode.children = child.parentNode.children.filter((c) => c !== child);
      child.parentNode = node;
      node.children.push(child);
    },
    querySelector(sel) { return node.found && node.found[sel] || null; },
  };
  return node;
}

function load({ config = {}, width = 1400, pref = null } = {}) {
  const store = pref === null ? {} : { st_activity_panel: pref };
  const handlers = {};
  const win = {
    innerWidth: width,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
    frappe: { boot: { st_theme_config: config } },
    __: (s) => s,
  };
  win.window = win;
  win.document = {};
  win.$ = (target) => ({ on(event, fn) { handlers[event] = fn; return this; } });
  vm.runInNewContext(fs.readFileSync(modulePath, "utf8"), win);
  return { api: win.solvronix_desk.activityPanel, win, handlers, store };
}

function fakeForm() {
  const page = fakeNode("page");
  const side = fakeNode("side");
  const main = fakeNode("main");
  const host = fakeNode("host");
  const footer = fakeNode("footer");
  main.appendChild(host);
  host.appendChild(footer);
  page.found = { ".layout-side-section": side, ".layout-main-section-wrapper": main };
  const buttons = [];
  const button = {
    classes: new Set(), shown: true,
    toggleClass(c, f) { f ? this.classes.add(c) : this.classes.delete(c); return this; },
    toggle(v) { this.shown = !!v; return this; },
  };
  const frm = {
    footer: { wrapper: [footer] },
    page: { wrapper: [page], add_action_icon(icon, click) { buttons.push({ icon, click }); return button; } },
  };
  return { frm, page, side, main, host, button, buttons };
}

test("decide: wide screen, feature on, no saved choice shows the panel", () => {
  const { api } = load();
  assert.equal(api.decide(1400, true, null), true);
  assert.equal(api.decide(1200, true, undefined), true);
});

test("decide: narrow screen, feature off, or saved 'hidden' never shows it", () => {
  const { api } = load();
  assert.equal(api.decide(1199, true, true), false);
  assert.equal(api.decide(1600, false, true), false);
  assert.equal(api.decide(1600, true, false), false);
  assert.equal(api.decide(1600, true, true), true);
});

test("form-refresh moves the footer host into the side column and marks the page", () => {
  const { handlers } = load();
  const f = fakeForm();
  handlers["form-refresh"]({}, f.frm);
  assert.equal(f.host.parentNode, f.side);
  assert.ok(f.page.classes.has("st-activity-on"));
  assert.ok(f.host.classes.has("st-activity-host"));
  assert.equal(f.buttons.length, 1);
  assert.equal(f.buttons[0].icon, "messages-square");
});

test("the toolbar button hides the panel, puts the footer back and remembers it", () => {
  const { handlers, store } = load();
  const f = fakeForm();
  handlers["form-refresh"]({}, f.frm);
  f.buttons[0].click();
  assert.equal(f.host.parentNode, f.main);
  assert.ok(!f.page.classes.has("st-activity-on"));
  assert.equal(store.st_activity_panel, "0");
  f.buttons[0].click();
  assert.equal(f.host.parentNode, f.side);
  assert.equal(store.st_activity_panel, "1");
});

test("a narrow window leaves the stock layout and hides the button", () => {
  const { handlers } = load({ width: 900 });
  const f = fakeForm();
  handlers["form-refresh"]({}, f.frm);
  assert.equal(f.host.parentNode, f.main);
  assert.equal(f.button.shown, false);
});

test("site switch off: nothing is moved and no button is added", () => {
  const { handlers } = load({ config: { activity_panel: false } });
  const f = fakeForm();
  handlers["form-refresh"]({}, f.frm);
  assert.equal(f.host.parentNode, f.main);
  assert.equal(f.buttons.length, 0);
});

test("a form without a timeline footer is left alone", () => {
  const { handlers } = load();
  const f = fakeForm();
  f.frm.footer = undefined;
  handlers["form-refresh"]({}, f.frm);
  assert.equal(f.buttons.length, 0);
  assert.equal(f.host.parentNode, f.main);
});
