/* =============================================================================
   Solvronix Desk — Theme Studio
   Visual token editor, live Desk preview, profiles, history, and deployment.
   ============================================================================= */
frappe.provide("solvronix_desk");

/* ── 1. DECLARATIVE CONTROL SCHEMA ───────────────────────────────────────────
   One definition drives navigation, field rendering, search, and section reset. */
solvronix_desk.theme_studio_sections = [
	{
		id: "colors", title: "Main colours", index: "01",
		description: "Core surfaces, content, links, borders, and semantic status colours.",
		controls: [
			["preferred_mode", "Theme mode", "select", ["Light", "Dark", "Auto"]],
			["brand_color", "Brand / primary", "color"], ["accent_color", "Accent", "color"],
			["page_background", "Page background", "color"], ["card_background", "Card background", "color"],
			["text_color", "Text", "color"], ["muted_text_color", "Muted text", "color"],
			["link_color", "Links", "color"], ["border_color", "Borders", "color"],
			["success_color", "Success", "color"], ["warning_color", "Warning", "color"],
			["error_color", "Error", "color"], ["info_color", "Info", "color"],
		],
	},
	{
		id: "navigation", title: "Navbar & sidebar", index: "02",
		description: "Navigation colours, behaviour, width, icons, active states, and logo placement.",
		controls: [
			["navbar_background", "Top toolbar", "color"], ["toolbar_text_color", "Toolbar text (auto if empty)", "optional-color"],
			["sidebar_background", "Sidebar background", "color"], ["sidebar_text_color", "Sidebar text (auto if empty)", "optional-color"],
			["sidebar_icon_color", "Sidebar icons (auto if empty)", "optional-color"], ["sidebar_active_color", "Active menu", "color"],
			["sidebar_active_text_color", "Active menu text (auto if empty)", "optional-color"],
			["sidebar_hover_color", "Menu hover", "color"], ["sidebar_width", "Expanded width", "range", 200, 360, "px"],
			["sidebar_mode", "Initial sidebar", "select", ["Compact", "Expanded"]],
			["sidebar_auto_collapse", "Auto-collapse on mouse leave", "check"],
			["logo_size", "Logo size", "range", 16, 64, "px"], ["logo_position", "Logo position", "select", ["Left", "Center"]],
		],
	},
	{
		id: "controls", title: "Buttons & fields", index: "03",
		description: "Buttons, inputs, focus treatment, dropdowns, toggles, and disabled states.",
		controls: [
			["primary_button_color", "Primary button", "color"], ["secondary_button_color", "Secondary button", "color"],
			["secondary_button_text", "Secondary button text", "color"], ["button_radius", "Button radius", "range", 0, 24, "px"],
			["button_height", "Button height", "range", 26, 52, "px"], ["button_padding", "Horizontal padding", "range", 6, 30, "px"],
			["input_background", "Input background", "color"], ["input_border_color", "Input border", "color"],
			["focus_color", "Focus colour", "color"], ["checkbox_color", "Checkbox & toggle", "color"],
			["dropdown_background", "Dropdown background", "color"], ["readonly_background", "Read-only background", "color"],
			["disabled_opacity", "Disabled opacity", "range", 20, 80, "%"],
		],
	},
	{
		id: "typography", title: "Typography", index: "04",
		description: "Font family, scale, weights, line-height, labels, tables, and web fonts.",
		controls: [
			["font_family", "Font family", "text"],
			["custom_font_url", "Google / local font stylesheet URL", "text"],
			["base_font_px", "Base font size", "range", 11, 20, "px"],
			["heading_scale", "Heading scale", "range", 100, 180, "%"],
			["font_weight", "Body weight", "select", [300, 400, 500, 600, 700]],
			["line_height", "Line height", "range", 120, 200, "%"],
			["label_font_size", "Form label size", "range", 10, 16, "px"],
			["table_font_size", "Table / report size", "range", 10, 18, "px"],
		],
	},
	{
		id: "data", title: "Cards, lists & tables", index: "05",
		description: "Card depth, table rhythm, row states, report grids, and display density.",
		controls: [
			["shadow_style", "Card shadow", "select", ["None", "Soft", "Elevated"]],
			["card_radius", "Card radius", "range", 0, 30, "px"],
			["list_row_height", "List row height", "range", 28, 64, "px"],
			["alternate_row_color", "Alternate row", "color"], ["table_header_color", "Table header", "color"],
			["selected_row_color", "Selected row", "color"], ["row_hover_color", "Row hover", "color"],
			["density", "Display density", "select", ["Comfortable", "Compact"]],
			["report_grid_color", "Report grid lines", "color"],
		],
	},
	{
		id: "workspace", title: "Workspace & dashboard", index: "06",
		description: "Workspace cards, shortcuts, number cards, charts, icons, width, and empty states.",
		controls: [
			["workspace_card_color", "Workspace cards", "color"], ["shortcut_style", "Shortcut design", "select", ["Solid", "Outline", "Soft"]],
			["number_card_color", "Number cards", "color"], ["chart_background", "Chart background", "color"],
			["chart_palette", "Chart palette", "palette"], ["module_icon_style", "Module icons", "select", ["Plain", "Tinted", "Solid"]],
			["workspace_width", "Workspace width", "range", 900, 1920, "px"],
			["empty_state_style", "Empty states", "select", ["Minimal", "Illustrated"]],
		],
	},
	{
		id: "features", title: "Smart Home & features", index: "07",
		description: "Choose the optional Desk experiences available across the site.",
		controls: [
			["enable_smart_home", "Enable Smart Home as the default Desk page", "check"],
			["enable_command_palette", "Enable Command Palette (Ctrl+K)", "check"],
		],
	},
	{
		id: "branding", title: "Login & branding", index: "08",
		description: "Company identity, login artwork, messages, favicon, footer, and platform credit.",
		controls: [
			["company_logo", "Company logo", "attach-image"], ["favicon", "Favicon", "attach-image"],
			["app_title", "Company / app name", "text"], ["tagline", "Tagline", "text"],
			["login_bg_image", "Login background image", "attach-image"],
			["login_background", "Login background", "color"], ["login_gradient_to", "Gradient end", "color"],
			["login_gradient_angle", "Gradient angle", "range", 0, 360, "°"],
			["login_card_opacity", "Login card opacity", "range", 55, 100, "%"],
			["login_heading", "Welcome heading", "text"], ["login_description", "Welcome description", "textarea"],
			["footer_text", "Footer text", "text"], ["hide_powered", "Hide “Powered by Frappe”", "check"],
		],
	},
	{
		id: "layout", title: "Layout", index: "09",
		description: "Page width, spacing, global shape, sticky regions, and compact forms.",
		controls: [
			["layout_mode", "Page layout", "select", ["Full Width", "Boxed"]],
			["page_margin", "Page margins", "range", 0, 64, "px"],
			["form_column_gap", "Form column gap", "range", 8, 48, "px"],
			["section_spacing", "Section spacing", "range", 8, 64, "px"],
			["corner_radius", "Global radius", "range", 0, 24, "px"],
			["header_height", "Toolbar height", "range", 32, 64, "px"],
			["sticky_navbar", "Sticky top toolbar", "check"], ["sticky_form_toolbar", "Sticky form toolbar", "check"],
			["compact_forms", "Compact forms", "check"],
		],
	},
	{
		id: "accessibility", title: "Accessibility", index: "10",
		description: "WCAG checks, high contrast, large text, focus visibility, and colour-blind palettes.",
		controls: [
			["high_contrast", "High-contrast mode", "check"], ["large_text", "Large text mode", "check"],
			["focus_outline_width", "Focus outline", "range", 1, 5, "px"],
			["colorblind_palette", "Status palette", "select", ["Default", "Deuteranopia", "Protanopia", "Tritanopia"]],
			["enforce_wcag", "Block publish when WCAG AA fails", "check"],
		],
	},
	{
		id: "advanced", title: "Developer options", index: "11",
		description: "Power tools for trusted administrators. Invalid rules can affect Desk functionality.",
		controls: [
			["custom_css", "Custom CSS", "code-css"], ["enable_custom_js", "Enable custom JavaScript", "check"],
			["custom_js", "Custom JavaScript", "code-js"], ["custom_variables", "Custom CSS variables (JSON)", "json"],
			["scoped_rules", "Scoped rules (JSON)", "json"],
			["class_mappings", "Class mappings (JSON)", "json"], ["raw_theme_json", "Raw theme JSON", "raw-json"],
		],
	},
	{
		id: "operations", title: "Profiles & deployment", index: "12",
		description: "Presets, drafts, assignments, versions, import/export, scheduling, and cache controls.",
		controls: [["operations", "Operations", "operations"]],
	},
];

/* ── 2. FRAPPE PAGE LIFECYCLE ────────────────────────────────────────────────
   Preserve unsaved local edits across SPA page shows; remove preview on leave. */
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

