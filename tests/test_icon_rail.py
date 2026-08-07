"""Structural coverage for the opt-in Icon Rail sidebar layout."""

import importlib.util
import re
from pathlib import Path
import sys
import types
import unittest


ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "solvronix_desk" / "public" / "js" / "solvronix_desk.js"
CSS = ROOT / "solvronix_desk" / "public" / "css" / "sidebar.css"
HOOKS = ROOT / "solvronix_desk" / "hooks.py"
THEME_SETTINGS_JSON = ROOT / "solvronix_desk" / "solvronix_desk" / "doctype" / "theme_settings" / "theme_settings.json"
THEME_SETTINGS_PY = ROOT / "solvronix_desk" / "solvronix_desk" / "doctype" / "theme_settings" / "theme_settings.py"
THEME_ENGINE = ROOT / "solvronix_desk" / "theme_engine.py"
THEME_STUDIO_JS = ROOT / "solvronix_desk" / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js"


class FrappeStub(types.ModuleType):
    def throw(self, message):
        raise ValueError(message)


def load_engine():
    """Import theme_engine.py standalone, mirroring test_theme_engine.py's harness."""
    previous = sys.modules.get("frappe")
    sys.modules["frappe"] = FrappeStub("frappe")
    try:
        spec = importlib.util.spec_from_file_location("theme_engine_icon_rail_test_module", THEME_ENGINE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        if previous is None:
            sys.modules.pop("frappe", None)
        else:
            sys.modules["frappe"] = previous


ENGINE = load_engine()


class IconRailTest(unittest.TestCase):
    def test_rail_is_gated_behind_sidebar_layout_and_reuses_workspace_data(self):
        js = JS.read_text(encoding="utf-8")

        self.assertIn("function injectIconRail", js)
        self.assertIn("function railEnabled", js)
        self.assertIn('id="st-icon-rail"', js)
        self.assertIn('sidebar_layout === "Icon Rail"', js)
        self.assertIn("solvronix_desk.api.get_workspaces", js)
        self.assertIn("page.parent_page", js)

    def test_rail_click_uses_normal_routing_and_syncs_highlight(self):
        js = JS.read_text(encoding="utf-8")

        self.assertIn("function syncRailHighlight", js)
        self.assertIn("frappe.set_route(route)", js)
        self.assertIn('data-title', js)
        self.assertIn('frappe.router.on("change", syncRailHighlight)', js)

    def test_no_app_highlighted_on_smart_home(self):
        """Regression test: Smart Home / Today's View is a cross-app
        dashboard, not a real Workspace — Frappe's own sidebar has nothing to
        resolve for it and keeps showing whichever workspace's list was last
        active, which made the rail misleadingly highlight that workspace's
        app as if Today's View belonged to it."""
        js = JS.read_text(encoding="utf-8")

        self.assertIn('route[0] === "smart-home"', js)
        self.assertIn("var active = onSmartHome ? \"\" : activeSidebarTitle();", js)

    def test_rail_groups_by_installed_app_not_by_workspace(self):
        """One rail icon per installed app (using frappe.boot.app_data's
        friendly app_title, e.g. "Frappe HR" not "HR Setup"), not one per
        workspace — ERPNext alone can contribute a dozen top-level
        workspaces, far too many for a slim rail. get_workspaces() already
        tags each page with its owning app; group by that instead of
        rendering every page as its own rail item."""
        js = JS.read_text(encoding="utf-8")

        self.assertIn("appReps[appKey] = page", js)
        self.assertIn("frappe.boot && frappe.boot.app_data", js)
        self.assertIn("meta.app_title", js)
        self.assertIn("ST._railTitleToApp = titleToApp", js)

    def test_rail_items_use_real_icon_artwork_in_a_theme_colored_tile(self):
        """Each rail item shows the representative workspace's real icon
        (frappe.utils.icon) inside a tile, not a colored dot — matching the
        reference design. Tile color is driven by --st-rail-bg, which
        defaults to the theme's own accent color so it updates automatically
        when brand/accent colors change in Theme Studio."""
        js = JS.read_text(encoding="utf-8")
        css = CSS.read_text(encoding="utf-8")
        engine = THEME_ENGINE.read_text(encoding="utf-8")

        self.assertIn('class="st-rail-app-icon"', js)
        self.assertIn("frappe.utils.icon(item.icon", js)
        self.assertIn("st-rail-app-fallback", js)
        self.assertIn("background: var(--st-rail-bg, var(--st-accent));", css)
        self.assertIn('"--st-rail-bg": config["icon_rail_background"] or config["accent_color"]', engine)

    def test_rail_icons_are_actually_visible_not_just_correctly_colored_in_theory(self):
        """Regression test: frappe.utils.icon()'s <svg class="icon"> renders
        via the --icon-fill/--icon-stroke custom properties Frappe's own
        icons.scss declares (fill: var(--icon-fill); stroke: var(--icon-stroke);)
        — never via `color`/currentColor. Setting `color: var(--st-rail-icon-
        color)` on the tile, as the very first version of this feature did,
        has zero effect on the glyph: it silently renders with whatever
        --icon-stroke happens to be ambient on the page (a neutral gray meant
        for icons sitting on the plain page background), invisible against an
        accent-colored tile on a real site. Confirmed live: every rail tile
        and the collapse chevron rendered as a solid blank color swatch with
        no visible glyph at all. Each tile/control that renders a real
        frappe.utils.icon() svg on its own colored surface must set
        --icon-stroke explicitly, scoped locally — Frappe's own CSS uses this
        exact scoped-override pattern throughout (e.g. desk/filters.scss's
        `--icon-stroke: var(--primary);`)."""
        css = CSS.read_text(encoding="utf-8")

        tile = css[css.index("#st-icon-rail .st-rail-app-icon {"):css.index("#st-icon-rail .st-rail-app-icon svg")]
        self.assertIn("--icon-stroke: var(--st-rail-icon-color", tile)

        collapse = css[css.index("#st-icon-rail .st-rail-collapse {"):css.index("#st-icon-rail .st-rail-collapse:hover")]
        self.assertIn("--icon-stroke: var(--st-sidebar-text-muted", collapse)

    def test_active_rail_item_uses_a_ring_not_an_inverted_color_scheme(self):
        """Regression test: an earlier version swapped the active item's
        background AND text color, and the active workspace's label appeared
        blank on a real site because of that. Sidestep the whole class of
        contrast bugs: the active tile keeps the same background always and
        just gets a ring — label/tile contrast never has to be recomputed
        per state."""
        css = CSS.read_text(encoding="utf-8")

        self.assertIn("#st-icon-rail .st-rail-app.st-rail-active .st-rail-app-icon {", css)
        self.assertIn("box-shadow: 0 0 0 2px", css)
        self.assertNotIn("st-rail-active-text", css)

    def test_rail_has_a_collapse_toggle_matching_the_classic_sidebars_own(self):
        """The rail can shrink to icon-tiles-only (no labels), matching the
        classic sidebar's own collapse behavior — persisted separately
        (st-rail-collapsed) since it's an independent column, not tied to
        Frappe's own sidebar-expanded key."""
        js = JS.read_text(encoding="utf-8")
        css = CSS.read_text(encoding="utf-8")

        self.assertIn('class="st-rail-collapse"', js)
        self.assertIn('localStorage.getItem("st-rail-collapsed")', js)
        self.assertIn('localStorage.setItem("st-rail-collapsed"', js)
        self.assertIn("#st-icon-rail.is-collapsed", css)
        self.assertIn("#st-icon-rail.is-collapsed .st-rail-label", css)

    def test_rail_shows_the_company_logo_at_the_top(self):
        """The rail's own company logo/icon (reusing the same ST._branding
        boot data the classic sidebar's #st-company-header uses for its
        text-only company name), not just app tiles — falls back to a
        lettered avatar if no logo is configured. The logo has exactly one
        home in the sidebar chrome — this rail tile — so the classic
        header never renders it a second time."""
        js = JS.read_text(encoding="utf-8")
        css = CSS.read_text(encoding="utf-8")

        self.assertIn('class="st-rail-brand"', js)
        self.assertIn("ST._branding", js)
        self.assertIn("st-rail-brand-fallback", js)
        self.assertIn("#st-icon-rail .st-rail-brand", css)

    def test_classic_sidebar_header_shows_the_company_name_only_no_logo(self):
        """Regression test: #st-company-header (the classic sidebar's own
        branding header, shown beside the rail) used to render the logo a
        second time next to the company name — duplicating the Icon Rail's
        own dedicated brand tile. injectSidebarBrandingHeader() must build
        text only, permanently, regardless of whether a logo is configured."""
        js = JS.read_text(encoding="utf-8")
        css = CSS.read_text(encoding="utf-8")

        fn = js[js.index("function injectSidebarBrandingHeader"):js.index("3. BROWSER TAB TITLE")]

        self.assertNotIn("<img", fn)
        self.assertIn("st-company-name", fn)
        self.assertIn("if (!b.company_name) return;", fn)
        self.assertNotIn("#st-company-header img", css)

    def test_rail_brand_refreshes_live_instead_of_only_at_first_render(self):
        """Regression test: injectIconRail() only builds the rail's DOM once
        (it early-returns on every later call while the layout stays Icon
        Rail), so the very first version of this feature baked the logo
        markup into that one-shot render — a live logo/name change updated
        the classic sidebar's own header but left the rail showing stale
        artwork until a full reload. renderRailBrand() is the one place that
        writes the rail's brand tile, and must be re-invoked from every path
        that can change ST._branding without a reload: the st_theme_changed
        realtime handler, the resolved-config-driven runtime refresh, and
        the raw Theme Settings form's own after_save hook."""
        js = JS.read_text(encoding="utf-8")

        self.assertIn("function renderRailBrand", js)
        self.assertIn('$("#st-icon-rail .st-rail-brand")', js)

        realtime_branding = js.index("/* 2. Refresh branding header if company/logo changed */")
        runtime_refresh = js.index('window.addEventListener("st-theme-runtime-refresh"')
        after_save = js.index('frappe.ui.form.on("Theme Settings"')
        render_calls = [m.start() for m in re.finditer(r"renderRailBrand\(\)", js)]

        def has_call_after(anchor, before):
            return any(anchor < pos < before for pos in render_calls)

        self.assertTrue(has_call_after(realtime_branding, runtime_refresh))
        self.assertTrue(has_call_after(runtime_refresh, after_save))
        self.assertTrue(any(pos > after_save for pos in render_calls))

    def test_list_column_force_expand_does_not_fight_mobiles_own_overlay_toggle(self):
        """Regression test: below Frappe's own sidebar breakpoint (768px,
        frappe/public/scss/desk/sidebar.scss's media-breakpoint-down(sm)),
        core CSS turns ".expanded" into a full-screen overlay + dimming
        scrim toggled by tapping the navbar brand. keepListColumnExpanded()
        used to force that class on unconditionally on every page-change,
        which would re-open the overlay immediately after a mobile user
        tapped it shut — permanently covering Desk content under Icon Rail
        layout. It must bail out under that breakpoint instead."""
        js = JS.read_text(encoding="utf-8")
        fn = js[js.index("function keepListColumnExpanded"):js.index("function injectIconRail")]

        self.assertIn("matchMedia", fn)
        self.assertIn("767px", fn)
        guard_pos = fn.index("max-width: 767px")
        add_class_pos = fn.index('.addClass("expanded")')
        self.assertLess(guard_pos, add_class_pos)

    def test_classic_workspace_quick_list_is_removed(self):
        js = JS.read_text(encoding="utf-8")

        self.assertNotIn("injectWorkspaceRail", js)
        self.assertNotIn('id="st-workspace-rail"', js)

    def test_rail_css_is_additive_and_does_not_edit_default_tree_layout(self):
        css = CSS.read_text(encoding="utf-8")

        self.assertIn("#st-icon-rail", css)
        self.assertIn("--st-rail-width", css)

    def test_rail_clears_the_fixed_toolbar(self):
        css = CSS.read_text(encoding="utf-8")

        self.assertIn("body.st-has-toolbar #st-icon-rail", css)

    def test_list_column_stays_expanded_via_frappes_own_mechanism_not_new_css(self):
        """Regression test: an earlier version force-collapsed the list column
        to width:0/overflow:hidden via new CSS scoped under
        body.st-sidebar-layout-rail, which visually broke on a real site (item
        labels escaped their zero-width container instead of clipping). Fixed
        by reusing Frappe's own .expanded class/CSS — the exact mechanism
        classic Tree mode already renders correctly with today — instead of
        inventing new width/label override rules."""
        css = CSS.read_text(encoding="utf-8")
        js = JS.read_text(encoding="utf-8")

        self.assertNotIn("overflow: hidden !important", css.split("ICON RAIL")[1])
        self.assertIn("function keepListColumnExpanded", js)
        self.assertIn('$container.addClass("expanded")', js)

    def test_live_theme_changes_patch_boot_data_and_retrigger_the_rail(self):
        """Regression test: frappe.boot.st_theme_config is only embedded once,
        at the last full page load — it never refreshes during SPA
        navigation, so a Theme Studio publish previously had no visible
        effect on already-open Desk tabs until a manual reload. This reuses
        the existing "st-theme-runtime-refresh" event (already dispatched by
        the realtime st_theme_changed handler, already consumed by
        theme_runtime.js/chart_runtime.js) instead of adding new plumbing."""
        js = JS.read_text(encoding="utf-8")

        self.assertIn('window.addEventListener("st-theme-runtime-refresh"', js)
        self.assertIn("frappe.boot.st_theme_config = frappe.boot.st_theme_config", js)
        self.assertIn("cfg.sidebar_layout = config.sidebar_layout", js)

    def test_theme_settings_doctype_has_sidebar_layout_fields(self):
        schema = THEME_SETTINGS_JSON.read_text(encoding="utf-8")

        for fieldname in (
            "sidebar_layout",
            "icon_rail_width",
            "icon_rail_background",
            "icon_rail_active_color",
        ):
            self.assertIn(f'"fieldname": "{fieldname}"', schema)

    def test_theme_settings_boot_exposes_sidebar_layout(self):
        py = THEME_SETTINGS_PY.read_text(encoding="utf-8")

        self.assertIn("sidebar_layout", py)

    def test_theme_engine_validates_and_emits_rail_variables(self):
        engine = THEME_ENGINE.read_text(encoding="utf-8")

        self.assertIn('"sidebar_layout": "Icon Rail"', engine)
        self.assertIn('"icon_rail_width": 72', engine)
        self.assertIn('"icon_rail_width": (60, 120)', engine)
        self.assertIn('"sidebar_layout": {"Tree", "Icon Rail"}', engine)
        # The step sidebar_auto_collapse skipped: an emitted CSS declaration,
        # not just a validated config key, or the setting never reaches the
        # real Desk.
        self.assertIn('"--st-rail-width"', engine)
        self.assertIn('"--st-rail-bg"', engine)
        self.assertIn('"--st-rail-active"', engine)

    def test_theme_studio_exposes_sidebar_layout_control(self):
        studio = THEME_STUDIO_JS.read_text(encoding="utf-8")

        self.assertIn('"sidebar_layout", "Sidebar layout", "select", ["Tree", "Icon Rail"]', studio)
        self.assertIn("icon_rail_width", studio)
        self.assertIn("_apply_draft_to_desk", studio)
        self.assertIn("--st-rail-width:", studio)

    def test_rail_assets_are_cache_busted(self):
        hooks = HOOKS.read_text(encoding="utf-8")

        self.assertIn("/assets/solvronix_desk/css/sidebar.css?v=31", hooks)
        self.assertIn("/assets/solvronix_desk/js/solvronix_desk.js?v=63", hooks)
        self.assertIn("/assets/solvronix_desk/css/theme_studio.css?v=19", hooks)

    def test_legacy_config_treats_never_set_icon_rail_width_as_unset_not_zero(self):
        """Regression test: frappe.utils.cint() coercion serializes an Int
        Single field that was never explicitly set to 0 (not None) on the
        very first Document.save() — confirmed live on erp.solvronix.com,
        where publishing a theme for the first time wrote icon_rail_width=0
        to the DB, which legacy_config() then read as a deliberate override,
        clamping it up to the range minimum instead of the documented
        default."""
        settings = types.SimpleNamespace(icon_rail_width=0)
        config = ENGINE.legacy_config(settings)
        self.assertEqual(config["icon_rail_width"], ENGINE.DEFAULT_CONFIG["icon_rail_width"])

    def test_legacy_config_still_honors_a_real_user_set_width(self):
        settings = types.SimpleNamespace(icon_rail_width=110)
        config = ENGINE.legacy_config(settings)
        self.assertEqual(config["icon_rail_width"], 110)


if __name__ == "__main__":
    unittest.main()
