/* =============================================================================
   Solvronix Theme Studio — Runtime
   Applies resolved theme context, profile choices, layout flags, and safe
   administrator extensions throughout Frappe's single-page Desk lifecycle.
   ============================================================================= */
(function () {
  "use strict";

  /* Boot values provide a zero-request first paint; realtime refresh can replace
     these references later without reinstalling listeners. */
  var config = (window.frappe && frappe.boot && frappe.boot.st_theme_config) || {};
  var flags = (window.frappe && frappe.boot && frappe.boot.st_theme_flags) || {};
  var profiles = (window.frappe && frappe.boot && frappe.boot.st_theme_profiles) || [];
  var scheduleTimer = null;
  var appliedClassMappings = [];

  /* ── 1. ROUTE CONTEXT ─────────────────────────────────────────────────────
     Expose the current page/DocType/workspace as HTML attributes for scoped CSS. */
  function setRouteContext() {
    var route = [];
    try { route = frappe.get_route ? frappe.get_route() : []; } catch (e) {}
    if (!Array.isArray(route)) route = [];
    var html = document.documentElement;
    ["data-st-page", "data-st-doctype", "data-st-workspace"].forEach(function (name) {
      html.removeAttribute(name);
    });
    if (!route.length) return;
    var first = String(route[0] || "");
    if (first === "Form" || first === "List" || first === "Tree" || first === "Report") {
      if (route[1]) html.setAttribute("data-st-doctype", String(route[1]));
    } else if (first === "Workspaces" || first === "workspace") {
      if (route[1]) html.setAttribute("data-st-workspace", String(route[1]));
    } else {
      html.setAttribute("data-st-page", first);
      if (first === "home" && route[1]) html.setAttribute("data-st-workspace", String(route[1]));
    }
    applyClassMappings();
  }

  /* ── 2. ADMINISTRATOR CLASS MAPPINGS ──────────────────────────────────────
     Remove the previous mapping set before applying the newest resolved config. */
  function applyClassMappings() {
    appliedClassMappings.forEach(function (mapping) {
      try {
        document.querySelectorAll(mapping.selector).forEach(function (element) {
          element.classList.remove(mapping.class_name);
        });
      } catch (e) {}
    });
    appliedClassMappings = [];
    (config.class_mappings || []).forEach(function (mapping) {
      try {
        document.querySelectorAll(mapping.selector).forEach(function (element) {
          element.classList.add(mapping.class_name);
        });
        appliedClassMappings.push(mapping);
      } catch (e) {
        /* Invalid custom selectors fail soft. */
      }
    });
  }

  /* ── 3. LAYOUT PREFERENCES ────────────────────────────────────────────────
     Data attributes feed CSS variants; the sidebar needs a small behavior hook. */
  function applyLayoutPreferences() {
    document.documentElement.setAttribute(
      "data-st-density",
      String(config.density || "Comfortable").toLowerCase()
    );
    document.documentElement.setAttribute(
      "data-st-shortcuts",
      String(config.shortcut_style || "Soft").toLowerCase()
    );
    document.documentElement.setAttribute(
      "data-st-icons",
      String(config.module_icon_style || "Tinted").toLowerCase()
    );
    document.documentElement.setAttribute(
      "data-st-empty-state",
      String(config.empty_state_style || "Illustrated").toLowerCase()
    );

    var sidebar = document.querySelector(".body-sidebar-container");
    if (sidebar && sidebar.dataset.stThemeMode !== config.sidebar_mode) {
      sidebar.classList.toggle("expanded", config.sidebar_mode === "Expanded");
      sidebar.dataset.stThemeMode = config.sidebar_mode || "Compact";
    }
    if (sidebar && config.sidebar_auto_collapse && !sidebar.__stAutoCollapseHandler) {
      sidebar.__stAutoCollapseHandler = function () {
        sidebar.classList.remove("expanded");
      };
      sidebar.dataset.stAutoCollapse = "1";
      sidebar.addEventListener("mouseleave", sidebar.__stAutoCollapseHandler);
    } else if (sidebar && !config.sidebar_auto_collapse && sidebar.__stAutoCollapseHandler) {
      sidebar.removeEventListener("mouseleave", sidebar.__stAutoCollapseHandler);
      delete sidebar.__stAutoCollapseHandler;
      delete sidebar.dataset.stAutoCollapse;
    }
  }

  /* ── 4. OPTIONAL PER-USER PROFILE SELECTOR ────────────────────────────────
     Install once inside the shared Appearance panel when site policy allows it. */
  function installUserThemeSelector() {
    if (!flags.allow_user_theme || flags.locked || !profiles.length) return;
    var host = document.getElementById("st-op-appearance");
    if (!host || document.getElementById("st-user-theme-profile")) return;
    var row = document.createElement("div");
    row.className = "st-op-appearance-row st-theme-profile-row";
    row.innerHTML =
      '<span class="st-op-app-label">' + (frappe._ ? frappe._("Theme profile") : "Theme profile") + '</span>' +
      '<select id="st-user-theme-profile" class="form-control input-xs"></select>';
    var select = row.querySelector("select");
    select.innerHTML = '<option value="">' + (frappe._ ? frappe._("Site default") : "Site default") + "</option>" +
      profiles.map(function (profile) {
        return '<option value="' + frappe.utils.escape_html(profile.id) + '">' +
          frappe.utils.escape_html(profile.name) + "</option>";
      }).join("");
    select.value = (frappe.boot && frappe.boot.st_active_theme_profile) || "";
    select.addEventListener("change", function () {
      frappe.call({
        method: "solvronix_desk.theme_api.set_user_theme_profile",
        args: { profile_id: select.value },
        freeze: true,
        callback: function (response) {
          var runtime = response && response.message;
          applyRuntime(runtime);
          frappe.show_alert({ message: __("Theme profile applied"), indicator: "green" });
        }
      });
    });
    host.appendChild(row);
  }

  /* ── 5. TRUSTED CUSTOM JAVASCRIPT ─────────────────────────────────────────
     Executes once per page session and only when explicitly enabled by a manager. */
  function executeCustomJavaScript() {
    if (!config.enable_custom_js || !config.custom_js || window.__stCustomJsExecuted) return;
    window.__stCustomJsExecuted = true;
    try {
      /* System Manager-authored code. Deliberately opt-in and disabled by default. */
      new Function("frappe", "config", '"use strict";\n' + config.custom_js)(frappe, config);
    } catch (error) {
      if (window.console) console.error("Solvronix custom theme JavaScript failed", error);
    }
  }

  /* ── 6. ATOMIC RUNTIME REFRESH ────────────────────────────────────────────
     CSS, config, mode, mappings, selector, and schedule move as one state update. */
  function applyRuntime(runtime) {
    if (!runtime) return;
    if (Object.prototype.hasOwnProperty.call(runtime, "css")) {
      if (window.stApplyThemeCss) window.stApplyThemeCss(runtime.css || "");
    }
    config = runtime.config || config;
    flags = runtime.flags || flags;
    profiles = runtime.profiles || profiles;
    var preferredMode = String(runtime.preferred_mode || "").toLowerCase();
    if (runtime.preview && preferredMode && window.stApplyDark) {
      stApplyDark(
        preferredMode === "dark" ||
        (preferredMode === "auto" && window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    } else if (preferredMode && window.stSetThemeMode) {
      stSetThemeMode(preferredMode);
    }
    applyLayoutPreferences();
    applyClassMappings();
    installUserThemeSelector();
    if (!runtime.preview) executeCustomJavaScript();
    var selector = document.getElementById("st-user-theme-profile");
    if (selector && Object.prototype.hasOwnProperty.call(runtime, "active_profile")) {
      selector.value = runtime.active_profile || "";
    }
    if (Object.prototype.hasOwnProperty.call(runtime, "schedule")) {
      ensureScheduleTimer(runtime.schedule);
    }
  }

  /* Keep only one minute timer alive while schedule resolution is enabled. */
  function ensureScheduleTimer(schedule) {
    schedule = schedule || {};
    if (schedule.enabled && !scheduleTimer) {
      scheduleTimer = window.setInterval(refreshScheduledTheme, 60000);
    } else if (!schedule.enabled && scheduleTimer) {
      window.clearInterval(scheduleTimer);
      scheduleTimer = null;
    }
  }

  /* Server time and assignment rules remain authoritative for scheduled themes. */
  function refreshScheduledTheme() {
    frappe.call({
      method: "solvronix_desk.theme_api.get_resolved_theme_runtime",
      callback: function (response) {
        applyRuntime(response && response.message);
      }
    });
  }

  /* ── 7. BOOT / SPA OBSERVERS ──────────────────────────────────────────────
     Route and DOM observers reapply behavior when Frappe replaces page fragments. */
  function ready() {
    setRouteContext();
    window.addEventListener("st-theme-runtime-refresh", function (event) {
      applyRuntime(event.detail || {});
    });
    if (frappe.router && frappe.router.on) frappe.router.on("change", setRouteContext);
    var observer = new MutationObserver(function () {
      applyLayoutPreferences();
      applyClassMappings();
      installUserThemeSelector();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    if (config && Object.keys(config).length) {
      applyLayoutPreferences();
      applyClassMappings();
      installUserThemeSelector();
      executeCustomJavaScript();
      ensureScheduleTimer((frappe.boot && frappe.boot.st_theme_schedule) || {});
    } else {
      refreshScheduledTheme();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
}());
