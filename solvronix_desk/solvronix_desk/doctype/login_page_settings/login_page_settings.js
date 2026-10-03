const MAX_FEATURE_CARDS = 4;

frappe.ui.form.on("Login Page Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Preview Login"), () => {
			// Open synchronously so the popup isn't blocked, then point it at the saved page.
			const preview = window.open("about:blank", "_blank");
			const layout = frm.doc.layout === "Centered Card" ? "centered" : "split";
			const show = () => preview && (preview.location = `/login?preview=1&layout=${layout}`);
			frm.is_dirty() ? frm.save().then(show) : show();
		});
		frm.add_custom_button(__("Fetch Branding"), () => {
			frappe
				.call("solvronix_desk.solvronix_desk.doctype.login_page_settings.login_page_settings.fetch_branding")
				.then(({ message }) => {
					Object.entries(message || {}).forEach(([field, value]) => frm.set_value(field, value || ""));
					frappe.show_alert({ message: __("Branding fetched from site settings"), indicator: "green" });
				});
		});
		frm.add_custom_button(__("Restore Default Text"), () => {
			frappe.confirm(
				__("Clear all text on this page so the built-in default text is used again?"),
				() => {
					Object.keys(frm.doc.__onload?.default_copy || {}).forEach((field) => frm.set_value(field, ""));
					frm.clear_table("feature_cards");
					frm.refresh_field("feature_cards");
					frappe.show_alert({ message: __("Default text restored — save to apply"), indicator: "green" });
				}
			);
		});
		show_default_placeholders(frm);
		toggle_card_limit(frm);
	},
	feature_cards_add: toggle_card_limit,
	feature_cards_remove: toggle_card_limit,
});

function show_default_placeholders(frm) {
	// Empty fields fall back to the built-in text on the login page; show it here.
	Object.entries(frm.doc.__onload?.default_copy || {}).forEach(([field, text]) => {
		const control = frm.fields_dict[field];
		control?.$input?.attr("placeholder", text);
	});
}

function toggle_card_limit(frm) {
	const grid = frm.get_field("feature_cards").grid;
	grid.cannot_add_rows = (frm.doc.feature_cards || []).length >= MAX_FEATURE_CARDS;
	grid.refresh();
}
