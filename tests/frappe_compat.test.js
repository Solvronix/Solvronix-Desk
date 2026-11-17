const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const modulePath = path.join(__dirname, "..", "solvronix_desk", "public", "js", "frappe_compat.js");

function load({ sidebar = null } = {}) {
  const calls = [];
  const window = {
    location: { href: "" },
    open(url, target) { calls.push("open:" + url + ":" + target); },
  };
  const frappe = {
    ui: {},
    app: { sidebar },
    set_route(route) { calls.push("route:" + route); },
  };
  window.frappe = frappe;
  window.window = window;
  const document = { documentElement: { setAttribute() {} } };
  vm.runInContext(fs.readFileSync(modulePath, "utf8"), vm.createContext({ window, document, frappe, console }));
  return { compat: window.solvronix_desk.compat, calls, window };
}

test("a desk route goes through the desk router", () => {
  const { compat, calls } = load();
  compat.openRoute("/desk/selling");
  compat.openRoute("/app/stock");
  compat.openRoute("selling");
  assert.deepEqual(calls, ["route:/desk/selling", "route:/app/stock", "route:selling"]);
});

test("an app outside the desk is a page load", () => {
  const { compat, calls, window } = load();
  compat.openRoute("/crm");
  assert.equal(window.location.href, "/crm");
  assert.deepEqual(calls, []);
});

test("a full URL opens in a new tab", () => {
  const { compat, calls } = load();
  compat.openRoute("https://example.com/help");
  assert.deepEqual(calls, ["open:https://example.com/help:_blank"]);
});

test("Frappe's own is_desk_route wins when it exists", () => {
  const sidebar = { is_desk_route: (route) => route === "/helpdesk" };
  const { compat, calls, window } = load({ sidebar });
  compat.openRoute("/helpdesk");
  compat.openRoute("/desk/selling");
  assert.deepEqual(calls, ["route:/helpdesk"]);
  assert.equal(window.location.href, "/desk/selling");
});

test("no route does nothing", () => {
  const { compat, calls } = load();
  assert.equal(compat.openRoute(""), false);
  assert.deepEqual(calls, []);
});
