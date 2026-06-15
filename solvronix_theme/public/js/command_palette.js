/* =============================================
   Solvronix Desk — Command Palette (Ctrl+K)
   Press Ctrl+K (Cmd+K on Mac) from anywhere to open.
   Type to search DocTypes, navigate, or create new documents.
   ============================================= */

(function () {
  "use strict";

  var ST_CP = (window.solvronix_theme = window.solvronix_theme || {});

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
      /* capture:true fires before Frappe's own Ctrl+K handler (bubbling phase).
         stopImmediatePropagation() prevents any other capture-phase handler too. */
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
      var can_read   = (frappe.boot && frappe.boot.user && frappe.boot.user.can_read)   || [];
      var can_create = (frappe.boot && frappe.boot.user && frappe.boot.user.can_create) || [];

      var quick = [
        { label: "New Sales Invoice",   sub: "Create document", ico: "💰", ico_cls: "orange", action: function () { frappe.new_doc("Sales Invoice"); } },
        { label: "New Purchase Order",  sub: "Create document", ico: "🛒", ico_cls: "",       action: function () { frappe.new_doc("Purchase Order"); } },
        { label: "New Customer",        sub: "Create document", ico: "👤", ico_cls: "green",  action: function () { frappe.new_doc("Customer"); } },
        { label: "Theme Settings",      sub: "Solvronix Desk", ico: "🎨", ico_cls: "",       action: function () { frappe.set_route("Form", "Theme Settings"); } },
        { label: "Go to Home",          sub: "Navigation",      ico: "🏠", ico_cls: "",       action: function () { frappe.set_route(""); } },
      ];

      var dt_items = can_read.slice(0, 200).map(function (dt) {
        return {
          label: dt,
          sub: "Open list",
          ico: "📋",
          ico_cls: "",
          action: function () { frappe.set_route("List", dt); }
        };
      });

      this.all_items = quick.concat(dt_items);
    },

    open: function () {
      if (this.overlay) return;
      var self = this;

      var overlay = document.createElement("div");
      overlay.className = "st-cp-overlay";
      overlay.innerHTML = [
        '<div class="st-cp-modal" role="dialog" aria-label="Command Palette">',
        '  <div class="st-cp-search-row">',
        '    <span class="st-cp-search-icon">🔍</span>',
        '    <input class="st-cp-input" type="text"',
        '      placeholder="Search documents, actions, settings..."',
        '      autocomplete="off" autocorrect="off" spellcheck="false" />',
        '    <span class="st-cp-kbd-hint">Esc</span>',
        '  </div>',
        '  <div class="st-cp-results" id="st-cp-results"></div>',
        '  <div class="st-cp-footer">',
        '    <span class="st-cp-hint"><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>',
        '    <span class="st-cp-hint"><kbd>↵</kbd> Open</span>',
        '    <span class="st-cp-hint"><kbd>Esc</kbd> Close</span>',
        '  </div>',
        '</div>'
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
        if (e.key === "ArrowDown")  { e.preventDefault(); self._move(1); }
        if (e.key === "ArrowUp")    { e.preventDefault(); self._move(-1); }
        if (e.key === "Enter")      { e.preventDefault(); self._activate(); }
        if (e.key === "Escape")     { self.close(); }
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
      this._render([{ section: "Quick Actions", items: this.all_items.slice(0, 5) }]);
    },

    _search: function (q) {
      if (!q) { this._render_default(); return; }
      var ql = q.toLowerCase();
      var matches = this.all_items.filter(function (i) {
        return i.label.toLowerCase().indexOf(ql) !== -1;
      }).slice(0, 12);

      var create_item = {
        label: "New " + q,
        sub: "Create new document",
        ico: "➕",
        ico_cls: "orange",
        action: function () {
          try { frappe.new_doc(q); }
          catch (e) { frappe.msgprint("DocType not found: " + q); }
        }
      };

      var items = matches.length ? [create_item].concat(matches) : [create_item];
      this._render([{ section: 'Results for "' + q + '"', items: items }]);
    },

    _render: function (sections) {
      var self = this;
      this.list.innerHTML = "";
      var flat = [];

      sections.forEach(function (sec) {
        if (!sec.items.length) return;

        var lbl = document.createElement("div");
        lbl.className = "st-cp-section";
        lbl.textContent = sec.section;
        self.list.appendChild(lbl);

        sec.items.forEach(function (item) {
          var idx = flat.length;
          var el = document.createElement("div");
          el.className = "st-cp-item" + (idx === 0 ? " st-selected" : "");
          el.dataset.idx = idx;
          el.innerHTML = [
            '<div class="st-cp-item-ico ' + (item.ico_cls || "") + '">' + (item.ico || "📄") + "</div>",
            '<div class="st-cp-item-text">',
            '  <div class="st-cp-item-name">' + self._esc(item.label) + "</div>",
            item.sub ? '  <div class="st-cp-item-sub">' + self._esc(item.sub) + "</div>" : "",
            "</div>"
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
          '<div class="st-cp-empty">' +
          '<span class="st-cp-empty-icon">🔍</span>' +
          "No results found" +
          "</div>";
      }
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
    }
  };

  function tryInit() {
    if (window.frappe && frappe.boot) {
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
