// Copyright (c) 2026, Solvronix and contributors
// For license information, please see license.txt

const ST_PRESETS = [
	{ name: "Solvronix", brand: "#1B3F7E", accent: "#F57C00" },
	{ name: "Forest",    brand: "#1A4731", accent: "#D97706" },
	{ name: "Midnight",  brand: "#1E293B", accent: "#7C3AED" },
	{ name: "Plum",      brand: "#6B2D6E", accent: "#F0A500" },
];

function st_swatch_html(p, custom) {
	return `
	<div class="st-preset-swatch${custom ? " st-preset-custom" : ""}"
	     data-brand="${p.brand}"
	     data-accent="${p.accent}"
	     title="${frappe.utils.escape_html(p.name)}"
	     style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;position:relative;">
		<div style="
			width:48px;height:48px;border-radius:10px;
			background:linear-gradient(135deg,${p.brand} 55%,${p.accent} 45%);
			border:2px solid transparent;
			transition:all 0.2s ease;
			box-shadow:0 2px 8px rgba(0,0,0,0.15);
		"></div>
		<span style="font-size:11px;color:#666;max-width:60px;overflow:hidden;
		             text-overflow:ellipsis;white-space:nowrap;">${frappe.utils.escape_html(p.name)}</span>
	</div>`;
}

function st_build_preset_wrapper(frm) {
	const builtin = ST_PRESETS.map((p) => st_swatch_html(p, false)).join("");
	const custom = (frm.doc.custom_presets || [])
		.filter((r) => r.preset_name && r.brand_color && r.accent_color)
		.map((r) =>
			st_swatch_html({ name: r.preset_name, brand: r.brand_color, accent: r.accent_color }, true)
		)
		.join("");

	const saveBtn = `
	<div class="st-preset-save" title="${__("Save current colors as a preset")}"
	     style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;">
		<div style="
			width:48px;height:48px;border-radius:10px;
			border:2px dashed #aaa;display:flex;align-items:center;justify-content:center;
			font-size:20px;color:#888;transition:all 0.2s ease;
		">+</div>
		<span style="font-size:11px;color:#666;">${__("Save")}</span>
	</div>`;

	return $(`
		<div class="st-presets" style="margin-bottom:20px; padding: 0 15px 0 18px;">
			<div style="font-size:11px;font-weight:600;text-transform:uppercase;
			            letter-spacing:0.08em;color:#888;margin-bottom:10px;">
				${__("Quick Presets")}
			</div>
			<div style="display:flex;gap:10px;flex-wrap:wrap;">${builtin}${custom}${saveBtn}</div>
		</div>
	`);
}

function st_highlight_active(wrapper, brand, accent) {
	wrapper.find(".st-preset-swatch").each(function () {
		const match =
			String($(this).data("brand")).toLowerCase() === (brand || "").toLowerCase() &&
			String($(this).data("accent")).toLowerCase() === (accent || "").toLowerCase();
		$(this).find("div").first().css("border-color", match ? $(this).data("brand") : "transparent");
	});
}

function st_save_current_as_preset(frm) {
	if (!frm.doc.brand_color || !frm.doc.accent_color) {
		frappe.show_alert({ message: __("Set brand and accent colors first"), indicator: "orange" });
		return;
	}
	frappe.prompt(
		{ fieldname: "preset_name", fieldtype: "Data", label: __("Preset Name"), reqd: 1 },
		(values) => {
			const exists = (frm.doc.custom_presets || []).some(
				(r) => (r.preset_name || "").toLowerCase() === values.preset_name.toLowerCase()
			);
			if (exists) {
				frappe.show_alert({ message: __("A preset with that name already exists"), indicator: "orange" });
				return;
			}
			const row = frm.add_child("custom_presets");
			row.preset_name = values.preset_name;
			row.brand_color = frm.doc.brand_color;
			row.accent_color = frm.doc.accent_color;
			frm.refresh_field("custom_presets");
			frm.dirty();
			frappe.show_alert({ message: __("Preset added — click Save to keep it"), indicator: "green" }, 3);
			st_render_presets(frm);
		},
		__("Save Current Colors as Preset")
	);
}

function st_render_presets(frm) {
	// Remove stale presets from a previous refresh before re-injecting
	frm.$wrapper.find(".st-presets").remove();

	const wrapper = st_build_preset_wrapper(frm);

	// Insert before the Colors section (above brand_color + accent_color)
	frm.fields_dict["brand_color"].$wrapper
		.closest(".form-section")
		.before(wrapper);

	wrapper.on("click", ".st-preset-swatch", function () {
		const brand  = $(this).data("brand");
		const accent = $(this).data("accent");
		frm.set_value("brand_color", brand);
		frm.set_value("accent_color", accent);
		st_highlight_active(wrapper, brand, accent);
		frappe.show_alert({ message: __("Preset applied — click Save to update"), indicator: "green" }, 3);
	});

	wrapper.on("click", ".st-preset-save", function () {
		st_save_current_as_preset(frm);
	});

	st_highlight_active(wrapper, frm.doc.brand_color, frm.doc.accent_color);
}

frappe.ui.form.on("Theme Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Open Theme Studio"), function () {
			frappe.set_route("theme-studio");
		}, __("Actions"));

		frm.add_custom_button(__("Preview Theme"), function () {
			frappe.call({
				method: "solvronix_desk.api.get_theme_css",
				callback(r) {
					if (!r.message) return;
					let el =
						document.getElementById("st-dynamic-theme") ||
						document.createElement("style");
					el.id = "st-dynamic-theme";
					el.textContent = r.message;
					if (!document.getElementById("st-dynamic-theme")) {
						document.head.appendChild(el);
					}
					frappe.show_alert({ message: __("Theme preview applied!"), indicator: "green" });
				},
			});
		}, __("Actions"));

		st_render_presets(frm);
	},

	brand_color(frm) {
		st_highlight_active(
			frm.$wrapper.find(".st-presets"),
			frm.doc.brand_color,
			frm.doc.accent_color
		);
	},

	accent_color(frm) {
		st_highlight_active(
			frm.$wrapper.find(".st-presets"),
			frm.doc.brand_color,
			frm.doc.accent_color
		);
	},
});
