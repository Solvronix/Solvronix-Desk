/* ================================================================
   Solvronix Desk — White label: keep the vendor's sites out of the Desk
   One rule list (frappe.boot.st_white_label, from white_label.py) decides
   what is a vendor link. This script applies it to everything the Desk
   builds in code, which the server-side Help menu clean-up cannot reach:
     - the Help menu rows (Navbar Settings) and contextual help links (frappe.help.help_links),
     - sidebar promotions and any other link to a vendor address,
     - menu rows that open a vendor page by script (window.open),
     - the About dialog's website / forum / support links.
   It never touches what users typed (fields, comments, timelines, lists,
   reports, print views), internal links, license / copyright / notice
   pages, the About dialog's version list or its source-code link.
   Hidden elements are only marked, never deleted, so Frappe can re-render
   them freely and switching the setting off brings everything back.
   The Help menu itself is cleaned here too, not on the server: Frappe sets that data after
   every app's boot hook has run, so a server-side edit would be overwritten.
   Site switch: Theme Studio → "Hide Frappe links, promotions and help".
   Your own documentation / support links: Theme Studio → the two URL fields.
   ================================================================ */
(function () {
  "use strict";
  var ST = (window.solvronix_desk = window.solvronix_desk || {});
  var MARK = "data-st-vendor-hidden";

  // The same links are hidden whatever the host, but some items open by script and have no address
  // to test. Their visible text is the fallback; compared case-insensitively after translation.
  var VENDOR_LABELS = ["Frappe Support", "Frappe School", "Frappe Cloud"];

  // Where users' own content lives: a link there is data, never chrome.
  var CONTENT = [
    ".frappe-control", ".control-value", ".timeline-item", ".timeline-content", ".comment-box",
    ".ql-editor", ".codex-editor", ".list-row", ".result-list", ".grid-body", ".dt-cell",
    ".report-wrapper", ".print-preview", ".email-content", "[data-fieldtype]",
  ].join(",");

  // What to hide together with a vendor link, nearest first.
  var CONTAINERS = [
    ".promotional-banner", ".about-info-row", ".dropdown-item", "[role=menuitem]", ".menu-item",
    ".dropdown-menu li", ".es-button", "li",
  ];

  function rules() { return (window.frappe && frappe.boot && frappe.boot.st_white_label) || {}; }
  function active() { return rules().enabled === true; }

  /* ── pure (unit-tested) ──────────────────────────────────────── */
  function isVendorUrl(url, cfg, origin) {
    var parsed;
    try { parsed = new URL(String(url || ""), origin || "https://site.invalid/"); } catch (e) { return false; }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (origin && parsed.origin === origin) return false; // the site's own address
    var host = parsed.hostname.toLowerCase();
    var path = (parsed.pathname || "").toLowerCase();
    var legal = (cfg.legal_hints || []).some(function (hint) { return path.indexOf(hint) !== -1; });
    if (legal) return false;
    if (host === "github.com" || host === "www.github.com") {
      var prefix = cfg.github_prefix || "/frappe";
      return path === prefix || path.indexOf(prefix + "/") === 0;
    }
    return (cfg.hosts || []).some(function (vendor) { return host === vendor || host.slice(-(vendor.length + 1)) === "." + vendor; });
  }

  var URL_IN_TEXT = /https?:\/\/[^\s'"`)<>]+/gi;

  /* A Help-menu row (Navbar Item) that opens a vendor address, by route or inside its action script. */
  function rowIsVendor(item, cfg, origin) {
    if (!item) return false;
    if (item.route && isVendorUrl(item.route, cfg, origin)) return true;
    return (String(item.action || "").match(URL_IN_TEXT) || []).some(function (url) { return isVendorUrl(url, cfg, origin); });
  }

  /* The site's Help rows without the vendor's, followed by the site's own links. */
  function cleanHelpMenu(items, own, cfg, origin) {
    return (items || []).filter(function (item) { return !rowIsVendor(item, cfg, origin); }).concat(own || []);
  }

  function filterHelpLinks(links, cfg, origin) {
    var out = {};
    Object.keys(links || {}).forEach(function (key) {
      var kept = (links[key] || []).filter(function (item) { return !isVendorUrl(item && item.url, cfg, origin); });
      if (kept.length) out[key] = kept;
    });
    return out;
  }

  /* kept: the About dialog's source-code link (an open-source licence obligation) */
  function keepsLink(href, insideAbout, cfg, origin) {
    if (!insideAbout) return false;
    try {
      var u = new URL(href, origin || "https://site.invalid/");
      return (u.hostname === "github.com" || u.hostname === "www.github.com") && u.pathname.replace(/\/+$/, "").toLowerCase() === (cfg.github_prefix || "/frappe");
    } catch (e) { return false; }
  }

  function isVendorLabel(text, labels, translate) {
    var wanted = (text || "").trim().toLowerCase();
    if (!wanted) return false;
    return labels.some(function (label) {
      return label.toLowerCase() === wanted || (translate ? String(translate(label)).toLowerCase() === wanted : false);
    });
  }

  /* ── DOM ─────────────────────────────────────────────────────── */
  function origin() { return window.location && window.location.origin; }

  function hide(el) {
    if (!el || el.hasAttribute(MARK)) return;
    el.setAttribute(MARK, "1");
    el.hidden = true;
  }

  // These are made for one link: hide them whole. The generic ones (a list item, a menu row) are
  // hidden whole only when the link is essentially all they hold, so a sentence or a step that
  // merely contains a link keeps its text.
  var WHOLE = [".promotional-banner", ".about-info-row"];
  function containerOf(el) {
    for (var i = 0; i < CONTAINERS.length; i++) {
      var found = el.closest(CONTAINERS[i]);
      if (!found) continue;
      if (WHOLE.indexOf(CONTAINERS[i]) !== -1) return found;
      var extra = (found.textContent || "").trim().length - (el.textContent || "").trim().length;
      return extra <= 10 ? found : el;
    }
    return el;
  }

  function tidyEmptyBanners(root) {
    var holders = new Set();
    root.querySelectorAll("[" + MARK + "]").forEach(function (el) {
      var parent = el.parentElement;
      if (parent && /promotional/.test(parent.className || "")) holders.add(parent);
    });
    holders.forEach(function (holder) {
      var visible = Array.prototype.some.call(holder.children, function (child) { return !child.hasAttribute(MARK); });
      if (!visible) hide(holder);
    });
  }

  function scrub(root) {
    if (!active() || !root || !root.querySelectorAll) return;
    var cfg = rules();
    var here = origin();
    var anchors = root.matches && root.matches("a[href]") ? [root] : [];
    anchors = anchors.concat(Array.prototype.slice.call(root.querySelectorAll("a[href]")));
    anchors.forEach(function (a) {
      if (a.hasAttribute(MARK) || a.closest("[data-st-keep]") || a.closest(CONTENT)) return;
      var href = a.getAttribute("href");
      if (!isVendorUrl(href, cfg, here)) return;
      if (keepsLink(href, !!a.closest(".about-dialog"), cfg, here)) return;
      hide(containerOf(a));
    });

    // menu rows that open a vendor page by script have no address to test
    var translate = window.__ ? window.__ : null;
    root.querySelectorAll(".dropdown-item, [role=menuitem], .menu-item").forEach(function (item) {
      if (item.hasAttribute(MARK) || item.closest(CONTENT)) return;
      if (isVendorLabel(item.textContent, VENDOR_LABELS, translate)) hide(item);
    });
    tidyEmptyBanners(root);
  }

  function applyHelpMenu() {
    var settings = window.frappe && frappe.boot && frappe.boot.navbar_settings;
    if (!active() || !settings || settings.__st_clean) return;
    settings.help_dropdown = cleanHelpMenu(settings.help_dropdown, rules().own_help, rules(), origin());
    settings.__st_clean = true;
  }

  function applyHelpLinks() {
    if (!active() || !window.frappe || !frappe.help || !frappe.help.help_links) return;
    var cleaned = filterHelpLinks(frappe.help.help_links, rules(), origin());
    Object.keys(frappe.help.help_links).forEach(function (key) {
      if (cleaned[key]) frappe.help.help_links[key] = cleaned[key]; else delete frappe.help.help_links[key];
    });
  }

  function guardWindowOpen() {
    if (window.__stWindowOpenGuard) return;
    window.__stWindowOpenGuard = true;
    var original = window.open;
    window.open = function (url) {
      if (active() && url && isVendorUrl(url, rules(), origin())) return null;
      return original.apply(this, arguments);
    };
  }

  ST.whiteLabel = {
    isVendorUrl: isVendorUrl, filterHelpLinks: filterHelpLinks, keepsLink: keepsLink,
    isVendorLabel: isVendorLabel, VENDOR_LABELS: VENDOR_LABELS, cleanHelpMenu: cleanHelpMenu, rowIsVendor: rowIsVendor, _scrub: scrub,
  };

  if (window.document && window.MutationObserver && window.frappe && window.frappe.boot) {
    if (active()) {
      applyHelpMenu();
      applyHelpLinks();
      guardWindowOpen();
      scrub(document.body);
      var queue = [];
      var timer = null;
      new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (node) { if (node.nodeType === 1) queue.push(node); });
        });
        clearTimeout(timer);
        timer = setTimeout(function () {
          var batch = queue.splice(0);
          batch.forEach(scrub);
        }, 60);
      }).observe(document.body, { childList: true, subtree: true });
      if (frappe.router && frappe.router.on) frappe.router.on("change", function () { applyHelpLinks(); });
    }
  }
}());
