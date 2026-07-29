/* Solvronix Desk — visual theme editor */
frappe.provide("solvronix_desk");

frappe.pages["theme-studio"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Theme Studio"),
		single_column: true,
	});
	var studio = new solvronix_desk.ThemeStudio(wrapper, page);
	frappe.pages["theme-studio"].studio = studio;
	studio.load();
};

frappe.pages["theme-studio"].on_page_show = function () {
	var studio = frappe.pages["theme-studio"].studio;
	if (studio) {
		studio.refresh_if_clean();
		if (studio.dirty) studio.apply();
	}
};

frappe.pages["theme-studio"].on_page_hide = function () {
	var studio = frappe.pages["theme-studio"].studio;
	if (studio) studio.remove_draft();
};

solvronix_desk.ThemeStudio = class ThemeStudio {
	constructor(wrapper, page) {
		this.wrapper = $(wrapper);
		this.page = page;
		this.config = null;
		this.saved = null;
		this.history = [];
		this.future = [];
		this.dirty = false;
		this.dragged = null;
	}

	load() {
		var self = this;
		this.page.set_primary_action(__("Publish theme"), function () { self.save(); }, "check");
		this.page.add_menu_item(__("Open Theme Settings"), function () {
			frappe.set_route("Form", "Theme Settings");
		});
		this.page.add_menu_item(__("Reset to saved"), function () { self.reset(); });
		this.$root = $('<div class="sts-loading"><div class="sts-loader"></div><span>' +
			__("Preparing your studio…") + "</span></div>").appendTo(this.wrapper.find(".page-content"));

		frappe.call({
			method: "solvronix_desk.api.get_theme_config",
			callback: function (r) {
				if (!r.message) return;
				self.config = self._clone(r.message);
				self.saved = self._clone(r.message);
				self.render();
			},
			error: function () {
				self.$root.html('<div class="sts-error">' + __("Theme Studio could not be loaded.") + "</div>");
			},
		});
	}

	refresh_if_clean() {
		if (!this.config || this.dirty) return;
		var self = this;
		frappe.call({
			method: "solvronix_desk.api.get_theme_config",
			callback: function (r) {
				if (!r.message) return;
				self.config = self._clone(r.message);
				self.saved = self._clone(r.message);
				self.apply();
			},
		});
	}

	render() {
		this.$root.removeClass("sts-loading").addClass("st-theme-studio").html(
			'<aside class="sts-controls">' +
				'<div class="sts-eyebrow">' + __("DESIGN SYSTEM") + "</div>" +
				'<h2>' + __("Make it unmistakably yours.") + "</h2>" +
				'<p class="sts-intro">' + __("Tune every visual token and arrange the preview by dragging its blocks.") + "</p>" +
				this._preset_html() +
				'<div class="sts-section">' +
					'<div class="sts-section-title"><span>01</span>' + __("Color language") + "</div>" +
					this._color_control("brand_color", __("Brand"), false) +
					this._color_control("accent_color", __("Accent"), false) +
					this._color_control("sidebar_background", __("Sidebar"), true) +
					this._color_control("navbar_background", __("Top bar"), true) +
					this._color_control("page_background", __("Canvas"), true) +
					this._color_control("card_background", __("Cards"), true) +
					this._color_control("text_color", __("Text"), true) +
				"</div>" +
				'<div class="sts-section">' +
					'<div class="sts-section-title"><span>02</span>' + __("Shape & depth") + "</div>" +
					this._range_control("corner_radius", __("Corner radius"), 0, 24, "px") +
					this._range_control("sidebar_width", __("Sidebar width"), 200, 320, "px") +
					'<label class="sts-label">' + __("Card shadow") + "</label>" +
					'<div class="sts-segments" data-setting="shadow_style">' +
						["None", "Soft", "Elevated"].map(function (name) {
							return '<button type="button" data-value="' + name + '">' + __(name) + "</button>";
						}).join("") +
					"</div>" +
				"</div>" +
			"</aside>" +
			'<main class="sts-workbench">' +
				'<div class="sts-toolbar">' +
					'<div class="sts-device-switch" role="group" aria-label="' + __("Preview size") + '">' +
						'<button class="active" data-device="desktop" title="' + __("Desktop") + '">' + this._icon("desktop") + "</button>" +
						'<button data-device="tablet" title="' + __("Tablet") + '">' + this._icon("tablet") + "</button>" +
						'<button data-device="mobile" title="' + __("Mobile") + '">' + this._icon("mobile") + "</button>" +
					"</div>" +
					'<div class="sts-toolbar-note"><i></i>' + __("Live preview") + "</div>" +
					'<div class="sts-history">' +
						'<button data-action="undo" title="' + __("Undo") + '">' + this._icon("undo") + "</button>" +
						'<button data-action="redo" title="' + __("Redo") + '">' + this._icon("redo") + "</button>" +
					"</div>" +
				"</div>" +
				'<div class="sts-stage">' +
					'<div class="sts-preview-frame" id="st-theme-studio-preview">' +
						'<div class="sts-browser-bar"><span></span><span></span><span></span><div>desk.solvronix.local</div></div>' +
						this._navbar_html() +
						'<div class="sts-app-shell">' +
							this._sidebar_html() +
							'<div class="sts-preview-main">' +
								'<div class="sts-preview-page">' +
									'<div class="sts-preview-heading"><div><small>' + __("WORKSPACE") + '</small><h3>' + __("Good morning, Ayesha") + '</h3></div><button>' + __("Create new") + "</button></div>" +
									'<div class="sts-drop-hint">' + this._icon("move") + __("Drag cards to rearrange your layout") + "</div>" +
									'<div class="sts-canvas" id="sts-canvas"></div>' +
								"</div>" +
							"</div>" +
						"</div>" +
					"</div>" +
				"</div>" +
			"</main>"
		);
		this.$preview = this.$root.find("#st-theme-studio-preview");
		this.$canvas = this.$root.find("#sts-canvas");
		this.bind();
		this.render_blocks();
		this.apply();
	}

	_preset_html() {
		var presets = [
			["Solvronix", "#1B3F7E", "#F57C00"],
			["Forest", "#173F35", "#D59A28"],
			["Graphite", "#20242D", "#D06442"],
			["Plum", "#552C5B", "#E7A83E"],
		];
		return '<div class="sts-presets"><label class="sts-label">' + __("Starting points") + "</label><div>" +
			presets.map(function (p) {
				return '<button type="button" class="sts-preset" data-brand="' + p[1] + '" data-accent="' + p[2] +
					'" title="' + p[0] + '"><i style="--a:' + p[1] + ";--b:" + p[2] + '"></i><span>' + p[0] + "</span></button>";
			}).join("") + "</div></div>";
	}

	_color_control(key, optional) {
		var value = this.config[key] || (key === "brand_color" ? "#1B3F7E" : key === "accent_color" ? "#F57C00" : "#FFFFFF");
		return '<div class="sts-color-row" data-control="' + key + '">' +
			'<label for="sts-' + key + '">' + this._label_for(key) + "</label>" +
			'<div><input id="sts-' + key + '" type="color" value="' + value + '" data-setting="' + key + '">' +
			'<input class="sts-hex" type="text" value="' + (this.config[key] || "") + '" placeholder="' +
				(optional ? __("Auto") : value) + '" data-hex="' + key + '" maxlength="7" spellcheck="false">' +
			(optional ? '<button type="button" class="sts-auto" data-clear="' + key + '" title="' + __("Use automatic value") + '">×</button>' : "") +
			"</div></div>";
	}

	_label_for(key) {
		var labels = {
			brand_color: __("Brand"), accent_color: __("Accent"),
			sidebar_background: __("Sidebar"), navbar_background: __("Top bar"),
			page_background: __("Canvas"), card_background: __("Cards"), text_color: __("Text"),
		};
		return labels[key] || key;
	}

	_range_control(key, label, min, max, unit) {
		return '<div class="sts-range-row"><div><label for="sts-' + key + '">' + label +
			'</label><output data-output="' + key + '">' + this.config[key] + unit + "</output></div>" +
			'<input id="sts-' + key + '" type="range" min="' + min + '" max="' + max +
			'" value="' + this.config[key] + '" data-setting="' + key + '"></div>';
	}

	_sidebar_html() {
		return '<aside class="sts-preview-sidebar">' +
			'<button type="button" class="sts-preview-logo sts-sidebar-toggle" title="' + __("Expand or collapse sidebar") + '"><b>S</b><span>Solvronix</span></button>' +
			'<nav><small>' + __("MAIN") + '</small><a class="active">' + this._icon("home") + "<span>" + __("Overview") + "</span></a>" +
			'<a>' + this._icon("chart") + "<span>" + __("Analytics") + "</span></a>" +
			'<a>' + this._icon("invoice") + "<span>" + __("Invoices") + "</span></a>" +
			'<a>' + this._icon("users") + "<span>" + __("Customers") + "</span></a></nav>" +
			'<button type="button" class="sts-preview-collapse sts-sidebar-toggle">' + this._icon("collapse") + '<span>' + __("Collapse") + "</span></button>" +
		"</aside>";
	}

	_navbar_html() {
		return '<header class="sts-preview-nav"><div class="sts-toolbar-left">' +
			'<time>10:42:18</time><i></i><a>☼ ' + __("Today’s View") + '</a></div>' +
			'<div class="sts-nav-actions"><button>◎ EN⌄</button><button>•••</button>' +
			'<span class="sts-avatar">AK</span></div></header>';
	}

	render_blocks() {
		var blocks = {
			metrics:
				'<section class="sts-block sts-metrics" draggable="true" data-block="metrics"><div class="sts-drag">' + this._icon("grip") + "</div>" +
				[["Revenue", "$84.2k", "+12.4%"], ["Invoices", "128", "+8.1%"], ["Customers", "846", "+4.6%"]].map(function (m, i) {
					return '<article><div class="sts-metric-icon m' + i + '"></div><small>' + __(m[0]) + "</small><strong>" + m[1] +
						'</strong><em>' + m[2] + "</em></article>";
				}).join("") + "</section>",
			chart:
				'<section class="sts-block sts-chart-card" draggable="true" data-block="chart"><div class="sts-drag">' + this._icon("grip") +
				'</div><div class="sts-card-head"><div><strong>' + __("Revenue overview") + "<small>" + __("Last 6 months") +
				'</small></strong></div><button>•••</button></div><div class="sts-chart"><span style="--h:42%"></span><span style="--h:64%"></span>' +
				'<span style="--h:53%"></span><span style="--h:82%"></span><span style="--h:68%"></span><span style="--h:91%"></span></div>' +
				'<div class="sts-chart-labels"><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span></div></section>',
			activity:
				'<section class="sts-block sts-activity" draggable="true" data-block="activity"><div class="sts-drag">' + this._icon("grip") +
				'</div><div class="sts-card-head"><strong>' + __("Recent activity") + '</strong><a>' + __("View all") + '</a></div>' +
				'<div class="sts-activity-row"><i>SI</i><span><b>INV-2026-0841</b><small>' + __("Sales invoice · 2 min ago") + '</small></span><strong>$2,480</strong></div>' +
				'<div class="sts-activity-row"><i>PO</i><span><b>PO-2026-0138</b><small>' + __("Purchase order · 18 min ago") + '</small></span><strong>$980</strong></div></section>',
			quick_actions:
				'<section class="sts-block sts-quick-actions" draggable="true" data-block="quick_actions"><div class="sts-drag">' + this._icon("grip") +
				'</div><div class="sts-card-head"><strong>' + __("Quick actions") + '</strong></div><div><button>＋ ' + __("Invoice") +
				'</button><button>＋ ' + __("Customer") + '</button><button>＋ ' + __("Task") + "</button></div></section>",
		};
		var self = this;
		this.$canvas.html(this.config.layout.map(function (key) { return blocks[key]; }).join(""));
		this.$canvas.find(".sts-block").each(function () {
			this.addEventListener("dragstart", function () {
				self.dragged = this;
				this.classList.add("dragging");
			});
			this.addEventListener("dragend", function () {
				this.classList.remove("dragging");
				self.dragged = null;
				self._sync_layout();
			});
			this.addEventListener("dragover", function (e) {
				e.preventDefault();
				if (!self.dragged || self.dragged === this) return;
				var rect = this.getBoundingClientRect();
				var after = e.clientY > rect.top + rect.height / 2;
				self.$canvas[0].insertBefore(self.dragged, after ? this.nextSibling : this);
			});
		});
	}

	bind() {
		var self = this;
		this.$root.on("input change", "[data-setting]", function () {
			var key = $(this).data("setting");
			self._checkpoint();
			if (this.type === "color") {
				self.config[key] = this.value.toUpperCase();
				self.$root.find('[data-hex="' + key + '"]').val(self.config[key]);
			} else if (this.type === "range") {
				self.config[key] = parseInt(this.value, 10);
				self.$root.find('[data-output="' + key + '"]').text(this.value + "px");
			}
			self.changed();
		});
		this.$root.on("change", "[data-hex]", function () {
			var key = $(this).data("hex");
			var value = String(this.value || "").trim().toUpperCase();
			if (value && !/^#[0-9A-F]{6}$/.test(value)) {
				frappe.show_alert({ message: __("Use a six-digit hex color, for example #1B3F7E"), indicator: "orange" });
				$(this).val(self.config[key] || "");
				return;
			}
			self._checkpoint();
			self.config[key] = value;
			if (value) self.$root.find("#sts-" + key).val(value);
			self.changed();
		});
		this.$root.on("click", "[data-clear]", function () {
			var key = $(this).data("clear");
			self._checkpoint();
			self.config[key] = "";
			self.$root.find('[data-hex="' + key + '"]').val("");
			self.changed();
		});
		this.$root.on("click", ".sts-preset", function () {
			self._checkpoint();
			self.config.brand_color = $(this).data("brand");
			self.config.accent_color = $(this).data("accent");
			self.$root.find("#sts-brand_color").val(self.config.brand_color);
			self.$root.find('[data-hex="brand_color"]').val(self.config.brand_color);
			self.$root.find("#sts-accent_color").val(self.config.accent_color);
			self.$root.find('[data-hex="accent_color"]').val(self.config.accent_color);
			self.changed();
		});
		this.$root.on("click", ".sts-segments button", function () {
			self._checkpoint();
			self.config.shadow_style = $(this).data("value");
			self.changed();
		});
		this.$root.on("click", "[data-device]", function () {
			self.$root.find("[data-device]").removeClass("active");
			$(this).addClass("active");
			self.$preview.attr("data-device", $(this).data("device"));
		});
		this.$root.on("click", ".sts-sidebar-toggle", function () {
			self.$preview.find(".sts-preview-sidebar").toggleClass("is-expanded");
		});
		this.$root.on("click", '[data-action="undo"]', function () { self.undo(); });
		this.$root.on("click", '[data-action="redo"]', function () { self.redo(); });
	}

	_sync_layout() {
		var next = this.$canvas.children("[data-block]").map(function () { return $(this).data("block"); }).get();
		if (JSON.stringify(next) === JSON.stringify(this.config.layout)) return;
		this._checkpoint();
		this.config.layout = next;
		this.changed(false);
	}

	_checkpoint() {
		if (!this.config) return;
		var snapshot = JSON.stringify(this.config);
		if (this.history[this.history.length - 1] !== snapshot) this.history.push(snapshot);
		if (this.history.length > 40) this.history.shift();
		this.future = [];
	}

	undo() {
		if (!this.history.length) return;
		this.future.push(JSON.stringify(this.config));
		this.config = JSON.parse(this.history.pop());
		this._refresh_controls();
	}

	redo() {
		if (!this.future.length) return;
		this.history.push(JSON.stringify(this.config));
		this.config = JSON.parse(this.future.pop());
		this._refresh_controls();
	}

	_refresh_controls() {
		var self = this;
		Object.keys(this.config).forEach(function (key) {
			self.$root.find('[data-setting="' + key + '"]').val(self.config[key]);
			self.$root.find('[data-hex="' + key + '"]').val(self.config[key]);
			self.$root.find('[data-output="' + key + '"]').text(self.config[key] + "px");
		});
		this.render_blocks();
		this.changed(false);
	}

	changed(mark) {
		if (mark !== false) this.dirty = true;
		this.dirty = JSON.stringify(this.config) !== JSON.stringify(this.saved);
		this.apply();
		this.$root.toggleClass("is-dirty", this.dirty);
		this.page.btn_primary && this.page.btn_primary.toggleClass("btn-warning", this.dirty);
	}

	apply() {
		if (!this.config || !this.$preview) return;
		var c = this.config;
		var shadow = {
			None: "none",
			Soft: "0 10px 28px rgba(22,28,45,.09)",
			Elevated: "0 18px 42px rgba(22,28,45,.17)",
		}[c.shadow_style] || "none";
		this.$preview.css({
			"--studio-brand": c.brand_color,
			"--studio-accent": c.accent_color,
			"--studio-sidebar": c.sidebar_background || "#FFFFFF",
			"--studio-navbar": c.navbar_background || "color-mix(in srgb, " + c.brand_color + " 40%, black)",
			"--studio-page": c.page_background || "#F3F5F7",
			"--studio-card": c.card_background || "#FFFFFF",
			"--studio-text": c.text_color || "#19202D",
			"--studio-radius": c.corner_radius + "px",
			"--studio-sidebar-width": c.sidebar_width + "px",
			"--studio-shadow": shadow,
			"--studio-sidebar-text": this._contrast(c.sidebar_background || "#FFFFFF"),
			"--studio-toolbar-text": this._contrast(c.navbar_background || c.brand_color),
		});
		this.$root.find(".sts-segments button").removeClass("active")
			.filter('[data-value="' + c.shadow_style + '"]').addClass("active");
		this.$root.find('[data-action="undo"]').prop("disabled", !this.history.length);
		this.$root.find('[data-action="redo"]').prop("disabled", !this.future.length);
		this._apply_draft_to_desk();
	}

	save() {
		if (!this.config || !this.dirty) {
			frappe.show_alert({ message: __("Theme is already up to date"), indicator: "blue" });
			return;
		}
		var self = this;
		this.page.btn_primary.prop("disabled", true);
		frappe.call({
			method: "solvronix_desk.api.save_theme_config",
			args: { config: this.config },
			freeze: true,
			freeze_message: __("Publishing your theme…"),
			callback: function (r) {
				if (!r.message) return;
				self.config = self._clone(r.message.config);
				self.saved = self._clone(r.message.config);
				self.history = [];
				self.future = [];
				self.dirty = false;
				self.changed(false);
				self._inject_global_css(r.message.css);
				self.remove_draft();
				frappe.show_alert({ message: __("Theme published for everyone"), indicator: "green" }, 4);
			},
			always: function () { self.page.btn_primary.prop("disabled", false); },
		});
	}

	reset() {
		if (!this.saved) return;
		this._checkpoint();
		this.config = this._clone(this.saved);
		this._refresh_controls();
	}

	_inject_global_css(css) {
		if (!css) return;
		var el = document.getElementById("st-dynamic-theme") || document.getElementById("st-inline-theme");
		if (!el) {
			el = document.createElement("style");
			el.id = "st-dynamic-theme";
			document.head.appendChild(el);
		}
		el.textContent = css;
		try { localStorage.setItem("st_theme_css", css); } catch (e) {}
	}

	_apply_draft_to_desk() {
		if (!this.config) return;
		var c = this.config;
		var declarations = [
			"--st-brand:" + c.brand_color,
			"--st-primary:" + c.brand_color,
			"--st-accent:" + c.accent_color,
			"--st-radius:" + c.corner_radius + "px",
			"--st-radius-sm:" + Math.max(0, c.corner_radius - 2) + "px",
			"--st-radius-lg:" + (c.corner_radius + 4) + "px",
			"--st-sidebar-width:" + c.sidebar_width + "px",
			"--sidebar-width:" + c.sidebar_width + "px",
		];
		if (c.sidebar_background) {
			var sidebarText = this._contrast(c.sidebar_background);
			declarations.push("--st-sidebar-bg:" + c.sidebar_background);
			declarations.push("--st-sidebar-text:" + sidebarText);
			declarations.push("--st-sidebar-text-muted:color-mix(in srgb," + sidebarText + " 62%,transparent)");
			declarations.push("--st-sidebar-hover:color-mix(in srgb," + sidebarText + " 9%,transparent)");
			declarations.push("--st-sidebar-border:color-mix(in srgb," + sidebarText + " 12%,transparent)");
		}
		if (c.navbar_background) {
			declarations.push("--st-navbar-bg:" + c.navbar_background);
			declarations.push("--st-toolbar-bg:" + c.navbar_background);
			declarations.push("--st-toolbar-text:" + this._contrast(c.navbar_background));
		}
		if (c.page_background) declarations.push("--st-page-bg:" + c.page_background);
		if (c.card_background) declarations.push("--st-card-bg:" + c.card_background);
		if (c.text_color) {
			declarations.push("--st-text:" + c.text_color);
			declarations.push("--st-text-primary:" + c.text_color);
		}
		var shadow = {
			None: ["none", "none", "none"],
			Soft: [
				"0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06)",
				"0 4px 6px rgba(0,0,0,.07),0 2px 4px rgba(0,0,0,.06)",
				"0 10px 25px rgba(0,0,0,.12),0 4px 10px rgba(0,0,0,.08)",
			],
			Elevated: [
				"0 2px 8px rgba(15,23,42,.10)",
				"0 10px 24px rgba(15,23,42,.14)",
				"0 20px 48px rgba(15,23,42,.18)",
			],
		}[c.shadow_style] || ["none", "none", "none"];
		declarations.push("--st-shadow-sm:" + shadow[0]);
		declarations.push("--st-shadow-md:" + shadow[1]);
		declarations.push("--st-shadow-lg:" + shadow[2]);

		var el = document.getElementById("st-studio-draft");
		if (!el) {
			el = document.createElement("style");
			el.id = "st-studio-draft";
			document.head.appendChild(el);
		}
		var dark = [];
		if (c.sidebar_background) dark.push("--st-sidebar-bg:" + c.sidebar_background);
		if (c.navbar_background) dark.push("--st-navbar-bg:" + c.navbar_background);
		el.textContent = ":root{" + declarations.join(";") + "}" +
			(dark.length ? '[data-theme="dark"]{' + dark.join(";") + "}" : "");
	}

	remove_draft() {
		var el = document.getElementById("st-studio-draft");
		if (el) el.remove();
	}

	_clone(value) { return JSON.parse(JSON.stringify(value)); }

	_contrast(color) {
		var hex = String(color || "").replace("#", "");
		if (!/^[0-9a-f]{6}$/i.test(hex)) return "#19202D";
		var r = parseInt(hex.slice(0, 2), 16);
		var g = parseInt(hex.slice(2, 4), 16);
		var b = parseInt(hex.slice(4, 6), 16);
		return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.62 ? "#19202D" : "#FFFFFF";
	}

	_icon(name) {
		var paths = {
			desktop: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
			tablet: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
			mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
			undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v1"/>',
			redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0-6 6v1"/>',
			move: '<path d="M5 9 2 12l3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
			home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
			chart: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
			invoice: '<path d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 8h6M9 12h6"/>',
			users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
			search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
			bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
			grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
			collapse: '<path d="m15 18-6-6 6-6"/><path d="M21 19V5"/>',
		};
		return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || "") + "</svg>";
	}
};
