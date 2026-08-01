"""Integration-contract coverage for Theme Studio's public implementation."""

from pathlib import Path
import ast
import json
import sys
import types
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "solvronix_desk" / "api.py"
THEME_API = ROOT / "solvronix_desk" / "theme_api.py"
ENGINE = ROOT / "solvronix_desk" / "theme_engine.py"
HOOKS = ROOT / "solvronix_desk" / "hooks.py"
SETTINGS = ROOT / "solvronix_desk" / "solvronix_desk" / "doctype" / "theme_settings" / "theme_settings.json"
PREFERENCE = ROOT / "solvronix_desk" / "solvronix_desk" / "doctype" / "theme_preference" / "theme_preference.json"
PAGE = ROOT / "solvronix_desk" / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js"
PAGE_JSON = PAGE.with_name("theme_studio.json")
CSS = ROOT / "solvronix_desk" / "public" / "css" / "theme_studio.css"
DESK_CSS = ROOT / "solvronix_desk" / "public" / "css" / "solvronix_desk.css"
SIDEBAR_CSS = ROOT / "solvronix_desk" / "public" / "css" / "sidebar.css"
DARK_CSS = ROOT / "solvronix_desk" / "public" / "css" / "dark_mode.css"


class ThemeStudioTest(unittest.TestCase):
    def test_workspace_api_failures_expose_non_sensitive_unavailable_flag(self):
        source = API.read_text(encoding="utf-8")
        tree = ast.parse(source)
        function = next(
            node for node in tree.body
            if isinstance(node, ast.FunctionDef) and node.name == "get_workspaces"
        )
        function.decorator_list = []
        namespace = {}
        fake_frappe = types.ModuleType("frappe")
        fake_frappe.log_error = lambda *args, **kwargs: None
        fake_desk = types.ModuleType("frappe.desk")
        fake_desktop = types.ModuleType("frappe.desk.desktop")
        fake_desk.desktop = fake_desktop
        namespace["frappe"] = fake_frappe
        modules = {
            "frappe": fake_frappe,
            "frappe.desk": fake_desk,
            "frappe.desk.desktop": fake_desktop,
        }
        with mock.patch.dict(sys.modules, modules):
            exec(
                compile(ast.Module(body=[function], type_ignores=[]), str(API), "exec"),
                namespace,
            )
            expected = {"pages": [], "private_pages": [], "unavailable": True}
            self.assertEqual(namespace["get_workspaces"](), expected)
            fake_desktop.get_workspaces = lambda: (_ for _ in ()).throw(
                RuntimeError("private detail")
            )
            self.assertEqual(namespace["get_workspaces"](), expected)

    def test_page_is_restricted_to_system_managers(self):
        page = json.loads(PAGE_JSON.read_text(encoding="utf-8"))
        self.assertEqual(page["name"], "theme-studio")
        self.assertEqual(page["roles"], [{"role": "System Manager"}])

    def test_theme_settings_contain_visual_tokens(self):
        settings = json.loads(SETTINGS.read_text(encoding="utf-8"))
        fields = {field["fieldname"] for field in settings["fields"]}
        self.assertTrue(
            {
                "sidebar_background", "navbar_background", "page_background",
                "card_background", "text_color", "corner_radius", "shadow_style",
                "sidebar_width", "studio_layout",
            }.issubset(fields)
        )
        self.assertTrue(
            {
                "theme_enabled", "allow_user_theme", "theme_lock",
                "theme_studio_config", "theme_studio_draft", "theme_profiles",
                "theme_versions", "theme_assignments", "theme_schedule",
            }.issubset(fields)
        )
        preference = json.loads(PREFERENCE.read_text(encoding="utf-8"))
        self.assertEqual(preference["autoname"], "field:user")
        self.assertEqual(
            {field["fieldname"] for field in preference["fields"]},
            {"user", "theme_profile"},
        )

    def test_api_validates_and_persists_studio_configuration(self):
        api = THEME_API.read_text(encoding="utf-8")
        engine = ENGINE.read_text(encoding="utf-8")
        self.assertIn('frappe.only_for("System Manager")', api)
        self.assertIn("def publish_theme_config(", api)
        self.assertIn("def save_theme_draft(", api)
        self.assertIn("def manage_theme_profile(", api)
        self.assertIn("HEX_COLOR.fullmatch", engine)
        self.assertIn("settings.theme_studio_config", api)
        self.assertIn("settings.theme_enabled = 1", api)

    def test_editor_has_drag_history_and_responsive_preview(self):
        js = PAGE.read_text(encoding="utf-8")
        css = CSS.read_text(encoding="utf-8")
        self.assertIn('draggable="true"', js)
        self.assertIn('addEventListener("dragover"', js)
        self.assertIn("undo()", js)
        self.assertIn("redo()", js)
        self.assertIn('[data-device="mobile"]', css)
        self.assertIn("sts-preview-collapse", js)
        self.assertIn("sts-toolbar-left", js)
        self.assertIn("st-studio-draft", js)
        self.assertIn("on_page_hide", js)
        self.assertIn("_resolved_visual_config", js)
        self.assertIn("_is_dark_palette", js)
        self.assertIn("_mix_hex", js)
        self.assertIn("this._apply_draft_to_desk(visual)", js)

    def test_editor_typography_stays_readable(self):
        css = CSS.read_text(encoding="utf-8")
        self.assertIn("READABLE TYPOGRAPHY SCALE", css)
        self.assertIn(".sts-field > label { font-size: 13px; }", css)
        self.assertIn(".sts-field textarea { font-size: 13px;", css)
        self.assertIn(".sts-table-row { font-size: 11px; }", css)

    def test_login_preview_matches_public_login_structure(self):
        js = PAGE.read_text(encoding="utf-8")
        css = CSS.read_text(encoding="utf-8")
        login_runtime = (
            ROOT / "solvronix_desk" / "public" / "js" / "login_theme.js"
        ).read_text(encoding="utf-8")
        for token in (
            "sts-login-card-head", "sts-login-card-body", "sts-login-company-logo",
            "sts-login-app-logo", "sts-login-input", "sts-login-forgot",
            "data-login-powered", "data-login-footer",
        ):
            self.assertIn(token, js + css)
        self.assertIn("var loginSettings = loginConfig || c;", js)
        self.assertIn('"--studio-login-background": loginBackground', js)
        self.assertIn("background-image: var(--studio-login-background)", css)
        self.assertIn("image.addEventListener('error'", login_runtime)
        self.assertIn("applyPreferredMode(branding.preferred_mode)", login_runtime)
        self.assertIn("normalizeCardGeometry()", login_runtime)
        self.assertIn("installCompanyLogo(head, branding)", login_runtime)
        self.assertIn("st-hide-powered", login_runtime)
        self.assertIn('"preferred_mode": config.get("preferred_mode")', API.read_text(encoding="utf-8"))
        self.assertIn('html[data-theme="dark"] .for-login .page-card', ENGINE.read_text(encoding="utf-8"))
        login_css = (ROOT / "solvronix_desk" / "public" / "css" / "login.css").read_text(encoding="utf-8")
        self.assertIn("box-sizing: border-box !important;", login_css)
        self.assertIn("width: 100% !important;", login_css)
        self.assertIn("overflow: hidden !important;", login_css)
        self.assertIn(".st-login-company-fallback", login_css)
        self.assertIn(".st-hide-powered .for-login .page-card-actions::after", login_css)

    def test_preview_elements_expose_contextual_property_inspector(self):
        js = PAGE.read_text(encoding="utf-8")
        css = CSS.read_text(encoding="utf-8")
        for inspector in (
            "dashboard.heading", "dashboard.metrics", "dashboard.chart",
            "form.heading", "form.card", "form.fields", "form.actions",
            "table.heading", "table.grid", "table.status",
            "login.background", "login.branding", "login.card",
            "login.fields", "login.button", "login.footer",
        ):
            self.assertIn(f'"{inspector}"', js)
        self.assertIn("_inspector_catalog()", js)
        self.assertIn("_render_inspector()", js)
        self.assertIn("_position_inspector(element)", js)
        self.assertIn("_sync_setting_inputs(key, this)", js)
        self.assertIn("data-open-control-section", js)
        self.assertIn(".sts-context-inspector", css)
        self.assertIn('.sts-context-inspector[data-side="right"]', css)
        self.assertIn('.sts-context-inspector[data-side="left"]', css)
        self.assertIn(".is-inspected", css)

    def test_published_navigation_tokens_reach_actual_desk_selectors(self):
        engine = ENGINE.read_text(encoding="utf-8")
        desk_css = DESK_CSS.read_text(encoding="utf-8")
        sidebar_css = SIDEBAR_CSS.read_text(encoding="utf-8")
        dark_css = DARK_CSS.read_text(encoding="utf-8")
        self.assertIn('"--st-toolbar-bg": config["navbar_background"]', engine)
        self.assertIn('"--sidebar-width":', engine)
        self.assertIn("background: var(--st-toolbar-bg", desk_css)
        self.assertIn("var(--st-sidebar-width, var(--sidebar-width))", sidebar_css)
        self.assertIn("var(--st-sidebar-hover-text", sidebar_css)
        self.assertIn("var(--st-sidebar-icon", sidebar_css)
        self.assertIn(".btn.icon-btn .es-icon", desk_css)
        self.assertIn(".editor-js-container .ce-header .h4", desk_css)
        self.assertIn("var(--st-sidebar-bg, var(--fg-color, #fff))", dark_css)

    def test_assets_are_versioned(self):
        hooks = HOOKS.read_text(encoding="utf-8")
        self.assertIn("/assets/solvronix_desk/css/theme_studio.css?v=12", hooks)
        self.assertIn("/assets/solvronix_desk/js/command_palette.js?v=9", hooks)
        self.assertIn("/assets/solvronix_desk/js/dark_mode.js?v=9", hooks)
        self.assertIn("/assets/solvronix_desk/js/theme_runtime.js?v=6", hooks)
        self.assertIn("/assets/solvronix_desk/css/login.css?v=10", hooks)
        self.assertIn("/assets/solvronix_desk/js/login_theme.js?v=8", hooks)
        self.assertIn('"on_update": "solvronix_desk.events.theme_settings_on_update"', hooks)

    def test_complete_studio_feature_surfaces_exist(self):
        js = PAGE.read_text(encoding="utf-8")
        api = THEME_API.read_text(encoding="utf-8")
        engine = ENGINE.read_text(encoding="utf-8")
        for token in (
            "Main colours", "Navbar & sidebar", "Buttons & fields", "Typography",
            "Cards, lists & tables", "Workspace & dashboard", "Login & branding",
            "Layout", "Smart Home & features", "Accessibility", "Developer options", "Profiles & deployment",
        ):
            self.assertIn(token, js)
        for endpoint in (
            "save_theme_draft", "publish_theme_config", "manage_theme_profile",
            "restore_theme_version", "import_theme_profile",
            "save_theme_assignments", "save_theme_schedule", "clear_theme_cache",
            "get_resolved_theme_runtime",
        ):
            self.assertIn(f"def {endpoint}", api)
        self.assertIn("builtin-high-contrast", engine)
        self.assertIn("wcag_failures", engine)
        self.assertIn("custom_js", engine)
        self.assertIn("scoped_rules", engine)
        self.assertIn("def resolve_profile_id(", engine)
        self.assertIn('"preferred_mode", "Theme mode"', js)
        self.assertIn("_sync_profile_actions()", js)
        self.assertIn('__("Current Theme Copy")', js)
        self.assertIn('data-profile-action="apply"', js)
        runtime = (ROOT / "solvronix_desk" / "public" / "js" / "theme_runtime.js").read_text(encoding="utf-8")
        desk_js = (ROOT / "solvronix_desk" / "public" / "js" / "solvronix_desk.js").read_text(encoding="utf-8")
        self.assertIn("st-theme-runtime-refresh", runtime)
        self.assertIn("window.stApplyThemeCss", desk_js)
        self.assertIn("duplicate.remove()", desk_js)
        self.assertIn("if (config && Object.keys(config).length)", runtime)
        self.assertIn("runtime.preview", runtime)
        self.assertIn("if (!Array.isArray(route)) route = [];", runtime)

    def test_theme_settings_are_unified_into_studio(self):
        js = PAGE.read_text(encoding="utf-8")
        engine = ENGINE.read_text(encoding="utf-8")
        api = THEME_API.read_text(encoding="utf-8")
        settings_js = (
            ROOT / "solvronix_desk" / "solvronix_desk" / "doctype" /
            "theme_settings" / "theme_settings.js"
        ).read_text(encoding="utf-8")
        desk_js = (ROOT / "solvronix_desk" / "public" / "js" / "solvronix_desk.js").read_text(encoding="utf-8")

        for key in ("tagline", "enable_command_palette", "enable_smart_home"):
            self.assertIn(f'"{key}"', js)
            self.assertIn(f'"{key}"', engine)
            self.assertIn(f'config["{key}"]', api)
        self.assertIn('"attach-image"', js)
        self.assertIn("st_allow_raw_theme_settings", js)
        self.assertIn("st_allow_raw_theme_settings", settings_js)
        self.assertIn('frappe.set_route("theme-studio")', settings_js)
        self.assertIn('/desk/theme-studio', desk_js)


if __name__ == "__main__":
    unittest.main()