/* ── 3. STUDIO CONTROLLER / SERVER STATE ───────────────────────────────────── */
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
		this.state = null;
		this.active_section = "colors";
		this.active_profile = "";
		this.published_profile = "";
		this.selected_inspector = null;
		this.preview_timer = null;
		this.original_dark = document.documentElement.getAttribute("data-theme") === "dark";
	}

	/* Load the resolved profile, published baseline, flags, and deployment data. */
	load() {
		var self = this;
		this.page.set_primary_action(__("Publish theme"), function () { self.save(); }, "check");
		this.page.add_menu_item(__("Open raw Theme Settings"), function () {
			try { sessionStorage.setItem("st_allow_raw_theme_settings", "1"); } catch (e) {}
			frappe.set_route("Form", "Theme Settings");
		});
		this.page.add_menu_item(__("Reset to saved"), function () { self.reset(); });
		this.$root = $('<div class="sts-loading"><div class="sts-loader"></div><span>' +
			__("Preparing your studio…") + "</span></div>").appendTo(this.wrapper.find(".page-content"));

		frappe.call({
			method: "solvronix_desk.theme_api.get_theme_studio_state",
			callback: function (r) {
				if (!r.message) return;
				self.state = r.message;
				self.config = self._clone(r.message.config);
				self.saved = self._clone(r.message.published);
				self.active_profile = (r.message.flags && r.message.flags.active_profile) || "";
				self.published_profile = self.active_profile;
				self.dirty = JSON.stringify(self.config) !== JSON.stringify(self.saved);
				self.render();
			},
			error: function () {
				self.$root.html('<div class="sts-error">' + __("Theme Studio could not be loaded.") + "</div>");
			},
		});
	}

	/* External changes are safe to pull only when no local draft would be lost. */
	refresh_if_clean() {
		if (!this.config || this.dirty) return;
		var self = this;
		frappe.call({
			method: "solvronix_desk.theme_api.get_theme_studio_state",
			callback: function (r) {
				if (!r.message) return;
				self.state = r.message;
				self.config = self._clone(r.message.config);
				self.saved = self._clone(r.message.published);
				self.active_profile = (r.message.flags && r.message.flags.active_profile) || "";
				self.published_profile = self.active_profile;
				self.apply();
			},
		});
	}

	/* ── 4. EDITOR SHELL / CONTROL FACTORIES ─────────────────────────────────
	   Render from the schema, then cache nodes updated repeatedly by preview. */
	render() {
		this.$root.off();
		this.$root.removeClass("sts-loading").addClass("st-theme-studio").html(
			'<aside class="sts-controls">' +
				'<div class="sts-eyebrow">' + __("DESIGN SYSTEM") + "</div>" +
				'<h2>' + __("Make it unmistakably yours.") + "</h2>" +
				'<p class="sts-intro">' + __("Every theme token, assignment, and deployment control in one place.") + "</p>" +
				this._profile_bar_html() +
				'<div class="sts-control-search"><span>⌕</span><input type="search" id="sts-control-search" placeholder="' + __("Search theme controls…") + '"></div>' +
				this._tabs_html() +
				'<div class="sts-control-panels">' + this._sections_html() + "</div>" +
			"</aside>" +
			'<main class="sts-workbench">' +
				'<div class="sts-toolbar">' +
					'<div class="sts-device-switch" role="group" aria-label="' + __("Preview size") + '">' +
						'<button class="active" data-device="desktop" title="' + __("Desktop") + '">' + this._icon("desktop") + "</button>" +
						'<button data-device="tablet" title="' + __("Tablet") + '">' + this._icon("tablet") + "</button>" +
						'<button data-device="mobile" title="' + __("Mobile") + '">' + this._icon("mobile") + "</button>" +
					"</div>" +
					'<div class="sts-scene-switch" role="group">' +
						'<button class="active" data-preview-scene="dashboard">' + __("Dashboard") + "</button>" +
						'<button data-preview-scene="form">' + __("Form") + "</button>" +
						'<button data-preview-scene="table">' + __("Table") + "</button>" +
						'<button data-preview-scene="login">' + __("Login") + "</button>" +
					"</div>" +
					'<div class="sts-toolbar-note"><i></i>' + __("Live preview") + "</div>" +
					'<button class="sts-compare-btn" data-action="compare">' + __("Compare with default") + "</button>" +
					'<button class="sts-draft-btn" data-action="save-draft">' + __("Save draft") + "</button>" +
					'<div class="sts-history">' +
						'<button data-action="undo" title="' + __("Undo") + '">' + this._icon("undo") + "</button>" +
						'<button data-action="redo" title="' + __("Redo") + '">' + this._icon("redo") + "</button>" +
					"</div>" +
				"</div>" +
				'<div class="sts-stage">' +
					'<div class="sts-preview-frame" id="st-theme-studio-preview">' +
						'<div class="sts-browser-bar"><span></span><span></span><span></span><div class="sts-browser-address">' +
							'<img data-favicon-preview alt="" hidden><span><b data-app-title>Solvronix Desk</b>' +
							'<small data-app-tagline>desk.solvronix.local</small></span></div></div>' +
						this._navbar_html() +
						'<div class="sts-app-shell">' +
							this._sidebar_html() +
							'<div class="sts-preview-main">' +
								'<div class="sts-preview-page">' +
									'<div class="sts-scene active" data-scene="dashboard">' +
										'<div class="sts-preview-heading" data-inspector="dashboard.heading"><div><small>' + __("WORKSPACE") + '</small><h3>' + __("Good morning, Ayesha") + '</h3></div><button>' + __("Create new") + "</button></div>" +
										'<div class="sts-drop-hint">' + this._icon("move") + __("Drag cards to rearrange your layout") + "</div>" +
										'<div class="sts-empty-state"><i>◇</i><span>' + __("No pending approvals") + "</span></div>" +
										'<div class="sts-canvas" id="sts-canvas"></div>' +
									"</div>" +
									this._form_scene_html() +
									this._table_scene_html() +
									this._login_scene_html() +
								"</div>" +
							"</div>" +
						"</div>" +
					"</div>" +
				"</div>" +
				'<section class="sts-context-inspector" id="sts-context-inspector" aria-live="polite"></section>' +
			"</main>"
		);
		this.$preview = this.$root.find("#st-theme-studio-preview");
		this.$canvas = this.$root.find("#sts-canvas");
		this.$inspector = this.$root.find("#sts-context-inspector");
		this.bind();
		this._sync_profile_actions();
		this.render_blocks();
		this._render_inspector();
		this.apply();
		this.$root.toggleClass("is-dirty", this.dirty);
	}

	/* Profile controls adapt to built-in versus user-created theme ownership. */
	_profile_bar_html() {
		var self = this;
		var profiles = (this.state && this.state.profiles) || [];
		return '<div class="sts-profile-bar"><label class="sts-label">' + __("Theme profile") + '</label><div class="sts-profile-select-row">' +
			'<select id="sts-profile-select"><option value=""' + (!self.active_profile ? " selected" : "") + ">" + __("Current custom theme") + "</option>" + profiles.map(function (profile) {
				return '<option value="' + self._esc(profile.id) + '"' +
					(profile.id === self.active_profile ? " selected" : "") + ">" +
					self._esc(profile.name) + (profile.builtin ? " · " + __("Built-in") : "") + "</option>";
			}).join("") + '</select><button type="button" data-profile-action="apply" title="' + __("Load selected profile") + '">' + __("Load") + "</button></div>" +
			'<div class="sts-profile-actions">' +
				'<button type="button" data-profile-action="create">' + __("Save as new") + "</button>" +
				'<button type="button" data-profile-action="update">' + __("Update") + "</button>" +
				'<button type="button" data-profile-action="duplicate">' + __("Duplicate") + "</button>" +
				'<button type="button" data-profile-action="rename">' + __("Rename") + "</button>" +
				'<button type="button" data-profile-action="delete">' + __("Delete") + "</button>" +
			"</div></div>";
	}

	/* Preview elements map to existing schema keys, keeping the contextual
	   inspector and full category panels on one canonical configuration model. */
	_inspector_catalog() {
		return {
			"navigation.toolbar": { title: "Top toolbar", scene: "Global", keys: ["navbar_background", "toolbar_text_color", "header_height", "sticky_navbar"] },
			"navigation.sidebar": { title: "Sidebar", scene: "Global", keys: ["sidebar_background", "sidebar_text_color", "sidebar_icon_color", "sidebar_active_color", "sidebar_hover_color", "sidebar_width", "sidebar_mode"] },
			"dashboard.heading": { title: "Dashboard heading", scene: "Dashboard", keys: ["page_background", "text_color", "heading_scale", "primary_button_color", "button_radius"] },
			"dashboard.metrics": { title: "Number cards", scene: "Dashboard", keys: ["number_card_color", "text_color", "muted_text_color", "card_radius", "shadow_style"] },
			"dashboard.chart": { title: "Chart card", scene: "Dashboard", keys: ["chart_background", "chart_palette", "text_color", "card_radius", "shadow_style"] },
			"dashboard.activity": { title: "Activity card", scene: "Dashboard", keys: ["workspace_card_color", "text_color", "muted_text_color", "border_color", "card_radius"] },
			"dashboard.shortcuts": { title: "Quick actions", scene: "Dashboard", keys: ["workspace_card_color", "shortcut_style", "primary_button_color", "button_radius", "card_radius"] },
			"form.heading": { title: "Form heading", scene: "Form", keys: ["page_background", "text_color", "heading_scale", "primary_button_color", "button_radius"] },
			"form.card": { title: "Form card", scene: "Form", keys: ["card_background", "border_color", "card_radius", "shadow_style", "section_spacing"] },
			"form.fields": { title: "Form fields", scene: "Form", keys: ["input_background", "input_border_color", "focus_color", "readonly_background", "label_font_size", "button_radius", "button_height", "form_column_gap"] },
			"form.actions": { title: "Form actions", scene: "Form", keys: ["primary_button_color", "secondary_button_color", "secondary_button_text", "button_radius", "button_height", "button_padding"] },
			"table.heading": { title: "Table heading", scene: "Table", keys: ["page_background", "text_color", "heading_scale", "primary_button_color", "button_radius"] },
			"table.grid": { title: "Data table", scene: "Table", keys: ["table_header_color", "alternate_row_color", "selected_row_color", "row_hover_color", "list_row_height", "table_font_size", "border_color", "card_radius"] },
			"table.status": { title: "Status badges", scene: "Table", keys: ["success_color", "warning_color", "error_color", "info_color", "colorblind_palette"] },
			"login.background": { title: "Login background", scene: "Login", keys: ["login_bg_image", "login_background", "login_gradient_to", "login_gradient_angle"] },
			"login.branding": { title: "Login branding", scene: "Login", keys: ["company_logo", "app_title", "login_heading", "login_description"] },
			"login.card": { title: "Login card", scene: "Login", keys: ["card_background", "text_color", "muted_text_color", "login_card_opacity", "card_radius", "shadow_style"] },
			"login.fields": { title: "Login fields", scene: "Login", keys: ["input_background", "input_border_color", "focus_color", "label_font_size", "button_radius", "button_height"] },
			"login.button": { title: "Login button", scene: "Login", keys: ["accent_color", "button_radius", "button_height", "button_padding"] },
			"login.footer": { title: "Login footer", scene: "Login", keys: ["footer_text", "hide_powered", "muted_text_color"] },
		};
	}

	_definition_for(key) {
		var definition = null;
		solvronix_desk.theme_studio_sections.some(function (section) {
			definition = section.controls.find(function (item) { return item[0] === key; }) || null;
			return !!definition;
		});
		return definition;
	}

	_section_for_key(key) {
		var section = solvronix_desk.theme_studio_sections.find(function (item) {
			return item.controls.some(function (definition) { return definition[0] === key; });
		});
		return section && section.id;
	}

	_render_inspector() {
		if (!this.$inspector || !this.$inspector.length) return;
		var item = this._inspector_catalog()[this.selected_inspector];
		if (!item) {
			this.selected_inspector = null;
			this.$inspector.removeClass("is-open").empty().removeAttr("data-side style");
			this.$preview && this.$preview.find(".is-inspected").removeClass("is-inspected");
			return;
		}
		var self = this;
		var controls = item.keys.map(function (key) {
			var definition = self._definition_for(key);
			return definition ? self._render_control(definition, "inspector") : "";
		}).join("");
		var section = this._section_for_key(item.keys[0]);
		this.$inspector.addClass("is-open").html(
			'<div class="sts-inspector-head"><div><small>' + __(item.scene) + '</small><b>' + __(item.title) +
			'</b></div><button type="button" data-inspector-close title="' + __("Close inspector") + '">×</button></div>' +
			'<p>' + __("Changes apply instantly to the preview and published theme.") + '</p><div class="sts-inspector-controls">' +
			controls + '</div><button type="button" class="sts-inspector-more" data-open-control-section="' + section + '">' +
			__("Open full settings section") + "</button>"
		);
		this._restore_inspector_highlight();
	}

	/* Keep the contextual editor beside its selected preview item. It prefers
	   the right edge, falls back to the left, and stays inside the viewport. */
	_position_inspector(element) {
		if (!element || !this.$inspector || !this.$inspector.hasClass("is-open")) return;
		var target = element.getBoundingClientRect();
		var gap = 14;
		var edge = 12;
		var width = Math.min(330, window.innerWidth - edge * 2);
		this.$inspector.css({ width: width + "px", visibility: "hidden" });
		var height = this.$inspector.outerHeight();
		var roomRight = window.innerWidth - target.right - gap;
		var roomLeft = target.left - gap;
		var side = roomRight >= width || roomRight >= roomLeft ? "right" : "left";
		var left = side === "right" ? target.right + gap : target.left - width - gap;
		left = Math.max(edge, Math.min(left, window.innerWidth - width - edge));
		var top = Math.max(edge, Math.min(target.top, window.innerHeight - height - edge));
		this.$inspector.attr("data-side", side).css({ left: left + "px", top: top + "px", visibility: "visible" });
	}

	_select_inspector(id, element) {
		if (!this._inspector_catalog()[id]) return;
		this.selected_inspector = id;
		this.$preview.find(".is-inspected").removeClass("is-inspected");
		$(element).addClass("is-inspected");
		this._render_inspector();
		this._position_inspector(element);
	}

	_restore_inspector_highlight() {
		if (!this.$preview || !this.selected_inspector) return;
		this.$preview.find(".is-inspected").removeClass("is-inspected");
		var element = this.$preview.find('[data-inspector="' + this.selected_inspector + '"]:visible').first().addClass("is-inspected")[0];
		this._position_inspector(element);
	}

	_sync_setting_inputs(key, source) {
		var value = this.config[key];
		this.$root.find('[data-setting="' + key + '"]').each(function () {
			if (this === source) return;
			var $control = $(this);
			if (this.type === "checkbox") $control.prop("checked", !!value);
			else if ($control.data("palette")) $control.val((value || []).join(", "));
			else if (this.type !== "color" || value) $control.val(value);
		});
		this.$root.find('[data-hex="' + key + '"]').val(value || "");
		var $outputs = this.$root.find('[data-output="' + key + '"]');
		$outputs.each(function () { $(this).text(value + ($(this).data("unit") || "")); });
	}

	_tabs_html() {
		var self = this;
		return '<nav class="sts-tabs" aria-label="' + __("Theme categories") + '">' +
			solvronix_desk.theme_studio_sections.map(function (section) {
				return '<button type="button" data-section-tab="' + section.id + '" class="' +
					(section.id === self.active_section ? "active" : "") + '"><b>' + section.index +
					"</b><span>" + __(section.title) + "</span></button>";
			}).join("") + "</nav>";
	}

	_sections_html() {
		var self = this;
		return solvronix_desk.theme_studio_sections.map(function (section) {
			return '<section class="sts-section sts-control-panel' +
				(section.id === self.active_section ? " active" : "") + '" data-section="' + section.id + '">' +
				'<div class="sts-section-title"><span>' + section.index + "</span>" + __(section.title) +
					'<button type="button" data-reset-section="' + section.id + '">' + __("Reset section") + "</button></div>" +
				'<p class="sts-section-copy">' + __(section.description) + "</p>" +
				section.controls.map(function (definition) { return self._render_control(definition); }).join("") +
			"</section>";
		}).join("");
	}

	_render_control(definition, scope) {
		var key = definition[0], label = __(definition[1]), type = definition[2];
		var inputId = "sts-" + (scope ? scope + "-" : "") + key;
		if (type === "color" || type === "optional-color") {
			return this._color_control(key, label, type === "optional-color", scope);
		}
		if (type === "range") return this._range_control(key, label, definition[3], definition[4], definition[5], scope);
		if (type === "select") {
			var current = this.config[key];
			return '<div class="sts-field"><label for="' + inputId + '">' + label + '</label><select id="' + inputId +
				'" data-setting="' + key + '">' + definition[3].map(function (option) {
					return '<option value="' + option + '"' + (String(option) === String(current) ? " selected" : "") + ">" + __(String(option)) + "</option>";
				}).join("") + "</select></div>";
		}
		if (type === "check") {
			return '<label class="sts-check"><span>' + label + '</span><input type="checkbox" data-setting="' + key + '"' +
				(this.config[key] ? " checked" : "") + '><i></i></label>';
		}
		if (type === "text") {
			return '<div class="sts-field"><label for="' + inputId + '">' + label + '</label><input id="' + inputId +
				'" type="text" data-setting="' + key + '" value="' + this._esc(this.config[key] || "") + '"></div>';
		}
		if (type === "attach-image") {
			return '<div class="sts-field sts-attach-field"><label for="' + inputId + '">' + label + '</label><div>' +
				'<input id="' + inputId + '" type="text" data-setting="' + key + '" value="' +
				this._esc(this.config[key] || "") + '" placeholder="/files/..."><button type="button" data-upload-setting="' +
				key + '" data-upload-label="' + this._esc(label) + '">' + __("Choose file") + '</button></div></div>';
		}
		if (type === "textarea") {
			return '<div class="sts-field"><label for="' + inputId + '">' + label + '</label><textarea id="' + inputId +
				'" rows="3" data-setting="' + key + '">' + this._esc(this.config[key] || "") + "</textarea></div>";
		}
		if (type === "palette") {
			return '<div class="sts-field"><label>' + label + '</label><input type="text" data-setting="' + key +
				'" data-palette="1" value="' + this._esc((this.config[key] || []).join(", ")) + '"><div class="sts-palette-preview"></div></div>';
		}
		if (type === "code-css" || type === "code-js") {
			return '<div class="sts-field sts-code-field"><label>' + label + '</label><textarea rows="8" spellcheck="false" data-setting="' +
				key + '">' + this._esc(this.config[key] || "") + "</textarea></div>";
		}
		if (type === "json") {
			return '<div class="sts-field sts-code-field"><label>' + label + '</label><textarea rows="7" spellcheck="false" data-json-setting="' +
				key + '">' + this._esc(JSON.stringify(this.config[key] || [], null, 2)) + "</textarea><button type=\"button\" data-apply-json=\"" +
				key + '">' + __("Apply JSON") + "</button></div>";
		}
		if (type === "raw-json") {
			return '<div class="sts-field sts-code-field"><label>' + label + '</label><textarea rows="12" id="sts-raw-theme-json" spellcheck="false">' +
				this._esc(JSON.stringify(this.config, null, 2)) + '</textarea><button type="button" data-action="apply-raw-json">' + __("Apply raw theme JSON") + "</button></div>";
		}
		if (type === "operations") return this._operations_html();
		return "";
	}

	/* Deployment tools live inside the same schema as ordinary theme controls. */
	_operations_html() {
		var flags = (this.state && this.state.flags) || {};
		return '<div class="sts-operation-grid">' +
			'<button type="button" data-action="import">⇧<span>' + __("Import theme") + "</span></button>" +
			'<button type="button" data-action="export">⇩<span>' + __("Export JSON") + "</span></button>" +
			'<button type="button" data-action="versions">↶<span>' + __("Version history") + "</span></button>" +
			'<button type="button" data-action="assignments">◎<span>' + __("User / role themes") + "</span></button>" +
			'<button type="button" data-action="schedule">◷<span>' + __("Schedule activation") + "</span></button>" +
			'<button type="button" data-action="clear-cache">↻<span>' + __("Clear cache & reload") + "</span></button>" +
			'<button type="button" data-action="reset-all">×<span>' + __("Reset to Frappe default") + "</span></button>" +
			'<button type="button" data-action="toggle-theme">' + (flags.enabled ? "◉" : "○") + "<span>" +
				(flags.enabled ? __("Disable custom theme") : __("Enable custom theme")) + "</span></button>" +
			"</div>" +
			'<div class="sts-wcag-card" id="sts-wcag-card"></div>' +
			'<input type="file" id="sts-import-file" accept=".json,application/json" hidden>';
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

	_color_control(key, label, optional, scope) {
		var value = this.config[key] || (key === "brand_color" ? "#1B3F7E" : key === "accent_color" ? "#F57C00" : "#FFFFFF");
		var inputId = "sts-" + (scope ? scope + "-" : "") + key;
		return '<div class="sts-color-row" data-control="' + key + '">' +
			'<label for="' + inputId + '">' + label + "</label>" +
			'<div><input id="' + inputId + '" type="color" value="' + value + '" data-setting="' + key + '">' +
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

	_range_control(key, label, min, max, unit, scope) {
		var inputId = "sts-" + (scope ? scope + "-" : "") + key;
		return '<div class="sts-range-row"><div><label for="' + inputId + '">' + label +
			'</label><output data-output="' + key + '" data-unit="' + unit + '">' + this.config[key] + unit + "</output></div>" +
			'<input id="' + inputId + '" type="range" min="' + min + '" max="' + max +
			'" value="' + this.config[key] + '" data-setting="' + key + '"></div>';
	}

	_sidebar_html() {
		return '<aside class="sts-preview-sidebar" data-inspector="navigation.sidebar">' +
			'<button type="button" class="sts-preview-logo sts-sidebar-toggle" title="' + __("Expand or collapse sidebar") + '"><b>S</b><span data-app-title>Solvronix Desk</span></button>' +
			'<nav><small>' + __("MAIN") + '</small><a class="active">' + this._icon("home") + "<span>" + __("Overview") + "</span></a>" +
			'<a>' + this._icon("chart") + "<span>" + __("Analytics") + "</span></a>" +
			'<a>' + this._icon("invoice") + "<span>" + __("Invoices") + "</span></a>" +
			'<a>' + this._icon("users") + "<span>" + __("Customers") + "</span></a></nav>" +
			'<button type="button" class="sts-preview-collapse sts-sidebar-toggle">' + this._icon("collapse") + '<span>' + __("Collapse") + "</span></button>" +
		"</aside>";
	}

	_navbar_html() {
		return '<header class="sts-preview-nav" data-inspector="navigation.toolbar"><div class="sts-toolbar-left">' +
			'<time>10:42:18</time><i></i><a>☼ ' + __("Today’s View") + '</a></div>' +
			'<div class="sts-nav-actions"><button>◎ EN⌄</button><button>•••</button>' +
			'<span class="sts-avatar">AK</span></div></header>';
	}

	_form_scene_html() {
		return '<div class="sts-scene" data-scene="form"><div class="sts-preview-heading" data-inspector="form.heading"><div><small>' + __("DOCUMENT") +
			'</small><h3>' + __("Customer profile") + '</h3></div><button>' + __("Save") + '</button></div>' +
			'<div class="sts-form-card" data-inspector="form.card"><div class="sts-form-section-title">' + __("General information") + '</div><div class="sts-form-grid">' +
			'<label data-inspector="form.fields"><span>' + __("Customer name") + '</span><input value="Northstar Trading"></label>' +
			'<label data-inspector="form.fields"><span>' + __("Customer group") + '</span><select><option>Commercial</option></select></label>' +
			'<label data-inspector="form.fields"><span>' + __("Email address") + '</span><input value="hello@northstar.example"></label>' +
			'<label data-inspector="form.fields"><span>' + __("Read-only field") + '</span><input readonly value="CUST-00084"></label>' +
			'<label class="sts-preview-check" data-inspector="form.fields"><input type="checkbox" checked><i>✓</i><span>' + __("Email notifications") + '</span></label>' +
			'<label class="sts-preview-disabled" data-inspector="form.fields"><span>' + __("Disabled field") + '</span><input disabled value="Unavailable"></label>' +
			'<label class="sts-form-wide" data-inspector="form.fields"><span>' + __("Notes") + '</span><textarea>Priority account with quarterly review.</textarea></label>' +
			'</div><div class="sts-form-actions" data-inspector="form.actions"><button class="secondary">' + __("Cancel") + '</button><button>' + __("Save changes") +
			'</button></div></div></div>';
	}

	_table_scene_html() {
		return '<div class="sts-scene" data-scene="table"><div class="sts-preview-heading" data-inspector="table.heading"><div><small>' + __("REPORT") +
			'</small><h3>' + __("Sales invoices") + '</h3></div><button>' + __("New invoice") + '</button></div>' +
			'<div class="sts-table-card" data-inspector="table.grid"><div class="sts-table-head"><span>ID</span><span>' + __("Customer") + '</span><span>' +
			__("Status") + '</span><span>' + __("Amount") + '</span></div>' +
			[['INV-0841','Northstar','Paid','$2,480'],['INV-0840','Acme Retail','Overdue','$1,920'],['INV-0839','Orbit Foods','Draft','$760'],['INV-0838','Harbor Labs','Paid','$4,210']].map(function (row, index) {
				return '<div class="sts-table-row' + (index === 1 ? " selected" : "") + '"><span>' + row[0] + '</span><span>' + row[1] +
					'</span><span><i data-inspector="table.status" class="status-' + row[2].toLowerCase() + '">' + row[2] + '</i></span><strong>' + row[3] + '</strong></div>';
			}).join("") + "</div></div>";
	}

	_login_scene_html() {
		/* Mirror the public Frappe login DOM: a visual card head plus a form body.
		   Login-only tokens stay independent from Desk's derived dark preview. */
		var companyLogo = this.config.company_logo ?
			'<img class="sts-login-company-logo" data-login-company-logo src="' + this._esc(this.config.company_logo) +
			'" alt="' + this._esc(this.config.app_title || "") + '">' :
			'<img class="sts-login-company-logo" data-login-company-logo alt="" hidden>';
		return '<div class="sts-scene sts-login-scene" data-scene="login" data-inspector="login.background"><div class="sts-login-shell" data-inspector="login.card">' +
			'<div class="sts-login-card-head" data-inspector="login.branding">' + companyLogo + '<div class="sts-login-app-logo">' + this._icon("cube") +
			'</div><h3 data-login-heading>' + this._esc(this.config.login_heading || __("Welcome back")) +
			'</h3><p data-login-description>' + this._esc(this.config.login_description || "") + '</p></div>' +
			'<div class="sts-login-card-body"><label data-inspector="login.fields"><span>' + __("Email or Username") + '</span><div class="sts-login-input">' +
			this._icon("mail") + '<input value="jane@example.com"></div></label><label data-inspector="login.fields"><span>' + __("Password") +
			'</span><div class="sts-login-input">' + this._icon("lock") + '<input type="password" value="password">' +
			this._icon("eye") + '</div></label><a class="sts-login-forgot">' + __("Forgot password?") + '</a>' +
			'<button data-inspector="login.button">' + __("Continue") + '</button><small data-login-powered data-inspector="login.footer">' + __("Powered by Solvronix") +
			'</small></div></div><small class="sts-login-custom-footer" data-login-footer data-inspector="login.footer"></small></div>';
	}

	/* ── 5. PREVIEW BLOCK LAYOUT ──────────────────────────────────────────────
	   Rebuild block order from stable IDs while preserving the active scene. */
	render_blocks() {
		var blocks = {
			metrics:
				'<section class="sts-block sts-metrics" draggable="true" data-block="metrics" data-inspector="dashboard.metrics"><div class="sts-drag">' + this._icon("grip") + "</div>" +
				[["Revenue", "$84.2k", "+12.4%"], ["Invoices", "128", "+8.1%"], ["Customers", "846", "+4.6%"]].map(function (m, i) {
					return '<article><div class="sts-metric-icon m' + i + '"></div><small>' + __(m[0]) + "</small><strong>" + m[1] +
						'</strong><em>' + m[2] + "</em></article>";
				}).join("") + "</section>",
			chart:
				'<section class="sts-block sts-chart-card" draggable="true" data-block="chart" data-inspector="dashboard.chart"><div class="sts-drag">' + this._icon("grip") +
				'</div><div class="sts-card-head"><div><strong>' + __("Revenue overview") + "<small>" + __("Last 6 months") +
				'</small></strong></div><button>•••</button></div><div class="sts-chart"><span style="--h:42%"></span><span style="--h:64%"></span>' +
				'<span style="--h:53%"></span><span style="--h:82%"></span><span style="--h:68%"></span><span style="--h:91%"></span></div>' +
				'<div class="sts-chart-labels"><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span></div></section>',
			activity:
				'<section class="sts-block sts-activity" draggable="true" data-block="activity" data-inspector="dashboard.activity"><div class="sts-drag">' + this._icon("grip") +
				'</div><div class="sts-card-head"><strong>' + __("Recent activity") + '</strong><a>' + __("View all") + '</a></div>' +
				'<div class="sts-activity-row"><i>SI</i><span><b>INV-2026-0841</b><small>' + __("Sales invoice · 2 min ago") + '</small></span><strong>$2,480</strong></div>' +
				'<div class="sts-activity-row"><i>PO</i><span><b>PO-2026-0138</b><small>' + __("Purchase order · 18 min ago") + '</small></span><strong>$980</strong></div></section>',
			quick_actions:
				'<section class="sts-block sts-quick-actions" draggable="true" data-block="quick_actions" data-inspector="dashboard.shortcuts"><div class="sts-drag">' + this._icon("grip") +
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
		this._restore_inspector_highlight();
	}

	/* ── 6. EVENT BINDINGS ───────────────────────────────────────────────────
	   Delegation keeps the generated control surface cheap to re-render. */
	bind() {
		var self = this;
		$(window).off("resize.stsInspector").on("resize.stsInspector", function () {
			self._restore_inspector_highlight();
		});
		this.$root.find(".sts-stage,.sts-preview-page").on("scroll.stsInspector", function () {
			self._restore_inspector_highlight();
		});
		this.$root.on("click", "[data-inspector]", function (event) {
			var closest = $(event.target).closest("[data-inspector]")[0];
			if (this !== closest) return;
			event.stopPropagation();
			self._select_inspector($(this).data("inspector"), this);
		});
		this.$root.on("click", "[data-inspector-close]", function () {
			self.selected_inspector = null;
			self._render_inspector();
		});
		this.$root.on("click", "[data-open-control-section]", function () {
			var section = $(this).data("open-control-section");
			self.active_section = section;
			self.$root.find("[data-section-tab]").removeClass("active").filter('[data-section-tab="' + section + '"]').addClass("active");
			self.$root.find(".sts-control-panel").removeClass("active").filter('[data-section="' + section + '"]').addClass("active");
			self.$root.find('[data-section="' + section + '"]')[0].scrollIntoView({ behavior: "smooth", block: "start" });
		});
		this.$root.on("input change", "[data-setting]", function () {
			var key = $(this).data("setting");
			self._checkpoint();
			if (this.type === "color") {
				self.config[key] = this.value.toUpperCase();
				self.$root.find('[data-hex="' + key + '"]').val(self.config[key]);
			} else if (this.type === "range") {
				self.config[key] = parseInt(this.value, 10);
				var $output = self.$root.find('[data-output="' + key + '"]');
				$output.text(this.value + ($output.data("unit") || ""));
			} else if (this.type === "checkbox") {
				self.config[key] = !!this.checked;
			} else if ($(this).data("palette")) {
				self.config[key] = String(this.value || "").split(",").map(function (item) {
					return item.trim().toUpperCase();
				}).filter(function (item) { return /^#[0-9A-F]{6}$/.test(item); });
			} else {
				self.config[key] = this.value;
			}
			self._sync_setting_inputs(key, this);
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
			self._sync_setting_inputs(key, this);
			self.changed();
		});
		this.$root.on("click", "[data-clear]", function () {
			var key = $(this).data("clear");
			self._checkpoint();
			self.config[key] = "";
			self._sync_setting_inputs(key);
			self.changed();
		});
		/* Frappe's Attach Image prompt provides upload, library, and URL support
		   without coupling Theme Studio to the FileUploader implementation. */
		this.$root.on("click", "[data-upload-setting]", function () {
			var key = $(this).data("upload-setting");
			var label = $(this).data("upload-label") || __("Choose image");
			frappe.prompt(
				{ fieldname: "file_url", fieldtype: "Attach Image", label: label, default: self.config[key] || "" },
				function (values) {
					self._checkpoint();
					self.config[key] = values.file_url || "";
					self._sync_setting_inputs(key);
					self.changed();
				},
				label,
				__("Use file")
			);
		});
		this.$root.on("click", ".sts-preset", function () {
			self._checkpoint();
			self.config.brand_color = $(this).data("brand");
			self.config.accent_color = $(this).data("accent");
			self._sync_setting_inputs("brand_color");
			self._sync_setting_inputs("accent_color");
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
			self._restore_inspector_highlight();
			setTimeout(function () { self._restore_inspector_highlight(); }, 340);
		});
		this.$root.on("click", "[data-preview-scene]", function () {
			var scene = $(this).data("preview-scene");
			self.$root.find("[data-preview-scene]").removeClass("active");
			$(this).addClass("active");
			self.$preview.attr("data-scene", scene);
			self.$preview.find(".sts-scene").removeClass("active")
				.filter('[data-scene="' + scene + '"]').addClass("active");
			var defaults = { dashboard: "dashboard.heading", form: "form.card", table: "table.grid", login: "login.background" };
			var element = self.$preview.find('[data-inspector="' + defaults[scene] + '"]:visible').first()[0];
			if (element) self._select_inspector(defaults[scene], element);
		});
		this.$root.on("click", ".sts-sidebar-toggle", function () {
			self._checkpoint();
			var expanded = !self.$preview.find(".sts-preview-sidebar").hasClass("is-expanded");
			self.config.sidebar_mode = expanded ? "Expanded" : "Compact";
			self._sync_setting_inputs("sidebar_mode");
			self.changed();
		});
		this.$root.on("mouseenter mouseleave", ".sts-preview-sidebar", function (event) {
			if (!self.config.sidebar_auto_collapse) return;
			$(this).toggleClass("is-expanded", event.type === "mouseenter");
			self._restore_inspector_highlight();
		});
		this.$root.on("click", "[data-section-tab]", function () {
			self.active_section = $(this).data("section-tab");
			self.$root.find("[data-section-tab]").removeClass("active");
			$(this).addClass("active");
			self.$root.find(".sts-control-panel").removeClass("active")
				.filter('[data-section="' + self.active_section + '"]').addClass("active");
			self.$root.find("#sts-control-search").val("");
			self.$root.find(".sts-control-panel .sts-field,.sts-control-panel .sts-color-row,.sts-control-panel .sts-range-row,.sts-control-panel .sts-check").show();
		});
		this.$root.on("input", "#sts-control-search", function () {
			self._search_controls(this.value);
		});
		this.$root.on("click", "[data-apply-json]", function () {
			self._apply_json_setting($(this).data("apply-json"));
		});
		this.$root.on("click", '[data-action="apply-raw-json"]', function () { self._apply_raw_json(); });
		this.$root.on("click", "[data-reset-section]", function () { self._reset_section($(this).data("reset-section")); });
		this.$root.on("click", "[data-profile-action]", function () { self._profile_action($(this).data("profile-action")); });
		this.$root.on("change", "#sts-profile-select", function () { self._sync_profile_actions(); });
		this.$root.on("click", '[data-action="save-draft"]', function () { self.save_draft(); });
		this.$root.on("click", '[data-action="compare"]', function () { self.toggle_compare(); });
		this.$root.on("click", '[data-action="import"]', function () { self.$root.find("#sts-import-file").trigger("click"); });
		this.$root.on("change", "#sts-import-file", function () { self.import_theme(this.files && this.files[0]); });
		this.$root.on("click", '[data-action="export"]', function () { self.export_theme(); });
		this.$root.on("click", '[data-action="versions"]', function () { self.show_versions(); });
		this.$root.on("click", '[data-action="assignments"]', function () { self.show_assignments(); });
		this.$root.on("click", '[data-action="schedule"]', function () { self.show_schedule(); });
		this.$root.on("click", '[data-action="clear-cache"]', function () { self.clear_cache(); });
		this.$root.on("click", '[data-action="reset-all"]', function () { self._reset_all(); });
		this.$root.on("click", '[data-action="toggle-theme"]', function () { self.toggle_theme_enabled(); });
		this.$root.on("click", '[data-action="undo"]', function () { self.undo(); });
		this.$root.on("click", '[data-action="redo"]', function () { self.redo(); });
	}

	/* ── 7. SEARCH, JSON, AND RESET OPERATIONS ──────────────────────────────── */
	_search_controls(query) {
		query = String(query || "").trim().toLowerCase();
		this.$root.toggleClass("is-searching", !!query);
		var $panels = this.$root.find(".sts-control-panel");
		if (!query) {
			$panels.removeClass("search-match").filter('[data-section="' + this.active_section + '"]').addClass("active");
			return;
		}
		$panels.each(function () {
			var $panel = $(this), matches = 0;
			$panel.find(".sts-field,.sts-color-row,.sts-range-row,.sts-check").each(function () {
				var match = $(this).text().toLowerCase().indexOf(query) !== -1;
				$(this).toggle(match);
				if (match) matches++;
			});
			$panel.toggleClass("search-match", matches > 0);
		});
	}

	_apply_json_setting(key) {
		var raw = this.$root.find('[data-json-setting="' + key + '"]').val();
		try {
			var parsed = JSON.parse(raw || "[]");
			this._checkpoint();
			this.config[key] = parsed;
			this.changed();
			frappe.show_alert({ message: __("JSON applied"), indicator: "green" });
		} catch (error) {
			frappe.show_alert({ message: __("Invalid JSON: ") + error.message, indicator: "red" }, 5);
		}
	}

	_apply_raw_json() {
		try {
			var parsed = JSON.parse(this.$root.find("#sts-raw-theme-json").val() || "{}");
			if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Theme JSON must be an object");
			this._checkpoint();
			this.config = $.extend(true, {}, this.config, parsed);
			this._refresh_controls();
			frappe.show_alert({ message: __("Raw theme JSON applied"), indicator: "green" });
		} catch (error) {
			frappe.show_alert({ message: __("Invalid theme JSON: ") + error.message, indicator: "red" }, 5);
		}
	}

	_default_config() {
		var profile = ((this.state && this.state.profiles) || []).find(function (item) {
			return item.id === "builtin-frappe";
		});
		return this._clone(profile ? profile.config : this.saved);
	}

	_section_keys(sectionId) {
		var section = solvronix_desk.theme_studio_sections.find(function (item) { return item.id === sectionId; });
		return section ? section.controls.map(function (control) { return control[0]; })
			.filter(function (key) { return key !== "operations" && key !== "raw_theme_json"; }) : [];
	}

	_reset_section(sectionId) {
		var defaults = this._default_config(), keys = this._section_keys(sectionId);
		if (!keys.length) return;
		this._checkpoint();
		var self = this;
		keys.forEach(function (key) {
			if (defaults[key] !== undefined) self.config[key] = self._clone(defaults[key]);
		});
		this._refresh_controls();
		frappe.show_alert({ message: __("Section reset to default"), indicator: "blue" });
	}

	_reset_all() {
		var self = this;
		frappe.confirm(__("Reset every Theme Studio setting to the Frappe-friendly Light default?"), function () {
			self._checkpoint();
			self.config = self._default_config();
			self.active_profile = "builtin-frappe";
			self.render();
			self.changed();
		});
	}

	/* ── 8. PROFILE MANAGEMENT ───────────────────────────────────────────────
	   Built-ins are immutable; update/rename/delete remain custom-profile only. */
	_selected_profile() {
		var id = this.$root.find("#sts-profile-select").val();
		return ((this.state && this.state.profiles) || []).find(function (item) { return item.id === id; });
	}

	_sync_profile_actions() {
		var profile = this._selected_profile();
		var editable = !!profile && !profile.builtin;
		var $apply = this.$root.find('[data-profile-action="apply"]');
		var $update = this.$root.find('[data-profile-action="update"]');
		var $rename = this.$root.find('[data-profile-action="rename"]');
		var $delete = this.$root.find('[data-profile-action="delete"]');
		$apply.prop("disabled", !profile).attr(
			"title",
			profile ? __("Load selected profile") : __("Choose a profile to load")
		);
		[$update, $rename, $delete].forEach(function ($button) {
			$button.prop("disabled", !editable);
		});
		$update.attr("title", editable ? __("Update selected custom profile") : __("Select a custom profile to update"));
		$rename.attr("title", editable ? __("Rename selected custom profile") : __("Only custom profiles can be renamed"));
		$delete.attr("title", editable ? __("Delete selected custom profile") : __("Only custom profiles can be deleted"));
		this.$root.find('[data-profile-action="duplicate"]').attr(
			"title",
			profile ? __("Duplicate selected profile") : __("Save a copy of the current theme")
		);
	}

	_profile_action(action) {
		var self = this, profile = this._selected_profile();
		if (action === "apply") {
			if (!profile) {
				frappe.show_alert({ message: __("Choose a theme profile first"), indicator: "orange" });
				return;
			}
			this._checkpoint();
			this.config = this._clone(profile.config);
			this.active_profile = profile.id;
			this.render();
			this.changed();
			if (profile.config.preferred_mode === "Dark") this.$preview.attr("data-theme", "dark");
			return;
		}
		if (action === "create") {
			frappe.prompt(
				[
					{ fieldname: "name", fieldtype: "Data", label: __("Theme name"), reqd: 1 },
					{ fieldname: "description", fieldtype: "Small Text", label: __("Description") },
				],
				function (values) {
					self._call_profile("create", { name: values.name, description: values.description, config: self.config });
				},
				__("Save as custom theme")
			);
			return;
		}
		if (action === "duplicate") {
			var duplicateName = profile ? profile.name + " Copy" : __("Current Theme Copy");
			frappe.prompt(
				{ fieldname: "name", fieldtype: "Data", label: __("Copy name"), default: duplicateName, reqd: 1 },
				function (values) {
					if (profile) {
						self._call_profile("duplicate", { profile_id: profile.id, name: values.name });
					} else {
						self._call_profile("create", { name: values.name, config: self.config });
					}
				},
				__("Duplicate theme")
			);
			return;
		}
		if (!profile) {
			frappe.show_alert({ message: __("Select a custom profile for this action"), indicator: "orange" }, 4);
			return;
		}
		if (profile.builtin) {
			frappe.show_alert({ message: __("Built-in themes cannot be changed; duplicate it first"), indicator: "orange" }, 4);
			return;
		}
		if (action === "update") {
			this._call_profile("update", { profile_id: profile.id, name: profile.name, description: profile.description, config: this.config });
		} else if (action === "rename") {
			frappe.prompt(
				{ fieldname: "name", fieldtype: "Data", label: __("New name"), default: profile.name, reqd: 1 },
				function (values) { self._call_profile("rename", { profile_id: profile.id, name: values.name }); },
				__("Rename theme")
			);
		} else if (action === "delete") {
			frappe.confirm(__("Delete custom theme “{0}”?").replace("{0}", profile.name), function () {
				self._call_profile("delete", { profile_id: profile.id });
			});
		}
	}

	_call_profile(action, args) {
		var self = this;
		frappe.call({
			method: "solvronix_desk.theme_api.manage_theme_profile",
			args: $.extend({ action: action }, args || {}),
			freeze: true,
			callback: function (response) {
				if (!response.message) return;
				self.state = response.message;
				if (action === "create" || action === "duplicate") {
					var custom = self.state.profiles.filter(function (item) { return !item.builtin; });
					self.active_profile = custom.length ? custom[custom.length - 1].id : "";
				}
				self.render();
				frappe.show_alert({ message: __("Theme profiles updated"), indicator: "green" });
			},
		});
	}

	/* ── 9. DRAFTS, IMPORT/EXPORT, VERSIONS, AND DEPLOYMENT ────────────────── */
	save_draft() {
		var self = this;
		frappe.call({
			method: "solvronix_desk.theme_api.save_theme_draft",
			args: { config: this.config },
			freeze: true,
			freeze_message: __("Saving private draft…"),
			callback: function (response) {
				if (!response.message) return;
				self.config = self._clone(response.message.config);
				self._update_wcag(response.message.wcag_failures);
				frappe.show_alert({ message: __("Draft saved; published theme is unchanged"), indicator: "blue" }, 4);
			},
		});
	}

	toggle_compare() {
		var $stage = this.$root.find(".sts-stage");
		var existing = $stage.find(".sts-default-frame");
		if (existing.length) {
			existing.remove();
			$stage.removeClass("is-comparing");
			this.$root.find('[data-action="compare"]').text(__("Compare with default"));
			return;
		}
		var defaults = this._default_config();
		var $clone = this.$preview.clone(false).removeAttr("id").addClass("sts-default-frame");
		$clone.prepend('<div class="sts-compare-label">' + __("Frappe-friendly default") + "</div>");
		this._apply_preview_vars($clone, defaults);
		$stage.addClass("is-comparing").append($clone);
		this.$root.find('[data-action="compare"]').text(__("Close comparison"));
	}

	export_theme() {
		var profile = this._selected_profile();
		var payload = {
			schema: "solvronix-theme/v1",
			name: profile ? profile.name : "Custom Theme",
			description: profile ? profile.description : "",
			exported_at: new Date().toISOString(),
			config: this.config,
		};
		var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
		var url = URL.createObjectURL(blob), anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = String(payload.name || "theme").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json";
		anchor.click();
		setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
	}

	import_theme(file) {
		if (!file) return;
		var self = this, reader = new FileReader();
		reader.onload = function () {
			try {
				var data = JSON.parse(reader.result);
				frappe.call({
					method: "solvronix_desk.theme_api.import_theme_profile",
					args: { payload: data, name: data.name || file.name.replace(/\.json$/i, "") },
					freeze: true,
					callback: function (response) {
						if (!response.message) return;
						self.state = response.message;
						var custom = self.state.profiles.filter(function (item) { return !item.builtin; });
						var imported = custom[custom.length - 1];
						if (imported) {
							self.active_profile = imported.id;
							self.config = self._clone(imported.config);
						}
						self.render();
						self.changed();
						frappe.show_alert({ message: __("Theme imported"), indicator: "green" });
					},
				});
			} catch (error) {
				frappe.show_alert({ message: __("Invalid theme file: ") + error.message, indicator: "red" }, 5);
			}
		};
		reader.readAsText(file);
	}

	show_versions() {
		var self = this, versions = (this.state && this.state.versions) || [];
		var dialog = new frappe.ui.Dialog({ title: __("Theme version history"), fields: [{ fieldname: "versions", fieldtype: "HTML" }] });
		dialog.fields_dict.versions.$wrapper.html(
			'<div class="sts-version-list">' + (versions.length ? versions.map(function (version) {
				return '<div><span><b>' + self._esc(version.label || __("Published theme")) + "</b><small>" +
					self._esc(version.created || "") + " · " + self._esc(version.user || "") +
					'</small></span><button class="btn btn-xs btn-default" data-version="' + self._esc(version.id) + '">' + __("Restore as draft") + "</button></div>";
			}).join("") : '<p class="text-muted">' + __("No backups yet. A backup is created before every publish.") + "</p>") + "</div>"
		);
		dialog.fields_dict.versions.$wrapper.on("click", "[data-version]", function () {
			frappe.call({
				method: "solvronix_desk.theme_api.restore_theme_version",
				args: { version_id: $(this).data("version") },
				freeze: true,
				callback: function (response) {
					if (!response.message) return;
					self._checkpoint();
					self.config = self._clone(response.message.config);
					dialog.hide();
					self.render();
					self.changed();
					frappe.show_alert({ message: __("Version restored as draft"), indicator: "green" });
				},
			});
		});
		dialog.show();
	}

	_profile_options() {
		return ((this.state && this.state.profiles) || []).map(function (item) {
			return { label: item.name, value: item.id };
		});
	}

	show_assignments() {
		var self = this, data = this.state.assignments || {}, flags = this.state.flags || {};
		var profileOptions = [""].concat(this._profile_options().map(function (item) { return item.value; })).join("\n");
		var profileReference = '<div class="sts-assignment-reference"><b>' + __("Available profile IDs") + '</b>' +
			this._profile_options().map(function (item) {
				return '<code>' + self._esc(item.value) + '</code><span>' + self._esc(item.label) + '</span>';
			}).join("") + '</div>';
		var dialog = new frappe.ui.Dialog({
			title: __("Theme assignments & permissions"),
			fields: [
				{ fieldname: "default", fieldtype: "Select", label: __("Default site profile"), options: profileOptions, default: data.default || "" },
				{ fieldname: "theme_enabled", fieldtype: "Check", label: __("Enable published theme"), default: flags.enabled ? 1 : 0 },
				{ fieldname: "allow_user_theme", fieldtype: "Check", label: __("Allow users to choose"), default: flags.allow_user_theme ? 1 : 0 },
				{ fieldname: "theme_lock", fieldtype: "Check", label: __("Administrator theme lock"), default: flags.theme_lock ? 1 : 0 },
				{ fieldname: "preview_admin_only", fieldtype: "Check", label: __("Administrator-only draft preview"), default: flags.preview_admin_only ? 1 : 0 },
				{ fieldname: "reference", fieldtype: "HTML", options: profileReference },
				{ fieldname: "users", fieldtype: "Code", label: __("User assignments (email → profile id JSON)"), options: "JSON", default: JSON.stringify(data.users || {}, null, 2) },
				{ fieldname: "roles", fieldtype: "Code", label: __("Role assignments (role → profile id JSON)"), options: "JSON", default: JSON.stringify(data.roles || {}, null, 2) },
				{ fieldname: "companies", fieldtype: "Code", label: __("Company assignments (company → profile id JSON)"), options: "JSON", default: JSON.stringify(data.companies || {}, null, 2) },
			],
			primary_action_label: __("Save assignments"),
			primary_action: function (values) {
				try {
					var assignments = {
						default: values.default || "",
						users: JSON.parse(values.users || "{}"),
						roles: JSON.parse(values.roles || "{}"),
						companies: JSON.parse(values.companies || "{}"),
					};
					self._save_assignments(assignments, values, dialog);
				} catch (error) {
					frappe.show_alert({ message: __("Invalid assignment JSON: ") + error.message, indicator: "red" }, 5);
				}
			},
		});
		dialog.show();
	}

	_save_assignments(assignments, flags, dialog) {
		var self = this;
		frappe.call({
			method: "solvronix_desk.theme_api.save_theme_assignments",
			args: {
				data: assignments,
				flags: {
					theme_enabled: !!flags.theme_enabled,
					allow_user_theme: !!flags.allow_user_theme,
					theme_lock: !!flags.theme_lock,
					preview_admin_only: !!flags.preview_admin_only,
				},
			},
			freeze: true,
			callback: function (response) {
				if (!response.message) return;
				self.state = response.message;
				dialog && dialog.hide();
				self.render();
				frappe.show_alert({ message: __("Theme assignments saved"), indicator: "green" });
			},
		});
	}

	show_schedule() {
		var self = this, schedule = this.state.schedule || {};
		var profileOptions = [""].concat(this._profile_options().map(function (item) { return item.value; })).join("\n");
		var dialog = new frappe.ui.Dialog({
			title: __("Schedule theme activation"),
			fields: [
				{ fieldname: "enabled", fieldtype: "Check", label: __("Enable schedule"), default: schedule.enabled ? 1 : 0 },
				{ fieldname: "profile_id", fieldtype: "Select", label: __("Theme profile"), options: profileOptions, default: schedule.profile_id || "" },
				{ fieldname: "activate_at", fieldtype: "Datetime", label: __("Activate at"), default: schedule.activate_at || "" },
				{ fieldname: "deactivate_at", fieldtype: "Datetime", label: __("Deactivate at"), default: schedule.deactivate_at || "" },
			],
			primary_action_label: __("Save schedule"),
			primary_action: function (values) {
				frappe.call({
					method: "solvronix_desk.theme_api.save_theme_schedule",
					args: { data: values },
					freeze: true,
					callback: function (response) {
						if (!response.message) return;
						self.state = response.message;
						dialog.hide();
						frappe.show_alert({ message: __("Theme schedule saved"), indicator: "green" });
					},
				});
			},
		});
		dialog.show();
	}

	clear_cache() {
		frappe.call({
			method: "solvronix_desk.theme_api.clear_theme_cache",
			args: { reload_desk: 1 },
			freeze: true,
			callback: function () { window.location.reload(); },
		});
	}

	toggle_theme_enabled() {
		var flags = $.extend({}, this.state.flags || {});
		flags.theme_enabled = !flags.enabled;
		this._save_assignments(this.state.assignments || {}, flags);
	}

	/* ── 10. BLOCK ORDER AND UNDO/REDO HISTORY ───────────────────────────────
	   Snapshots are bounded so a long editing session cannot grow indefinitely. */
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
			var $control = self.$root.find('[data-setting="' + key + '"]');
			if ($control.is(':checkbox')) $control.prop("checked", !!self.config[key]);
			else if ($control.data("palette")) $control.val((self.config[key] || []).join(", "));
			else $control.val(self.config[key]);
			self.$root.find('[data-hex="' + key + '"]').val(self.config[key]);
			var $output = self.$root.find('[data-output="' + key + '"]');
			$output.text(self.config[key] + ($output.data("unit") || ""));
			self.$root.find('[data-json-setting="' + key + '"]').val(JSON.stringify(self.config[key] || [], null, 2));
		});
		this.$root.find("#sts-raw-theme-json").val(JSON.stringify(this.config, null, 2));
		this.render_blocks();
		this.changed(false);
	}

	/* ── 11. DIRTY STATE AND LIVE PREVIEW ──────────────────────────────────── */
	changed(mark) {
		if (mark !== false) this.dirty = true;
		this.dirty = JSON.stringify(this.config) !== JSON.stringify(this.saved) ||
			this.active_profile !== this.published_profile;
		if (!document.activeElement || document.activeElement.id !== "sts-raw-theme-json") {
			this.$root.find("#sts-raw-theme-json").val(JSON.stringify(this.config, null, 2));
		}
		this.apply();
		this.$root.toggleClass("is-dirty", this.dirty);
		this.page.btn_primary && this.page.btn_primary.toggleClass("btn-warning", this.dirty);
	}

	apply() {
		if (!this.config || !this.$preview) return;
		var c = this.config;
		var previewDark = c.preferred_mode === "Dark" ||
			(c.preferred_mode === "Auto" && window.matchMedia &&
				window.matchMedia("(prefers-color-scheme: dark)").matches);
		var visual = this._resolved_visual_config(c, previewDark);
		this._apply_preview_vars(this.$preview, visual, c);
		this.$preview.attr("data-theme", previewDark ? "dark" : "light");
		this.$preview.attr("data-density", String(c.density || "Comfortable").toLowerCase());
		this.$preview.attr("data-shortcuts", String(c.shortcut_style || "Soft").toLowerCase());
		this.$preview.find(".sts-preview-sidebar").toggleClass("is-expanded", c.sidebar_mode === "Expanded");
		this.$root.find(".sts-segments button").removeClass("active")
			.filter('[data-value="' + c.shadow_style + '"]').addClass("active");
		this.$root.find('[data-action="undo"]').prop("disabled", !this.history.length);
		this.$root.find('[data-action="redo"]').prop("disabled", !this.future.length);
		this._update_wcag();
		if (window.stApplyDark) {
			stApplyDark(!!previewDark);
		}
		this._apply_draft_to_desk(visual);
		this._refresh_server_preview();
	}

	/* Light configs receive derived dark surfaces for Dark/Auto preview without
	   overwriting the administrator's stored light palette. */
	_resolved_visual_config(config, forceDark) {
		var c = this._clone(config || {});
		var defaults = (this.state && this.state.defaults) || {};
		var dark = forceDark;
		if (dark === undefined) {
			dark = c.preferred_mode === "Dark" ||
				(c.preferred_mode === "Auto" && window.matchMedia &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
		}
		var darkDefaults = {
				navbar_background: this._mix_hex(c.brand_color, "#090D16", 0.38),
				sidebar_background: this._mix_hex(c.brand_color, "#121826", 0.32),
				sidebar_hover_color: "#242A37",
				page_background: "#0F1117",
				card_background: "#1A1D27",
				text_color: "#E8EDF5",
				muted_text_color: "#9AA7BA",
				link_color: "#6DB4F2",
				border_color: "#303746",
				secondary_button_color: "#242A37",
				secondary_button_text: "#E8EDF5",
				input_background: "#222734",
				input_border_color: "#3B4354",
				dropdown_background: "#202531",
				readonly_background: "#252A36",
				alternate_row_color: "#181C25",
				table_header_color: "#222734",
				selected_row_color: "#3B2D21",
				row_hover_color: "#242A37",
				report_grid_color: "#303746",
				workspace_card_color: "#1A1D27",
				number_card_color: "#1A1D27",
				chart_background: "#1A1D27",
		};
		if (dark) {
			Object.keys(darkDefaults).forEach(function (key) {
				var current = c[key];
				var legacyDefault = key === "sidebar_hover_color" && current === "#F4F7FB";
				if (current === defaults[key] || legacyDefault) c[key] = darkDefaults[key];
			});
		} else {
			var canonicalDark = Object.assign({}, darkDefaults, {
				navbar_background: "#090D16",
				sidebar_background: "#121826",
			});
			Object.keys(canonicalDark).forEach(function (key) {
				if (c[key] === canonicalDark[key] && defaults[key] !== undefined) c[key] = defaults[key];
			});
		}
		var palettes = {
			Deuteranopia: {
				success_color: "#0072B2", warning_color: "#E69F00", error_color: "#D55E00", info_color: "#56B4E9",
			},
			Protanopia: {
				success_color: "#0072B2", warning_color: "#F0E442", error_color: "#CC79A7", info_color: "#56B4E9",
			},
			Tritanopia: {
				success_color: "#009E73", warning_color: "#E69F00", error_color: "#D55E00", info_color: "#0072B2",
			},
		};
		if (palettes[c.colorblind_palette]) Object.assign(c, palettes[c.colorblind_palette]);
		return c;
	}

	_is_dark_palette(c) {
		return this._color_luminance(c.page_background) < 0.18 &&
			this._color_luminance(c.card_background) < 0.22;
	}

	_color_luminance(value) {
		var hex = String(value || "").replace("#", "");
		if (!/^[0-9a-f]{6}$/i.test(hex)) return 1;
		var channels = [0, 2, 4].map(function (index) {
			var component = parseInt(hex.slice(index, index + 2), 16) / 255;
			return component <= 0.04045 ? component / 12.92 :
				Math.pow((component + 0.055) / 1.055, 2.4);
		});
		return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
	}

	_mix_hex(primary, secondary, primaryWeight) {
		var first = String(primary || "").replace("#", "");
		var second = String(secondary || "").replace("#", "");
		if (!/^[0-9a-f]{6}$/i.test(first) || !/^[0-9a-f]{6}$/i.test(second)) return secondary;
		var weight = Math.max(0, Math.min(1, primaryWeight));
		var mixed = [0, 2, 4].map(function (index) {
			var value = Math.round(
				parseInt(first.slice(index, index + 2), 16) * weight +
				parseInt(second.slice(index, index + 2), 16) * (1 - weight)
			);
			return value.toString(16).padStart(2, "0");
		});
		return "#" + mixed.join("").toUpperCase();
	}

	_apply_preview_vars($target, c, loginConfig) {
		/* The public runtime now resolves the same Dark/Auto surfaces as Desk.
		   Keep content/background settings raw, while visual surfaces use c. */
		var login = c;
		var loginSettings = loginConfig || c;
		var safeLoginImage = String(loginSettings.login_bg_image || "").replace(/["\\\r\n]/g, "");
		var loginBackground = safeLoginImage ?
			'linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)),url("' + safeLoginImage + '")' :
			"linear-gradient(" + loginSettings.login_gradient_angle + "deg," + loginSettings.login_background + "," + loginSettings.login_gradient_to + ")";
		var shadow = {
			None: "none",
			Soft: "0 10px 28px rgba(22,28,45,.09)",
			Elevated: "0 18px 42px rgba(22,28,45,.17)",
		}[c.shadow_style] || "none";
		$target.css({
			"--studio-brand": c.brand_color,
			"--studio-accent": c.accent_color,
			"--studio-sidebar": c.sidebar_background || "#FFFFFF",
			"--studio-navbar": c.navbar_background || "color-mix(in srgb, " + c.brand_color + " 40%, black)",
			"--studio-page": c.page_background || "#F3F5F7",
			"--studio-card": c.card_background || "#FFFFFF",
			"--studio-workspace-card": c.workspace_card_color || c.card_background || "#FFFFFF",
			"--studio-number-card": c.number_card_color || c.card_background || "#FFFFFF",
			"--studio-chart-bg": c.chart_background || c.card_background || "#FFFFFF",
			"--studio-text": c.text_color || "#19202D",
			"--studio-muted": c.muted_text_color || "#697386",
			"--studio-border": c.border_color || "#E1E5EA",
			"--studio-link": c.link_color || c.brand_color,
			"--studio-primary-btn": c.primary_button_color || c.accent_color,
			"--studio-secondary-btn": c.secondary_button_color,
			"--studio-secondary-text": c.secondary_button_text,
			"--studio-button-radius": c.button_radius + "px",
			"--studio-button-height": c.button_height + "px",
			"--studio-button-padding": c.button_padding + "px",
			"--studio-header-height": c.header_height + "px",
			"--studio-input-bg": c.input_background,
			"--studio-input-border": c.input_border_color,
			"--studio-focus": c.focus_color,
			"--studio-focus-width": c.focus_outline_width + "px",
			"--studio-checkbox": c.checkbox_color,
			"--studio-dropdown-bg": c.dropdown_background,
			"--studio-readonly": c.readonly_background,
			"--studio-disabled-opacity": String(c.disabled_opacity / 100),
			"--studio-card-radius": c.card_radius + "px",
			"--studio-section-spacing": c.section_spacing + "px",
			"--studio-form-gap": c.form_column_gap + "px",
			"--studio-row-height": c.list_row_height + "px",
			"--studio-table-header": c.table_header_color,
			"--studio-row-alt": c.alternate_row_color,
			"--studio-row-selected": c.selected_row_color,
			"--studio-row-hover": c.row_hover_color,
			"--studio-report-grid": c.report_grid_color,
			"--studio-success": c.success_color,
			"--studio-warning": c.warning_color,
			"--studio-error": c.error_color,
			"--studio-info": c.info_color,
			"--studio-font": '"' + (c.font_family || "Aptos").replace(/["']/g, "") + '", sans-serif',
			"--studio-base-font": c.base_font_px + "px",
			"--studio-font-weight": String(c.font_weight),
			"--studio-line-height": String(c.line_height / 100),
			"--studio-heading-size": (20 * c.heading_scale / 100) + "px",
			"--studio-label-size": c.label_font_size + "px",
			"--studio-table-font": c.table_font_size + "px",
			"--studio-radius": c.corner_radius + "px",
			"--studio-sidebar-width": c.sidebar_width + "px",
			"--studio-logo-size": c.logo_size + "px",
			"--studio-workspace-width": c.workspace_width + "px",
			"--studio-page-margin": c.page_margin + "px",
			"--studio-shadow": shadow,
			"--studio-sidebar-text": c.sidebar_text_color || this._contrast(c.sidebar_background || "#FFFFFF"),
			"--studio-sidebar-icon": c.sidebar_icon_color || c.sidebar_text_color || this._contrast(c.sidebar_background || "#FFFFFF"),
			"--studio-sidebar-active": c.sidebar_active_color || c.accent_color,
			"--studio-sidebar-active-text": c.sidebar_active_text_color || this._contrast(c.sidebar_active_color),
			"--studio-sidebar-hover": c.sidebar_hover_color || "color-mix(in srgb, " + c.sidebar_background + " 88%, " + c.text_color + ")",
			"--studio-toolbar-text": c.toolbar_text_color || this._contrast(c.navbar_background || c.brand_color),
			"--studio-chart-1": (c.chart_palette || [])[0] || c.brand_color,
			"--studio-chart-2": (c.chart_palette || [])[1] || c.accent_color,
			"--studio-login-bg": c.login_background,
			"--studio-login-to": c.login_gradient_to,
			"--studio-login-angle": c.login_gradient_angle + "deg",
			"--studio-login-opacity": c.login_card_opacity + "%",
			"--studio-login-background": loginBackground,
			"--studio-login-card": login.card_background || "#FFFFFF",
			"--studio-login-text": login.text_color || "#19202D",
			"--studio-login-muted": login.muted_text_color || "#697386",
			"--studio-login-input": login.input_background || "#F9FAFB",
			"--studio-login-input-border": login.input_border_color || "#C9CDD4",
			"--studio-login-button": login.accent_color || "#F57C00",
			"--studio-login-link": login.brand_color || "#1B3F7E",
			"--studio-login-card-radius": (login.card_radius || 16) + "px",
			"--studio-login-button-radius": (login.button_radius || 8) + "px",
		});
		$target.attr("data-layout", String(c.layout_mode || "Full Width").toLowerCase().replace(/\s+/g, "-"));
		$target.attr("data-logo-position", String(c.logo_position || "Left").toLowerCase());
		$target.attr("data-module-icons", String(c.module_icon_style || "Tinted").toLowerCase());
		$target.attr("data-empty-state", String(c.empty_state_style || "Minimal").toLowerCase());
		$target.attr("data-compact-forms", String(!!c.compact_forms));
		$target.attr("data-high-contrast", String(!!c.high_contrast));
		$target.attr("data-large-text", String(!!c.large_text));
		$target.attr("data-sticky-navbar", String(!!c.sticky_navbar));
		$target.attr("data-sticky-form-toolbar", String(!!c.sticky_form_toolbar));
		$target.find("[data-app-title]").text(loginSettings.app_title || "Solvronix Desk");
		$target.find("[data-app-tagline]").text(loginSettings.tagline || "desk.solvronix.local");
		var $favicon = $target.find("[data-favicon-preview]");
		$favicon.off("error.sts load.sts")
			.on("error.sts", function () { this.hidden = true; })
			.on("load.sts", function () { this.hidden = false; });
		if (loginSettings.favicon) $favicon.attr("src", loginSettings.favicon).prop("hidden", false);
		else $favicon.removeAttr("src").prop("hidden", true);
		$target.find("[data-login-heading]").text(loginSettings.login_heading || __("Welcome back"));
		$target.find("[data-login-description]").text(loginSettings.login_description || "");
		var $companyLogo = $target.find("[data-login-company-logo]");
		$companyLogo.attr("alt", loginSettings.app_title || "");
		$companyLogo.off("error.sts load.sts")
			.on("error.sts", function () { this.hidden = true; })
			.on("load.sts", function () { this.hidden = false; });
		if (loginSettings.company_logo) $companyLogo.attr("src", loginSettings.company_logo).prop("hidden", false);
		else $companyLogo.removeAttr("src").prop("hidden", true);
		$target.find("[data-login-powered]").prop("hidden", !!loginSettings.hide_powered);
		$target.find("[data-login-footer]").text(loginSettings.footer_text || "").prop("hidden", !loginSettings.footer_text);
	}

	/* Debounce server CSS generation and discard stale asynchronous responses. */
	_refresh_server_preview() {
		var self = this, snapshot = JSON.stringify(this.config);
		clearTimeout(this.preview_timer);
		this.preview_timer = setTimeout(function () {
			frappe.call({
				method: "solvronix_desk.theme_api.preview_theme_css",
				args: { config: self.config },
				callback: function (response) {
					if (!response.message || snapshot !== JSON.stringify(self.config)) return;
					var element = document.getElementById("st-studio-draft") || document.createElement("style");
					element.id = "st-studio-draft";
					element.textContent = response.message.css;
					if (!element.parentNode) document.head.appendChild(element);
					window.dispatchEvent(new CustomEvent("st-theme-runtime-refresh", {
						detail: {
							config: response.message.config,
							preferred_mode: response.message.config.preferred_mode,
							preview: true,
						},
					}));
					self._update_wcag(response.message.wcag_failures);
				},
			});
		}, 220);
	}

	/* ── 12. ACCESSIBILITY CONTRAST AUDIT ──────────────────────────────────── */
	_update_wcag(serverFailures) {
		var failures = serverFailures || [];
		if (!serverFailures) {
			var visual = this._resolved_visual_config(this.config);
			var pairs = [
				[__("Text / page"), visual.text_color, visual.page_background],
				[__("Text / card"), visual.text_color, visual.card_background],
				[__("Link / page"), visual.link_color, visual.page_background],
				[__("Sidebar text"), visual.sidebar_text_color || this._contrast(visual.sidebar_background), visual.sidebar_background],
				[__("Toolbar text"), visual.toolbar_text_color || this._contrast(visual.navbar_background), visual.navbar_background],
				[__("Active menu text"), visual.sidebar_active_text_color || this._contrast(visual.sidebar_active_color), visual.sidebar_active_color],
			];
			failures = pairs.filter(function (pair) { return this._ratio(pair[1], pair[2]) < 4.5; }, this)
				.map(function (pair) { return pair[0]; });
		}
		var $card = this.$root.find("#sts-wcag-card");
		if (!$card.length) return;
		$card.toggleClass("has-errors", failures.length > 0).html(
			'<strong>' + (failures.length ? __("WCAG AA needs attention") : __("WCAG AA checks passed")) + "</strong>" +
			'<p>' + (failures.length ? this._esc(failures.join(", ")) : __("All primary text/background pairs meet 4.5:1.")) + "</p>"
		);
	}

	_ratio(foreground, background) {
		function luminance(value) {
			var hex = String(value || "").replace("#", "");
			if (!/^[0-9a-f]{6}$/i.test(hex)) return 0;
			var channels = [0, 2, 4].map(function (index) {
				var component = parseInt(hex.slice(index, index + 2), 16) / 255;
				return component <= 0.04045 ? component / 12.92 : Math.pow((component + 0.055) / 1.055, 2.4);
			});
			return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
		}
		var values = [luminance(foreground), luminance(background)].sort(function (a, b) { return b - a; });
		return (values[0] + 0.05) / (values[1] + 0.05);
	}

	/* ── 13. PUBLISH / RESET / DESK-WIDE DRAFT APPLICATION ────────────────── */
	save() {
		if (!this.config || !this.dirty) {
			frappe.show_alert({ message: __("Theme is already up to date"), indicator: "blue" });
			return;
		}
		var self = this;
		this.page.btn_primary.prop("disabled", true);
		frappe.call({
			method: "solvronix_desk.theme_api.publish_theme_config",
			args: {
				config: this.config,
				label: __("Before publishing from Theme Studio"),
				profile_id: this.active_profile || this.$root.find("#sts-profile-select").val() || "",
			},
			freeze: true,
			freeze_message: __("Publishing your theme…"),
			callback: function (r) {
				if (!r.message) return;
				self.config = self._clone(r.message.config);
				self.saved = self._clone(r.message.config);
				self.state = r.message.state || self.state;
				self.published_profile = self.active_profile;
				self.history = [];
				self.future = [];
				self.dirty = false;
				self.changed(false);
				self._inject_global_css(r.message.css);
				window.dispatchEvent(new CustomEvent("st-theme-runtime-refresh", {
					detail: {
						css: r.message.css,
						config: r.message.config,
						preferred_mode: r.message.config.preferred_mode,
						schedule: self.state && self.state.schedule,
					},
				}));
				self.original_dark = r.message.config.preferred_mode === "Dark" ||
					(r.message.config.preferred_mode === "Auto" && window.matchMedia &&
						window.matchMedia("(prefers-color-scheme: dark)").matches);
				self.remove_draft(false);
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
		if (window.stApplyThemeCss) {
			window.stApplyThemeCss(css);
			return;
		}
		var el = document.getElementById("st-dynamic-theme") || document.getElementById("st-inline-theme");
		if (!el) {
			el = document.createElement("style");
			el.id = "st-dynamic-theme";
			document.head.appendChild(el);
		}
		el.textContent = css;
		try { localStorage.setItem("st_theme_css", css); } catch (e) {}
	}

	_apply_draft_to_desk(visualConfig) {
		if (!this.config) return;
		var c = visualConfig || this._resolved_visual_config(this.config);
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

	/* Restore the pre-Studio runtime when navigation leaves the editor. */
	remove_draft(restoreMode) {
		var el = document.getElementById("st-studio-draft");
		if (el) el.remove();
		if (restoreMode !== false) {
			if (this.saved) {
				window.dispatchEvent(new CustomEvent("st-theme-runtime-refresh", {
					detail: { config: this.saved, preview: true },
				}));
			}
			if (window.stApplyDark) stApplyDark(this.original_dark);
		}
	}

	/* ── 14. PURE HELPERS ──────────────────────────────────────────────────── */
	_clone(value) { return JSON.parse(JSON.stringify(value)); }

	_esc(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	_contrast(color) {
		var hex = String(color || "").replace("#", "");
		if (!/^[0-9a-f]{6}$/i.test(hex)) return "#19202D";
		var r = parseInt(hex.slice(0, 2), 16);
		var g = parseInt(hex.slice(2, 4), 16);
		var b = parseInt(hex.slice(4, 6), 16);
		return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.45 ? "#19202D" : "#FFFFFF";
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
			cube: '<path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z"/><path d="m4 6.5 8 4.5 8-4.5M12 11v9"/>',
			mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
			lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
			eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
		};
		return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || "") + "</svg>";
	}
};
