"""Structural coverage for the Frappe compatibility layer and Frappe 16.50 Dock support."""

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "solvronix_desk" / "public"
COMPAT = PUBLIC / "js" / "frappe_compat.js"
DESK_JS = PUBLIC / "js" / "solvronix_desk.js"
SIDEBAR_CSS = PUBLIC / "css" / "sidebar.css"
DARK_CSS = PUBLIC / "css" / "dark_mode.css"
DESK_CSS = PUBLIC / "css" / "solvronix_desk.css"
HOOKS = ROOT / "solvronix_desk" / "hooks.py"


class FrappeCompatTest(unittest.TestCase):
    def test_adapter_loads_first(self):
        """The adapter patches frappe.ui.Sidebar before Frappe builds the sidebar
        and before solvronix_desk.js asks it anything, so it must load first."""
        hooks = HOOKS.read_text(encoding="utf-8")
        block = hooks[hooks.index("app_include_js = ["):]
        includes = re.findall(r'"/assets/solvronix_desk/js/([a-z_]+)\.js\?v=\d+"', block)
        self.assertEqual(includes[0], "frappe_compat")
        self.assertIn("/assets/solvronix_desk/js/frappe_compat.js?v=2", hooks)
        self.assertIn("/assets/solvronix_desk/css/dark_mode.css?v=17", hooks)

    def test_adapter_detects_by_feature_not_version(self):
        js = COMPAT.read_text(encoding="utf-8")
        self.assertIn('typeof frappe.ui.Dock === "function"', js)
        self.assertIn('setAttribute("data-st-nav", gen)', js)
        self.assertNotRegex(js, r"frappe\.boot\.versions")

    def test_adapter_uses_existing_namespace(self):
        js = COMPAT.read_text(encoding="utf-8")
        self.assertIn("window.solvronix_desk = window.solvronix_desk || {}", js)
        self.assertNotIn("window.ST =", js)

    def test_dock_hidden_only_while_icon_rail_is_on(self):
        """Frappe's Dock is switched off through its own dock_enabled() so Frappe
        lays the sidebar out as for an app without a dock — never by CSS-hiding
        .dock, which would leave dock-pinned layout rules (and a hidden user
        menu) behind."""
        js = COMPAT.read_text(encoding="utf-8")
        self.assertIn("proto.dock_enabled = function", js)
        self.assertIn("if (railLayoutOn()) return false;", js)
        self.assertIn("nativeDockEnabled.apply(this, arguments)", js)
        self.assertIn("__st_dock_patched", js)
        css = SIDEBAR_CSS.read_text(encoding="utf-8") + DESK_CSS.read_text(encoding="utf-8")
        self.assertNotRegex(css, r"\.dock\s*\{[^}]*display:\s*none")

    def test_every_frappe_call_is_guarded(self):
        """Each Sidebar method is checked before it is called, so a Frappe
        rename degrades to the legacy rail instead of throwing."""
        js = COMPAT.read_text(encoding="utf-8")
        for method in (
            "refresh_dock",
            "get_sidebar_app",
            "collect_dock_entries",
            "is_active_entry",
            "open_dock_entry",
            "dock_entry_key",
            "app_landing_route",
        ):
            self.assertIn(f'has(sb, "{method}")', js, method)

    def test_rail_lists_active_app_modules(self):
        js = DESK_JS.read_text(encoding="utf-8")
        self.assertIn("function renderRailModules($rail, activeApp)", js)
        self.assertIn("renderRailModules($rail, activeApp);", js)
        self.assertIn("compat.moduleEntries(app)", js)
        self.assertIn("compat.openEntry(entry)", js)
        # Redraw only when what is shown changed: one navigation fires several refreshes.
        self.assertIn('$rail.data("st-modules-sig") === sig', js)
        # Labels go in as text, never as HTML.
        self.assertIn('.text(entry.label)', js)

    def test_rail_refreshes_frappe_dock_on_layout_change(self):
        js = DESK_JS.read_text(encoding="utf-8")
        self.assertIn("if (railWasOn !== railEnabled() && ST.compat) ST.compat.refreshDock();", js)

    def test_module_styles_use_theme_variables(self):
        css = SIDEBAR_CSS.read_text(encoding="utf-8")
        start = css.index("#st-icon-rail .st-rail-modules")
        end = css.index("/* Collapse toggle")
        block = css[start:end]
        self.assertNotRegex(block, r"#[0-9A-Fa-f]{3,8}\b(?![\w-])(?=[^{]*;)")
        self.assertIn("var(--st-rail-active", block)
        self.assertIn('html[data-st-nav="dock"]', block)

    def test_dark_mode_pins_frappe_semantic_tokens(self):
        """Frappe's dark --ink-* tokens are built on the raw gray scale, which
        dark_mode.css remaps to surfaces — they must be pinned to theme vars."""
        css = DARK_CSS.read_text(encoding="utf-8")
        root = css[css.index('html[data-theme="dark"] {'):css.index("/* ── Body & Page")]
        for token in ("--ink-gray-9", "--ink-gray-8", "--ink-gray-7", "--surface-gray-1",
                      "--surface-gray-10", "--outline-gray-1", "--outline-gray-9", "--desk-sidebar-bg"):
            self.assertRegex(root, rf"{token}:\s+(var|color-mix)\(", token)
        for n in range(1, 10):
            value = re.search(rf"^\s+--ink-gray-{n}:\s+([^;]+);", root, re.MULTILINE).group(1)
            self.assertNotIn("--gray-", value)

    def test_es_button_solid_gets_primary_style_except_danger(self):
        css = DESK_CSS.read_text(encoding="utf-8")
        self.assertIn('.es-button[data-variant="solid"]:not([data-theme="red"]) {', css)


