"""Unit coverage for theme validation, profile resolution, and CSS rendering."""

import importlib.util
from pathlib import Path
import sys
import types
import unittest


ROOT = Path(__file__).resolve().parents[1]
ENGINE_PATH = ROOT / "solvronix_desk" / "theme_engine.py"


class FrappeStub(types.ModuleType):
    def throw(self, message):
        raise ValueError(message)


def load_engine():
    previous = sys.modules.get("frappe")
    sys.modules["frappe"] = FrappeStub("frappe")
    try:
        spec = importlib.util.spec_from_file_location("theme_engine_test_module", ENGINE_PATH)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        if previous is None:
            sys.modules.pop("frappe", None)
        else:
            sys.modules["frappe"] = previous


ENGINE = load_engine()


class ThemeEngineTest(unittest.TestCase):
    def test_sanitize_clamps_rejects_invalid_colors_and_deduplicates_layout(self):
        config = ENGINE.sanitize_config(
            {
                "brand_color": "not-a-color",
                "sidebar_width": 999,
                "button_height": 1,
                "layout": ["chart", "chart", "metrics"],
            },
            validate_contrast=False,
        )
        self.assertEqual(config["brand_color"], ENGINE.DEFAULT_CONFIG["brand_color"])
        self.assertEqual(config["sidebar_width"], 360)
        self.assertEqual(config["button_height"], 26)
        self.assertEqual(config["layout"], ["chart", "metrics", "activity", "quick_actions"])

    def test_builtin_profiles_include_required_modes(self):
        profiles = {profile["id"]: profile for profile in ENGINE.builtin_profiles()}
        self.assertIn("builtin-light", profiles)
        self.assertIn("builtin-dark", profiles)
        self.assertIn("builtin-high-contrast", profiles)
        self.assertTrue(profiles["builtin-high-contrast"]["config"]["high_contrast"])
        for profile in profiles.values():
            self.assertEqual(
                ENGINE.wcag_failures(profile["config"]),
                [],
                f'{profile["name"]} should pass bundled WCAG checks',
            )

    def test_renderer_outputs_complete_runtime_tokens(self):
        css = ENGINE.render_css(ENGINE.DEFAULT_CONFIG)
        for token in (
            "--st-toolbar-bg", "--st-sidebar-bg", "--st-btn-primary",
            "--st-input-bg", "--st-font-family", "--st-row-height",
            "--st-chart-1", "--st-login-gradient", "--st-workspace-width",
        ):
            self.assertIn(token, css)
        self.assertIn(".btn-primary", css)
        self.assertIn(".list-row", css)
        self.assertIn("body:has(.for-login)", css)
        self.assertIn(
            "#st-top-toolbar { height: var(--st-header-height) !important; position:fixed!important;",
            css,
        )
        self.assertNotIn("#st-top-toolbar { height: var(--st-header-height) !important; position:sticky", css)

    def test_non_sticky_toolbar_is_still_removed_from_flex_layout(self):
        config = dict(ENGINE.DEFAULT_CONFIG)
        config["sticky_navbar"] = False
        css = ENGINE.render_css(config)
        self.assertIn(
            "#st-top-toolbar { height: var(--st-header-height) !important; position:absolute!important;",
            css,
        )

    def test_light_profile_has_a_complete_derived_dark_palette(self):
        css = ENGINE.render_css(ENGINE.DEFAULT_CONFIG)
        dark_rule = css.split('html[data-theme="dark"] {', 1)[1].split("}", 1)[0]
        self.assertIn("--st-page-bg: #0F1117", dark_rule)
        self.assertIn("--st-card-bg: #1A1D27", dark_rule)
        self.assertIn("--st-text: #E8EDF5", dark_rule)
        self.assertIn("--st-sidebar-text: #FFFFFF", dark_rule)

    def test_dark_mode_on_a_light_palette_derives_dark_surfaces(self):
        config = dict(ENGINE.DEFAULT_CONFIG)
        config["preferred_mode"] = "Dark"
        css = ENGINE.render_css(config)
        dark_rule = css.split('html[data-theme="dark"] {', 1)[1].split("}", 1)[0]
        self.assertIn("--st-page-bg: #0F1117", dark_rule)
        self.assertIn("--st-card-bg: #1A1D27", dark_rule)
        self.assertNotIn("--st-card-bg: #FFFFFF", dark_rule)

    def test_dark_profile_has_a_complete_light_mode_override(self):
        dark_profile = next(
            profile["config"]
            for profile in ENGINE.builtin_profiles()
            if profile["id"] == "builtin-dark"
        )
        css = ENGINE.render_css(dark_profile)
        light_rule = css.split('html:not([data-theme="dark"]) {', 1)[1].split("}", 1)[0]
        self.assertIn("--st-page-bg: #F5F6F8", light_rule)
        self.assertIn("--st-card-bg: #FFFFFF", light_rule)
        self.assertIn("--st-text: #19202D", light_rule)

    def test_mixed_palette_always_emits_a_safe_light_mode_override(self):
        config = dict(ENGINE.DEFAULT_CONFIG)
        config.update(page_background="#1A1D27", card_background="#FFFFFF")

        css = ENGINE.render_css(config)
        light_rule = css.split('html:not([data-theme="dark"]) {', 1)[1].split("}", 1)[0]

        self.assertIn("--st-page-bg: #F5F6F8", light_rule)
        self.assertIn("--st-card-bg: #FFFFFF", light_rule)

    def test_high_contrast_profile_emits_accessibility_rules(self):
        high_contrast = next(
            profile["config"]
            for profile in ENGINE.builtin_profiles()
            if profile["id"] == "builtin-high-contrast"
        )
        css = ENGINE.render_css(high_contrast)
        self.assertIn("border-width:2px!important", css)
        self.assertIn("--st-focus-width: 3px", css)

    def test_wcag_checker_flags_low_contrast(self):
        config = dict(ENGINE.DEFAULT_CONFIG)
        config.update({"text_color": "#777777", "page_background": "#777777"})
        self.assertIn("Text / page", ENGINE.wcag_failures(config))

    def test_buttons_and_sidebar_hover_emit_contrast_aware_tokens(self):
        config = dict(ENGINE.DEFAULT_CONFIG)
        config.update(
            {
                "primary_button_color": "#FFF27A",
                "sidebar_hover_color": "#F4F7FB",
            }
        )
        css = ENGINE.render_css(config)
        self.assertIn("--st-btn-primary-text: #19202D", css)
        self.assertIn("--st-sidebar-hover-text: #19202D", css)
        dark_rule = css.split('html[data-theme="dark"] {', 1)[1].split("}", 1)[0]
        self.assertIn("--st-sidebar-hover: #242A37", dark_rule)
        self.assertIn("--st-sidebar-hover-text: #FFFFFF", dark_rule)
        self.assertIn("color: var(--st-btn-primary-text) !important", css)
        self.assertIn("color: var(--st-sidebar-hover-text) !important", css)

    def test_icon_buttons_and_workspace_headings_remain_visible(self):
        css = ENGINE.render_css(ENGINE.DEFAULT_CONFIG)
        self.assertIn(".btn-default:not(.icon-btn)", css)
        self.assertIn("min-width: var(--st-button-height) !important", css)
        self.assertIn(".btn.icon-btn .icon use", css)
        self.assertIn(".editor-js-container .ce-header .h4", css)

    def test_custom_css_cannot_escape_dynamic_style_element(self):
        config = ENGINE.sanitize_config(
            {
                "custom_css": ".safe{color:red}</STYLE><script>alert(1)</script>",
                "scoped_rules": [
                    {
                        "type": "Page",
                        "scope": "home",
                        "css": ".safe{color:blue}</style><img src=x>",
                    }
                ],
            },
            validate_contrast=False,
        )
        self.assertNotIn("</style", config["custom_css"].lower())
        self.assertNotIn("</style", config["scoped_rules"][0]["css"].lower())

    def test_assignment_maps_fail_soft_on_invalid_json_shapes(self):
        self.assertEqual(ENGINE.clean_string_map(["not", "a", "mapping"], 100), {})
        self.assertEqual(
            ENGINE.clean_string_map({"user@example.com": "builtin-dark"}, 180),
            {"user@example.com": "builtin-dark"},
        )

    def test_sanitize_config_includes_versioned_chart_payload(self):
        config = ENGINE.sanitize_config({}, validate_contrast=False)

        self.assertEqual(config["chart_system_version"], 1)
        self.assertEqual(config["chart_defaults"], {})
        self.assertEqual(config["chart_overrides"], {})

    def test_legacy_chart_colors_migrate_into_canonical_globals(self):
        config = ENGINE.sanitize_config(
            {"chart_background": "#112233", "chart_palette": ["#445566"]},
            validate_contrast=False,
        )

        self.assertEqual(
            config["chart_defaults"]["surface"]["background"], "#112233"
        )
        self.assertEqual(
            config["chart_defaults"]["series_defaults"]["palette"],
            ["#445566"],
        )

    def test_profile_chart_payload_replaces_base_instead_of_merging(self):
        chart_id = "v1|dashboard_chart|4:Base"
        base = ENGINE.sanitize_config(
            {
                "chart_system_version": 1,
                "chart_defaults": {"chart": {"height": 300}},
                "chart_overrides": {chart_id: {"chart": {"height": 320}}},
            },
            validate_contrast=False,
        )
        selected = ENGINE.sanitize_config(
            {
                "chart_system_version": 1,
                "chart_defaults": {"chart": {"height": 480}},
                "chart_overrides": {},
            },
            validate_contrast=False,
        )

        resolved = ENGINE.resolve_profile_config(base, selected)

        self.assertEqual(resolved["chart_defaults"]["chart"]["height"], 480)
        self.assertEqual(resolved["chart_overrides"], {})

    def test_renderer_uses_canonical_global_chart_projections(self):
        config = ENGINE.sanitize_config(
            {
                "chart_system_version": 1,
                "chart_defaults": {
                    "surface": {"background": "#123456"},
                    "series_defaults": {"palette": ["#111111", "#222222"]},
                },
            },
            validate_contrast=False,
        )

        css = ENGINE.render_css(config)

        self.assertIn("--st-chart-bg: #123456", css)
        self.assertIn("--st-chart-1: #111111", css)
        self.assertIn("--st-chart-2: #222222", css)


if __name__ == "__main__":
    unittest.main()
