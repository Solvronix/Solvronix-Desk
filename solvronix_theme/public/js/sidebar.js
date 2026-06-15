/* =============================================
   Solvronix Desk — Sidebar Enhancement v3
   Frappe v16 handles expand/collapse via
   .body-sidebar-container.expanded and
   localStorage("sidebar-expanded").
   This adds: tooltip-on-hover, chevron sync,
   and mirrors state to "st_sidebar_expanded".
   ============================================= */

(function () {
  "use strict";

  var ST = (window.solvronix_theme = window.solvronix_theme || {});

  ST.sidebar_enhance = {

    _tooltip: null,

    init: function () {
      if (this._done) return;
      this._done = true;
      this._sync_localstorage();
      this._setup_tooltips();
      this._watch_state();
    },

    /* If user previously saved st_sidebar_expanded, mirror it to Frappe's key
       so the sidebar opens in the correct state on first load. */
    _sync_localstorage: function () {
      var stKey = localStorage.getItem("st_sidebar_expanded");
      if (stKey !== null) {
        localStorage.setItem("sidebar-expanded", stKey === "1" ? "1" : "0");
      }
    },

    /* Show label as tooltip when hovering a sidebar item in collapsed mode. */
    _setup_tooltips: function () {
      var tip = document.createElement("div");
      tip.className = "st-sidebar-tooltip";
      document.body.appendChild(tip);
      this._tooltip = tip;

      $(document).on("mouseenter", ".standard-sidebar-item", function (e) {
        var container = document.querySelector(".body-sidebar-container");
        if (!container || container.classList.contains("expanded")) return;
        var label = this.querySelector(".sidebar-item-label");
        if (!label) return;
        var text = (label.textContent || "").trim();
        if (!text) return;
        tip.textContent = text;
        tip.style.top = (e.clientY - 12) + "px";
        tip.classList.add("visible");
      });

      $(document).on("mouseleave", ".standard-sidebar-item", function () {
        tip.classList.remove("visible");
      });

      /* Hide tooltip when sidebar expands so it doesn't linger. */
      $(document).on("sidebar_expand", function () {
        tip.classList.remove("visible");
      });
    },

    /* Keep st_sidebar_expanded in sync whenever Frappe fires its events. */
    _watch_state: function () {
      $(document).on("sidebar_expand", function () {
        localStorage.setItem("st_sidebar_expanded", "1");
      });
      $(document).on("sidebar_collapse", function () {
        localStorage.setItem("st_sidebar_expanded", "0");
      });
    }
  };

  function tryInit() {
    setTimeout(function () {
      ST.sidebar_enhance.init();
    }, 600);
  }

  $(document).ready(tryInit);
  $(document).on("page-change", tryInit);

}());
