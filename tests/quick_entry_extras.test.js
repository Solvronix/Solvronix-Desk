const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const modulePath = path.join(__dirname, "..", "solvronix_desk", "public", "js", "quick_entry_extras.js");

function load(config = {}) {
  const made = [];
  class QuickEntryForm { render_dialog() { this.rendered = true; return "dialog"; } }
  const win = {
    frappe: { boot: { st_theme_config: config }, _from_link: false, ui: { form: { QuickEntryForm, make_quick_entry: (...a) => made.push(a) } } },
    __: (s) => s,
    setTimeout: (fn) => fn(),
    setInterval: () => 0, clearInterval() {},
  };
  win.window = win;
  vm.runInNewContext(fs.readFileSync(modulePath, "utf8"), win);
  return { api: win.solvronix_desk.quickEntryExtras, win, QuickEntryForm, made };
}

function fakeQe(extra = {}) {
  const clicks = [];
  const handlers = {};
  const actions = [];
  const btn = { length: 1, 0: { click() { clicks.push(1); if (handlers["click.st-save-new"]) handlers["click.st-save-new"](); } }, on(ev, fn) { handlers[ev] = fn; return btn; } };
  // like Frappe, the two methods the feature swaps live on the prototype
  const proto = {
    process_after_insert() { return "orig"; },
    open_form_if_not_list() { return "orig-open"; },
  };
  const qe = Object.assign(Object.create(proto), {
    doctype: "Contact", meta: {}, after_insert: null, init_callback: null,
    add_custom_action(label, fn) { actions.push({ label, fn }); },
    get_primary_btn() { return btn; },
    ...extra,
  });
  return { qe, actions, clicks };
}

test("offered for a normal pop-up, not for link-field, skip-insert, forced or single doctypes", () => {
  const { api } = load();
  assert.equal(api.offersSaveNew(fakeQe().qe, false), true);
  assert.equal(api.offersSaveNew(fakeQe().qe, true), false);
  assert.equal(api.offersSaveNew(fakeQe({ skip_insert: true }).qe, false), false);
  assert.equal(api.offersSaveNew(fakeQe({ force: true }).qe, false), false);
  assert.equal(api.offersSaveNew(fakeQe({ meta: { issingle: 1 } }).qe, false), false);
  assert.equal(api.offersSaveNew(null, false), false);
});

test("the render step is wrapped: Frappe's dialog still renders and gets the button", () => {
  const { QuickEntryForm, api } = load();
  assert.ok(QuickEntryForm.prototype.__st_save_new);
  const { qe, actions } = fakeQe();
  const out = QuickEntryForm.prototype.render_dialog.call(Object.assign(Object.create(QuickEntryForm.prototype), qe));
  assert.equal(out, "dialog");
});

test("Save & New clicks Save, skips the jump to the new record and reopens an empty pop-up after the insert", () => {
  const { api, made } = load();
  const { qe, actions, clicks } = fakeQe();
  api._addSaveNew(qe);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, "Save & New");
  actions[0].fn();
  assert.equal(clicks.length, 1);
  assert.equal(qe.open_form_if_not_list(), undefined); // navigation suppressed
  assert.equal(qe.process_after_insert(), "orig");     // Frappe's own after-insert still runs
  assert.equal(made.length, 1);
  assert.equal(made[0][0], "Contact");
});

test("a normal Save after Save & New puts Frappe's behaviour back and does not reopen", () => {
  const { api, made } = load();
  const { qe, actions } = fakeQe();
  api._addSaveNew(qe);
  actions[0].fn();
  // user fixes a validation error and presses plain Save
  qe.get_primary_btn()[0].click();
  assert.equal(qe.open_form_if_not_list(), "orig-open");
  assert.equal(qe.process_after_insert(), "orig");
  assert.equal(made.length, 0);
});

test("site switch off: no button", () => {
  const { QuickEntryForm } = load({ quick_entry_save_new: false });
  const { qe, actions } = fakeQe();
  const holder = Object.assign(Object.create(QuickEntryForm.prototype), qe);
  QuickEntryForm.prototype.render_dialog.call(holder);
  assert.equal(actions.length, 0);
});
