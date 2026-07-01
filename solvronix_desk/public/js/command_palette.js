/* =============================================
   Solvronix Desk — Command Palette (Ctrl+K)
   Searches: Reports, DocTypes, Workspaces
   ============================================= */

(function () {
  "use strict";

  var ST_CP = (window.solvronix_desk = window.solvronix_desk || {});

  ST_CP.cp = {
    overlay:   null,
    input:     null,
    list:      null,
    items:     [],
    all_items: [],
    selected:  0,
    _bound:    false,

    init: function () {
      if (this._bound) return;
      this._bound = true;

      var self = this;
      document.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
          e.preventDefault();
          e.stopImmediatePropagation();
          self.overlay ? self.close() : self.open();
        }
      }, true);

      this._build_items();
    },

    _build_items: function () {
      var boot        = (window.frappe && frappe.boot) || {};
      var user        = boot.user || {};
      var can_read    = user.can_read   || [];
      var can_create  = user.can_create || [];
      var rpt_map     = boot.allowed_reports || {};

      var items = [];

      // ── Reports (from frappe.boot.allowed_reports) ────────────────────────
      Object.keys(rpt_map).forEach(function (name) {
        var info   = rpt_map[name] || {};
        var ref    = info.ref_doctype || "";
        var rtype  = info.report_type || "";
        items.push({
          label:  name,
          sub:    ref ? ref : __("Report"),
          type:   "report",
          action: function () { frappe.set_route("query-report", name); },
        });
      });

      // ── DocTypes (all readable, no slice cap) ─────────────────────────────
      can_read.forEach(function (dt) {
        var creatable = can_create.indexOf(dt) !== -1;
        items.push({
          label:    dt,
          sub:      creatable ? __("Open list · Ctrl+N to create") : __("Open list"),
          type:     "doctype",
          creatable: creatable,
          action:   function () { frappe.set_route("List", dt); },
          new_action: creatable ? function () { frappe.new_doc(dt); } : null,
        });
      });

      // ── Workspaces (from sidebar boot data if available) ──────────────────
      var sidebar_pages = (boot.sidebar_items && boot.sidebar_items.pages) || [];
      sidebar_pages.forEach(function (page) {
        items.push({
          label:  page.title || page.name,
          sub:    __("Workspace"),
          type:   "workspace",
          action: function () { frappe.set_route("workspace", encodeURIComponent(page.name)); },
        });
      });

      this.all_items = items;
    },

    _rebuild_if_needed: function () {
      var boot = (window.frappe && frappe.boot) || {};
      var has_reports   = Object.keys(boot.allowed_reports || {}).length > 0;
      var loaded_rpts   = this.all_items.some(function (i) { return i.type === "report"; });
      if (!this.all_items.length || (has_reports && !loaded_rpts)) {
        this._build_items();
      }
    },

    open: function () {
      if (this.overlay) return;
      this._rebuild_if_needed();
      var self = this;

      var overlay = document.createElement("div");
      overlay.className = "st-cp-overlay";
      overlay.innerHTML = [
        '<div class="st-cp-modal" role="dialog" aria-label="Command Palette">',
        '  <div class="st-cp-search-row">',
        '    <svg class="st-cp-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"',
        '      stroke="currentColor" stroke-width="2" stroke-linecap="round">',
        '      <circle cx="6.5" cy="6.5" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>',
        '    </svg>',
        '    <input class="st-cp-input" type="text"',
        '      placeholder="Search reports, doctypes, workspaces..."',
        '      autocomplete="off" autocorrect="off" spellcheck="false" />',
        '    <kbd class="st-cp-kbd-hint">Esc</kbd>',
        '  </div>',
        '  <div class="st-cp-results" id="st-cp-results"></div>',
        '  <div class="st-cp-footer">',
        '    <span class="st-cp-hint"><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>',
        '    <span class="st-cp-hint"><kbd>↵</kbd> Open</span>',
        '    <span class="st-cp-hint"><kbd>Esc</kbd> Close</span>',
        '    <span class="st-cp-hint st-cp-count" id="st-cp-count"></span>',
        '  </div>',
        '</div>',
      ].join("\n");

      document.body.appendChild(overlay);
      this.overlay = overlay;
      this.input   = overlay.querySelector(".st-cp-input");
      this.list    = overlay.querySelector("#st-cp-results");

      this.input.focus();
      this._render_default();

      this.input.addEventListener("input", function (e) {
        self._search(e.target.value.trim());
      });

      this.input.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); self._move(1); }
        if (e.key === "ArrowUp")   { e.preventDefault(); self._move(-1); }
        if (e.key === "Enter")     { e.preventDefault(); self._activate(); }
        if (e.key === "Escape")    { self.close(); }
      });

      overlay.addEventListener("mousedown", function (e) {
        if (e.target === overlay) self.close();
      });
    },

    close: function () {
      if (!this.overlay) return;
      var el = this.overlay;
      this.overlay = null;
      el.classList.add("closing");
      setTimeout(function () { el && el.remove(); }, 110);
    },

    _render_default: function () {
      var hasERPNext = !!(frappe.boot && frappe.boot.versions && frappe.boot.versions.erpnext);
      var quick = hasERPNext ? [
        { label: __("New Sales Invoice"),  sub: __("Create document"), type: "create", action: function () { frappe.new_doc("Sales Invoice"); } },
        { label: __("New Purchase Order"), sub: __("Create document"), type: "create", action: function () { frappe.new_doc("Purchase Order"); } },
        { label: __("New Customer"),       sub: __("Create document"), type: "create", action: function () { frappe.new_doc("Customer"); } },
        { label: __("Theme Settings"),     sub: "Solvronix Desk",      type: "action", action: function () { frappe.set_route("Form", "Theme Settings"); } },
        { label: __("Home"),               sub: __("Workspace"),        type: "workspace", action: function () { frappe.set_route(""); } },
      ] : [
        { label: __("Theme Settings"),     sub: "Solvronix Desk",      type: "action", action: function () { frappe.set_route("Form", "Theme Settings"); } },
        { label: __("Home"),               sub: __("Workspace"),        type: "workspace", action: function () { frappe.set_route(""); } },
      ];
      var rpt_count = Object.keys((frappe.boot && frappe.boot.allowed_reports) || {}).length;
      var dt_count  = ((frappe.boot && frappe.boot.user && frappe.boot.user.can_read) || []).length;
      var count_str = rpt_count + " " + __("reports") + " · " + dt_count + " " + __("doctypes indexed");
      this._render([{ section: __("Quick Actions"), items: quick }], null, count_str);
    },

    _search: function (q) {
      if (!q) { this._render_default(); return; }
      var ql = q.toLowerCase();

      var scored = [];
      this.all_items.forEach(function (item) {
        var lbl = item.label.toLowerCase();
        if (lbl.indexOf(ql) === -1) return;
        // score: 3=prefix, 2=word-prefix, 1=contains
        var score = 3;
        if (lbl.indexOf(ql) !== 0) {
          var words = lbl.split(/[\s\-_\/]+/);
          score = words.some(function (w) { return w.indexOf(ql) === 0; }) ? 2 : 1;
        }
        scored.push({ item: item, score: score });
      });

      // Sort: score desc → type priority (report > doctype > workspace) → alpha
      var T = { report: 10, doctype: 5, workspace: 3, create: 15, action: 15 };
      scored.sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return (T[a.item.type] || 0) !== (T[b.item.type] || 0)
          ? (T[b.item.type] || 0) - (T[a.item.type] || 0)
          : a.item.label.localeCompare(b.item.label);
      });

      var reports = [], doctypes = [], workspaces = [];
      scored.forEach(function (s) {
        if      (s.item.type === "report"    && reports.length    < 8) reports.push(s.item);
        else if (s.item.type === "doctype"   && doctypes.length   < 8) doctypes.push(s.item);
        else if (s.item.type === "workspace" && workspaces.length < 4) workspaces.push(s.item);
      });

      var sections = [];
      if (reports.length)    sections.push({ section: __("Reports"),    items: reports });
      if (doctypes.length)   sections.push({ section: __("DocTypes"),   items: doctypes });
      if (workspaces.length) sections.push({ section: __("Workspaces"), items: workspaces });

      var total = scored.length;

      if (!sections.length) {
        var qfinal = q;
        var create_item = {
          label: __("New {0}", [q]),
          sub:   __("Create document (if DocType exists)"),
          type:  "create",
          action: function () {
            try { frappe.new_doc(qfinal); }
            catch (e) { frappe.msgprint("DocType not found: " + qfinal); }
          }
        };
        sections = [{ section: __('No results for "{0}"', [q]), items: [create_item] }];
        total = 0;
      }

      this._render(sections, null, total > 0 ? total + " " + (total !== 1 ? __("results") : __("result")) : "");
    },

    _render: function (sections, _unused, count_hint) {
      var self = this;
      this.list.innerHTML = "";
      var flat = [];

      sections.forEach(function (sec) {
        var lbl = document.createElement("div");
        lbl.className = "st-cp-section";
        lbl.textContent = sec.section;
        self.list.appendChild(lbl);

        (sec.items || []).forEach(function (item) {
          var idx = flat.length;
          var el  = document.createElement("div");
          el.className = "st-cp-item" + (idx === 0 ? " st-selected" : "");
          el.dataset.idx = String(idx);

          el.innerHTML = [
            '<div class="st-cp-badge st-cp-badge--' + (item.type || "doctype") + '">',
            self._type_abbr(item.type),
            "</div>",
            '<div class="st-cp-item-text">',
            '  <div class="st-cp-item-name">' + self._esc(item.label) + "</div>",
            item.sub
              ? '  <div class="st-cp-item-sub">' + self._esc(item.sub) + "</div>"
              : "",
            "</div>",
          ].join("");

          el.addEventListener("mousedown", function (e) {
            e.preventDefault();
            item.action();
            self.close();
          });

          self.list.appendChild(el);
          flat.push(item);
        });
      });

      this.items    = flat;
      this.selected = 0;

      if (!flat.length) {
        this.list.innerHTML =
          '<div class="st-cp-empty"><div class="st-cp-empty-icon">🔍</div>' + __("No results found") + '</div>';
      }

      var countEl = this.overlay && this.overlay.querySelector("#st-cp-count");
      if (countEl && count_hint) countEl.textContent = count_hint;
    },

    _type_abbr: function (type) {
      if (type === "report")    return "RP";
      if (type === "workspace") return "WS";
      if (type === "create")    return "+";
      if (type === "action")    return "⚡";
      return "DT";
    },

    _move: function (dir) {
      var els = this.list.querySelectorAll(".st-cp-item");
      if (!els.length) return;
      els[this.selected] && els[this.selected].classList.remove("st-selected");
      this.selected = Math.max(0, Math.min(this.selected + dir, els.length - 1));
      els[this.selected] && els[this.selected].classList.add("st-selected");
      els[this.selected] && els[this.selected].scrollIntoView({ block: "nearest" });
    },

    _activate: function () {
      var item = this.items[this.selected];
      if (item) { item.action(); this.close(); }
    },

    _esc: function (str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    },
  };

  function tryInit() {
    if (window.frappe && frappe.boot) {
      if (frappe.boot.enable_command_palette === 0) return;
      ST_CP.cp.init();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryInit);
  } else {
    tryInit();
  }

  $(document).on("frappe.ready", tryInit);
}());