class MobileLayoutTest(unittest.TestCase):
    def test_rail_moves_into_frappe_drawer_on_phones(self):
        css = SIDEBAR_CSS.read_text(encoding="utf-8")
        block = css[css.index("@media (max-width: 767.98px)"):]
        self.assertIn("body #st-icon-rail {\n    display: none;", block)
        self.assertIn("body:has(.body-sidebar-container.expanded) #st-icon-rail", block)
        self.assertIn(".body-sidebar-container.expanded .overlay", block)
        # Must outrank the base collapse rules that come later in the file.
        self.assertIn("body #st-icon-rail .st-rail-collapse", block)

    def test_phone_toolbar_rules_come_after_base_toolbar_rules(self):
        """Equal-specificity base rules later in the file would win."""
        css = DESK_CSS.read_text(encoding="utf-8")
        self.assertGreater(css.index("MOBILE TOOLBAR & LAYOUT"), css.index("#st-tb-search {"))
        self.assertGreater(css.index("MOBILE TOOLBAR & LAYOUT"), css.index("#st-options-btn {"))
        tail = css[css.index("MOBILE TOOLBAR & LAYOUT"):]
        for rule in ("#st-options-btn .st-options-label", "#st-tb-search .st-tb-search-text",
                     ".frappe-list .result-container .result", ".list-row .level-left"):
            self.assertIn(rule, tail)

    def test_sidebar_state_left_to_frappe_on_dock_generation(self):
        """On 16.50+ Frappe saves the viewer's ☰ choice; the old force-expand
        undid a collapse on every page change. Only tablets get an unsaved
        default fold, and only while the viewer never chose."""
        js = DESK_JS.read_text(encoding="utf-8")
        fn = js[js.index("function keepListColumnExpanded"):js.index("function injectIconRail")]
        dock_branch = fn.index("if (ST.compat && ST.compat.hasDock) return;")
        self.assertLess(dock_branch, fn.index('.addClass("expanded")'))
        compat = COMPAT.read_text(encoding="utf-8")
        self.assertIn('localStorage.getItem("desk-sidebar-collapsed")', compat)
        self.assertIn("proto.load_expanded_state = function", compat)
        self.assertIn("nativeLoadExpanded.apply(this, arguments)", compat)
        self.assertIn("savedSidebarChoice() === null", compat)
        self.assertIn('"(min-width: 768px) and (max-width: 1199px)"', compat)
        # Folding is never saved as the viewer's choice.
        self.assertNotIn("save_collapsed_state", compat)

    def test_options_label_is_wrapped_for_icon_only_mode(self):
        js = DESK_JS.read_text(encoding="utf-8")
        self.assertIn('<span class="st-options-label">', js)


if __name__ == "__main__":
    unittest.main()
