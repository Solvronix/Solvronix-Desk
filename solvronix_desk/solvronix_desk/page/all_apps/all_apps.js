/* ================================================================
   Solvronix Desk — All Apps
   Stable, dedicated route for the workspace launcher grid.
   Registered as Frappe Page "all-apps" so it always works regardless
   of Smart Home's bare-route redirect or any site's own Workspace
   naming (both can make the grid unreachable otherwise — see #8
   follow-up). Reuses module_cards.js's own card renderer via
   solvronix_desk.workspaceCards so this looks identical to Today's
   View's "Your Apps" section and the bare-route grid.
   ================================================================ */

frappe.pages["all-apps"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("All Apps"),
		single_column: true,
	});
	var inst = new solvronix_desk.AllApps(wrapper);
	frappe.pages["all-apps"]._inst = inst;
	inst.render();
};

frappe.provide("solvronix_desk");

solvronix_desk.AllApps = class AllApps {
	constructor(wrapper) {
		this.wrapper = $(wrapper);
		this.$body = this.wrapper.find(".page-content");
	}

	render() {
		var wc = solvronix_desk.workspaceCards;
		if (!wc) {
			this.$body.html('<div class="st-ws-empty">' + __("Workspace data unavailable.") + "</div>");
			return;
		}

		this.$body.html(
			/* Reuses #st-module-grid's own padding/max-width/dark-mode/
			   responsive rules from module_cards.css — same spacing as
			   the original bare-route grid, no duplicated CSS needed. */
			'<div id="st-module-grid">' +
			  '<div class="st-ws-header">' +
			    '<div class="st-ws-title">' + __("All Apps") + '</div>' +
			    '<div class="st-ws-subtitle">' + __("Jump to any workspace from here") + '</div>' +
			  '</div>' +
			  '<div class="st-ws-search-wrap">' +
			    '<input id="st-all-apps-search" class="st-ws-search" type="text" placeholder="' + __("Search apps…") + '" autocomplete="off">' +
			  '</div>' +
			  '<div id="st-all-apps-cards">' + wc.buildSkeletons(8) + '</div>' +
			'</div>'
		);

		var $search = this.$body.find("#st-all-apps-search");
		$search.on("input", this._filter.bind(this));

		wc.fetchWorkspaces(
			function (pages) {
				var $cards = this.$body.find("#st-all-apps-cards");
				if (!pages || !pages.length) {
					$cards.html('<div class="st-ws-cards"><div class="st-ws-empty">' + __("No workspaces found.") + "</div></div>");
					return;
				}

				var html = '<div class="st-ws-cards">' +
					pages.map(function (p, idx) { return wc.buildCard(p, idx); }).join("") +
					'<div id="st-all-apps-empty" class="st-ws-empty" style="display:none">' + __("No apps match your search.") + "</div>" +
				"</div>";
				$cards.html(html);

				$cards.find(".st-ws-card[data-ws]").each(function () {
					var slug = this.getAttribute("data-ws");
					this.addEventListener("click", function (e) {
						e.preventDefault();
						if (slug) frappe.set_route(slug);
					});
				});

				if ($search.val()) this._filter();
			}.bind(this)
		);
	}

	_filter() {
		var q = (this.$body.find("#st-all-apps-search").val() || "").toLowerCase().trim();
		var $cards = this.$body.find("#st-all-apps-cards .st-ws-card");
		var any = false;

		$cards.each(function () {
			var $c = $(this);
			var title = ($c.find(".st-ws-card-name").text() || "").toLowerCase();
			var desc = ($c.find(".st-ws-card-desc").text() || "").toLowerCase();
			var match = !q || title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
			$c.toggle(match);
			if (match) any = true;
		});

		this.$body.find("#st-all-apps-empty").toggle(!any);
	}
};
