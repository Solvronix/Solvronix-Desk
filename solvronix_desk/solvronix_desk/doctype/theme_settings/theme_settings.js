// Copyright (c) 2026, Solvronix and contributors
// For license information, please see license.txt

const ST_PRESETS = [
	{ name: "Solvronix", brand: "#1B3F7E", accent: "#F57C00" },
	{ name: "Forest",    brand: "#1A4731", accent: "#D97706" },
	{ name: "Midnight",  brand: "#1E293B", accent: "#7C3AED" },
	{ name: "Plum",      brand: "#6B2D6E", accent: "#F0A500" },
];

function st_build_preset_wrapper() {
	const swatches = ST_PRESETS.map(
		(p) => `
		<div class="st-preset-swatch"
		     data-brand="${p.brand}"
		     data-accent="${p.accent}"
		     title="${p.name}"
		     style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;">
			<div style="
				width:48px;height:48px;border-radius:10px;
				background:linear-gradient(135deg,${p.brand} 55%,${p.accent} 45%);
				border:2px solid transparent;
				transition:all 0.2s ease;
				box-shadow:0 2px 8px rgba(0,0,0,0.15);
			"></div>
			<span style="font-size:11px;color:#666;">${p.name}</span>
		</div>`
	).join("");

	return $(`
		<div class="st-presets" style="margin-bottom:20px; padding: 0 15px 0 18px;">
			<div style="font-size:11px;font-weight:600;text-transform:uppercase;
			            letter-spacing:0.08em;color:#888;margin-bottom:10px;">
				Quick Presets
			</div>
			<div style="display:flex;gap:10px;flex-wrap:wrap;">${swatches}</div>
		</div>
	`);
}

function st_highlight_active(wrapper, brand, accent) {
	wrapper.find(".st-preset-swatch").each(function () {
		const match =
			$(this).data("brand").toLowerCase() === (brand || "").toLowerCase() &&
			$(this).data("accent").toLowerCase() === (accent || "").toLowerCase();
		$(this).find("div").css("border-color", match ? $(this).data("brand") : "transparent");
	});
}

frappe.ui.form.on("Theme Settings", {
	refresh(frm) {
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

		// Remove stale presets from a previous refresh before re-injecting
		frm.$wrapper.find(".st-presets").remove();

		const wrapper = st_build_preset_wrapper();

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

		st_highlight_active(wrapper, frm.doc.brand_color, frm.doc.accent_color);
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
