// Copyright (c) 2026, Solvronix and contributors
// For license information, please see license.txt

frappe.ui.form.on("Theme Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Preview Theme"), function () {
			frappe.call({
				method: "solvronix_theme.api.get_theme_css",
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
					frappe.show_alert({
						message: __("Theme preview applied!"),
						indicator: "green",
					});
				},
			});
		}, __("Actions"));
	},
});
