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
    return !!(cfg && cfg.sidebar_layout === "Icon Rail" && cfg.desk_layout !== "Workspace");
  }

  /* Workspace desk layout: the top app bar replaces all side navigation. */
  function workspaceLayoutOn() {
    var cfg = frappe.boot && frappe.boot.st_theme_config;
    return !!(cfg && cfg.desk_layout === "Workspace");
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
        if (railLayoutOn() || workspaceLayoutOn()) return false;
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

  function legacyItemRoute(item) {
    var gen_route = frappe.utils && frappe.utils.generate_route;
    if (typeof gen_route !== "function") return null;
    try {
      if (item.link_type === "URL") return item.url || null;
      if (item.link_type === "Workspace") {
        var ws = frappe.workspaces && frappe.workspaces[frappe.router.slug(item.link_to)];
        if (item.route) return item.route;
        if (ws && !ws.public) return "/desk/private/" + frappe.router.slug(ws.title);
        return "/desk/" + frappe.router.slug(item.link_to);
      }
      if (item.link_type === "Report") {
        var report = item.report || {};
        return gen_route({
          type: "Report",
          name: item.link_to,
          is_query_report: !item.report ||
            report.report_type === "Query Report" || report.report_type === "Script Report",
          report_ref_doctype: report.ref_doctype,
        });
      }
      if (item.link_type === "Page" && item.route_options) {
        return gen_route({ type: "Page", name: item.link_to, route_options: JSON.parse(item.route_options) });
      }
      var args = { type: item.link_type, name: item.link_to, tab: item.tab };
      if (item.filters && item.link_type === "DocType" && frappe.utils.get_filter_as_json) {
        args.doc_view = "List";
        args.route_options = JSON.parse(frappe.utils.get_filter_as_json(JSON.parse(item.filters)));
      }
      return gen_route(args);
    } catch (e) {
      return null;
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

    /* The sidebar on screen as {label, items, home}. Every v16 minor keeps
       the resolved payload on `sidebar_data`: rows of `module_sidebars`
       (16.50+) or `workspace_sidebar_item` (16.0 – 16.49), same item shape. */
    currentSidebar: function () {
      var sb = sidebar();
      var data = sb && sb.sidebar_data;
      if (!data || !Array.isArray(data.items)) return null;
      var label = data.label || sb.workspace_title || sb.current_module || "";
      /* A module's home is the first navigable item in its sidebar — the
         rule Frappe 16.50 uses (module_landing_route). Its name alone is
         not a route: e.g. "Solvronix Desk" has no workspace page. */
      var home = null;
      for (var i = 0; i < data.items.length && !home; i++) {
        home = ST.compat.itemRoute(data.items[i]);
      }
      return { label: label, items: data.items, home: home || "/desk" };
    },

    /* href for a sidebar item. Frappe's own helper first (16.50+), else the
       same rules 16.0 – 16.49 used inside SidebarItem.get_path(). */
    itemRoute: function (item) {
      if (!item || item.type !== "Link") return null;
      var path = null;
      var helper = frappe.ui && frappe.ui.sidebar_item && frappe.ui.sidebar_item.get_route;
      if (typeof helper === "function") {
        try { path = helper(item, false); } catch (e) { path = null; }
      } else {
        path = legacyItemRoute(item);
      }
      return path ? encodeURI(path) : null;
    },

    /* The form's sheet (.form-layout) for status steps and ribbons. */
    formSheet: function (frm) {
      var wrapper = frm && frm.layout && frm.layout.wrapper;
      var el = wrapper && (wrapper.jquery ? wrapper[0] : wrapper);
      return el && el.nodeType === 1 ? el : null;
    },

    /* The DocType's active Workflow document, once Frappe has loaded it. */
    workflowFor: function (doctype) {
      var store = frappe.workflow && frappe.workflow.workflows;
      return (store && store[doctype]) || null;
    },

    /* Where an app's rail icon should lead on dock-generation Frappe. */
    appLandingRoute: function (app) {
      var sb = sidebar();
      if (!app || !has(sb, "app_landing_route")) return null;
      try { return sb.app_landing_route(app) || null; } catch (e) { return null; }
    },
  };
})();
