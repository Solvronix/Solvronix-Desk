"""Workspace Classic desk layout (3.0.0): engine key, profile and wiring."""

import pathlib
import unittest

from test_theme_engine import ENGINE

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = ROOT / "solvronix_desk"


class WorkspaceLayoutTest(unittest.TestCase):
    def test_desk_layout_defaults_to_standard_and_rejects_unknown_values(self):
        self.assertEqual(ENGINE.sanitize_config({}, validate_contrast=False)["desk_layout"], "Standard")
        config = ENGINE.sanitize_config({"desk_layout": "Sideways"}, validate_contrast=False)
        self.assertEqual(config["desk_layout"], "Standard")
        config = ENGINE.sanitize_config({"desk_layout": "Workspace"}, validate_contrast=False)
        self.assertEqual(config["desk_layout"], "Workspace")

    def test_workspace_classic_profile_is_one_click(self):
        profiles = {p["id"]: p for p in ENGINE.builtin_profiles()}
        profile = profiles["builtin-workspace"]
        self.assertEqual(profile["name"], "Workspace Classic")
        self.assertEqual(profile["config"]["desk_layout"], "Workspace")
        self.assertEqual(profile["config"]["sidebar_layout"], "Tree")
        for other in profiles.values():
            if other["id"] != "builtin-workspace":
                self.assertEqual(other["config"]["desk_layout"], "Standard")

    def test_assets_are_registered_after_their_dependencies(self):
        hooks = (APP / "hooks.py").read_text(encoding="utf-8")
        self.assertIn("/assets/solvronix_desk/css/workspace_layout.css?v=5", hooks)
        js = hooks.index("/assets/solvronix_desk/js/workspace_layout.js?v=6")
        self.assertLess(hooks.index("frappe_compat.js"), js)
        self.assertLess(hooks.index("module_cards.js"), js)
        self.assertLess(hooks.index("theme_runtime.js"), js)

    def test_desk_prepaints_the_layout_attribute(self):
        html = (APP / "www" / "desk.html").read_text(encoding="utf-8")
        self.assertIn('data-st-layout="workspace"', html)

    def test_layout_css_is_scoped_and_uses_variables_only(self):
        css = (APP / "public" / "css" / "workspace_layout.css").read_text(encoding="utf-8")
        import re
        self.assertIsNone(re.search(r"#[0-9a-fA-F]{3,8}\b(?![-\w])", re.sub(r"#st-[\w-]+", "", css)))
        for rule in re.findall(r"([^{}]+)\{", css):
            selector = rule.strip()
            if selector.startswith(("@media", "html[data-st-layout", "html.st-ws-home-open", "/*")) or not selector:
                continue
            if selector in ("#st-ws-nav", "#st-ws-home", "#st-ws-drawer"):
                continue
            self.fail("unscoped selector: " + selector)

    def test_status_steps_stay_clear_of_the_ribbon(self):
        css = (APP / "public" / "css" / "workspace_layout.css").read_text(encoding="utf-8")
        js = (APP / "public" / "js" / "workspace_layout.js").read_text(encoding="utf-8")
        self.assertIn('.st-ws-has-ribbon > .st-ws-statusbar {\n  padding-right: var(--st-ws-ribbon-w);', css)
        self.assertIn('host.classList.toggle("st-ws-has-ribbon", !!spec);', js)

    def test_checkboxes_and_dialogs_keep_their_shape(self):
        density = (APP / "public" / "css" / "density.css").read_text(encoding="utf-8")
        self.assertIn('.input-with-feedback:not([type="checkbox"]):not([type="radio"])', density)
        self.assertNotIn('html[data-density="compact"] .input-with-feedback {', density)
        core = (APP / "public" / "css" / "solvronix_desk.css").read_text(encoding="utf-8")
        self.assertIn(".modal-body .form-page {\n  padding: 4px 16px 16px;", core)

    def test_a_real_layout_switch_reloads_the_desk(self):
        js = (APP / "public" / "js" / "theme_runtime.js").read_text(encoding="utf-8")
        self.assertIn("needsReload(runtime.config) && reloadForLayout()) return;", js)
        # Previews, the Studio page and its preview frame never reload, and never twice in 10 s.
        self.assertIn("window.top !== window || window.__stPreviewDeskLayout", js)
        self.assertIn('indexOf("/theme-studio") !== -1) return false;', js)
        self.assertIn("Date.now() - last < 10000", js)

    def test_studio_offers_the_layout_switch(self):
        studio = (APP / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js").read_text(encoding="utf-8")
        self.assertIn('["desk_layout", "Desk layout", "select", ["Standard", "Workspace"]]', studio)


if __name__ == "__main__":
    unittest.main()


class WorkspaceStudioPreviewTest(unittest.TestCase):
    def test_runtime_honours_the_studio_preview_pin(self):
        runtime = (APP / "public" / "js" / "theme_runtime.js").read_text(encoding="utf-8")
        self.assertIn("window.__stPreviewDeskLayout || viewerLayout", runtime)

    def test_studio_mock_follows_the_desk_layout(self):
        studio = (APP / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js").read_text(encoding="utf-8")
        css = (APP / "public" / "css" / "theme_studio.css").read_text(encoding="utf-8")
        self.assertIn('attr("data-desk-layout"', studio)
        self.assertIn("sts-mock-ws-bar", studio)
        self.assertIn('.sts-preview-frame[data-desk-layout="workspace"] .sts-preview-sidebar', css)

    def test_page_head_sidebar_toggle_hidden(self):
        css = (APP / "public" / "css" / "workspace_layout.css").read_text(encoding="utf-8")
        self.assertIn('html[data-st-layout="workspace"] .page-head .sidebar-toggle-btn', css)

    def test_studio_explains_a_personal_profile_with_another_layout(self):
        studio = (APP / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js").read_text(encoding="utf-8")
        self.assertIn("_sync_viewer_note()", studio)
        self.assertIn("data-load-viewer-profile", studio)

    def test_boot_exposes_the_viewers_own_profile(self):
        boot = (APP / "boot.py").read_text(encoding="utf-8")
        self.assertIn("bootinfo.st_viewer_own_profile", boot)
