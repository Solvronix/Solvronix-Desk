/* ================================================================
   Solvronix Desk — Dashboard date filter
   One date range for a whole workspace dashboard: a bar at the top
   of a workspace page drives every chart and every document-count /
   sum number card on it, instead of changing each chart's own
   timespan one by one.
   Charts: set the same "Select Date Range" state their own timespan
   menu sets, then ask them to refetch. Number cards of the
   "Document Type" kind: the range is added to the filters they send,
   on the document's date field (posting / transaction date, else the
   creation date). Report and Custom cards are left alone.
   If the site has several companies a company picker joins the bar; it
   filters the widgets whose document has a company field.
   Nothing is saved: closing the browser tab forgets the choice, and
   "All time" puts every widget back exactly as the workspace defines.
   Frappe's widgets are only observed (the widget factory is wrapped
   to remember them); their behaviour is not changed.
   Off switch for the whole site: Theme Studio → "Dashboard date filter".
   ================================================================ */
(function () {
  "use strict";
  var ST = (window.solvronix_desk = window.solvronix_desk || {});
  var STORE_KEY = "st_dashboard_range";
  var BAR_ID = "st-dash-filter";
  var DATE_FIELDS = ["posting_date", "transaction_date", "date", "start_date", "creation"];

  var PRESETS = [
    { id: "all", label: "All time" },
    { id: "today", label: "Today" },
    { id: "week", label: "This week" },
    { id: "month", label: "This month" },
    { id: "last_month", label: "Last month" },
    { id: "quarter", label: "This quarter" },
    { id: "year", label: "This year" },
    { id: "30d", label: "Last 30 days" },
    { id: "custom", label: "Custom range" },
  ];

  function t(text) { return window.__ ? __(text) : text; }
  function cfg() { return (window.frappe && frappe.boot && frappe.boot.st_theme_config) || {}; }
  function featureOn() { return cfg().dashboard_filter !== false; }

  /* ── pure model (unit-tested) ────────────────────────────────── */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  /* [from, to] as YYYY-MM-DD for a preset, or null for "all"/unknown. Weeks start on Monday. */
  function rangeFor(preset, now, custom) {
    var y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
    if (preset === "today") return [ymd(now), ymd(now)];
    if (preset === "week") {
      var back = (now.getDay() + 6) % 7;
      return [ymd(new Date(y, m, d - back)), ymd(new Date(y, m, d - back + 6))];
    }
    if (preset === "month") return [ymd(new Date(y, m, 1)), ymd(new Date(y, m + 1, 0))];
    if (preset === "last_month") return [ymd(new Date(y, m - 1, 1)), ymd(new Date(y, m, 0))];
    if (preset === "quarter") {
      var q = Math.floor(m / 3) * 3;
      return [ymd(new Date(y, q, 1)), ymd(new Date(y, q + 3, 0))];
    }
    if (preset === "year") return [ymd(new Date(y, 0, 1)), ymd(new Date(y, 11, 31))];
    if (preset === "30d") return [ymd(new Date(y, m, d - 29)), ymd(now)];
    if (preset === "custom" && custom && custom[0] && custom[1]) return [custom[0], custom[1]];
    return null;
  }

  /* The date column a document-count card is filtered on. */
  function pickDateField(fieldnames) {
    var have = {};
    (fieldnames || []).forEach(function (f) { have[f] = true; });
    for (var i = 0; i < DATE_FIELDS.length; i++) if (have[DATE_FIELDS[i]]) return DATE_FIELDS[i];
    return "creation";
  }

  /* Frappe filter row [doctype, field, "between", [from, to]] */
  function cardFilter(doctype, field, range) {
    return [doctype, field, "between", [range[0], range[1]]];
  }

  /* A widget's own filter list plus "company = X" on its document type. */
  function companyFilters(base, doctype, company) {
    var list = Array.isArray(base) ? base.slice() : [];
    list = list.filter(function (f) { return !(Array.isArray(f) && f[0] === doctype && f[1] === "company"); });
    list.push([doctype, "company", "=", company]);
    return list;
  }

  function withFields(doctype, cb) {
    var names = function () {
      var meta = frappe.get_meta(doctype);
      return meta && meta.fields ? meta.fields.map(function (f) { return f.fieldname; }) : [];
    };
    try { if (frappe.get_meta(doctype)) return cb(names()); } catch (e) {}
    frappe.model.with_doctype(doctype, function () { cb(names()); });
  }

  /* ── widget registry ─────────────────────────────────────────── */
  var registry = []; // { widget, type }
  var state = { preset: "all", custom: null, company: "" };

  function isLive(entry) {
    var el = entry.widget && entry.widget.widget && entry.widget.widget[0];
    return !!(el && document.body && document.body.contains(el));
  }
  function liveEntries() {
    registry = registry.filter(isLive);
    return registry;
  }

  function applyToChart(widget, range, company) {
    if (!widget.chart_doc || typeof widget.fetch_and_update_chart !== "function") return;
    if (widget.chart_doc.chart_type === "Report") return; // report charts take their own filters
    var go = function () {
      if (range) {
        widget.selected_timespan = "Select Date Range";
        widget.selected_from_date = range[0];
        widget.selected_to_date = range[1];
      } else {
        widget.selected_timespan = null;
        widget.selected_from_date = null;
        widget.selected_to_date = null;
      }
      widget.fetch_and_update_chart();
    };
    var doctype = widget.chart_doc.document_type;
    if (!("__st_base_filters" in widget)) widget.__st_base_filters = widget.filters;
    if (!company || !doctype) {
      widget.filters = widget.__st_base_filters;
      return go();
    }
    withFields(doctype, function (fields) {
      widget.filters = fields.indexOf("company") >= 0 ? companyFilters(widget.__st_base_filters, doctype, company) : widget.__st_base_filters;
      go();
    });
  }

  function toFilterList(base, doctype) {
    if (Array.isArray(base)) return base.slice();
    if (base && typeof base === "object") {
      return Object.keys(base).map(function (k) {
        return Array.isArray(base[k]) ? [doctype, k, base[k][0], base[k][1]] : [doctype, k, "=", base[k]];
      });
    }
    return [];
  }

  function applyToCard(widget, range, done, company) {
    var doc = widget.card_doc;
    if (!doc || doc.type !== "Document Type" || !doc.document_type) return;
    if (!range && !company) {
      delete widget.get_filters;
      return done();
    }
    withFields(doc.document_type, function (fieldnames) {
      var original = Object.getPrototypeOf(widget).get_filters;
      var field = pickDateField(fieldnames);
      var hasCompany = fieldnames.indexOf("company") >= 0;
      widget.get_filters = function () {
        var list = toFilterList(original.call(this), doc.document_type);
        if (range) list.push(cardFilter(doc.document_type, field, range));
        if (company && hasCompany) list = companyFilters(list, doc.document_type, company);
        return list;
      };
      done();
    });
  }

  function applyOne(entry, range, company) {
    var w = entry.widget;
    try {
      if (entry.type === "chart") applyToChart(w, range, company);
      else applyToCard(w, range, function () { if (typeof w.render_card === "function") w.render_card(); }, company);
    } catch (e) {
      if (window.console) console.warn("solvronix_desk dashboard filter:", e);
    }
  }

  function currentRange() { return rangeFor(state.preset, new Date(), state.custom); }

  function applyAll() {
    var range = currentRange();
    liveEntries().forEach(function (entry) { applyOne(entry, range, state.company); });
  }

  function register(widget, type) {
    var entry = { widget: widget, type: type };
    registry.push(entry);
    // a widget built while a range is active adopts it once it has its document
    if (state.preset !== "all" || state.company) {
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        var ready = type === "chart" ? widget.chart_doc : widget.card_doc;
        if (ready || tries > 40) {
          clearInterval(timer);
          if (ready && isLive(entry)) applyOne(entry, currentRange(), state.company);
        }
      }, 250);
    }
    scheduleBar();
  }

  /* ── bar ─────────────────────────────────────────────────────── */
  function loadState() {
    try {
      var saved = JSON.parse(window.sessionStorage.getItem(STORE_KEY) || "null");
      if (saved && saved.preset) state = { preset: saved.preset, custom: saved.custom || null, company: saved.company || "" };
    } catch (e) {}
  }
  function saveState() {
    try { window.sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function host() {
    return document.querySelector('[data-page-route="Workspaces"] .layout-main-section');
  }

  function renderBar() {
    var container = host();
    var existing = document.getElementById(BAR_ID);
    var hasWidgets = liveEntries().length > 0;
    if (!container || !hasWidgets || !featureOn()) {
      if (existing) existing.remove();
      return;
    }
    if (existing && existing.parentNode === container) return;
    if (existing) existing.remove();

    var bar = $('<div id="' + BAR_ID + '" class="st-dash-filter" role="group"></div>');
    $('<span class="st-dash-label"></span>').text(t("Date range")).appendTo(bar);
    var $select = $('<select class="st-dash-select form-control input-xs"></select>');
    PRESETS.forEach(function (p) {
      $("<option></option>").val(p.id).text(t(p.label)).prop("selected", p.id === state.preset).appendTo($select);
    });
    $select.appendTo(bar);
    var $custom = $('<span class="st-dash-custom"></span>').toggle(state.preset === "custom").appendTo(bar);
    var $from = $('<input type="date" class="st-dash-date form-control input-xs">').val(state.custom ? state.custom[0] : "").appendTo($custom);
    $('<span class="st-dash-dash">–</span>').appendTo($custom);
    var $to = $('<input type="date" class="st-dash-date form-control input-xs">').val(state.custom ? state.custom[1] : "").appendTo($custom);
    var $range = $('<span class="st-dash-range text-muted"></span>').appendTo(bar);
    var $company = $('<select class="st-dash-company form-control input-xs"></select>').hide().prependTo($('<span class="st-dash-company-wrap"></span>').appendTo(bar));
    if (frappe.db && frappe.db.get_list) {
      frappe.db.get_list("Company", { fields: ["name"], limit: 50 }).then(function (rows) {
        if (!rows || rows.length < 2) return; // one company: nothing to choose
        $("<option></option>").val("").text(t("All companies")).appendTo($company);
        rows.forEach(function (r) { $("<option></option>").val(r.name).text(r.name).prop("selected", r.name === state.company).appendTo($company); });
        $company.show();
      });
    }
    $company.on("change", function () { state.company = $company.val() || ""; saveState(); applyAll(); });

    function paintRange() {
      var r = currentRange();
      $range.text(r ? r[0] + " → " + r[1] : "");
    }
    function change() {
      state.preset = $select.val();
      $custom.toggle(state.preset === "custom");
      if (state.preset === "custom") state.custom = [$from.val(), $to.val()];
      saveState();
      paintRange();
      if (state.preset !== "custom" || (state.custom[0] && state.custom[1])) applyAll();
    }
    $select.on("change", change);
    $from.on("change", change);
    $to.on("change", change);
    paintRange();
    bar.prependTo(container);
  }

  var barTimer = null;
  function scheduleBar() {
    clearTimeout(barTimer);
    barTimer = setTimeout(renderBar, 300);
  }

  ST.dashboardFilter = {
    rangeFor: rangeFor, pickDateField: pickDateField, cardFilter: cardFilter, companyFilters: companyFilters, PRESETS: PRESETS,
    _register: register, _state: state, _applyAll: applyAll, _applyToChart: applyToChart, _applyToCard: applyToCard,
  };

  if (window.frappe && frappe.widget && typeof frappe.widget.make_widget === "function" && window.$) {
    loadState();
    var original = frappe.widget.make_widget;
    frappe.widget.make_widget = function (opts) {
      var widget = original.apply(this, arguments);
      if (widget && featureOn() && opts && (opts.widget_type === "chart" || opts.widget_type === "number_card")) {
        register(widget, opts.widget_type === "chart" ? "chart" : "card");
      }
      return widget;
    };
    if (frappe.router && frappe.router.on) frappe.router.on("change", scheduleBar);
  }
}());
