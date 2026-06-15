/* ================================================================
   Solvronix Desk — Smart Home / "Today's View"
   Role-aware dashboard: KPI cards, recent docs, quick create,
   pending items. Registered as Frappe Page "smart-home".
   ================================================================ */

frappe.provide("solvronix_desk");

frappe.pages["smart-home"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Today's View"),
		single_column: true,
	});
	var inst = new solvronix_desk.SmartHome(wrapper);
	frappe.pages["smart-home"]._inst = inst;
	/* Build shell once, then load all data */
	inst._build_shell();
	inst._fetch_data();
};

frappe.pages["smart-home"].on_page_show = function () {
	var inst = frappe.pages["smart-home"]._inst;
	if (!inst) return;
	/* Shell already in DOM — only refresh numbers + recent list.
	   No HTML wipe, so user sees previous values instantly. */
	inst._refresh_kpis();
	inst._refresh_recent();
	inst._refresh_pending();
};

solvronix_desk.SmartHome = class SmartHome {
	constructor(wrapper) {
		this.wrapper = $(wrapper);
		this.$body = this.wrapper.find(".page-content");
		this._kpi_defs = null;
	}

	/* ── Build the page skeleton (called once on page_load) ─── */
	_build_shell() {
		var hour = new Date().getHours();
		var greeting =
			hour < 12 ? __("Good morning") :
			hour < 17 ? __("Good afternoon") :
			            __("Good evening");

		var user_info = (frappe.boot.user_info || {})[frappe.session.user] || {};
		var fname = (user_info.full_name || frappe.session.user || "").split(" ")[0];

		var today = new Date();
		var date_label = today.toLocaleDateString(undefined, {
			weekday: "long", year: "numeric", month: "long", day: "numeric",
		});

		this.$body.html(
			'<div class="st-smart-home">' +

			  '<div class="st-sh-header">' +
			    '<div>' +
			      '<h2 class="st-sh-greeting">' + greeting + ', <span class="st-sh-name">' + this._esc(fname) + '</span></h2>' +
			      '<div class="st-sh-date">' + date_label + '</div>' +
			    '</div>' +
			    '<a href="/desk/home" class="st-sh-all-ws">' + __("All Workspaces") + ' &rarr;</a>' +
			  '</div>' +

			  '<div class="st-sh-kpi-row" id="st-sh-kpis"></div>' +

			  '<div class="st-sh-layout">' +
			    '<div class="st-sh-main">' +
			      '<div class="st-sh-card">' +
			        '<div class="st-sh-card-head">' + __("Recent Documents") + '</div>' +
			        '<div id="st-sh-recent" class="st-sh-card-body"><div class="st-sh-spin"></div></div>' +
			      '</div>' +
			    '</div>' +
			    '<div class="st-sh-side">' +
			      '<div class="st-sh-card">' +
			        '<div class="st-sh-card-head">' + __("Quick Create") + '</div>' +
			        '<div id="st-sh-qc" class="st-sh-card-body"><div class="st-sh-spin"></div></div>' +
			      '</div>' +
			      '<div class="st-sh-card">' +
			        '<div class="st-sh-card-head">' + __("Needs Attention") + '</div>' +
			        '<div id="st-sh-pending" class="st-sh-card-body"><div class="st-sh-spin"></div></div>' +
			      '</div>' +
			    '</div>' +
			  '</div>' +

			'</div>'
		);

		/* Build KPI card shells immediately with spinner values */
		this._build_kpi_shells();
		/* Quick Create is static — render once, never needs refresh */
		this._render_quick_create();
	}

	/* ── First full load ───────────────────────────────────────── */
	_fetch_data() {
		this._refresh_kpis();
		this._refresh_recent();
		this._refresh_pending();
	}

	/* ── KPI card shells (built once, numbers updated in place) ── */
	_build_kpi_shells() {
		var $row = this.$body.find("#st-sh-kpis");
		var can_read = (frappe.boot.user && frappe.boot.user.can_read) || [];

		var defs = [
			{
				label: __("Unpaid Invoices"),
				dt: "Sales Invoice",
				filters: { status: ["in", ["Unpaid", "Overdue"]], docstatus: 1 },
				route: "/desk/sales-invoice?status=Unpaid",
				icon: "file-text",
				accent: "orange",
			},
			{
				label: __("Open Orders"),
				dt: "Sales Order",
				filters: { status: ["in", ["To Deliver and Bill", "To Bill", "To Deliver"]], docstatus: 1 },
				route: "/desk/sales-order",
				icon: "shopping-cart",
				accent: "blue",
			},
			{
				label: __("Open Tasks"),
				dt: "Task",
				filters: { status: "Open" },
				route: "/desk/task?status=Open",
				icon: "list-todo",
				accent: "green",
			},
			{
				label: __("My ToDos"),
				dt: "ToDo",
				filters: { status: "Open" },
				route: "/desk/todo?status=Open",
				icon: "circle-check",
				accent: "purple",
			},
		].filter(function (k) { return can_read.indexOf(k.dt) !== -1; }).slice(0, 4);

		if (!defs.length) {
			$row.hide();
			this._kpi_defs = [];
			return;
		}

		this._kpi_defs = defs;
		$row.empty();

		defs.forEach(function (kpi) {
			var icon_html = "";
			try { icon_html = frappe.utils.icon(kpi.icon, "md") || ""; } catch (e) {}

			$(
				'<a href="' + kpi.route + '" class="st-sh-kpi kpi-' + kpi.accent + '" data-kpi-dt="' + kpi.dt + '">' +
				  '<div class="st-sh-kpi-icon">' + (icon_html || "<span>&#9632;</span>") + '</div>' +
				  '<div class="st-sh-kpi-data">' +
				    '<div class="st-sh-kpi-num">—</div>' +
				    '<div class="st-sh-kpi-label">' + kpi.label + '</div>' +
				  '</div>' +
				'</a>'
			).appendTo($row);
		});
	}

	/* ── Refresh only KPI numbers (no DOM rebuild) ──────────────── */
	_refresh_kpis() {
		var defs = this._kpi_defs;
		if (!defs || !defs.length) return;
		var $row = this.$body.find("#st-sh-kpis");

		defs.forEach(function (kpi, idx) {
			var $num = $row.find(".st-sh-kpi").eq(idx).find(".st-sh-kpi-num");
			frappe.call({
				method: "frappe.client.get_count",
				args: { doctype: kpi.dt, filters: kpi.filters },
				callback: function (r) {
					$num.text(r.message !== undefined ? r.message : "—");
				},
				error: function () { $num.text("—"); },
			});
		});
	}

	/* ── Recent Documents (cheap — reads frappe.route_history) ─── */
	_refresh_recent() {
		var $body = this.$body.find("#st-sh-recent");
		var history = (frappe.route_history || []).slice().reverse();
		var seen = {}, items = [];

		for (var i = 0; i < history.length && items.length < 8; i++) {
			var r = history[i];
			if (r[0] === "Form" && r[1] && r[2] && !r[2].startsWith("new-")) {
				var key = r[1] + "::" + r[2];
				if (!seen[key]) {
					seen[key] = true;
					items.push({ doctype: r[1], name: r[2] });
				}
			}
		}

		if (!items.length) {
			$body.html('<div class="st-sh-empty">' + __("No recent documents yet. Start by opening any record.") + '</div>');
			return;
		}

		$body.html(items.map(function (item) {
			var slug = frappe.router.slug(item.doctype);
			var url = "/desk/" + slug + "/" + encodeURIComponent(item.name);
			return '<a href="' + url + '" class="st-sh-doc-row">' +
				'<span class="st-sh-doc-dt">' + item.doctype + '</span>' +
				'<span class="st-sh-doc-name">' + item.name + '</span>' +
			'</a>';
		}).join(""));
	}

	/* ── Quick Create (static permission check — render once) ─── */
	_render_quick_create() {
		var $body = this.$body.find("#st-sh-qc");
		var can_create = (frappe.boot.user && frappe.boot.user.can_create) || [];
		var order = [
			"Sales Invoice", "Quotation", "Sales Order",
			"Purchase Order", "Purchase Invoice",
			"Expense Claim", "Leave Application",
			"Customer", "Supplier", "Task", "ToDo",
		];
		var items = order.filter(function (dt) {
			return can_create.indexOf(dt) !== -1;
		}).slice(0, 6);

		if (!items.length) {
			$body.html('<div class="st-sh-empty">' + __("No create permissions found.") + '</div>');
			return;
		}

		$body.html(items.map(function (dt) {
			var slug = frappe.router.slug(dt);
			return '<a href="/desk/' + slug + '/new" class="st-sh-qc-row">' +
				'<span class="st-sh-qc-plus">+</span>' +
				'<span>' + __(dt) + '</span>' +
			'</a>';
		}).join(""));
	}

	/* ── Pending / Needs Attention ──────────────────────────────── */
	_refresh_pending() {
		var $body = this.$body.find("#st-sh-pending");
		var can_read = (frappe.boot.user && frappe.boot.user.can_read) || [];

		var checks = [
			{ dt: "Sales Invoice",     filters: { status: "Overdue", docstatus: 1 },             label: __("{0} overdue sales invoices"),               route: "/desk/sales-invoice?status=Overdue" },
			{ dt: "Purchase Order",    filters: { status: "To Receive and Bill", docstatus: 1 },  label: __("{0} pending purchase orders"),              route: "/desk/purchase-order" },
			{ dt: "Leave Application", filters: { status: "Open", docstatus: 0 },                 label: __("{0} leave applications awaiting approval"),  route: "/desk/leave-application?status=Open" },
			{ dt: "Expense Claim",     filters: { approval_status: "Draft", docstatus: 0 },       label: __("{0} expense claims pending"),               route: "/desk/expense-claim" },
		].filter(function (c) { return can_read.indexOf(c.dt) !== -1; });

		if (!checks.length) {
			$body.html('<div class="st-sh-empty">&#10003; ' + __("All clear!") + '</div>');
			return;
		}

		var done = 0, found = [];

		checks.forEach(function (chk) {
			frappe.call({
				method: "frappe.client.get_count",
				args: { doctype: chk.dt, filters: chk.filters },
				callback: function (r) {
					if (r.message > 0) {
						found.push({ msg: chk.label.replace("{0}", r.message), route: chk.route });
					}
					if (++done === checks.length) _render();
				},
				error: function () {
					if (++done === checks.length) _render();
				},
			});
		});

		function _render() {
			$body.html(!found.length
				? '<div class="st-sh-empty st-sh-all-clear">&#10003; ' + __("All clear — nothing needs attention.") + '</div>'
				: found.map(function (f) {
					return '<a href="' + f.route + '" class="st-sh-pending-row">&#9888; ' + f.msg + '</a>';
				}).join("")
			);
		}
	}

	_esc(str) {
		return String(str || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}
};
