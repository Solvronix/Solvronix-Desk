/**
 * Solvronix Theme — Desk JavaScript
 * Loaded on every Frappe/ERPNext desk page via app_include_js in hooks.py
 */

(function () {
  "use strict";

  var ST = (window.solvronix_theme = window.solvronix_theme || {});

  /* ── 1. Inject dynamic CSS from Theme Settings ─────────────────────────── */
  function injectDynamicTheme() {
    frappe.call({
      method: "solvronix_theme.api.get_theme_css",
      callback: function (r) {
        if (!r.message) return;
        var existing = document.getElementById("st-dynamic-theme");
        if (existing) existing.remove();
        var style = document.createElement("style");
        style.id = "st-dynamic-theme";
        style.textContent = r.message;
        document.head.appendChild(style);
      },
    });
  }

  /* ── 2. Logo, favicon, and title injection ─────────────────────────────── */
  function injectBranding() {
    frappe.call({
      method: "solvronix_theme.api.get_branding",
      callback: function (r) {
        if (!r.message) return;
        var b = r.message;

        if (b.logo) {
          var $img = $(".navbar-brand img, .app-logo");
          if ($img.length) {
            $img.attr("src", b.logo);
          } else {
            $(".navbar-brand").prepend(
              '<img src="' +
                b.logo +
                '" height="30" style="margin-right:6px;vertical-align:middle;" alt="logo">'
            );
          }
        }

        if (b.favicon) {
          var $fav = $('link[rel="shortcut icon"], link[rel="icon"]');
          if ($fav.length) {
            $fav.attr("href", b.favicon);
          } else {
            $("head").append('<link rel="shortcut icon" href="' + b.favicon + '">');
          }
        }

        if (b.company_name) {
          ST._company_name = b.company_name;
        }

        if (b.show_powered_by) {
          injectPoweredBy();
        }
      },
    });
  }

  /* ── 3. Update browser tab title on every AJAX navigation ─────────────── */
  function setupTitleUpdate() {
    if (typeof frappe.after_ajax !== "function") return;
    frappe.after_ajax(function () {
      if (!ST._company_name) return;
      if (!document.title.startsWith(ST._company_name)) {
        var parts = document.title.split(" — ");
        var pageTitle = parts[parts.length - 1];
        document.title = ST._company_name + " — " + pageTitle;
      }
    });
  }

  /* ── 4. Module Switcher ────────────────────────────────────────────────── */
  function injectModuleSwitcher() {
    if (!frappe.desk) return;
    var $sidebar = $(".desk-sidebar, .layout-side-section").first();
    if (!$sidebar.length || $sidebar.find("#st-module-switch-btn").length) return;

    var $btn = $(
      '<button id="st-module-switch-btn" title="Switch Module (Ctrl+M)">' +
        '<span style="margin-right:6px;font-size:14px;">&#9776;</span>' +
        "<span>Switch Module</span>" +
        '<span style="margin-left:auto;color:var(--st-primary);"> &#9662;</span>' +
        "</button>"
    );
    $btn.css({
      display: "flex",
      alignItems: "center",
    });

    $sidebar.prepend($btn);

    $btn.on("click", function (e) {
      e.stopPropagation();
      toggleModuleDropdown($btn);
    });

    $(document).on("keydown.st_module_switcher", function (e) {
      if (e.ctrlKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        toggleModuleDropdown($btn);
      }
    });

    $(document).on("keydown.st_escape", function (e) {
      if (e.key === "Escape") {
        $("#st-module-switcher-dropdown").remove();
      }
    });
  }

  function toggleModuleDropdown($anchor) {
    if ($("#st-module-switcher-dropdown").length) {
      $("#st-module-switcher-dropdown").remove();
      return;
    }

    frappe.call({
      method: "frappe.desk.desktop.get_workspace_sidebar_items",
      callback: function (r) {
        if (!r.message) return;
        var pages = (r.message.pages || r.message.workspaces || []);
        var $dropdown = $('<div id="st-module-switcher-dropdown"></div>');

        pages.forEach(function (p) {
          var route = p.route || encodeURIComponent((p.title || "").toLowerCase().replace(/\s+/g, "-"));
          var $item = $(
            '<a class="st-module-item" href="/app/' + route + '">' + (p.title || route) + "</a>"
          );
          $item.on("click", function () {
            $("#st-module-switcher-dropdown").remove();
          });
          $dropdown.append($item);
        });

        $anchor.after($dropdown);

        setTimeout(function () {
          $(document).one("click.st_dropdown_close", function () {
            $("#st-module-switcher-dropdown").remove();
          });
        }, 0);
      },
    });
  }

  /* ── 5. Quick Nav Bar ──────────────────────────────────────────────────── */
  function injectQuickNav() {
    var $sidebar = $(".desk-sidebar, .layout-side-section").first();
    if (!$sidebar.length || $sidebar.find("#st-quick-nav").length) return;

    var $nav = $(
      '<div id="st-quick-nav">' +
        '<a href="/app" title="Home">&#8962;</a>' +
        '<a href="/app/theme-settings" title="Theme Settings">&#9881;</a>' +
        '<a href="/app/notification-log" title="Notifications">&#128276;</a>' +
        "</div>"
    );

    $nav.find("a").on("click", function (e) {
      e.preventDefault();
      var route = $(this).attr("href").replace("/app/", "").replace("/app", "");
      if (route === "") {
        frappe.set_route("");
      } else {
        frappe.set_route(route);
      }
    });

    $sidebar.append($nav);
  }

  /* ── 6. Powered-by badge ───────────────────────────────────────────────── */
  function injectPoweredBy() {
    var $sidebar = $(".desk-sidebar, .layout-side-section").first();
    if (!$sidebar.length || $sidebar.find("#st-powered-by").length) return;
    $sidebar.append('<div id="st-powered-by">Powered by Solvronix</div>');
  }

  /* ── Boot sequence ─────────────────────────────────────────────────────── */
  frappe.provide("solvronix_theme");

  function onPageLoad() {
    injectDynamicTheme();
    injectModuleSwitcher();
    injectQuickNav();
  }

  $(document).ready(function () {
    injectDynamicTheme();
    injectBranding();
    setupTitleUpdate();
    injectModuleSwitcher();
    injectQuickNav();

    $(document).on("page-change", function () {
      onPageLoad();
    });
  });

  /* MutationObserver catches sidebar re-renders after SPA navigation */
  var _observer = new MutationObserver(function (mutations) {
    var needsReinject = mutations.some(function (m) {
      return m.addedNodes.length > 0;
    });
    if (needsReinject) {
      injectModuleSwitcher();
      injectQuickNav();
    }
  });

  function startObserver() {
    if (document.body) {
      _observer.observe(document.body, { childList: true, subtree: false });
    }
  }

  if (document.body) {
    startObserver();
  } else {
    document.addEventListener("DOMContentLoaded", startObserver);
  }
})();
