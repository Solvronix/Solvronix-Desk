/* ================================================================
   Solvronix Desk — Module Card Grid
   Replaces the /app/home workspace with an Odoo-style app grid.
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

  function fetchWorkspaces(cb) {
    if (_wsCache) { cb(_wsCache); return; }
    frappe.call({
      method: "frappe.desk.desktop.get_workspace_sidebar_items",
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
    var slug  = page.name || "";
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

  /* ── Render the full module grid into the page ───────────────── */
  function renderGrid(container) {
    if (!container) return;

    /* Grid shell with skeleton loaders */
    container.innerHTML =
      '<div id="st-module-grid">' +
      '<div class="st-ws-header">' +
      '<div class="st-ws-title">All Apps</div>' +
      '<div class="st-ws-subtitle">Jump to any workspace from here</div>' +
      '</div>' +
      '<div class="st-ws-search-wrap">' +
      '<input id="st-ws-search-input" class="st-ws-search" type="text" placeholder="Search apps…" autocomplete="off">' +
      '</div>' +
      buildSkeletons(8) +
      '</div>';

    /* Wire search input */
    var searchInput = document.getElementById("st-ws-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", function () { filterCards(this.value); });
    }

    /* Fetch real workspace list and replace skeletons */
    fetchWorkspaces(function (pages) {
      var grid = document.getElementById("st-module-grid");
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

      /* Wire card clicks (SPA navigation — prevent full reload) */
      var cards = grid.querySelectorAll(".st-ws-card[data-ws]");
      for (var j = 0; j < cards.length; j++) {
        cards[j].addEventListener("click", function (e) {
          e.preventDefault();
          var slug = this.getAttribute("data-ws");
          if (slug) frappe.set_route(slug);
        });
      }

      /* Re-apply any active search */
      if (searchInput && searchInput.value) filterCards(searchInput.value);
    });
  }

  /* ── Find the best content container to take over ───────────── */
  function getPageContent() {
    /* Try the page-content wrapper Frappe renders workspace into */
    return document.querySelector(".main-section .page-content") ||
           document.querySelector(".desk-page .page-body") ||
           document.querySelector(".main-section");
  }

  /* ── Check if we're on the Home route ───────────────────────── */
  function isHomeRoute() {
    var route = (frappe.get_route && frappe.get_route()) || [];
    return route.length === 1 && route[0].toLowerCase() === "home";
  }

  /* ── Main injection logic ────────────────────────────────────── */
  function maybeInjectGrid() {
    if (!isHomeRoute()) return;
    /* Don't re-inject if already rendered */
    if (document.getElementById("st-module-grid")) return;

    /* Wait for the page content div to appear */
    var attempts = 0;
    var poller = setInterval(function () {
      attempts++;
      var container = getPageContent();
      if (container) {
        clearInterval(poller);
        renderGrid(container);
      } else if (attempts > 20) {
        clearInterval(poller);
      }
    }, 100);
  }

  /* ── Boot & route change wiring ──────────────────────────────── */
  $(document).ready(function () {
    /* Hook route change event */
    frappe.router.on("change", function () {
      /* Small delay — let Frappe set up the new page first */
      setTimeout(function () { maybeInjectGrid(); }, 300);
    });

    /* Also trigger on first load if already on home */
    setTimeout(function () { maybeInjectGrid(); }, 500);
  });
}());
