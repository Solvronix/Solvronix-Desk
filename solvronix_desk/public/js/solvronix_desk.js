/* =============================================================================
   Solvronix Desk — Desk JavaScript
   Infinitrix + CommitStreet SaaS design patterns
   Loaded on every Frappe desk page via app_include_js in hooks.py
   ============================================================================= */

/* ── INSTANT THEME APPLY (synchronous, before DOMContentLoaded) ──────────────
   Reads cached CSS from localStorage and injects it immediately so the page
   never shows Frappe's default blue colors, even on the very first render.
   The cache is populated/updated by injectDynamicTheme() after the API call.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  try {
    var cached = localStorage.getItem("st_theme_css");
    if (cached) {
      var s = document.createElement("style");
      s.id = "st-dynamic-theme";
      s.textContent = cached;
      document.head.appendChild(s);
    }
  } catch (e) {}
}());

(function () {
  "use strict";

  var ST = (window.solvronix_desk = window.solvronix_desk || {});
  var COLLAPSE_KEY = "st_sidebar_collapsed";

  /* ────────────────────────────────────────────────────────────────────────────
     1. DYNAMIC CSS FROM THEME SETTINGS
  ──────────────────────────────────────────────────────────────────────────── */
  function injectDynamicTheme() {
    frappe.call({
      method: "solvronix_desk.api.get_theme_css",
      callback: function (r) {
        if (!r.message) return;
        var css = r.message;
        /* Persist so the synchronous early-inject block (top of file) can
           apply it instantly on the next page load with zero flash. */
        try { localStorage.setItem("st_theme_css", css); } catch (e) {}
        /* Update in-place — never remove the element, which would cause a
           brief flash as the browser re-renders without the style tag. */
        var el = document.getElementById("st-dynamic-theme");
        if (el) {
          el.textContent = css;
        } else {
          var s = document.createElement("style");
          s.id = "st-dynamic-theme";
          s.textContent = css;
          document.head.appendChild(s);
        }
      },
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────
     2. BRANDING — logo / favicon / title
  ──────────────────────────────────────────────────────────────────────────── */
  function injectBranding() {
    /* Use boot data — zero API call, instant, no layout shift from async delay */
    var b = (frappe.boot && frappe.boot.st_branding) || {};
    ST._branding = b;

    if (b.logo) {
      var $img = $(".navbar-brand img, .app-logo");
      if ($img.length) {
        $img.attr("src", b.logo);
      } else {
        $(".navbar-brand").prepend(
          '<img src="' + b.logo + '" height="30" style="margin-right:6px;vertical-align:middle;" alt="logo">'
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
      setupTitleUpdate();
    }

    /* Try immediately — sidebar may already exist on SPA navigation */
    injectSidebarBrandingHeader();
  }

  /* ────────────────────────────────────────────────────────────────────────────
     2b. SIDEBAR COMPANY HEADER — replaces Frappe's .sidebar-header
  ──────────────────────────────────────────────────────────────────────────── */
  function injectSidebarBrandingHeader() {
    /* Already injected */
    if (document.getElementById("st-company-header")) return;

    var sidebar = document.querySelector(".body-sidebar");
    if (!sidebar) return;           /* sidebar not rendered yet — sidebarReady() will retry */

    var b = ST._branding;
    if (!b) return;                 /* branding not fetched yet — injectBranding() will retry */

    /* Nothing set → show nothing (blank space avoided by keeping header absent) */
    if (!b.logo && !b.company_name) return;

    var html = '<div id="st-company-header">';
    if (b.logo) {
      html += '<img src="' + b.logo + '" alt="' + (b.company_name || "Logo") + '">';
    }
    if (b.company_name) {
      html += '<span class="st-company-name">' +
              frappe.utils.escape_html(b.company_name) + '</span>';
    }
    html += '</div>';

    /* Prepend before .body-sidebar-top (the items list) */
    var top = sidebar.querySelector(".body-sidebar-top");
    if (top) {
      top.insertAdjacentHTML("beforebegin", html);
    } else {
      sidebar.insertAdjacentHTML("afterbegin", html);
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────
     3. BROWSER TAB TITLE
  ──────────────────────────────────────────────────────────────────────────── */
  function setupTitleUpdate() {
    if (typeof frappe.after_ajax !== "function") return;
    frappe.after_ajax(function () {
      if (!ST._company_name) return;
      var parts = document.title.split(" — ");
      var pageTitle = parts[parts.length - 1];
      document.title = ST._company_name + " — " + pageTitle;
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────
     4. SIDEBAR COLLAPSE TOGGLE (Infinitrix)
  ──────────────────────────────────────────────────────────────────────────── */
  function injectSidebarCollapseToggle() {
    /* Frappe v16 handles sidebar collapse natively — no custom toggle needed */
    return;

    /* Inject header row */
    var $hdr = $('<div id="st-sidebar-header">' +
      '<span class="st-app-brand">Menu</span>' +
      '<button id="st-sidebar-collapse" title="Toggle sidebar">&#9776;</button>' +
      '</div>');

    $hdr.find("#st-sidebar-collapse").on("click", function () {
      var isNowCollapsed = document.body.classList.toggle("st-sidebar-collapsed");
      localStorage.setItem(COLLAPSE_KEY, isNowCollapsed ? "1" : "0");
      $(this).html(isNowCollapsed ? "&#9658;" : "&#9776;");
      $(this).attr("title", isNowCollapsed ? "Expand sidebar" : "Collapse sidebar");
    });

    $sidebar.prepend($hdr);

    /* Restore persisted state */
    if (localStorage.getItem(COLLAPSE_KEY) === "1") {
      document.body.classList.add("st-sidebar-collapsed");
      $sidebar.find("#st-sidebar-collapse").html("&#9658;").attr("title", "Expand sidebar");
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────
     5. MODULE SWITCHER — search + keyboard nav (Infinitrix)
  ──────────────────────────────────────────────────────────────────────────── */
  function injectModuleSwitcher() {
    if (!frappe.desk) return;
    var $sidebar = $(".body-sidebar").first();
    if (!$sidebar.length || $sidebar.find("#st-module-switch-btn").length) return;

    frappe.call({
      method: "frappe.desk.desktop.get_workspace_sidebar_items",
      callback: function (r) {
        if (!r.message) return;
        var pages = (r.message.pages || []).concat(r.message.private_pages || []);
        buildModuleSwitcher($sidebar, pages);
      },
    });
  }

  function buildModuleSwitcher($sidebar, pages) {
    if ($sidebar.find("#st-module-switch-btn").length) return;

    /* Group by category */
    var categories = {};
    pages.forEach(function (p) {
      var cat = p.category || "General";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(p);
    });

    /* Button */
    var $btn = $(
      '<button id="st-module-switch-btn" title="Switch Workspace (Ctrl+M)">' +
        '<span style="font-size:13px;margin-right:6px;">&#9783;</span>' +
        "<span>Workspaces</span>" +
        '<span class="st-chevron">&#9660;</span>' +
      "</button>"
    );

    /* Dropdown (appended to body to escape overflow:hidden) */
    var $dropdown = $('<div id="st-module-switcher-dropdown" style="display:none;position:fixed;z-index:1050;"></div>');
    var $search = $('<input id="st-module-search" type="text" placeholder="Search workspaces…">');
    $dropdown.append($search);

    var currentItems = [];
    var focusIdx = -1;

    function slugify(s) {
      return encodeURIComponent((s || "").toLowerCase().replace(/\s+/g, "-"));
    }

    function rebuildItems(filter) {
      $dropdown.find(".st-module-category, .st-module-item").remove();
      currentItems = [];
      var lf = (filter || "").toLowerCase();

      Object.keys(categories).sort().forEach(function (cat) {
        var catItems = categories[cat].filter(function (p) {
          return !lf || (p.title || "").toLowerCase().indexOf(lf) !== -1;
        });
        if (!catItems.length) return;

        $dropdown.append('<div class="st-module-category">' + cat + "</div>");

        catItems.forEach(function (p) {
          var route = p.route || slugify(p.title);
          var $item = $(
            '<a class="st-module-item" href="/desk/' + route + '">' +
              '<span class="st-module-dot"></span>' +
              "<span>" + (p.title || route) + "</span>" +
            "</a>"
          );
          $item.on("click", function () { closeDropdown(); });
          $dropdown.append($item);
          currentItems.push($item[0]);
        });
      });
    }

    rebuildItems("");

    $search.on("input", function () {
      rebuildItems($(this).val());
      focusIdx = -1;
    });

    $search.on("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusIdx = Math.min(focusIdx + 1, currentItems.length - 1);
        updateFocus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusIdx = Math.max(focusIdx - 1, -1);
        updateFocus();
      } else if (e.key === "Enter" && focusIdx >= 0) {
        currentItems[focusIdx].click();
      } else if (e.key === "Escape") {
        closeDropdown();
      }
    });

    function updateFocus() {
      $(currentItems).each(function (i, el) {
        $(el).toggleClass("st-focused", i === focusIdx);
        if (i === focusIdx) el.scrollIntoView({ block: "nearest" });
      });
    }

    function openDropdown() {
      var rect = $btn[0].getBoundingClientRect();
      $dropdown.css({
        display: "block",
        top: rect.bottom + "px",
        left: rect.left + "px",
        width: Math.max(rect.width, 220) + "px",
      });
      $btn.addClass("open");
      setTimeout(function () { $search.focus(); }, 50);
    }

    function closeDropdown() {
      $dropdown.hide();
      $btn.removeClass("open");
      $search.val("");
      rebuildItems("");
      focusIdx = -1;
    }

    $btn.on("click", function (e) {
      e.stopPropagation();
      if ($dropdown.is(":visible")) closeDropdown();
      else openDropdown();
    });

    $(document).on("click.st_module_close", function (e) {
      if (!$dropdown[0].contains(e.target) && e.target !== $btn[0]) closeDropdown();
    });

    $(document).on("keydown.st_module_switcher", function (e) {
      if (e.ctrlKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        if ($dropdown.is(":visible")) closeDropdown();
        else openDropdown();
      }
    });

    /* Place button after sidebar header */
    var $hdr = $sidebar.find("#st-sidebar-header");
    if ($hdr.length) {
      $hdr.after($btn);
    } else {
      $sidebar.prepend($btn);
    }
    $("body").append($dropdown);
  }


  /* ────────────────────────────────────────────────────────────────────────────
     6. BREADCRUMB BUILDER (CommitStreet)
  ──────────────────────────────────────────────────────────────────────────── */
  /* buildBreadcrumb removed — Frappe renders its own native breadcrumb */

  /* ────────────────────────────────────────────────────────────────────────────
     7. QUICK NAV BAR
  ──────────────────────────────────────────────────────────────────────────── */
  function injectQuickNav() {
    var $sidebar = $(".body-sidebar").first();
    if (!$sidebar.length || $sidebar.find("#st-quick-nav").length) return;

    var $nav = $(
      '<div id="st-quick-nav">' +
        '<a href="/app" title="Home">&#8962;</a>' +
        '<a href="/desk/todo" title="To-Do">&#9998;</a>' +
        '<a href="/desk/activity" title="Activity">&#128338;</a>' +
        '<a href="/desk/notification-log" title="Notifications">&#128276;</a>' +
      "</div>"
    );

    $nav.find("a").on("click", function (e) {
      e.preventDefault();
      var path = $(this).attr("href").replace("/desk/", "").replace("/desk", "").replace("/app/", "").replace("/app", "");
      frappe.set_route(path || "");
    });

    $sidebar.append($nav);
  }

  /* ────────────────────────────────────────────────────────────────────────────
     8. POWERED-BY BADGE
  ──────────────────────────────────────────────────────────────────────────── */
  function injectPoweredBy() {
    var $sidebar = $(".body-sidebar").first();
    if (!$sidebar.length || $sidebar.find("#st-powered-by").length) return;
    $sidebar.append('<div id="st-powered-by">Powered by <strong>Solvronix</strong></div>');
  }

  /* ────────────────────────────────────────────────────────────────────────────
     9a. SETUP GUIDE BANNER (first-run, System Manager only)
  ──────────────────────────────────────────────────────────────────────────── */
  function injectSetupGuide() {
    /* Only System Manager */
    if (!frappe.user_roles || !frappe.user_roles.includes("System Manager")) return;
    if (document.getElementById("st-setup-guide")) return;

    var b = frappe.boot || {};
    var branding = b.st_branding || {};
    var brand    = (b.st_brand || "").toLowerCase().replace(/\s/g, "");

    /* Storage key is tied to the install: changes after every reinstall
       so a fresh install always shows the guide regardless of prior dismissal */
    var installKey = b.st_install_key || "v1";
    var storageKey = "st_setup_" + installKey;

    if (localStorage.getItem(storageKey) === "done") return;

    var step1done = !!branding.company_name;
    var step2done = !!brand && brand !== "#1b3f7e";
    var step3done = !!branding.logo;

    /* Auto-dismiss once everything is configured */
    if (step1done && step2done && step3done) {
      localStorage.setItem(storageKey, "done");
      return;
    }

    function stepHtml(done, label) {
      var icon = done
        ? '<span class="st-sg-icon" style="color:#16a34a;font-size:14px">&#10003;</span>'
        : '<span class="st-sg-icon" style="color:#6B7280;font-size:14px">&#9675;</span>';
      return '<div class="st-sg-step' + (done ? " done" : "") + '">' + icon + label + "</div>";
    }

    var html =
      '<div id="st-setup-guide">' +
        '<button class="st-sg-dismiss" title="Dismiss">&times;</button>' +
        '<div class="st-sg-title">&#9881; Solvronix Desk Setup</div>' +
        stepHtml(step1done, "Set your company name") +
        stepHtml(step2done, "Choose a brand color") +
        stepHtml(step3done, "Upload your logo") +
        '<div class="st-sg-actions">' +
          '<a href="/desk/theme-settings" class="st-sg-open-btn">Open Theme Settings &rarr;</a>' +
        "</div>" +
      "</div>";

    var target = document.querySelector(".layout-main-section-wrapper") ||
                 document.querySelector(".layout-main");
    if (!target) return;
    target.insertAdjacentHTML("afterbegin", html);

    document.getElementById("st-setup-guide")
      .querySelector(".st-sg-dismiss")
      .addEventListener("click", function () {
        localStorage.setItem(storageKey, "done");
        var el = document.getElementById("st-setup-guide");
        if (el) el.remove();
      });
  }

  /* ────────────────────────────────────────────────────────────────────────────
     9. TOP TOOLBAR — language switcher + all-options panel
  ──────────────────────────────────────────────────────────────────────────── */
  function injectTopToolbar() {
    if (document.getElementById("st-top-toolbar")) return;

    /* ── Build toolbar ── */
    var $tb = $('<div id="st-top-toolbar"></div>');

    /* Left: clock + Today's View (user moved to right avatar button) */
    var $left = $(
      '<div class="st-tb-left">' +
        '<span id="st-tb-clock"></span>' +
        '<span class="st-tb-sep"></span>' +
        '<a id="st-sh-link" href="/desk/smart-home" title="Today\'s View">&#9732; Today\'s View</a>' +
      "</div>"
    );

    /* Clock ticker */
    function tickClock() {
      var now = new Date();
      var h = now.getHours().toString().padStart(2, "0");
      var m = now.getMinutes().toString().padStart(2, "0");
      var s = now.getSeconds().toString().padStart(2, "0");
      var el = document.getElementById("st-tb-clock");
      if (el) el.textContent = h + ":" + m + ":" + s;
    }
    tickClock();
    setInterval(tickClock, 1000);

    /* Right: lang switcher + options button */
    var $right = $('<div class="st-tb-right"></div>');

    /* Language button */
    var currentLang = (frappe.boot && frappe.boot.lang) ? frappe.boot.lang : "en";
    var currentLabel = currentLang.toUpperCase();
    var $langWrap = $('<div id="st-lang-wrapper"></div>');
    var $langBtn = $(
      '<button id="st-lang-btn" title="Change language">' +
        '<span class="st-lang-globe">&#127760;</span>' +
        '<span id="st-lang-label">' + currentLabel + "</span>" +
        '<span class="st-lang-chevron">&#9660;</span>' +
      "</button>"
    );

    /* Language dropdown */
    var $langDrop = $('<div id="st-lang-dropdown"></div>');
    var $langSearch = $('<input id="st-lang-search" type="text" placeholder="Search language…">');
    $langDrop.append($langSearch);
    $("body").append($langDrop);

    var _allLangs = [];

    function renderLangItems(filter) {
      $langDrop.find(".st-lang-item").remove();
      var lf = (filter || "").toLowerCase();
      var shown = _allLangs.filter(function (l) {
        return !lf || (l.label || "").toLowerCase().indexOf(lf) !== -1
                   || (l.code || "").toLowerCase().indexOf(lf) !== -1;
      });
      shown.forEach(function (l) {
        var isActive = l.code === currentLang;
        var $item = $(
          '<button class="st-lang-item' + (isActive ? " st-active" : "") + '" data-code="' + l.code + '">' +
            '<span class="st-lang-flag">' + (l.flag || "&#127760;") + '</span>' +
            '<span>' + (l.label || l.code) + '</span>' +
            (isActive ? '<span class="st-lang-check">&#10003;</span>' : '') +
          "</button>"
        );
        $item.on("click", function () {
          var code = $(this).data("code");
          switchLanguage(code);
        });
        $langDrop.append($item);
      });
      if (!shown.length) {
        $langDrop.append('<div style="padding:16px;text-align:center;color:#aaa;font-size:12px;">No languages found</div>');
      }
    }

    function openLangDrop() {
      var rect = $langBtn[0].getBoundingClientRect();
      $langDrop.css({
        display: "block",
        top: (rect.bottom + 4) + "px",
        left: rect.left + "px",
      });
      $langBtn.addClass("open");
      setTimeout(function () { $langSearch.focus(); }, 40);

      /* Load languages if not cached */
      if (!_allLangs.length) {
        frappe.call({
          method: "solvronix_desk.api.get_available_languages",
          callback: function (r) {
            _allLangs = r.message || [];
            /* Also build from frappe.boot.lang_dict as fallback */
            if (!_allLangs.length && frappe.boot && frappe.boot.lang_dict) {
              Object.keys(frappe.boot.lang_dict).forEach(function (name) {
                _allLangs.push({ code: frappe.boot.lang_dict[name], label: name, flag: "" });
              });
            }
            _allLangs.sort(function (a, b) { return (a.label || "").localeCompare(b.label || ""); });
            renderLangItems("");
          },
        });
      } else {
        renderLangItems("");
      }
    }

    function closeLangDrop() {
      $langDrop.hide();
      $langBtn.removeClass("open");
      $langSearch.val("");
    }

    $langSearch.on("input", function () { renderLangItems($(this).val()); });
    $langSearch.on("keydown", function (e) {
      if (e.key === "Escape") closeLangDrop();
    });
    $langBtn.on("click", function (e) {
      e.stopPropagation();
      if ($langDrop.is(":visible")) closeLangDrop();
      else openLangDrop();
    });
    $(document).on("click.st_lang_close", function (e) {
      if (!$langDrop[0].contains(e.target) && e.target !== $langBtn[0]) closeLangDrop();
    });

    /* Search bar — opens the command palette */
    var $searchBar = $(
      '<button id="st-tb-search" title="Search (Ctrl+K)">' +
        '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M8.5 8.5L11 11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' +
        '<span class="st-tb-search-text">Search...</span>' +
        '<span class="st-tb-search-kbd">Ctrl K</span>' +
      '</button>'
    );
    $searchBar.on("click", function () {
      var cp = window.solvronix_desk && window.solvronix_desk.cp;
      if (cp && cp.open) { cp.open(); }
      else { document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })); }
    });
    $right.append($searchBar);
    $right.append('<span class="st-tb-sep"></span>');

    /* Dark/Light toggle — icon filled in by dark_mode.js stUpdateToggleIcon() */
    var $darkToggle = $('<button id="st-dark-toggle" class="st-tb-btn st-tb-qn-btn" title="Toggle dark/light mode"></button>');
    $darkToggle.on("click", function () {
      if (window.stToggleDark) window.stToggleDark();
    });
    $right.append($darkToggle);

    /* Quick-nav shortcut buttons: Home + To-Do */
    var $qnav = $('<div id="st-tb-quicknav"></div>');
    [
      { icon: "&#8962;", title: "Home",  route: "smart-home" },
      { icon: "&#9998;", title: "To-Do", route: "todo" },
    ].forEach(function (item) {
      var $btn = $('<button class="st-tb-qn-btn" title="' + item.title + '">' + item.icon + "</button>");
      $btn.on("click", function () { frappe.set_route(item.route); });
      $qnav.append($btn);
    });
    $right.append($qnav);
    /* Bell placeholder — Frappe's native .desktop-notifications is moved here by moveNativeBell() */
    $right.append('<span id="st-tb-bell-anchor"></span>');
    $right.append('<span class="st-tb-sep"></span>');

    $langWrap.append($langBtn);
    $right.append($langWrap);
    $right.append('<span class="st-tb-sep"></span>');

    /* All Options button */
    var $opBtn = $(
      '<button id="st-options-btn">' +
        '<span class="st-options-icon">&#9776;</span>' +
        "All Options" +
      "</button>"
    );
    $opBtn.on("click", openOptionsPanel);
    $right.append($opBtn);

    /* User avatar button — replaces the sidebar bottom user section */
    var fullName  = (frappe.session && frappe.session.user_fullname) || "User";
    var userEmail = (frappe.session && frappe.session.user) || "";
    var initials  = fullName.split(" ").slice(0, 2)
                      .map(function (w) { return w.charAt(0); })
                      .join("").toUpperCase() || "?";

    /* Check for a profile picture in frappe.boot.user_info */
    var userInfo  = frappe.boot && frappe.boot.user_info && frappe.boot.user_info[userEmail];
    var userImage = userInfo && userInfo.image;
    var avatarInner = userImage
      ? '<img src="' + userImage + '" alt="' + frappe.utils.escape_html(fullName) + '">'
      : initials;
    var avatarLargeInner = userImage
      ? '<img src="' + userImage + '" alt="' + frappe.utils.escape_html(fullName) + '">'
      : initials;

    var $userBtn = $(
      '<button id="st-user-btn" title="Account">' +
        '<span class="st-user-av' + (userImage ? ' st-user-av-img' : '') + '">' + avatarInner + '</span>' +
        '<svg class="st-user-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">' +
          '<path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
      '</button>'
    );

    /* Build dropdown */
    var $userDrop = $(
      '<div id="st-user-dropdown">' +
        '<div class="st-ud-header">' +
          '<div class="st-ud-av' + (userImage ? ' st-user-av-img' : '') + '">' + avatarLargeInner + '</div>' +
          '<div class="st-ud-info">' +
            '<span class="st-ud-name">' + frappe.utils.escape_html(fullName) + '</span>' +
            '<span class="st-ud-email">' + frappe.utils.escape_html(userEmail) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="st-ud-divider"></div>' +
        '<div id="st-ud-apps"></div>' +
        '<button class="st-ud-item" data-action="edit-profile">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.5 2.5L11.5 4.5M2 12H4L11 5L9 3L2 10V12Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          'Edit Profile' +
        '</button>' +
        '<button class="st-ud-item" data-action="toggle-theme">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 1v1M7 12v1M1 7H2M12 7h1M2.9 2.9l.7.7M10.4 10.4l.7.7M2.9 11.1l.7-.7M10.4 3.6l.7-.7M9.5 7a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' +
          'Toggle Theme' +
        '</button>' +
        '<button class="st-ud-item" data-action="reset-layout">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 7a5 5 0 1 1 1.1 3.1M2 11V7.5H5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          'Reset Desktop Layout' +
        '</button>' +
        '<div class="st-ud-divider"></div>' +
        '<button class="st-ud-item st-ud-logout" data-action="logout">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2M9 10l3-3-3-3M12 7H5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          'Logout' +
        '</button>' +
      '</div>'
    );
    $("body").append($userDrop);

    /* ── Populate installed apps grid ── */
    (function () {
      var versions = (frappe.boot && frappe.boot.versions) || {};
      var APP_META = {
        frappe:          { title: "Frappe",        color: "#0089ff" },
        erpnext:         { title: "ERPNext",        color: "#2490EF" },
        hrms:            { title: "HRMS",           color: "#f68b00" },
        crm:             { title: "CRM",            color: "#00a36c" },
        education:       { title: "Education",      color: "#8e44ad" },
        healthcare:      { title: "Healthcare",     color: "#27ae60" },
        drive:           { title: "Drive",          color: "#ff6b35" },
        insights:        { title: "Insights",       color: "#7c3aed" },
        payments:        { title: "Payments",       color: "#0ea5e9" },
        edvronix:        { title: "Edvronix",       color: "#e8610a" },
        gymronix:        { title: "Gymronix",       color: "#e84310" },
        solvronix_desk:  { title: "Solvronix Desk", color: "#e8610a" },
        school_fee_override: { title: "Fee Override", color: "#0891b2" },
      };

      var appNames = Object.keys(versions);
      if (!appNames.length) return;

      var html = '<div class="st-ud-section-label">Installed Apps</div>' +
                 '<div class="st-ud-apps-grid">';
      appNames.forEach(function (name) {
        var meta = APP_META[name] || {};
        var title = meta.title || name.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        var color = meta.color || "#6b7280";
        var letter = title.charAt(0).toUpperCase();
        var ver = versions[name] || "";
        html += '<div class="st-ud-app-tile" title="' + title + ' v' + ver + '">' +
                  '<span class="st-ud-app-icon" style="background:' + color + '">' + letter + '</span>' +
                  '<span class="st-ud-app-name">' + title + '</span>' +
                  '<span class="st-ud-app-ver">' + ver + '</span>' +
                '</div>';
      });
      html += '</div><div class="st-ud-divider"></div>';

      document.getElementById("st-ud-apps").innerHTML = html;
    }());

    function openUserDrop() {
      var rect = $userBtn[0].getBoundingClientRect();
      $userDrop.css({
        top: (rect.bottom + 8) + "px",
        right: (window.innerWidth - rect.right) + "px",
      }).addClass("open");
      $userBtn.addClass("active");
    }
    function closeUserDrop() {
      $userDrop.removeClass("open");
      $userBtn.removeClass("active");
    }

    $userBtn.on("click", function (e) {
      e.stopPropagation();
      if ($userDrop.hasClass("open")) { closeUserDrop(); }
      else { openUserDrop(); }
    });
    $(document).on("click.st_user_drop", function (e) {
      if (!$userDrop[0].contains(e.target) && !$userBtn[0].contains(e.target)) {
        closeUserDrop();
      }
    });

    $userDrop.on("click", "[data-action]", function () {
      var action = $(this).data("action");
      closeUserDrop();
      if (action === "edit-profile") {
        frappe.set_route("Form", "User", frappe.session.user);
      } else if (action === "toggle-theme") {
        if (window.stSetDark) {
          var isDark = document.documentElement.getAttribute("data-theme") === "dark";
          window.stSetDark(!isDark);
        } else if (frappe.ui && frappe.ui.ThemeSwitcher) {
          new frappe.ui.ThemeSwitcher().show();
        }
      } else if (action === "reset-layout") {
        frappe.confirm(frappe._("Reset your desktop layout to default?"), function () {
          frappe.call({
            method: "solvronix_desk.api.reset_workspace_for_user",
            callback: function () { window.location.reload(); },
          });
        });
      } else if (action === "logout") {
        frappe.app.logout();
      }
    });

    $right.append('<span class="st-tb-sep"></span>');
    $right.append($userBtn);

    $tb.append($left).append($right);
    $("body").prepend($tb);
    $("body").addClass("st-has-toolbar");

    /* ── Build options panel ── */
    buildOptionsPanel();
  }

  /* ── Move Frappe's native notification bell into our toolbar ── */
  function moveNativeBell() {
    var $anchor = $("#st-tb-bell-anchor");
    if (!$anchor.length) return;

    var $bell = $(".desktop-notifications").first();
    if (!$bell.length) return;

    /* Already moved — nothing to do */
    if ($bell.closest("#st-top-toolbar").length) return;

    $bell.insertAfter($anchor);
  }

  /* ── Language switch ── */
  function switchLanguage(code) {
    frappe.call({
      method: "solvronix_desk.api.set_user_language",
      args: { lang_code: code },
      callback: function () {
        frappe.show_alert({ message: frappe._("Language updated. Reloading…"), indicator: "green" });
        setTimeout(function () { window.location.reload(); }, 900);
      },
      error: function () {
        frappe.show_alert({ message: frappe._("Could not update language."), indicator: "red" });
      },
    });
  }

  /* ── All-Options slide panel ── */
  function buildOptionsPanel() {
    if (document.getElementById("st-options-panel")) return;

    var $overlay = $('<div id="st-options-overlay"></div>');
    var $panel = $('<div id="st-options-panel"></div>');

    var $head = $(
      '<div id="st-options-panel-head">' +
        '<h3>&#9783; All Options</h3>' +
        '<button id="st-options-panel-close" title="Close">&#10005;</button>' +
      "</div>"
    );
    var $searchWrap = $(
      '<div id="st-options-search-wrap">' +
        '<input id="st-options-search" type="text" placeholder="&#128269; Search workspaces &amp; options…">' +
      "</div>"
    );
    var $body = $('<div id="st-options-body"><p class="st-op-empty">Loading…</p></div>');

    $panel.append($head).append($searchWrap).append($body);
    $("body").append($overlay).append($panel);

    /* Close handlers */
    $("#st-options-panel-close, #st-options-overlay").on("click", closeOptionsPanel);
    $(document).on("keydown.st_options", function (e) {
      if (e.key === "Escape") closeOptionsPanel();
    });

    /* Search filter */
    $searchWrap.find("#st-options-search").on("input", function () {
      filterOptionsPanel($(this).val());
    });

    /* Load workspace data */
    frappe.call({
      method: "frappe.desk.desktop.get_workspace_sidebar_items",
      callback: function (r) {
        if (!r.message) return;
        var pages = (r.message.pages || []).concat(r.message.private_pages || []);
        renderOptionsPanel(pages);
      },
    });
  }

  var _optionsSections = [];

  function renderOptionsPanel(pages) {
    var $body = $("#st-options-body");
    $body.empty();
    _optionsSections = [];

    if (!pages || !pages.length) {
      $body.html('<p class="st-op-empty">No workspaces found.</p>');
      return;
    }

    /* Group pages by category (parent_page or module) */
    var groups = {};
    pages.forEach(function (p) {
      var grp = p.parent_page || p.module || p.app || "General";
      if (!groups[grp]) groups[grp] = [];
      groups[grp].push(p);
    });

    /* Also collect top-level pages (no parent) as their own group */
    var roots = pages.filter(function (p) { return !p.parent_page; });
    if (roots.length && !groups["Workspaces"]) {
      groups = {};
      groups["All Workspaces"] = roots;
      pages.forEach(function (p) {
        if (p.parent_page) {
          if (!groups[p.parent_page]) groups[p.parent_page] = [];
          groups[p.parent_page].push(p);
        }
      });
    }

    Object.keys(groups).sort().forEach(function (grpName) {
      var items = groups[grpName];
      if (!items.length) return;

      var sectionId = "st-op-sec-" + grpName.replace(/\s+/g, "-").toLowerCase();
      var $sec = $('<div class="st-op-section" data-section="' + grpName + '"></div>');
      var $sh = $(
        '<div class="st-op-section-head">' +
          '<span>' + grpName + '</span>' +
          '<span class="st-op-toggle">&#9660;</span>' +
        "</div>"
      );
      var $items = $('<div class="st-op-items" id="' + sectionId + '"></div>');

      items.forEach(function (p) {
        var slug = p.route || frappe.router.slug(p.title || p.name);
        var $a = $(
          '<a class="st-op-item" href="/desk/' + slug + '" data-title="' + (p.title || p.name) + '">' +
            '<span class="st-op-dot"></span>' +
            (p.title || p.name) +
          "</a>"
        );
        $a.on("click", function (e) {
          e.preventDefault();
          closeOptionsPanel();
          frappe.set_route(slug);
        });
        $items.append($a);
      });

      $sh.on("click", function () {
        $sh.toggleClass("collapsed");
        $items.toggleClass("hidden");
      });

      $sec.append($sh).append($items);
      $body.append($sec);
      _optionsSections.push({ name: grpName, $sec: $sec, $items: $items });
    });
  }

  function filterOptionsPanel(query) {
    var q = (query || "").toLowerCase();
    if (!q) {
      /* Show all */
      $(".st-op-section").show();
      $(".st-op-item").show();
      $(".st-op-section-head").removeClass("collapsed");
      $(".st-op-items").removeClass("hidden");
      return;
    }
    $(".st-op-section").each(function () {
      var $sec = $(this);
      var $items = $sec.find(".st-op-item");
      var anyVisible = false;
      $items.each(function () {
        var title = ($(this).data("title") || "").toLowerCase();
        var match = title.indexOf(q) !== -1;
        $(this).toggle(match);
        if (match) anyVisible = true;
      });
      $sec.toggle(anyVisible);
      if (anyVisible) {
        $sec.find(".st-op-section-head").removeClass("collapsed");
        $sec.find(".st-op-items").removeClass("hidden");
      }
    });
  }

  function openOptionsPanel() {
    $("#st-options-overlay").addClass("open");
    setTimeout(function () {
      $("#st-options-panel").addClass("open");
      $("#st-options-search").focus();
    }, 10);
  }

  function closeOptionsPanel() {
    $("#st-options-panel").removeClass("open");
    $("#st-options-overlay").removeClass("open");
    $("#st-options-search").val("");
    filterOptionsPanel("");
  }

  /* ────────────────────────────────────────────────────────────────────────────
     NATIVE SIDEBAR PATCHES
     - Hide Frappe's "Notification" item (theme provides bottom icons instead)
     - Redirect "Search" item click → theme command palette
  ──────────────────────────────────────────────────────────────────────────── */
  function patchNativeSidebar() {
    $(".body-sidebar .standard-sidebar-item").each(function () {
      var label = $(this).find(".sidebar-item-label").text().trim().toLowerCase();
      if (label === "notification" || label === "notifications" || label === "search") {
        $(this).addClass("st-native-hidden");
      }
    });
  }

  /* Capture-phase interceptor — fires before Frappe's bubbling click on Search item */
  document.addEventListener("click", function (e) {
    var anchor = e.target.closest(".body-sidebar .item-anchor, .body-sidebar .sidebar-item");
    if (!anchor) return;
    var labelEl = anchor.querySelector(".sidebar-item-label");
    if (!labelEl) return;
    if (labelEl.textContent.trim().toLowerCase() === "search") {
      e.preventDefault();
      e.stopImmediatePropagation();
      var cp = window.solvronix_desk && window.solvronix_desk.cp;
      if (cp) { cp.open(); }
    }
  }, true);

  /* ────────────────────────────────────────────────────────────────────────────
     BOOT SEQUENCE
  ──────────────────────────────────────────────────────────────────────────── */
  frappe.provide("solvronix_desk");

  function sidebarReady(cb) {
    var start = Date.now();
    function check() {
      var $s = $(".body-sidebar").first();
      if ($s.length) {
        cb($s);
      } else if (Date.now() - start < 10000) {
        requestAnimationFrame(check);
      }
    }
    requestAnimationFrame(check);
  }

  function onDeskReady() {
    injectDynamicTheme();
    injectBranding();
    setupTitleUpdate();
    injectTopToolbar();

    sidebarReady(function () {
      injectSidebarCollapseToggle();
      injectSidebarBrandingHeader();   /* retry — branding may already be cached */
      patchNativeSidebar();
      injectPoweredBy();
    });

    injectSetupGuide();

    /* Move Frappe's native notification bell into toolbar after desktop page renders */
    setTimeout(moveNativeBell, 800);
    $(document).on("page-change", function () {
      patchNativeSidebar();
      injectPoweredBy();
      injectSetupGuide();
      setTimeout(moveNativeBell, 400);
    });

    /* One-time redirect: if the page loaded at a bare /desk URL (empty route),
       send the user to Today's View. This does NOT listen on every navigation —
       so sidebar items, workspace links, Desktop page, etc. are never intercepted.
       Frappe's boot.home_page = "smart-home" already handles the normal first-load
       redirect; this is only a safety net for edge cases (direct URL visits). */
    (function () {
      var route = (frappe.get_route && frappe.get_route()) || [];
      var isEmptyOrWorkspace = route.length === 0 ||
        (route.length === 1 && (route[0] === "" || route[0] === "workspace"));
      if (isEmptyOrWorkspace) {
        frappe.set_route("smart-home");
      }
    }());
  }

  $(document).ready(onDeskReady);

  /* ────────────────────────────────────────────────────────────────────────────
     LIVE THEME UPDATE
     events.py publishes "st_theme_changed" via frappe.publish_realtime after
     Theme Settings is saved. All connected desk users receive it instantly.
  ──────────────────────────────────────────────────────────────────────────── */
  $(document).ready(function () {
    frappe.realtime.on("st_theme_changed", function (data) {
      /* 1. Apply new CSS variables immediately — update in-place, no flash */
      var css = data && data.css;
      if (css) {
        var dynEl = document.getElementById("st-dynamic-theme");
        var inlineEl = document.getElementById("st-inline-theme");
        if (dynEl)         { dynEl.textContent = css; }
        else if (inlineEl) { inlineEl.textContent = css; }
        else {
          var s = document.createElement("style");
          s.id = "st-dynamic-theme";
          s.textContent = css;
          document.head.appendChild(s);
        }
        try { localStorage.setItem("st_theme_css", css); } catch (e) {}
      }

      /* 2. Refresh branding header if company/logo changed */
      var branding = data && data.branding;
      if (branding) {
        ST._branding = branding;
        if (branding.favicon) {
          $('link[rel="shortcut icon"], link[rel="icon"]').attr("href", branding.favicon);
        }
        var old = document.getElementById("st-company-header");
        if (old) old.parentNode.removeChild(old);
        injectSidebarBrandingHeader();
      }

      /* 3. Subtle confirmation */
      frappe.show_alert({ message: frappe._("Theme updated"), indicator: "green" }, 2);
    });
  });

  /* ── THEME SETTINGS FORM: LIVE APPLY ON SAVE ────────────────────────────────
     frappe.realtime can miss the event if the socket reconnects right as the
     user saves. This form hook fires synchronously on the same page — guaranteed.
  ──────────────────────────────────────────────────────────────────────────── */
  frappe.ui.form.on("Theme Settings", {
    after_save: function (frm) {
      /* Re-fetch the new CSS variables and inject them immediately */
      frappe.call({
        method: "solvronix_desk.api.get_theme_css",
        callback: function (r) {
          var css = r && r.message;
          if (!css) return;
          var dynEl    = document.getElementById("st-dynamic-theme");
          var inlineEl = document.getElementById("st-inline-theme");
          if (dynEl)         dynEl.textContent = css;
          else if (inlineEl) inlineEl.textContent = css;
          else {
            var s = document.createElement("style");
            s.id = "st-dynamic-theme";
            s.textContent = css;
            document.head.appendChild(s);
          }
          try { localStorage.setItem("st_theme_css", css); } catch (e) {}

          /* Refresh sidebar branding header with latest doc values */
          ST._branding = {
            company_name: frm.doc.company_name || "",
            logo:         frm.doc.logo         || "",
            favicon:      frm.doc.favicon       || "",
            tagline:      frm.doc.tagline       || "",
          };
          var old = document.getElementById("st-company-header");
          if (old) old.parentNode.removeChild(old);
          injectSidebarBrandingHeader();
          if (frm.doc.favicon) {
            $('link[rel="shortcut icon"], link[rel="icon"]').attr("href", frm.doc.favicon);
          }
        }
      });
    }
  });

  /* MutationObserver — re-applies sidebar patches after SPA nav re-renders it */
  var _observer = new MutationObserver(function (mutations) {
    if (mutations.some(function (m) { return m.addedNodes.length > 0; })) {
      patchNativeSidebar();
    }
  });
  if (document.body) {
    _observer.observe(document.body, { childList: true, subtree: false });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      _observer.observe(document.body, { childList: true, subtree: false });
    });
  }
})();
