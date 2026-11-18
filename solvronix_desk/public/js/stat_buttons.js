/* ================================================================
   Solvronix Desk — Stat buttons
   Frappe lists a record's linked documents (invoices of a customer,
   payments of an invoice, ...) on the form's Connections tab, so a
   user has to open that tab to learn they exist. This shows the ones
   that have records as compact buttons with their counts at the top
   of the form; a click does exactly what the Connections link does.
   Nothing is fetched here: it reads the counts Frappe already loads
   and rebuilds when they change.
   Off switch for the whole site: Theme Studio → "Stat buttons".
   ================================================================ */
(function () {
  "use strict";
  var ST = (window.solvronix_desk = window.solvronix_desk || {});
  var MAX_BUTTONS = 8;
  var BAR_CLASS = "st-stat-bar";

  function cfg() {
    return (window.frappe && frappe.boot && frappe.boot.st_theme_config) || {};
  }
  function featureOn() {
    return cfg().stat_buttons !== false; // default on, explicit false opts out
  }

  /* ── pure model (unit-tested) ────────────────────────────────── */
  function toNumber(value) {
    var text = String(value == null ? "" : value).trim();
    if (!text) return 0;
    if (text === "?") return 1; // Frappe could not count exactly but knows there are some
    if (/^\d+\+$/.test(text)) return parseInt(text, 10);
    var n = parseInt(text, 10);
    return isNaN(n) ? 0 : n;
  }

  /* links: [{ key, label, count, open }] as read from the Connections block.
     Keeps those with records, biggest first, capped. */
  function buttonsFrom(links) {
    return (links || [])
      .map(function (item) {
        return {
          key: item.key,
          label: item.label,
          count: item.count,
          countNumber: toNumber(item.count),
          open: toNumber(item.open) > 0 ? item.open : "",
        };
      })
      .filter(function (item) { return item.label && item.countNumber > 0; })
      .sort(function (a, b) { return b.countNumber - a.countNumber; })
      .slice(0, MAX_BUTTONS);
  }

  /* ── DOM ─────────────────────────────────────────────────────── */
  function readLinks(frm) {
    var area = frm && frm.dashboard && frm.dashboard.transactions_area;
    if (!area || !area.find) return [];
    var links = [];
    area.find(".document-link").each(function (index) {
      var $link = $(this);
      var $count = $link.find(".count");
      var $open = $link.find(".open-notification");
      links.push({
        key: index,
        label: $.trim($link.find(".badge-link").text()),
        count: $count.hasClass("hidden") ? "" : $.trim($count.text()),
        open: $open.hasClass("hidden") ? "" : $.trim($open.text()),
        $link: $link,
      });
    });
    return links;
  }

  function render(frm) {
    if (!frm || !frm.layout || !frm.layout.wrapper) return;
    var $wrapper = $(frm.layout.wrapper);
    $wrapper.children("." + BAR_CLASS).remove();
    if (!featureOn() || (frm.is_new && frm.is_new())) return;

    var links = readLinks(frm);
    var byKey = {};
    links.forEach(function (item) { byKey[item.key] = item; });
    var buttons = buttonsFrom(links);
    if (!buttons.length) return;

    var $bar = $('<div class="' + BAR_CLASS + '" role="group"></div>');
    buttons.forEach(function (item) {
      var $button = $('<button type="button" class="st-stat-btn"></button>');
      $('<span class="st-stat-count"></span>').text(item.count).appendTo($button);
      $('<span class="st-stat-label"></span>').text(item.label).appendTo($button);
      if (item.open) {
        $('<span class="st-stat-open" title="' + (window.__ ? __("Open") : "Open") + '"></span>').text(item.open).appendTo($button);
      }
      $button.on("click", function () {
        var source = byKey[item.key];
        if (source && source.$link) source.$link.find(".badge-link").trigger("click");
      });
      $button.appendTo($bar);
    });
    $wrapper.prepend($bar);
  }

  function watch(frm) {
    var area = frm.dashboard && frm.dashboard.transactions_area && frm.dashboard.transactions_area[0];
    if (!area || frm.__st_stat_observer || !window.MutationObserver) return;
    var timer = null;
    frm.__st_stat_observer = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () { render(frm); }, 120);
    });
    frm.__st_stat_observer.observe(area, {
      childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"],
    });
  }

  /* Frappe only counts linked documents once the Connections block scrolls into view,
     so ask it to count now. Same call, same guard (`_fetched_counts`), once per record. */
  function requestCounts(frm) {
    var d = frm && frm.dashboard;
    if (!d || typeof d.set_open_count !== "function" || d._fetched_counts) return false;
    if (!d.data || !d.data.transactions || !d.data.transactions.length) return false;
    if (frm.is_new && frm.is_new()) return false;
    setTimeout(function () {
      try { if (!d._fetched_counts) d.set_open_count(); } catch (e) { /* Frappe will count on scroll as usual */ }
    }, 50);
    return true;
  }

  ST.statButtons = { toNumber: toNumber, buttonsFrom: buttonsFrom, requestCounts: requestCounts, MAX: MAX_BUTTONS };

  if (window.$ && window.document) {
    $(document).on("form-refresh", function (event, frm) {
      if (!featureOn() || !frm) return;
      watch(frm);
      render(frm);
      requestCounts(frm);
    });
  }
}());
