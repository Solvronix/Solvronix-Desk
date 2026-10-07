/* ================================================================
   Solvronix Desk — Frappe compatibility adapter
   The one file that knows which Desk navigation Frappe ships. Everything
   else asks solvronix_desk.compat instead of reading Frappe internals directly, so a
   future Frappe change means editing this file, not the whole theme.

   Navigation generations (feature-detected, never by version number):
     "legacy"  v16.0 – v16.49: body sidebar only
     "dock"    v16.50+: frappe.ui.Dock (module rail) + body sidebar

   Sets <html data-st-nav="legacy|dock"> so CSS can scope the rare rules
   that must differ between generations.
   ================================================================ */
(function () {
  "use strict";

  var ST = (window.solvronix_desk = window.solvronix_desk || {});

  var gen = frappe.ui && typeof frappe.ui.Dock === "function" ? "dock" : "legacy";
  document.documentElement.setAttribute("data-st-nav", gen);

  function railLayoutOn() {
    var cfg = frappe.boot && frappe.boot.st_theme_config;
    return !!(cfg && cfg.sidebar_layout === "Icon Rail");
  }

  function tabletWidth() {
    return !!(window.matchMedia && window.matchMedia("(min-width: 768px) and (max-width: 1199px)").matches);
  }

  /* Frappe 16.50 keeps the viewer's sidebar open/closed choice in this
     browser ("desk-sidebar-collapsed": "1"/"0"); null when they never chose. */
  function savedSidebarChoice() {
    try { return localStorage.getItem("desk-sidebar-collapsed"); } catch (e) { return null; }
  }

  function sidebar() {
    return (frappe.app && frappe.app.sidebar) || null;
  }

  function has(obj, name) {
    return !!obj && typeof obj[name] === "function";
  }

  /* The Icon Rail already lists the current app's modules (see
     solvronix_desk.js renderRailModules), so Frappe's own Dock would be a
     second rail beside it. Tell Frappe there is no dock to draw while the
     Icon Rail layout is on; Frappe then lays the sidebar out exactly as it
     does for an app without a dock. The dock's data and routing API stay
     available — only its drawing is switched off. */
  if (gen === "dock" && frappe.ui.Sidebar && frappe.ui.Sidebar.prototype) {
    var proto = frappe.ui.Sidebar.prototype;
    if (has(proto, "dock_enabled") && !proto.__st_dock_patched) {
      var nativeDockEnabled = proto.dock_enabled;
      proto.dock_enabled = function () {
        if (railLayoutOn()) return false;
        return nativeDockEnabled.apply(this, arguments);
      };
      proto.__st_dock_patched = true;
    }

    /* Tablets: the Icon Rail plus a full sidebar left lists ~420px. While
       the viewer has never chosen (Frappe saves the ☰ choice), start the
       sidebar folded to Frappe's icon column. Applied inside Frappe's own
       state loading, so its later re-applies keep it; nothing is saved, so
       the same browser on a desktop is unaffected. */
    if (has(proto, "load_expanded_state") && !proto.__st_fold_patched) {
      var nativeLoadExpanded = proto.load_expanded_state;
      proto.load_expanded_state = function () {
        nativeLoadExpanded.apply(this, arguments);
        if (this.sidebar_expanded && railLayoutOn() && tabletWidth() && savedSidebarChoice() === null) {
          this.sidebar_expanded = false;
        }
      };
      proto.__st_fold_patched = true;
    }
  }

  ST.compat = {
    gen: gen,
    hasDock: gen === "dock",

    /* Re-run Frappe's own dock refresh, e.g. after the sidebar layout is
       switched live in Theme Studio. */
    refreshDock: function () {
      var sb = sidebar();
      if (has(sb, "refresh_dock")) {
        try { sb.refresh_dock(); } catch (e) { /* sidebar not set up yet */ }
      }
    },

    /* The app (frappe.boot.app_data row) owning the sidebar on screen, or null. */
    currentApp: function () {
      var sb = sidebar();
      if (!has(sb, "get_sidebar_app")) return null;
      try { return sb.get_sidebar_app() || null; } catch (e) { return null; }
    },

    /* The modules of `app` in the order its dock arranges them (app, site and
       user layers merged by Frappe). [] on legacy Frappe or on any failure. */
    moduleEntries: function (app) {
      var sb = sidebar();
      if (!app || !has(sb, "collect_dock_entries")) return [];
      try { return sb.collect_dock_entries(app) || []; } catch (e) { return []; }
    },

    isActiveEntry: function (entry) {
      var sb = sidebar();
      if (!has(sb, "is_active_entry")) return false;
      try { return !!sb.is_active_entry(entry); } catch (e) { return false; }
    },

    openEntry: function (entry) {
      var sb = sidebar();
      if (has(sb, "open_dock_entry")) {
        sb.open_dock_entry(entry);
        return true;
      }
      return false;
    },

    entryKey: function (entry) {
      var sb = sidebar();
      if (has(sb, "dock_entry_key")) return sb.dock_entry_key(entry);
      return [entry.link_type, entry.link_to, entry.url].join("|");
    },

    /* Icon markup for a dock entry, using the same helpers the Dock uses. */
    entryIcon: function (entry) {
      if (entry.icon && frappe.utils.icon) return frappe.utils.icon(entry.icon, "md");
      if (frappe.utils.desktop_icon) return frappe.utils.desktop_icon(entry.label, "gray", "sm");
      return "";
    },

    /* Where an app's rail icon should lead on dock-generation Frappe. */
    appLandingRoute: function (app) {
      var sb = sidebar();
      if (!app || !has(sb, "app_landing_route")) return null;
      try { return sb.app_landing_route(app) || null; } catch (e) { return null; }
    },
  };
})();
