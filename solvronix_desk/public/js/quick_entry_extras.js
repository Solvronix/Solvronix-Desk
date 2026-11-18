/* ================================================================
   Solvronix Desk — Save & New in quick-entry pop-ups
   Frappe opens small masters (contact, address, customer, supplier,
   item, ...) in a compact pop-up. This adds a "Save & New" button
   beside "Edit Full Form": it saves the record, stays on the page you
   are on (no jump to the new record) and opens an empty pop-up for the
   next one, which is what you want when entering a list of contacts.
   It wraps the pop-up's render step only to add that button; saving,
   validation and the caller's own callbacks are Frappe's.
   Not offered when the pop-up was opened from a link field ("Create
   a new ..."), where there is a field waiting for the new record.
   Off switch for the whole site: Theme Studio → "Save & New in pop-ups".
   ================================================================ */
(function () {
  "use strict";
  var ST = (window.solvronix_desk = window.solvronix_desk || {});

  function t(text) { return window.__ ? __(text) : text; }
  function cfg() { return (window.frappe && frappe.boot && frappe.boot.st_theme_config) || {}; }
  function featureOn() { return cfg().quick_entry_save_new !== false; }

  /* pure: should this pop-up get the button? */
  function offersSaveNew(qe, fromLink) {
    if (!qe || fromLink) return false;
    if (qe.skip_insert || qe.force) return false;
    if (qe.meta && qe.meta.issingle) return false;
    return typeof qe.add_custom_action === "function";
  }

  function saveAndNew(qe) {
    var btn = qe.get_primary_btn && qe.get_primary_btn();
    if (!btn || !btn.length) return;
    var doctype = qe.doctype;
    var originalAfter = qe.process_after_insert;
    qe.__st_new = true;
    qe.open_form_if_not_list = function () {}; // stay where we are
    qe.process_after_insert = function () {
      var out = originalAfter.apply(this, arguments);
      if (qe.__st_new) {
        setTimeout(function () {
          frappe.ui.form.make_quick_entry(doctype, qe.after_insert, qe.init_callback);
        }, 700);
      }
      return out;
    };
    qe.__st_clicking = true;
    try { btn[0].click(); } finally { qe.__st_clicking = false; }
  }

  function restore(qe) {
    // a normal Save after a failed Save & New must behave like a normal Save
    qe.__st_new = false;
    delete qe.open_form_if_not_list;
    delete qe.process_after_insert;
  }

  function addSaveNew(qe) {
    if (!offersSaveNew(qe, window.frappe && frappe._from_link)) return;
    qe.add_custom_action(t("Save & New"), function () { saveAndNew(qe); });
    var btn = qe.get_primary_btn && qe.get_primary_btn();
    if (btn && btn.on) {
      btn.on("click.st-save-new", function () { if (!qe.__st_clicking) restore(qe); });
    }
  }

  ST.quickEntryExtras = { offersSaveNew: offersSaveNew, _addSaveNew: addSaveNew, _saveAndNew: saveAndNew };

  /* The pop-up class lives in the form bundle, which may load after this file,
     so install on first chance: now, and again when the router or a form shows up. */
  function install() {
    if (!(window.frappe && frappe.ui && frappe.ui.form && frappe.ui.form.QuickEntryForm)) return false;
    var proto = frappe.ui.form.QuickEntryForm.prototype;
    if (proto.__st_save_new) return true;
    proto.__st_save_new = true;
    var original = proto.render_dialog;
    proto.render_dialog = function () {
      var out = original.apply(this, arguments);
      try { if (featureOn()) addSaveNew(this); } catch (e) { /* the pop-up works without the extra button */ }
      return out;
    };
    return true;
  }

  ST.quickEntryExtras.install = install;
  if (!install() && window.$) {
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (install() || tries > 60) clearInterval(timer);
    }, 1000);
  }
}());
