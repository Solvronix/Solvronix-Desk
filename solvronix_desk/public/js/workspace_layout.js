/* ================================================================
   Solvronix Desk — Workspace Classic layout
   Theme Studio "Desk layout = Workspace" swaps Frappe's sidebar desk
   for a top app bar with module menus, an app-icon home screen and
   sheet-style forms with status steps.

   Everything here is inert unless the resolved theme config says
   desk_layout === "Workspace"; switching back tears the DOM down.
   All Frappe internals are read through solvronix_desk.compat
   (frappe_compat.js) so every Frappe v16 minor works the same way.
   ================================================================ */
(function () {
  "use strict";

  var ST = (window.solvronix_desk = window.solvronix_desk || {});
  var warned = {};

  function cfg() {
    return (window.frappe && frappe.boot && frappe.boot.st_theme_config) || {};
  }

  function isOn() {
    return cfg().desk_layout === "Workspace";
  }

  function t(text) {
    return window.__ ? __(text) : text;
  }

  function esc(value) {
    var s = String(value == null ? "" : value);
    if (window.frappe && frappe.utils && frappe.utils.escape_html) return frappe.utils.escape_html(s);
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function icon(name, size) {
    try {
      if (name && frappe.utils && frappe.utils.icon) return frappe.utils.icon(name, size || "sm");
    } catch (e) { /* unknown icon name */ }
    return "";
  }

  /* One failing piece must never take the desk down: log once, skip it. */
  function safely(name, fn) {
    try {
      return fn();
    } catch (e) {
      if (!warned[name] && window.console) {
        warned[name] = true;
        console.warn("Solvronix workspace layout: " + name + " skipped", e);
      }
      return null;
    }
  }

  /* ── 1. PURE MODELS (unit-tested) ────────────────────────────────
     Sidebar items → menu model. Both sidebar payload generations use
     the same item shape: Section Break rows open a group, Link rows
     flagged `child` (or indented) belong to the open group. */
  function buildMenus(items) {
    var menus = [];
    var group = null;
    (items || []).forEach(function (item) {
      if (!item || !item.label) return;
      if (item.type === "Section Break") {
        group = { label: item.label, icon: item.icon || "", items: [] };
        menus.push(group);
        return;
      }
      if (item.type !== "Link") return;
      if (group && (item.child || item.indent)) {
        group.items.push(item);
      } else {
        group = null;
        menus.push({ label: item.label, icon: item.icon || "", link: item, items: [] });
      }
    });
    return menus.filter(function (menu) { return menu.link || menu.items.length; });
  }

  /* Keep the first `count` menus on the bar; everything after them goes
     into one "More" dropdown, sections keeping their header. */
  function foldMenus(menus, count) {
    if (count == null || count >= menus.length) return menus.slice();
    var kept = menus.slice(0, Math.max(0, count));
    var overflow = [];
    menus.slice(Math.max(0, count)).forEach(function (menu) {
      if (menu.link) {
        overflow.push(menu.link);
      } else {
        overflow.push({ label: menu.label, header: true });
        overflow = overflow.concat(menu.items);
      }
    });
    kept.push({ label: t("More"), icon: "", items: overflow, more: true });
    return kept;
  }

  /* Status steps for a document, most specific source first:
     workflow states → submittable docstatus → a short Status select. */
  function statusSteps(doc, meta, workflow, indicator) {
    if (!doc || !meta) return null;
    var label = indicator && indicator[0] ? String(indicator[0]) : "";

    if (workflow && workflow.states && workflow.states.length) {
      var field = workflow.workflow_state_field || "workflow_state";
      var current = doc[field];
      var seen = {};
      var states = [];
      workflow.states.forEach(function (row) {
        if (!row.state || seen[row.state]) return;
        if (String(row.doc_status) === "2" && row.state !== current) return;
        seen[row.state] = true;
        states.push(row.state);
      });
      if (states.length > 1) return { steps: states, current: current };
    }

    if (meta.is_submittable) {
      if (doc.docstatus === 2) return { steps: [t("Draft"), t("Cancelled")], current: t("Cancelled") };
      var done = doc.docstatus === 1 ? (label || t("Submitted")) : t("Submitted");
      return { steps: [t("Draft"), done], current: doc.docstatus === 1 ? done : t("Draft") };
    }

    var status = (meta.fields || []).filter(function (df) {
      return df.fieldname === "status" && df.fieldtype === "Select";
    })[0];
    if (status && doc.status) {
      var options = String(status.options || "").split("\n").filter(Boolean);
      if (options.length > 1 && options.length <= 6 && options.indexOf(doc.status) !== -1) {
        return { steps: options, current: doc.status };
      }
    }
    return null;
  }

  /* Corner ribbon for final states: done (green), cancelled, disabled. */
  function ribbonFor(doc, indicator) {
    if (!doc) return null;
    if (doc.docstatus === 2) return { label: t("Cancelled"), tone: "danger" };
    if (doc.disabled === 1 || doc.disabled === true) return { label: t("Disabled"), tone: "muted" };
    if (doc.docstatus === 1 && indicator && indicator[1] === "green" && indicator[0]) {
      return { label: String(indicator[0]), tone: "success" };
    }
    return null;
  }

  /* ── 2. ATTRIBUTE + TEARDOWN ─────────────────────────────────── */
  function setAttribute() {
    var html = document.documentElement;
    if (isOn()) html.setAttribute("data-st-layout", "workspace");
    else html.removeAttribute("data-st-layout");
  }

  function teardown() {
    ["st-ws-nav", "st-ws-home", "st-ws-drawer"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    document.querySelectorAll(".st-ws-statusbar, .st-ws-ribbon").forEach(function (el) {
      el.parentNode.removeChild(el);
    });
    document.querySelectorAll(".st-ws-has-ribbon").forEach(function (el) {
      el.classList.remove("st-ws-has-ribbon");
    });
    navSig = null;
  }

  /* ── 3. TOP APP BAR ──────────────────────────────────────────── */
  var navSig = null;

  function linkHtml(item, cls) {
    var href = ST.compat ? ST.compat.itemRoute(item) : null;
    if (!href) return "";
    return '<a class="' + cls + '" href="' + esc(href) + '">' +
      (item.icon ? '<span class="st-ws-ico">' + icon(item.icon, "sm") + "</span>" : "") +
      "<span>" + esc(item.label) + "</span></a>";
  }

  function menuHtml(menu, index) {
    if (menu.link) return linkHtml(menu.link, "st-ws-menu-link");
    var entries = menu.items.map(function (item) {
      if (item.header) return '<div class="st-ws-drop-sub">' + esc(item.label) + "</div>";
      return linkHtml(item, "st-ws-drop-item");
    }).join("");
    if (!entries) return "";
    return '<div class="st-ws-menu' + (menu.more ? " st-ws-more" : "") + '">' +
      '<button type="button" class="st-ws-menu-btn" aria-haspopup="true" aria-expanded="false" data-menu="' + index + '">' +
        "<span>" + esc(menu.label) + "</span>" + icon("chevron-down", "xs") +
      "</button>" +
      '<div class="st-ws-drop" role="menu">' +
        '<div class="st-ws-drop-head">' + esc(menu.label) + "</div>" + entries +
      "</div></div>";
  }

  function ensureNav() {
    var toolbar = document.getElementById("st-top-toolbar");
    if (!toolbar) return null;
    var nav = document.getElementById("st-ws-nav");
    if (nav) return nav;
    nav = document.createElement("nav");
    nav.id = "st-ws-nav";
    nav.setAttribute("aria-label", t("Main menu"));
    nav.innerHTML =
      '<button type="button" class="st-ws-apps-btn" title="' + esc(t("Apps") + " (Alt+H)") + '" aria-label="' + esc(t("Apps")) + '">' +
        '<span class="st-ws-grid" aria-hidden="true">' + new Array(10).join("<i></i>") + "</span>" +
      "</button>" +
      '<button type="button" class="st-ws-burger" aria-label="' + esc(t("Menu")) + '">' + icon("menu", "md") + "</button>" +
      '<a class="st-ws-app-name" href="#"></a>' +
      '<div class="st-ws-menus"></div>';
    toolbar.insertBefore(nav, toolbar.firstChild);

    nav.querySelector(".st-ws-apps-btn").addEventListener("click", function () { goHome(); });
    nav.querySelector(".st-ws-burger").addEventListener("click", function () { toggleDrawer(); });
    nav.addEventListener("click", function (e) {
      var btn = e.target.closest(".st-ws-menu-btn");
      if (btn) {
        e.stopPropagation();
        var menu = btn.parentNode;
        var open = !menu.classList.contains("is-open");
        closeMenus();
        menu.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        return;
      }
      if (e.target.closest(".st-ws-drop-item")) closeMenus();
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest || !e.target.closest("#st-ws-nav .st-ws-menu")) closeMenus();
    });
    return nav;
  }

  function closeMenus() {
    document.querySelectorAll("#st-ws-nav .st-ws-menu.is-open").forEach(function (menu) {
      menu.classList.remove("is-open");
      var btn = menu.querySelector(".st-ws-menu-btn");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function renderNav() {
    var nav = ensureNav();
    if (!nav || !ST.compat) return;
    var sidebar = ST.compat.currentSidebar();
    var menus = buildMenus(sidebar ? sidebar.items : []);
    var sig = JSON.stringify([sidebar && sidebar.label, window.innerWidth, menus.map(function (m) {
      return [m.label, m.items.length];
    })]);
    if (sig === navSig) return;
    navSig = sig;

    var name = nav.querySelector(".st-ws-app-name");
    name.textContent = sidebar ? sidebar.label : "";
    name.setAttribute("title", sidebar ? sidebar.label : "");
    name.setAttribute("href", sidebar && sidebar.home ? sidebar.home : "/desk");
    fitMenus(nav, menus);
    var drawer = document.getElementById("st-ws-drawer");
    if (drawer) fillDrawer(drawer, sidebar, menus);
  }

  /* Render as many menus as fit before the toolbar's right-hand tools;
     the rest go under "More". Measured, so it adapts to any label length. */
  function fitMenus(nav, menus) {
    var host = nav.querySelector(".st-ws-menus");
    var right = document.querySelector("#st-top-toolbar .st-tb-right");
    for (var count = menus.length; count >= 0; count--) {
      host.innerHTML = foldMenus(menus, count).map(menuHtml).join("");
      if (!right || !host.offsetParent) return;
      var limit = right.getBoundingClientRect().left - 12;
      if (host.getBoundingClientRect().right <= limit) return;
    }
  }

  /* ── 4. PHONE DRAWER (same menus, stacked) ───────────────────── */
  function fillDrawer(drawer, sidebar, menus) {
    drawer.querySelector(".st-ws-drawer-body").innerHTML =
      '<div class="st-ws-drawer-title">' + esc(sidebar ? sidebar.label : "") + "</div>" +
      menus.map(function (menu) {
        if (menu.link) return linkHtml(menu.link, "st-ws-drawer-link");
        return '<div class="st-ws-drawer-head">' + esc(menu.label) + "</div>" +
          menu.items.map(function (item) { return linkHtml(item, "st-ws-drawer-link"); }).join("");
      }).join("");
  }

  function toggleDrawer(force) {
    var drawer = document.getElementById("st-ws-drawer");
    if (!drawer) {
      drawer = document.createElement("div");
      drawer.id = "st-ws-drawer";
      drawer.innerHTML = '<div class="st-ws-drawer-scrim"></div><aside class="st-ws-drawer-body"></aside>';
      document.body.appendChild(drawer);
      drawer.addEventListener("click", function (e) {
        if (e.target.closest(".st-ws-drawer-scrim") || e.target.closest(".st-ws-drawer-link")) toggleDrawer(false);
      });
      var sidebar = ST.compat && ST.compat.currentSidebar();
      fillDrawer(drawer, sidebar, buildMenus(sidebar ? sidebar.items : []));
    }
    var open = typeof force === "boolean" ? force : !drawer.classList.contains("is-open");
    drawer.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("st-ws-drawer-open", open);
  }

  /* ── 5. APP HOME (icon grid, type-to-search, arrow keys) ─────── */
  function toggleHome(force) {
    var home = document.getElementById("st-ws-home");
    var open = typeof force === "boolean" ? force : !(home && home.classList.contains("is-open"));
    if (!open) {
      if (home) home.classList.remove("is-open");
      document.documentElement.classList.remove("st-ws-home-open");
      return;
    }
    if (!home) home = buildHome();
    home.classList.add("is-open");
    document.documentElement.classList.add("st-ws-home-open");
    var input = home.querySelector(".st-ws-home-search");
    if (input) {
      input.value = "";
      filterHome("");
      setTimeout(function () { input.focus(); }, 30);
    }
  }

  function buildHome() {
    var home = document.createElement("div");
    home.id = "st-ws-home";
    home.setAttribute("role", "dialog");
    home.setAttribute("aria-label", t("Apps"));
    home.innerHTML =
      '<div class="st-ws-home-inner">' +
        '<input class="st-ws-home-search" type="search" autocomplete="off" placeholder="' + esc(t("Search apps…")) + '">' +
        '<div class="st-ws-home-grid" role="list"></div>' +
        '<div class="st-ws-home-empty" hidden>' + esc(t("No apps match your search.")) + "</div>" +
      "</div>";
    document.body.appendChild(home);

    var grid = home.querySelector(".st-ws-home-grid");
    var wc = ST.workspaceCards;
    if (wc) {
      grid.innerHTML = wc.buildSkeletons(6);
      wc.fetchWorkspaces(function (pages) {
        grid.innerHTML = (pages || []).map(function (page, idx) {
          return wc.buildCard(page, idx);
        }).join("");
        grid.querySelectorAll(".st-ws-card").forEach(function (card) {
          card.setAttribute("role", "listitem");
          /* A plain click hides the grid at once; a new-tab click must not,
             or this tab is left on /all-apps without its grid. */
          card.addEventListener("click", function (e) {
            if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            toggleHome(false);
          });
        });
      });
    }

    home.querySelector(".st-ws-home-search").addEventListener("input", function (e) {
      filterHome(e.target.value);
    });
    home.addEventListener("keydown", homeKeys);
    /* The grid is a page with its own URL, not a modal: clicking empty space
       does nothing. It closes via an app, the apps button, Esc or Back. */
    return home;
  }

  function visibleCards() {
    return Array.prototype.filter.call(
      document.querySelectorAll("#st-ws-home .st-ws-card"),
      function (card) { return card.style.display !== "none"; }
    );
  }

  function filterHome(query) {
    var q = String(query || "").toLowerCase().trim();
    var any = false;
    document.querySelectorAll("#st-ws-home .st-ws-card").forEach(function (card) {
      var name = (card.querySelector(".st-ws-card-name") || {}).textContent || "";
      var match = !q || name.toLowerCase().indexOf(q) !== -1;
      card.style.display = match ? "" : "none";
      if (match) any = true;
    });
    var empty = document.querySelector("#st-ws-home .st-ws-home-empty");
    if (empty) empty.hidden = any;
  }

  function homeKeys(e) {
    if (e.key === "Escape") { leaveHome(); return; }
    var cards = visibleCards();
    if (!cards.length) return;
    var index = cards.indexOf(document.activeElement);
    if (e.key === "Enter" && index === -1) {
      e.preventDefault();
      cards[0].click();
      return;
    }
    var cols = Math.max(1, Math.round(
      (cards[0].parentNode.clientWidth || 1) / (cards[0].offsetWidth || 1)
    ));
    var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (!step) return;
    e.preventDefault();
    var next = index === -1 ? 0 : Math.min(cards.length - 1, Math.max(0, index + step));
    cards[next].focus();
  }

  /* The app grid is a real route (all-apps), so it has its own URL, survives
     theme refreshes and works with back/forward. The overlay opens at once
     and the route follows (rules: instant UI, one URL per view). */
  var cameFromDesk = false;
  var openedAt = 0;
  var lastDeskPath = null;

  function goHome() {
    if (isHomeRoute()) { leaveHome(); return; }
    toggleHome(true);
    cameFromDesk = true;
    openedAt = Date.now();
    frappe.set_route("all-apps");
  }

  function leaveHome() {
    /* A close request right after opening is a double click or a late
       event, never an intent to go back. */
    if (Date.now() - openedAt < 400) return;
    if (!isHomeRoute()) { toggleHome(false); return; }
    if (cameFromDesk) {
      cameFromDesk = false;
      window.history.back();
      return;
    }
    /* Reached by reload, link or back/forward: leave to the last desk page.
       Never just hide the grid on a home route, or the bare all-apps page
       behind it shows. With nowhere to go, the grid stays. */
    if (lastDeskPath) frappe.set_route(lastDeskPath);
  }

  /* The desk landing route shows the app grid, like a launcher. */
  var HOME_ROUTES = ["", "home", "smart-home", "all-apps"];
  function isHomeRoute() {
    var route = (frappe.get_route && frappe.get_route()) || [];
    return HOME_ROUTES.indexOf(String(route[0] || "")) !== -1;
  }

  /* Frappe pushes the new URL first and resolves frappe.get_route() only
     after an async parse. While the two disagree the route is in flight,
     and the router's own change event will follow. */
  function routeSettled() {
    var path = String((window.location && window.location.pathname) || "").replace(/\/+$/, "");
    var last = path.split("/").pop();
    var pathHome = path === "/desk" || path === "/app" || (last !== "home" && HOME_ROUTES.indexOf(last) !== -1);
    return !pathHome || isHomeRoute();
  }

  /* ── 6. FORMS: status steps + ribbon ─────────────────────────── */
  function renderForm(frm) {
    if (!isOn() || !frm || !frm.doc || !frm.meta || !ST.compat) return;
    var host = ST.compat.formSheet(frm);
    if (!host) return;
    var indicator = null;
    try { indicator = frappe.get_indicator(frm.doc, frm.doctype); } catch (e) { /* no indicator */ }
    var workflow = ST.compat.workflowFor(frm.doctype);

    var bar = host.querySelector(":scope > .st-ws-statusbar");
    var model = frm.is_new() ? null : statusSteps(frm.doc, frm.meta, workflow, indicator);
    if (!model) {
      if (bar) bar.parentNode.removeChild(bar);
    } else {
      if (!bar) {
        bar = document.createElement("div");
        bar.className = "st-ws-statusbar";
        bar.setAttribute("aria-label", t("Status"));
        host.insertBefore(bar, host.firstChild);
      }
      var reached = model.steps.indexOf(model.current);
      bar.innerHTML = model.steps.map(function (step, i) {
        var state = i === reached ? " is-current" : (reached > -1 && i < reached ? " is-done" : "");
        return '<span class="st-ws-step' + state + '"' + (i === reached ? ' aria-current="step"' : "") + ">" +
          esc(t(step)) + "</span>";
      }).join("");
    }

    var ribbon = host.querySelector(":scope > .st-ws-ribbon");
    var spec = ribbonFor(frm.doc, indicator);
    host.classList.toggle("st-ws-has-ribbon", !!spec);
    if (!spec) {
      if (ribbon) ribbon.parentNode.removeChild(ribbon);
    } else {
      if (!ribbon) {
        ribbon = document.createElement("div");
        host.appendChild(ribbon);
      }
      ribbon.className = "st-ws-ribbon st-ws-ribbon-" + spec.tone;
      ribbon.innerHTML = "<span>" + esc(spec.label) + "</span>";
    }
  }

  /* ── 7. LIFECYCLE ────────────────────────────────────────────── */
  function onRoute() {
    if (!isOn()) return;
    safely("nav", renderNav);
    /* Frappe resolves the new sidebar after the route event on some minors;
       the signature check makes this second pass free when nothing changed. */
    setTimeout(function () { safely("nav", renderNav); }, 400);
    if (routeSettled()) {
      var onHome = isHomeRoute();
      if (!onHome) {
        cameFromDesk = false;
        lastDeskPath = String(window.location.pathname || "") + String(window.location.search || "");
      }
      safely("home", function () { syncHome(onHome); });
    }
    closeMenus();
    toggleDrawerClosed();
  }

  /* Route changes and theme refreshes both land here: the overlay follows
     the route. A repeat refresh on the same home route leaves an open grid
     alone (keeps the typed search), but a closed one is always reopened. */
  var lastHomeRoute = null;
  function syncHome(onHome) {
    var key = onHome ? String(window.location && window.location.pathname) : null;
    var home = document.getElementById("st-ws-home");
    var open = !!(home && home.classList.contains("is-open"));
    if (onHome && key === lastHomeRoute && open) return;
    lastHomeRoute = key;
    toggleHome(onHome);
  }

  function toggleDrawerClosed() {
    var drawer = document.getElementById("st-ws-drawer");
    if (drawer && drawer.classList.contains("is-open")) toggleDrawer(false);
  }

  function apply() {
    setAttribute();
    if (ST.compat) ST.compat.refreshDock();
    if (!isOn()) {
      teardown();
      return;
    }
    onRoute();
    var frm = window.cur_frm;
    if (frm) safely("form", function () { renderForm(frm); });
  }

  function keyboard(e) {
    if (!isOn() || !e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.key || "").toLowerCase() === "h") {
      e.preventDefault();
      goHome();
    }
  }

  function init() {
    setAttribute();
    if (frappe.router && frappe.router.on) frappe.router.on("change", function () { setTimeout(onRoute, 0); });
    $(document).on("page-change.st_ws", function () { setTimeout(onRoute, 0); });
    window.addEventListener("st-theme-runtime-refresh", function () { setTimeout(apply, 0); });
    window.addEventListener("st-layout-change", function () { setTimeout(apply, 0); });
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { if (isOn()) safely("nav", renderNav); }, 150);
    });
    document.addEventListener("keydown", keyboard);
    if (frappe.ui && frappe.ui.form && frappe.ui.form.on) {
      frappe.ui.form.on("*", {
        refresh: function (frm) { safely("form", function () { renderForm(frm); }); },
        after_save: function (frm) { safely("form", function () { renderForm(frm); }); },
      });
    }
    /* The toolbar is injected on desk ready; retry briefly until it exists. */
    var tries = 0;
    (function waitToolbar() {
      if (document.getElementById("st-top-toolbar") || tries++ > 100) {
        apply();
        return;
      }
      setTimeout(waitToolbar, 100);
    })();
  }

  ST.workspaceLayout = {
    isOn: isOn,
    apply: apply,
    buildMenus: buildMenus,
    foldMenus: foldMenus,
    statusSteps: statusSteps,
    ribbonFor: ribbonFor,
    toggleHome: toggleHome,
    goHome: goHome,
    leaveHome: leaveHome,
  };

  if (window.frappe && window.$) window.$(init);
})();
