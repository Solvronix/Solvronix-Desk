/* ================================================================
   Solvronix Desk — feature announcements
   One small, non-blocking card per release feature ("New in 3.0:
   Workspace Classic") with a one-click personal try, and after a try
   a slim bar to keep it or switch back. The server decides who sees
   what (boot: frappe.boot.st_announcements, see announcements.py);
   this file only renders and reports the choice.
   ================================================================ */
(function () {
  "use strict";

  var ST = (window.solvronix_desk = window.solvronix_desk || {});
  var shown = {};
  var acted = {}; // a choice was made (card, bar or dialog)

  function t(text, args) {
    return window.__ ? __(text, args) : text;
  }

  function esc(value) {
    var s = String(value == null ? "" : value);
    if (window.frappe && frappe.utils && frappe.utils.escape_html) return frappe.utils.escape_html(s);
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pending() {
    var list = window.frappe && frappe.boot && frappe.boot.st_announcements;
    return Array.isArray(list) ? list : [];
  }

  /* Never inside Theme Studio or its preview frame, and never on top of an
     open dialog (Frappe's own "What's new" notes go first). */
  function blocked() {
    if (window.top !== window) return "frame";
    var path = String((window.location && window.location.pathname) || "");
    if (path.indexOf("/theme-studio") !== -1) return "studio";
    if (document.querySelector(".modal.show")) return "modal";
    return "";
  }

  function remove(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function report(item, action, done) {
    frappe.call({
      method: "solvronix_desk.announcements.act",
      args: { announcement_id: item.id, action: action },
      callback: function (r) {
        var runtime = r && r.message && r.message.runtime;
        if (runtime) {
          /* theme_runtime reloads the Desk when the layout changes; reload
             anyway if it did not, so the new layout boots cleanly. */
          window.dispatchEvent(new CustomEvent("st-theme-runtime-refresh", { detail: runtime }));
          setTimeout(function () { window.location.reload(); }, 400);
        }
        if (done) done(r);
      },
    });
  }

  /* ── The card ─────────────────────────────────────────────────── */
  function cardHtml(item) {
    var actions = "";
    if (item.can_try) {
      actions += '<button type="button" class="st-ann-try" data-ann-action="try">' + esc(t("Try it now")) + "</button>";
    }
    actions += '<button type="button" class="st-ann-later" data-ann-action="snooze">' + esc(t("Not now")) + "</button>";
    return '<div class="st-ann-mock" aria-hidden="true">' +
        '<span class="st-ann-mock-bar"><i></i><b></b><b></b><b></b></span>' +
        '<span class="st-ann-mock-grid"><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
      "</div>" +
      '<div class="st-ann-body">' +
        '<div class="st-ann-kicker">' + esc(t("New in Solvronix Desk 3.0")) + "</div>" +
        '<div class="st-ann-title">' + esc(item.profile_name) + "</div>" +
        '<p class="st-ann-text">' + esc(t("A top menu bar, an app home screen and sheet-style forms. Try it on your own Desk; you can switch back at any time.")) + "</p>" +
        '<div class="st-ann-actions">' + actions + "</div>" +
        (item.manager
          ? '<a href="#" class="st-ann-default" data-ann-action="default">' + esc(t("Make it the default for everyone")) + " →</a>"
          : "") +
        '<button type="button" class="st-ann-never" data-ann-action="dismiss">' + esc(t("Don't show again")) + "</button>" +
      "</div>" +
      '<button type="button" class="st-ann-close" data-ann-action="snooze" aria-label="' + esc(t("Close")) + '">×</button>';
  }

  function showCard(item) {
    var card = document.createElement("aside");
    card.id = "st-ann-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", t("What's new"));
    card.innerHTML = cardHtml(item);
    document.body.appendChild(card);
    card.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-ann-action]");
      if (!btn) return;
      e.preventDefault();
      var action = btn.getAttribute("data-ann-action");
      acted[item.id] = true;
      /* Instant UI: the card goes first, the server call follows. */
      remove("st-ann-card");
      if (action === "default") {
        report(item, "snooze");
        frappe.route_options = { st_profile: item.profile };
        frappe.set_route("theme-studio");
        return;
      }
      if (action === "try" && window.frappe && frappe.show_alert) {
        frappe.show_alert({ message: t("Switching to {0}…", [esc(item.profile_name)]), indicator: "blue" });
      }
      report(item, action);
    });
  }

  /* ── The "you're trying it" bar ──────────────────────────────── */
  function showTried(item) {
    var bar = document.createElement("div");
    bar.id = "st-ann-tried";
    bar.setAttribute("role", "status");
    bar.innerHTML =
      "<span>" + t("You're trying {0}.", ["<b>" + esc(item.profile_name) + "</b>"]) + "</span>" +
      '<button type="button" class="st-ann-keep" data-ann-action="keep">' + esc(t("Keep it")) + "</button>" +
      '<button type="button" class="st-ann-back" data-ann-action="switch_back">' + esc(t("Switch back")) + "</button>";
    document.body.appendChild(bar);
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-ann-action]");
      if (!btn) return;
      remove("st-ann-tried");
      report(item, btn.getAttribute("data-ann-action"));
    });
  }

  /* ── Inside Frappe's "Updated to a new version" dialog ───────────
     Same choices under this app's notes, so the reader can act right
     where they read about it. Frappe records the new version when the
     dialog closes; a reload must wait for that, or the notes come back. */
  function closeOpenDialog() {
    var close = document.querySelector(".modal.show .btn-modal-close, .modal.show [data-dismiss='modal']");
    if (close) close.click();
  }

  function markVersionsSeen() {
    return frappe.xcall ? frappe.xcall("frappe.utils.change_log.update_last_known_versions").catch(function () {}) : Promise.resolve();
  }

  function inlineHtml(item) {
    return '<div class="st-ann-inline-title">' + esc(t("Want to see it on your own Desk?")) + "</div>" +
      '<div class="st-ann-inline-actions">' +
        (item.can_try ? '<button type="button" class="btn btn-primary btn-sm" data-ann-action="try">' + esc(t("Try it now")) + "</button>" : "") +
        '<button type="button" class="btn btn-default btn-sm" data-ann-action="snooze">' + esc(t("Not now")) + "</button>" +
        (item.manager ? '<a href="#" class="st-ann-inline-default" data-ann-action="default">' + esc(t("Make it the default for everyone")) + " →</a>" : "") +
      "</div>";
  }

  function injectIntoChangeLog() {
    var item = pending().filter(function (x) { return x.mode === "card" && !acted[x.id]; })[0];
    if (!item || !item.app_title) return false;
    var blocks = document.querySelectorAll(".modal.show .app-change-log");
    for (var i = 0; i < blocks.length; i++) {
      var heading = blocks[i].querySelector("h2");
      var title = heading && heading.firstChild ? String(heading.firstChild.textContent || "").trim() : "";
      if (title !== item.app_title) continue;
      if (blocks[i].querySelector(".st-ann-inline")) return true;
      var row = document.createElement("div");
      row.className = "st-ann-inline";
      row.innerHTML = inlineHtml(item);
      blocks[i].appendChild(row);
      row.addEventListener("click", function (e) {
        var btn = e.target.closest && e.target.closest("[data-ann-action]");
        if (!btn) return;
        e.preventDefault();
        var action = btn.getAttribute("data-ann-action");
        // Chosen here: no corner card afterwards (and drop one already up).
        shown[item.id] = acted[item.id] = true;
        remove("st-ann-card");
        if (action === "snooze") {
          row.innerHTML = '<div class="st-ann-inline-title">' +
            esc(t("No problem. You can try it any time from All Options → Appearance → Theme profile.")) + "</div>";
          report(item, "snooze");
          return;
        }
        closeOpenDialog();
        if (action === "default") {
          report(item, "snooze");
          frappe.route_options = { st_profile: item.profile };
          frappe.set_route("theme-studio");
          return;
        }
        if (window.frappe && frappe.show_alert) {
          frappe.show_alert({ message: t("Switching to {0}…", [esc(item.profile_name)]), indicator: "blue" });
        }
        markVersionsSeen().then(function () { report(item, "try"); });
      });
      return true;
    }
    return false;
  }

  function render() {
    var reason = blocked();
    if (reason === "frame") return false;
    if (reason === "modal") injectIntoChangeLog();
    if (reason) return null; // try again later
    pending().forEach(function (item) {
      if (shown[item.id]) return;
      if (item.mode === "card" && !document.getElementById("st-ann-card")) {
        shown[item.id] = true;
        showCard(item);
      } else if (item.mode === "tried" && !document.getElementById("st-ann-tried")) {
        shown[item.id] = true;
        showTried(item);
      }
    });
    return true;
  }

  /* Wait for the Desk to settle, then retry on route changes until the
     path is clear (no dialog, not Studio). */
  function init() {
    if (!pending().length) return;
    var tries = 0;
    (function attempt() {
      var done = render();
      if (done === false) return;
      if (done === null && tries++ < 60) setTimeout(attempt, 1000);
    })();
    if (frappe.router && frappe.router.on) {
      frappe.router.on("change", function () {
        if (pending().some(function (item) { return !shown[item.id]; })) setTimeout(render, 300);
      });
    }
  }

  ST.announcements = { render: render, blocked: blocked, cardHtml: cardHtml, injectIntoChangeLog: injectIntoChangeLog };

  if (window.frappe && frappe.boot) {
    if (document.readyState === "complete") setTimeout(init, 1500);
    else window.addEventListener("load", function () { setTimeout(init, 1500); });
  }
})();
