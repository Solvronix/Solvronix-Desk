/* ================================================================
   Solvronix Desk — Smart Home / Today's View
   Permission-aware widgets with a persistent drag-and-drop layout.
   ================================================================ */

frappe.provide("solvronix_desk");

/* ────────────────────────────────────────────────────────────────────────────
   1. FRAPPE PAGE LIFECYCLE
   Build once on page load; SPA revisits only refresh live values so the user's
   widget order and the existing DOM remain intact.
   ──────────────────────────────────────────────────────────────────────────── */
frappe.pages["smart-home"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Today's View"),
		single_column: true,
	});

	var instance = new solvronix_desk.SmartHome(wrapper);
	frappe.pages["smart-home"]._inst = instance;
	instance.build();
};

frappe.pages["smart-home"].on_page_show = function () {
	var instance = frappe.pages["smart-home"]._inst;
	if (instance) instance.refresh();
};

/* ────────────────────────────────────────────────────────────────────────────
   2. DASHBOARD CONTROLLER
   Owns widget rendering, edit state, persistence, permissions, and data refresh.
   ──────────────────────────────────────────────────────────────────────────── */
solvronix_desk.SmartHome = class SmartHome {
	constructor(wrapper) {
		this.wrapper = $(wrapper);
		this.$body = this.wrapper.find(".page-content");
		this.user = (frappe.session && frappe.session.user) || "Guest";
		this.storage_key = "st_smart_home_layout_v2::" + this.user;
		this.editing = false;
		this.dragged = null;
		this._built = false;
		this.kpis = this._get_kpi_definitions();
	}

	/* Public entry point; guarded because Frappe can revisit a cached page. */
	build() {
		if (this._built) return;
		this._built = true;
		this._build_shell();
		this._render_widgets();
		this._restore_layout();
		this._bind_layout_events();
		this.refresh();
	}

	/* Update data in place without rebuilding or reordering widget nodes. */
	refresh() {
		if (!this._built) return;
		this._refresh_kpis();
		this._refresh_recent();
		this._refresh_pending();
	}

	/* ── 3. PAGE SHELL ────────────────────────────────────────────────────────
	   The greeting is fixed page chrome; everything below it is a widget. */
	_build_shell() {
		var hour = new Date().getHours();
		var greeting =
			hour < 12 ? __("Good morning") :
			hour < 17 ? __("Good afternoon") :
			__("Good evening");

		var user_info = ((frappe.boot && frappe.boot.user_info) || {})[this.user] || {};
		var full_name =
			user_info.full_name ||
			(frappe.session && frappe.session.user_fullname) ||
			this.user ||
			"";
		var date_label = new Date().toLocaleDateString(undefined, {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});

		this.$body.html(
			'<main class="st-smart-home">' +
				'<header class="st-sh-header">' +
					'<div class="st-sh-welcome">' +
						'<div class="st-sh-eyebrow">' + __("Your command centre") + '</div>' +
						'<h2 class="st-sh-greeting">' +
							greeting + ', <span class="st-sh-name">' + this._esc(full_name) + '</span>' +
						'</h2>' +
						'<div class="st-sh-date">' + this._esc(date_label) + '</div>' +
					'</div>' +
					'<div class="st-sh-header-actions">' +
						'<span class="st-sh-save-state" role="status" aria-live="polite"></span>' +
						'<button class="btn btn-default btn-sm st-sh-reset" type="button">' +
							this._icon("refresh", "sm") + '<span>' + __("Reset") + '</span>' +
						'</button>' +
						'<button class="btn btn-primary btn-sm st-sh-customize" type="button" aria-pressed="false">' +
							this._icon("edit", "sm") +
							'<span class="st-sh-customize-label">' + __("Customize layout") + '</span>' +
						'</button>' +
						'<a href="/desk/home" class="st-sh-all-ws">' +
							__("All Workspaces") + ' <span aria-hidden="true">&rarr;</span>' +
						'</a>' +
					'</div>' +
				'</header>' +
				'<div class="st-sh-edit-note" role="status">' +
					'<span class="st-sh-edit-note-icon">' + this._icon("drag", "sm") + '</span>' +
					'<span>' + __("Drag widgets to rearrange them. Your layout saves automatically.") + '</span>' +
				'</div>' +
				'<div class="st-sh-widget-grid" id="st-sh-widget-grid"></div>' +
			'</main>'
		);
	}

	/* ── 4. WIDGET REGISTRY / FACTORIES ──────────────────────────────────────
	   Permission-safe KPI definitions and standard panels share one grid. */
	_render_widgets() {
		var $grid = this.$body.find("#st-sh-widget-grid");
		var self = this;

		/* KPI cards are individual widgets rather than one fixed KPI row. */
		this.kpis.forEach(function (kpi) {
			$grid.append(self._kpi_widget(kpi));
		});

		$grid.append(
			this._panel_widget(
				"recent-documents",
				__("Recent Documents"),
				__("Records you opened lately"),
				"clock",
				"wide",
				'<div id="st-sh-recent" class="st-sh-card-body"><div class="st-sh-spin"></div></div>'
			)
		);
		$grid.append(
			this._panel_widget(
				"quick-create",
				__("Quick Create"),
				__("Start something new"),
				"add",
				"half",
				'<div id="st-sh-qc" class="st-sh-card-body"></div>'
			)
		);
		$grid.append(
			this._panel_widget(
				"needs-attention",
				__("Needs Attention"),
				__("Items waiting on action"),
				"warning",
				"half",
				'<div id="st-sh-pending" class="st-sh-card-body"><div class="st-sh-spin"></div></div>'
			)
		);

		this._render_quick_create();
	}

	/* Shared wrapper: ID is persisted; size maps to a responsive CSS grid span. */
	_widget_shell(id, size, inner, extra_class) {
		return (
			'<section class="st-sh-widget ' + (extra_class || "") + '" ' +
				'data-widget-id="' + this._esc(id) + '" data-widget-size="' + size + '" draggable="false">' +
				'<div class="st-sh-drag-tools">' +
					'<button class="st-sh-move st-sh-move-back" type="button" title="' + __("Move backward") + '" aria-label="' + __("Move backward") + '">' +
						'&larr;' +
					'</button>' +
					'<button class="st-sh-drag-handle" type="button" title="' + __("Drag to rearrange") + '" aria-label="' + __("Drag to rearrange") + '">' +
						'<span></span><span></span><span></span><span></span><span></span><span></span>' +
					'</button>' +
					'<button class="st-sh-move st-sh-move-forward" type="button" title="' + __("Move forward") + '" aria-label="' + __("Move forward") + '">' +
						'&rarr;' +
					'</button>' +
				'</div>' +
				inner +
			'</section>'
		);
	}

	/* KPI content remains a normal Desk link outside customization mode. */
	_kpi_widget(kpi) {
		var inner =
			'<a href="' + kpi.route + '" class="st-sh-kpi-link" tabindex="0">' +
				'<div class="st-sh-kpi-top">' +
					'<span class="st-sh-kpi-icon">' + this._icon(kpi.icon, "md") + '</span>' +
					'<span class="st-sh-kpi-trend" aria-hidden="true">&nearr;</span>' +
				'</div>' +
				'<div class="st-sh-kpi-num" data-kpi-value>—</div>' +
				'<div class="st-sh-kpi-label">' + kpi.label + '</div>' +
			'</a>';

		return this._widget_shell(
			kpi.id,
			"quarter",
			inner,
			"st-sh-kpi st-sh-tone-" + kpi.accent
		);
	}

	/* Common frame keeps operational panel markup and drag controls consistent. */
	_panel_widget(id, title, subtitle, icon, size, body) {
		var inner =
			'<div class="st-sh-card">' +
				'<div class="st-sh-card-head">' +
					'<div class="st-sh-card-heading">' +
						'<span class="st-sh-card-icon">' + this._icon(icon, "sm") + '</span>' +
						'<div><h3>' + title + '</h3><p>' + subtitle + '</p></div>' +
					'</div>' +
				'</div>' +
				body +
			'</div>';
		return this._widget_shell(id, size, inner, "st-sh-panel-widget");
	}

	/* Filter before rendering so inaccessible DocTypes never enter the DOM. */
	_get_kpi_definitions() {
		var can_read = ((frappe.boot && frappe.boot.user && frappe.boot.user.can_read) || []);
		return [
			{
				id: "unpaid-invoices",
				label: __("Unpaid Invoices"),
				dt: "Sales Invoice",
				filters: { status: ["in", ["Unpaid", "Overdue"]], docstatus: 1 },
				route: "/desk/sales-invoice?status=Unpaid",
				icon: "file-text",
				accent: "amber",
			},
			{
				id: "open-orders",
				label: __("Open Orders"),
				dt: "Sales Order",
				filters: { status: ["in", ["To Deliver and Bill", "To Bill", "To Deliver"]], docstatus: 1 },
				route: "/desk/sales-order",
				icon: "shopping-cart",
				accent: "blue",
			},
			{
				id: "open-tasks",
				label: __("Open Tasks"),
				dt: "Task",
				filters: { status: "Open" },
				route: "/desk/task?status=Open",
				icon: "list-todo",
				accent: "green",
			},
			{
				id: "my-todos",
				label: __("My ToDos"),
				dt: "ToDo",
				filters: { status: "Open" },
				route: "/desk/todo?status=Open",
				icon: "circle-check",
				accent: "coral",
			},
		].filter(function (kpi) {
			return can_read.indexOf(kpi.dt) !== -1;
		});
	}

	/* ── 5. LAYOUT EDITING / DRAG AND DROP ───────────────────────────────────
	   HTML5 drag handles pointer reordering; arrows provide a keyboard fallback. */
	_bind_layout_events() {
		var self = this;
		var $grid = this.$body.find("#st-sh-widget-grid");

		/* Links are disabled while editing to prevent accidental navigation. */
		this.$body.on("click.st_sh_layout", ".st-sh-customize", function () {
			self._set_editing(!self.editing);
		});

		this.$body.on("click.st_sh_layout", ".st-sh-reset", function () {
			frappe.confirm(__("Reset your Smart Home widget order?"), function () {
				try {
					localStorage.removeItem(self.storage_key);
				} catch (e) {}
				self._restore_layout();
				self._announce_saved(__("Default layout restored"));
			});
		});

		/* Move the existing node so loaded values and event bindings survive. */
		this.$body.on("click.st_sh_layout", ".st-sh-move", function (event) {
			event.preventDefault();
			event.stopPropagation();
			var widget = this.closest(".st-sh-widget");
			if (!widget || !self.editing) return;
			if (this.classList.contains("st-sh-move-back") && widget.previousElementSibling) {
				widget.parentNode.insertBefore(widget, widget.previousElementSibling);
			} else if (
				this.classList.contains("st-sh-move-forward") &&
				widget.nextElementSibling
			) {
				widget.parentNode.insertBefore(widget.nextElementSibling, widget);
			}
			self._save_layout();
			widget.focus({ preventScroll: true });
		});

		this.$body.on("click.st_sh_layout", ".st-sh-widget a", function (event) {
			if (self.editing) {
				event.preventDefault();
				event.stopPropagation();
			}
		});

		/* Keep one active source and expose a stable ID to browser drag tooling. */
		$grid.on("dragstart.st_sh_layout", ".st-sh-widget", function (event) {
			if (!self.editing) {
				event.preventDefault();
				return;
			}
			self.dragged = this;
			this.classList.add("st-sh-dragging");
			var original = event.originalEvent;
			if (original && original.dataTransfer) {
				original.dataTransfer.effectAllowed = "move";
				original.dataTransfer.setData("text/plain", this.dataset.widgetId);
			}
		});

		/* Pointer midpoint decides whether insertion occurs before or after. */
		$grid.on("dragover.st_sh_layout", ".st-sh-widget", function (event) {
			if (!self.dragged || this === self.dragged) return;
			event.preventDefault();
			$grid.find(".st-sh-drop-before, .st-sh-drop-after")
				.removeClass("st-sh-drop-before st-sh-drop-after");
			var original = event.originalEvent;
			var rect = this.getBoundingClientRect();
			var after = original.clientY > rect.top + rect.height / 2;
			this.classList.add(after ? "st-sh-drop-after" : "st-sh-drop-before");
		});

		$grid.on("drop.st_sh_layout", ".st-sh-widget", function (event) {
			if (!self.dragged || this === self.dragged) return;
			event.preventDefault();
			var target = this;
			var put_after = target.classList.contains("st-sh-drop-after");
			target.parentNode.insertBefore(
				self.dragged,
				put_after ? target.nextElementSibling : target
			);
			self._finish_drag(true);
		});

		$grid.on("dragend.st_sh_layout", ".st-sh-widget", function () {
			self._finish_drag(false);
		});
	}

	/* Toggle every edit-only affordance from one authoritative state. */
	_set_editing(enabled) {
		this.editing = enabled === true;
		var $home = this.$body.find(".st-smart-home");
		var $button = this.$body.find(".st-sh-customize");
		$home.toggleClass("st-sh-is-editing", this.editing);
		$button.attr("aria-pressed", this.editing ? "true" : "false");
		$button.find(".st-sh-customize-label").text(
			this.editing ? __("Done") : __("Customize layout")
		);
		this.$body.find(".st-sh-widget").attr("draggable", this.editing ? "true" : "false");
		if (this.editing) {
			this.$body.find(".st-sh-widget").attr("tabindex", "0").first().focus();
		} else {
			this.$body.find(".st-sh-widget").removeAttr("tabindex");
		}
	}

	/* Clear transient markers after cancel; persist only a successful drop. */
	_finish_drag(save) {
		this.$body.find(".st-sh-widget")
			.removeClass("st-sh-dragging st-sh-drop-before st-sh-drop-after");
		this.dragged = null;
		if (save) this._save_layout();
	}

	/* ── 6. PER-USER LAYOUT PERSISTENCE ──────────────────────────────────────
	   Only stable IDs are stored; content and permissions remain authoritative. */
	_save_layout() {
		var order = this.$body.find(".st-sh-widget").map(function () {
			return this.dataset.widgetId;
		}).get();
		try {
			localStorage.setItem(this.storage_key, JSON.stringify({ order: order }));
		} catch (e) {}
		this._announce_saved(__("Layout saved"));
	}

	_restore_layout() {
		var $grid = this.$body.find("#st-sh-widget-grid");
		var saved = null;
		try {
			saved = JSON.parse(localStorage.getItem(this.storage_key) || "null");
		} catch (e) {}

		var order = saved && Array.isArray(saved.order) ? saved.order : [];
		var known = {};
		$grid.children(".st-sh-widget").each(function () {
			known[this.dataset.widgetId] = this;
		});
		order.forEach(function (id) {
			if (known[id]) $grid.append(known[id]);
		});

		/* Newly-added or newly-permitted widgets append instead of disappearing
		   from an older saved layout that does not know their IDs. */
		Object.keys(known).forEach(function (id) {
			if (order.indexOf(id) === -1) $grid.append(known[id]);
		});
	}

	/* Inline feedback avoids showing a global toast after every small movement. */
	_announce_saved(message) {
		var $state = this.$body.find(".st-sh-save-state");
		$state.text(message).addClass("is-visible");
		clearTimeout(this._save_timer);
		this._save_timer = setTimeout(function () {
			$state.removeClass("is-visible");
		}, 1800);
	}

	/* ── 7. LIVE KPI COUNTS ──────────────────────────────────────────────────
	   Requests are independent so one failed DocType cannot block other KPIs. */
	_refresh_kpis() {
		var self = this;
		this.kpis.forEach(function (kpi) {
			var $num = self.$body
				.find('[data-widget-id="' + kpi.id + '"] [data-kpi-value]');
			frappe.call({
				method: "frappe.client.get_count",
				args: { doctype: kpi.dt, filters: kpi.filters },
				callback: function (response) {
					$num.text(response.message !== undefined ? response.message : "—");
				},
				error: function () {
					$num.text("—");
				},
			});
		});
	}

	/* ── 8. RECENT DOCUMENTS ─────────────────────────────────────────────────
	   Route history is instant and avoids an unnecessary server-side query. */
	_refresh_recent() {
		var $container = this.$body.find("#st-sh-recent");
		var history = (frappe.route_history || []).slice().reverse();
		var seen = {};
		var items = [];

		/* De-duplicate repeated visits while retaining most-recent-first order. */
		for (var index = 0; index < history.length && items.length < 8; index++) {
			var route = history[index];
			if (
				route[0] === "Form" &&
				route[1] &&
				route[2] &&
				!String(route[2]).startsWith("new-")
			) {
				var key = route[1] + "::" + route[2];
				if (!seen[key]) {
					seen[key] = true;
					items.push({ doctype: route[1], name: route[2] });
				}
			}
		}

		if (!items.length) {
			$container.html(
				'<div class="st-sh-empty">' +
					this._icon("clock", "md") +
					'<span>' + __("No recent documents yet. Open a record and it will appear here.") + '</span>' +
				'</div>'
			);
			return;
		}

		var self = this;
		$container.html(items.map(function (item) {
			var slug = frappe.router.slug(item.doctype);
			var url = "/desk/" + slug + "/" + encodeURIComponent(item.name);
			return (
				'<a href="' + url + '" class="st-sh-doc-row">' +
					'<span class="st-sh-doc-mark"></span>' +
					'<span class="st-sh-doc-copy">' +
						'<span class="st-sh-doc-name">' + self._esc(item.name) + '</span>' +
						'<span class="st-sh-doc-dt">' + self._esc(__(item.doctype)) + '</span>' +
					'</span>' +
					'<span class="st-sh-row-arrow" aria-hidden="true">&rarr;</span>' +
				'</a>'
			);
		}).join(""));
	}

	/* ── 9. QUICK CREATE ─────────────────────────────────────────────────────
	   Static session permissions determine a compact, predictable action list. */
	_render_quick_create() {
		var $container = this.$body.find("#st-sh-qc");
		var can_create = ((frappe.boot && frappe.boot.user && frappe.boot.user.can_create) || []);
		var order = [
			"Sales Invoice", "Quotation", "Sales Order", "Purchase Order",
			"Purchase Invoice", "Expense Claim", "Leave Application",
			"Customer", "Supplier", "Task", "ToDo",
		];
		var items = order.filter(function (doctype) {
			return can_create.indexOf(doctype) !== -1;
		}).slice(0, 6);

		if (!items.length) {
			$container.html('<div class="st-sh-empty"><span>' + __("No create permissions found.") + '</span></div>');
			return;
		}

		$container.html('<div class="st-sh-qc-grid">' + items.map(function (doctype) {
			var slug = frappe.router.slug(doctype);
			return (
				'<a href="/desk/' + slug + '/new" class="st-sh-qc-item">' +
					'<span class="st-sh-qc-plus">+</span>' +
					'<span>' + __(doctype) + '</span>' +
				'</a>'
			);
		}).join("") + '</div>');
	}

	/* ── 10. NEEDS ATTENTION ─────────────────────────────────────────────────
	   Permission-safe counts run in parallel and render as one settled batch. */
	_refresh_pending() {
		var $container = this.$body.find("#st-sh-pending");
		var can_read = ((frappe.boot && frappe.boot.user && frappe.boot.user.can_read) || []);
		var checks = [
			{
				dt: "Sales Invoice",
				filters: { status: "Overdue", docstatus: 1 },
				label: __("{0} overdue sales invoices"),
				route: "/desk/sales-invoice?status=Overdue",
			},
			{
				dt: "Purchase Order",
				filters: { status: "To Receive and Bill", docstatus: 1 },
				label: __("{0} pending purchase orders"),
				route: "/desk/purchase-order",
			},
			{
				dt: "Leave Application",
				filters: { status: "Open", docstatus: 0 },
				label: __("{0} leave applications awaiting approval"),
				route: "/desk/leave-application?status=Open",
			},
			{
				dt: "Expense Claim",
				filters: { status: "Draft", docstatus: 0 },
				label: __("{0} expense claims pending"),
				route: "/desk/expense-claim",
			},
		].filter(function (check) {
			return can_read.indexOf(check.dt) !== -1;
		});

		if (!checks.length) {
			this._render_all_clear($container);
			return;
		}

		var complete = 0;
		var found = [];
		var self = this;

		/* Shared completion count allows parallel requests and a single redraw. */
		checks.forEach(function (check) {
			frappe.call({
				method: "frappe.client.get_count",
				args: { doctype: check.dt, filters: check.filters },
				callback: function (response) {
					if (response.message > 0) {
						found.push({
							count: response.message,
							message: check.label.replace("{0}", response.message),
							route: check.route,
						});
					}
					if (++complete === checks.length) self._render_attention($container, found);
				},
				error: function () {
					if (++complete === checks.length) self._render_attention($container, found);
				},
			});
		});
	}

	/* Non-zero results become actionable rows after the request batch settles. */
	_render_attention($container, found) {
		if (!found.length) {
			this._render_all_clear($container);
			return;
		}
		var self = this;
		$container.html(found.map(function (item) {
			return (
				'<a href="' + item.route + '" class="st-sh-pending-row">' +
					'<span class="st-sh-pending-count">' + self._esc(item.count) + '</span>' +
					'<span>' + self._esc(item.message) + '</span>' +
					'<span class="st-sh-row-arrow" aria-hidden="true">&rarr;</span>' +
				'</a>'
			);
		}).join(""));
	}

	/* Positive empty state makes a zero-result attention widget intentional. */
	_render_all_clear($container) {
		$container.html(
			'<div class="st-sh-all-clear">' +
				'<span class="st-sh-clear-check">✓</span>' +
				'<div><strong>' + __("All clear") + '</strong><span>' +
					__("Nothing needs your attention right now.") +
				'</span></div>' +
			'</div>'
		);
	}

	/* ── 11. SAFE UI HELPERS ─────────────────────────────────────────────────
	   Icon lookup fails softly across Frappe versions; dynamic text is escaped. */
	_icon(name, size) {
		try {
			return frappe.utils.icon(name, size || "sm") || "";
		} catch (e) {
			return "";
		}
	}

	_esc(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}
};
