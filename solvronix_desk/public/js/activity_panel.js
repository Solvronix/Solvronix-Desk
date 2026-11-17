/* ================================================================
   Solvronix Desk — Activity side panel
   On a wide screen the form's comments and timeline move out from
   under the form into the right-hand column, under the assign /
   attachments / tags blocks, so a record and its conversation are
   visible together. A button in the form toolbar shows or hides it;
   the choice is kept per user in the browser.
   It only moves Frappe's own footer element (nothing is rebuilt, so
   every Frappe handler keeps working) and puts it back when switched
   off or when the window gets narrower than 1200px.
   Off switch for the whole site: Theme Studio → "Activity side panel".
   ================================================================ */
(function () {
  "use strict";
  var ST = (window.solvronix_desk = window.solvronix_desk || {});
  var KEY = "st_activity_panel";
  var MIN_WIDTH = 1200;
  var HOST_CLASS = "st-activity-host";
  var ON_CLASS = "st-activity-on";

  function t(text) {
    return window.__ ? __(text) : text;
  }
  function cfg() {
    return (window.frappe && frappe.boot && frappe.boot.st_theme_config) || {};
  }
  function featureOn() {
    return cfg().activity_panel !== false; // default on, explicit false opts out
  }
  function readPref() {
    try {
      var v = window.localStorage.getItem(KEY);
      return v === null ? null : v === "1";
    } catch (e) { return null; }
  }
  function writePref(on) {
    try { window.localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
  }

  /* ── pure decision (unit-tested) ─────────────────────────────── */
  function decide(width, feature, pref) {
    if (!feature || !(width >= MIN_WIDTH)) return false;
    return pref === null || pref === undefined ? true : !!pref;
  }

  /* ── DOM ─────────────────────────────────────────────────────── */
  function parts(frm) {
    var footer = frm && frm.footer && frm.footer.wrapper && frm.footer.wrapper[0];
    var page = frm && frm.page && frm.page.wrapper && frm.page.wrapper[0];
    if (!footer || !page) return null;
    var host = footer.parentNode; // the <div> Frappe wraps the footer in
    var side = page.querySelector(".layout-side-section");
    var main = page.querySelector(".layout-main-section-wrapper");
    if (!host || !side || !main) return null;
    return { page: page, host: host, side: side, main: main };
  }

  function place(frm, on) {
    var p = parts(frm);
    if (!p) return false;
    var inSide = p.host.parentNode === p.side;
    if (on && !inSide) {
      p.host.classList.add(HOST_CLASS);
      p.side.appendChild(p.host);
    } else if (!on && inSide) {
      p.main.appendChild(p.host);
      p.host.classList.remove(HOST_CLASS);
    }
    p.page.classList.toggle(ON_CLASS, !!on);
    return true;
  }

  function sync(frm) {
    if (!frm) return;
    var on = decide(window.innerWidth, featureOn(), readPref());
    place(frm, on);
    var btn = frm.__st_activity_btn;
    if (btn) {
      btn.toggleClass("active", on);
      btn.toggle(featureOn() && window.innerWidth >= MIN_WIDTH);
    }
  }

  function ensureButton(frm) {
    if (frm.__st_activity_btn || !frm.page || !frm.page.add_action_icon || !featureOn()) return;
    if (!frm.footer) return; // forms without a timeline have nothing to move
    frm.__st_activity_btn = frm.page.add_action_icon(
      "messages-square",
      function () {
        var now = decide(window.innerWidth, featureOn(), readPref());
        writePref(!now);
        sync(frm);
      },
      "st-activity-toggle",
      t("Activity panel")
    );
  }

  var current = null;
  function onRefresh(frm) {
    if (!featureOn() || !frm) return;
    current = frm;
    ensureButton(frm);
    sync(frm);
  }

  ST.activityPanel = { decide: decide, MIN_WIDTH: MIN_WIDTH, KEY: KEY };

  if (window.$ && window.document) {
    $(document).on("form-refresh", function (event, frm) { onRefresh(frm); });
    var timer = null;
    $(window).on("resize.st-activity", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { sync(current); }, 150);
    });
  }
}());
