/* ================================================================
   Solvronix Desk — Module Card Grid
   Replaces the /app/home workspace with an clean app launcher grid.
   Workspace data fetched once and cached in memory per session.
   ================================================================ */

(function () {
  /* ── Workspace color + icon map ─────────────────────────────── */
  var WS_CONFIG = {
    /* Edvronix */
    "edvronix app":         { color: "#F97316", icon: "🎓", desc: "Students, fees, exams & attendance" },
    "edvronix":             { color: "#F97316", icon: "🎓", desc: "Students, fees, exams & attendance" },
    "education":            { color: "#F97316", icon: "🎓", desc: "Students, fees, exams & attendance" },
    /* Accounts / Finance */
    "accounts":             { color: "#F59E0B", icon: "💰", desc: "Invoices, ledger & balance sheets" },
    "accounting":           { color: "#F59E0B", icon: "💰", desc: "Invoices, ledger & balance sheets" },
    "finance":              { color: "#F59E0B", icon: "💰", desc: "Invoices, ledger & balance sheets" },
    /* Sales / Selling */
    "selling":              { color: "#EF4444", icon: "📈", desc: "Quotations, orders & customers" },
    "sales":                { color: "#EF4444", icon: "📈", desc: "Quotations, orders & customers" },
    "crm":                  { color: "#06B6D4", icon: "🤝", desc: "Leads, deals & opportunities" },
    /* Buying / Purchase */
    "buying":               { color: "#F59E0B", icon: "🛒", desc: "Purchase orders & suppliers" },
    "purchase":             { color: "#F59E0B", icon: "🛒", desc: "Purchase orders & suppliers" },
    /* Stock / Inventory */
    "stock":                { color: "#3B82F6", icon: "📦", desc: "Warehouses, items & deliveries" },
    "inventory":            { color: "#3B82F6", icon: "📦", desc: "Warehouses, items & deliveries" },
    /* HR / Payroll */
    "hr":                   { color: "#8B5CF6", icon: "👥", desc: "Employees, attendance & leave" },
    "human resources":      { color: "#8B5CF6", icon: "👥", desc: "Employees, attendance & leave" },
    "payroll":              { color: "#8B5CF6", icon: "💸", desc: "Salary slips & payroll runs" },
    /* Manufacturing */
    "manufacturing":        { color: "#10B981", icon: "🏭", desc: "Work orders & production planning" },
    /* Projects */
    "projects":             { color: "#3B82F6", icon: "📋", desc: "Tasks, timesheets & milestones" },
    /* Quality */
    "quality":              { color: "#06B6D4", icon: "✅", desc: "Quality inspections & feedback" },
    /* Support */
    "support":              { color: "#06B6D4", icon: "🎧", desc: "Issues, SLA & customer portal" },
    /* Assets */
    "assets":               { color: "#10B981", icon: "🏗️", desc: "Fixed assets & depreciation" },
    /* Loans */
    "loans":                { color: "#F59E0B", icon: "🏦", desc: "Loan management & repayments" },
    /* Healthcare */
    "healthcare":           { color: "#EF4444", icon: "🏥", desc: "Patients, appointments & billing" },
    /* Website */
    "website":              { color: "#F97316", icon: "🌐", desc: "Web pages, blog & store" },
    /* Settings */
    "settings":             { color: "#6B7280", icon: "⚙️",  desc: "System configuration & setup" },
    /* Solvronix */
    "solvronix":            { color: "#F97316", icon: "🔷", desc: "Solvronix platform settings" },
    /* Home — not shown in the grid itself */
    "home":                 { color: "#6B7280", icon: "🏠", desc: "Home" },
  };

  /* Fallback colors cycling for unknown workspaces */
  var FALLBACK_COLORS = ["#EF4444","#F59E0B","#10B981","#3B82F6","#8B5CF6","#06B6D4","#F97316"];

  function wsConfig(title) {
    var key = (title || "").toLowerCase();
    if (WS_CONFIG[key]) return WS_CONFIG[key];
    /* Partial match */
    var keys = Object.keys(WS_CONFIG);
    for (var i = 0; i < keys.length; i++) {
      if (key.indexOf(keys[i]) !== -1 || keys[i].indexOf(key) !== -1) {
        return WS_CONFIG[keys[i]];
      }
    }
    return null;
  }

  function wsColor(title, idx) {
    var cfg = wsConfig(title);
    return cfg ? cfg.color : FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  }

  function wsIcon(title, frappe_icon) {
    var cfg = wsConfig(title);
    if (cfg) return cfg.icon;
    /* Use first letter as fallback */
    return (title || "?").charAt(0).toUpperCase();
  }

  function wsDesc(title) {
    var cfg = wsConfig(title);
    return cfg ? cfg.desc : "";
  }

  /* ── Workspace data cache ────────────────────────────────────── */
  var _wsCache = null;
  var _routeGeneration = 0;
  var _activePoller = null;

  /* Cached reference to frappe.workspace's own .layout-main-section —
     the SAME singleton node for the whole session. Captured the moment
     we hide its real content; restore uses THIS, never a fresh lookup,
     so it can't be fooled by frappe.container.page not having swapped
     over to the new route yet (which caused a visible flash of the old
     workspace content when navigating away — e.g. clicking the Home
     icon to Today's View). */
  var _hiddenContainer = null;

  function fetchWorkspaces(cb) {
    if (_wsCache) { cb(_wsCache); return; }
    frappe.call({
      method: "solvronix_desk.api.get_workspaces",
      callback: function (r) {
        if (!r || !r.message) { cb([]); return; }
        var pages = (r.message.pages || []).concat(r.message.private_pages || []);
        /* Keep only top-level pages (no parent) and visible ones */
        var topLevel = [];
        for (var i = 0; i < pages.length; i++) {
          var p = pages[i];
          if (p.parent_page || p.is_hidden || !p.public) continue;
          /* Skip Home itself — we ARE the home page */
          if ((p.name || "").toLowerCase() === "home") continue;
          /* Skip pure module-level parents that are just navigation groupers */
          topLevel.push(p);
        }
        _wsCache = topLevel;
        cb(topLevel);
      }
    });
  }

  /* ── Build skeleton loaders ──────────────────────────────────── */
  function buildSkeletons(n) {
    var html = '<div class="st-ws-cards">';
    for (var i = 0; i < n; i++) {
      html += '<div class="st-ws-card st-skeleton">' +
              '<div class="st-ws-card-icon"></div>' +
              '<div class="st-ws-card-info">' +
              '<div class="st-ws-card-name">Loading</div>' +
              '<div class="st-ws-card-desc">Please wait</div>' +
              '</div></div>';
    }
    html += '</div>';
    return html;
  }

  /* ── Render one card ─────────────────────────────────────────── */
  function buildCard(page, idx) {
    var title = page.title || page.name || "Module";
    /* Use the Frappe workspace slug (lowercase, spaces → hyphens) for navigation */
    var slug  = (frappe.router && frappe.router.slug)
                ? frappe.router.slug(page.name || "")
                : (page.name || "").toLowerCase().replace(/ /g, "-");
    var color = wsColor(title, idx);
    var icon  = wsIcon(title, page.icon);
    var desc  = wsDesc(title);

    return '<a class="st-ws-card" href="/desk/' + encodeURIComponent(slug) + '"' +
           ' data-ws="' + slug + '"' +
           ' style="--mod-color:' + color + '"' +
           ' tabindex="0">' +
           '<div class="st-ws-card-icon">' + icon + '</div>' +
           '<div class="st-ws-card-info">' +
           '<div class="st-ws-card-name">' + frappe.utils.escape_html(title) + '</div>' +
           (desc ? '<div class="st-ws-card-desc">' + frappe.utils.escape_html(desc) + '</div>' : '') +
           '</div>' +
           '</a>';
  }

  /* ── Filter cards by search query ───────────────────────────── */
  function filterCards(query) {
    var q = (query || "").toLowerCase().trim();
    var cards = document.querySelectorAll("#st-module-grid .st-ws-card");
    var any = false;
    for (var i = 0; i < cards.length; i++) {
      var title = (cards[i].querySelector(".st-ws-card-name") || {}).textContent || "";
      var desc  = (cards[i].querySelector(".st-ws-card-desc") || {}).textContent || "";
      var match = !q || title.toLowerCase().indexOf(q) !== -1 || desc.toLowerCase().indexOf(q) !== -1;
      cards[i].style.display = match ? "" : "none";
      if (match) any = true;
    }
    var empty = document.getElementById("st-ws-empty");
    if (empty) empty.style.display = any ? "none" : "";
  }

  /* ── Hide/restore Frappe's own workspace content ──────────────
     `container` (.layout-main-section) is the SAME long-lived DOM
     node Frappe's `frappe.workspace` singleton owns for every
     workspace, including Home — it creates `.editor-js-container`
     / `#editorjs` in it once and reuses them for the whole session.
     We must never destroy those nodes (via innerHTML=) or the
     EditorJS instance loses its holder and every later workspace
     silently fails to render (GitHub #7). Hide them instead, and
     restore on the way out. ────────────────────────────────────── */
  function hideRealWorkspaceContent(container) {
    _hiddenContainer = container;
    var kids = container.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.id === "st-module-grid") continue;
      if (el.style.display !== "none") {
        el.dataset.stHiddenByGrid = "1";
        el.style.display = "none";
      }
    }
  }

  function restoreRealWorkspaceContent() {
    var container = _hiddenContainer;
    if (!container) return;
    var grid = container.querySelector("#st-module-grid");
    if (grid) grid.style.display = "none";
    var hidden = container.querySelectorAll("[data-st-hidden-by-grid]");
    for (var i = 0; i < hidden.length; i++) {
      hidden[i].style.display = "";
      delete hidden[i].dataset.stHiddenByGrid;
    }
    _hiddenContainer = null;
  }

  /* ── Render the full module grid into the page ───────────────── */
  function renderGrid(container, generation) {
    if (!container || generation !== _routeGeneration || !isHomeRoute()) return;

    hideRealWorkspaceContent(container);

    /* Reuse the grid element across visits instead of rebuilding it */
    var grid = container.querySelector("#st-module-grid");
    if (!grid) {
      grid = document.createElement("div");
      grid.id = "st-module-grid";
      container.appendChild(grid);
    }
    grid.style.display = "";

    /* Grid shell with skeleton loaders */
    grid.innerHTML =
      '<div class="st-ws-header">' +
      '<div class="st-ws-title">All Apps</div>' +
      '<div class="st-ws-subtitle">Jump to any workspace from here</div>' +
      '</div>' +
      '<div class="st-ws-search-wrap">' +
      '<input id="st-ws-search-input" class="st-ws-search" type="text" placeholder="Search apps…" autocomplete="off">' +
      '</div>' +
      buildSkeletons(8);

    /* Wire search input */
    var searchInput = document.getElementById("st-ws-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", function () { filterCards(this.value); });
    }

    /* Fetch real workspace list and replace skeletons */
    fetchWorkspaces(function (pages) {
      if (
        generation !== _routeGeneration ||
        !isHomeRoute() ||
        !container.isConnected ||
        !(frappe.container && frappe.container.page && frappe.container.page.contains(container))
      ) return;
      var grid = container.querySelector("#st-module-grid");
      if (!grid) return;

      /* Remove skeletons */
      var oldCards = grid.querySelector(".st-ws-cards");
      if (oldCards) grid.removeChild(oldCards);

      if (!pages.length) {
        grid.insertAdjacentHTML("beforeend",
          '<div class="st-ws-cards"><div class="st-ws-empty">No workspaces found.</div></div>');
        return;
      }

      var html = '<div class="st-ws-cards">';
      for (var i = 0; i < pages.length; i++) {
        html += buildCard(pages[i], i);
      }
      html += '<div id="st-ws-empty" class="st-ws-empty" style="display:none">No apps match your search.</div>';
      html += '</div>';
      grid.insertAdjacentHTML("beforeend", html);

      /* Native anchors are handled once by Frappe's delegated SPA router. */
      /* Re-apply any active search */
      if (searchInput && searchInput.value) filterCards(searchInput.value);
    });
  }

  /* ── Find the best content container to take over ───────────── */
  function getPageContent() {
    /* Only the router-owned active page is safe. */
    if (frappe.container && frappe.container.page) {
      var c = frappe.container.page.querySelector(".layout-main-section");
      if (c) return c;
    }
    return null;
  }

  /* ── Check if we're on the Home route ───────────────────────── */
  function isHomeRoute() {
    var route = frappe.get_route && frappe.get_route();
    /* Router not initialised yet — don't inject; wait for "change" event */
    if (!route) return false;
    /* Empty route: user is at /desk with no sub-path (Frappe Desktop page) */
    if (!route.length || route[0] === "") return true;
    var r0 = route[0].toLowerCase();
    /* Old-style ["home"] route */
    if (route.length === 1 && r0 === "home") return true;
    return false;
  }

  /* ── Detect Frappe's silent bare-route content substitution ───
     frappe.views.pageview.show() (Frappe core) substitutes an empty
     page name with frappe.boot.home_page — solvronix_desk sets this
     to "smart-home" when Theme Settings' "Enable Smart Home" is on.
     That substitution happens at the CONTENT level only: it changes
     what's rendered (frappe.container.change_to("smart-home")) but
     never touches frappe.router.current_route, which stays "" — a
     split-brain state where the route and the visible page disagree.
     This breaks Frappe's own sidebar resolution (set_workspace_sidebar
     reads the still-empty route, finds no match, and no-ops — leaving
     whatever workspace sidebar was showing before stuck on screen) and
     would make us inject the grid into frappe.container.page, which by
     then is smart-home's own Page instance, not a Workspace — its
     .layout-main-section lookup fails and getPageContent()'s unscoped
     fallback grabs the first matching node anywhere in the DOM, likely
     a stale hidden one from whatever workspace was active before.
     Fix at the source: turn the silent substitution into a REAL
     navigation, so route/content/sidebar all agree on smart-home. */
  function smartHomeOverrideActive() {
    return !!(frappe.boot && frappe.boot.home_page);
  }

  /* ── Main injection logic ────────────────────────────────────── */
  function maybeInjectGrid() {
    if (!isHomeRoute()) return;
    if (smartHomeOverrideActive()) {
      frappe.set_route(frappe.boot.home_page);
      return;
    }
    var generation = _routeGeneration;

    /* Wait for the page content div to appear */
    var attempts = 0;
    if (_activePoller) clearInterval(_activePoller);
    _activePoller = setInterval(function () {
      attempts++;
      if (generation !== _routeGeneration || !isHomeRoute()) {
        clearInterval(_activePoller);
        _activePoller = null;
        return;
      }
      var container = getPageContent();
      if (container) {
        clearInterval(_activePoller);
        _activePoller = null;
        var grid = container.querySelector("#st-module-grid");
        if (!grid || grid.style.display === "none") renderGrid(container, generation);
      } else if (attempts > 20) {
        clearInterval(_activePoller);
        _activePoller = null;
      }
    }, 100);
  }

  /* ── Boot & route change wiring ──────────────────────────────── */
  $(document).ready(function () {
    /* Hook route change event */
    frappe.router.on("change", function () {
      _routeGeneration++;
      if (_activePoller) {
        clearInterval(_activePoller);
        _activePoller = null;
      }
      /* Small delay — let Frappe set up the new page first */
      setTimeout(function () {
        if (isHomeRoute()) {
          maybeInjectGrid();
        } else {
          /* Leaving Home for a real workspace — restore whatever
             Frappe's own workspace singleton put in this container
             before the grid hid it, so it renders correctly. Uses the
             container reference cached at hide time (not a fresh
             getPageContent() lookup) — frappe.container.page may not
             have swapped to the new route yet when this fires, which
             previously caused a visible flash of the old workspace
             content (e.g. clicking the Home icon to Today's View). */
          restoreRealWorkspaceContent();
        }
      }, 300);
    });

    /* Also trigger on first load if already on home */
    setTimeout(function () { maybeInjectGrid(); }, 500);
  });

  /* ── Shared with other theme pages (e.g. Today's View's own apps
     section) so they render workspace cards identically instead of
     duplicating the icon/color map and card markup. ─────────────── */
  frappe.provide("solvronix_desk");
  solvronix_desk.workspaceCards = {
    fetchWorkspaces: fetchWorkspaces,
    buildCard: buildCard,
    buildSkeletons: buildSkeletons,
  };
}());
