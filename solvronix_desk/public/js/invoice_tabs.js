/* ================================================================
   Solvronix Desk — Invoice tabs
   Sales and purchase invoices are two lists in two places. This puts
   a small tab strip above both ("Sales | Purchase") so you can flip
   between them in one click; each tab is its own list URL, so back,
   refresh and sharing work. It is a link strip only: it changes no
   list and no data.
   Off switch for the whole site: Theme Studio → "Invoice tabs".
   ================================================================ */
(function () {
  "use strict";
  var ST = (window.solvronix_desk = window.solvronix_desk || {});
  var BAR_CLASS = "st-invoice-tabs";
  var TABS = [
    { doctype: "Sales Invoice", label: "Sales" },
    { doctype: "Purchase Invoice", label: "Purchase" },
  ];

  function t(text) { return window.__ ? __(text) : text; }
  function cfg() { return (window.frappe && frappe.boot && frappe.boot.st_theme_config) || {}; }
  function featureOn() { return cfg().invoice_tabs !== false; }

  /* pure: which tabs to show for the doctype of the open list, and which is active */
  function tabsFor(doctype, canRead) {
    if (!TABS.some(function (tab) { return tab.doctype === doctype; })) return [];
    return TABS
      .filter(function (tab) { return tab.doctype === doctype || !canRead || canRead(tab.doctype); })
      .map(function (tab) { return { doctype: tab.doctype, label: tab.label, active: tab.doctype === doctype }; });
  }

  function render() {
    var list = window.cur_list;
    var doctype = list && list.doctype;
    var $host = list && list.page && list.page.main && list.page.main.parent && list.page.main.parent();
    $(".%BAR%".replace("%BAR%", BAR_CLASS)).remove();
    if (!featureOn() || !$host || !$host.length) return;
    var tabs = tabsFor(doctype, function (dt) { return frappe.model.can_read(dt); });
    if (tabs.length < 2) return;

    var $bar = $('<div class="' + BAR_CLASS + '" role="tablist"></div>');
    tabs.forEach(function (tab) {
      var $a = $('<a class="st-invoice-tab" role="tab"></a>')
        .text(t(tab.label))
        .toggleClass("active", tab.active)
        .attr("href", "/desk/" + frappe.router.slug(tab.doctype));
      $a.on("click", function (event) {
        if (event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        if (!tab.active) frappe.set_route("List", tab.doctype, "List");
      });
      $a.appendTo($bar);
    });
    $host.prepend($bar);
  }

  ST.invoiceTabs = { tabsFor: tabsFor };

  if (window.frappe && frappe.router && frappe.router.on && window.$) {
    frappe.router.on("change", function () { setTimeout(render, 400); });
  }
}());
