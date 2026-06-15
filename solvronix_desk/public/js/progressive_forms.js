/* =============================================================================
   Solvronix Desk — Progressive Forms
   Required fields (reqd=1, shown with *) are always visible.
   Optional fields are hidden by default behind a "Show optional fields" toggle.
   State is persisted per-DocType in localStorage.
   ============================================================================= */
(function () {
  "use strict";

  var LAYOUT_TYPES = [
    "Section Break", "Column Break", "Tab Break",
    "HTML", "Button", "Fold", "Heading",
  ];

  var STORAGE_KEY_PREFIX = "st_pf_expanded_";

  function storageKey(doctype) {
    return STORAGE_KEY_PREFIX + doctype.replace(/\s+/g, "_");
  }

  function isExpanded(doctype) {
    try { return localStorage.getItem(storageKey(doctype)) === "1"; } catch (e) { return false; }
  }

  function setExpanded(doctype, val) {
    try { localStorage.setItem(storageKey(doctype), val ? "1" : "0"); } catch (e) {}
  }

  function isOptionalField(field) {
    if (!field || !field.df) return false;
    var df = field.df;
    if (LAYOUT_TYPES.indexOf(df.fieldtype) !== -1) return false;
    if (df.hidden) return false;
    if (df.reqd) return false;   /* required = always visible */
    if (df.fieldname === "name" || df.fieldname === "title") return false;
    return true;
  }

  function getOptionalFields(frm) {
    return (frm.fields || []).filter(isOptionalField);
  }

  function applyVisibility(frm, optFields, expanded) {
    optFields.forEach(function (f) {
      if (f.$wrapper) {
        f.$wrapper.toggleClass("st-pf-hidden", !expanded);
      }
    });
    updateEmptySections(frm);
  }

  /* Hide section headings whose every field is hidden (looks cleaner than an orphan label) */
  function updateEmptySections(frm) {
    $(frm.wrapper).find(".form-section").each(function () {
      var $sec = $(this);
      var $controls = $sec.find(".frappe-control");
      if (!$controls.length) return;
      var allHidden = $controls.toArray().every(function (el) {
        return $(el).hasClass("st-pf-hidden") || $(el).hasClass("hide-control");
      });
      $sec.find(".section-head").toggleClass("st-pf-section-head-hidden", allHidden);
    });
  }

  function removeToggle(frm) {
    $(frm.wrapper).find(".st-pf-toggle-row").remove();
  }

  function injectToggle(frm, optFields) {
    removeToggle(frm);
    if (!optFields.length) return;

    var expanded = isExpanded(frm.doctype);
    var count = optFields.length;

    var $toggle = $(
      '<div class="st-pf-toggle-row">' +
        '<button class="st-pf-toggle-btn" type="button">' +
          '<span class="st-pf-toggle-icon">' + (expanded ? "&#9650;" : "&#9660;") + '</span>' +
          '<span class="st-pf-toggle-label">' +
            (expanded
              ? __("Hide optional fields")
              : __("Show {0} optional fields").replace("{0}", count)
            ) +
          '</span>' +
        '</button>' +
      '</div>'
    );

    $toggle.on("click", ".st-pf-toggle-btn", function () {
      var nowExpanded = !isExpanded(frm.doctype);
      setExpanded(frm.doctype, nowExpanded);
      applyVisibility(frm, optFields, nowExpanded);
      $toggle.find(".st-pf-toggle-icon").html(nowExpanded ? "&#9650;" : "&#9660;");
      $toggle.find(".st-pf-toggle-label").text(
        nowExpanded
          ? __("Hide optional fields")
          : __("Show {0} optional fields").replace("{0}", count)
      );
    });

    /* Place the toggle after the last visible required-field row */
    var $mainSection = $(frm.wrapper).find(".layout-main-section").first();
    if ($mainSection.length) {
      $mainSection.append($toggle);
    }

    applyVisibility(frm, optFields, expanded);
  }

  function applyProgressiveForms(frm) {
    if (frm.meta && frm.meta.st_disable_progressive) return;
    /* Show all fields while filling in a new record */
    if (frm.is_new()) return;

    var optFields = getOptionalFields(frm);
    if (!optFields.length) return;

    injectToggle(frm, optFields);
  }

  frappe.ui.form.on("*", {
    refresh: function (frm) {
      setTimeout(function () { applyProgressiveForms(frm); }, 150);
    },
  });

  $(document).on("page-change", function () {
    var frm = cur_frm;
    if (!frm) return;
    setTimeout(function () { applyProgressiveForms(frm); }, 300);
  });

}());
