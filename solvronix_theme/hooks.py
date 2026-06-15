app_name = "solvronix_theme"
app_title = "Solvronix Desk"
app_publisher = "Solvronix"
app_description = "Professional white-label theme for Frappe/ERPNext v15 and v16"
app_email = "sales@solvronix.com"
app_license = "MIT"
app_color = "#E8610A"
app_icon = "octicon octicon-paintcan"
app_version = "1.0.0"

web_include_css = ["/assets/solvronix_theme/css/login.css?v=4"]
web_include_js = ["/assets/solvronix_theme/js/login_theme.js?v=2"]

app_include_css = [
    "/assets/solvronix_theme/css/solvronix_theme.css?v=30",
    "/assets/solvronix_theme/css/sidebar.css?v=13",
    "/assets/solvronix_theme/css/command_palette.css?v=4",
    "/assets/solvronix_theme/css/smart_home.css?v=2",
    "/assets/solvronix_theme/css/progressive_forms.css?v=3",
    "/assets/solvronix_theme/css/notification_center.css?v=2",
    "/assets/solvronix_theme/css/dark_mode.css?v=10",
    "/assets/solvronix_theme/css/module_cards.css?v=1",
]
app_include_js = [
    "/assets/solvronix_theme/js/dark_mode.js?v=7",
    "/assets/solvronix_theme/js/solvronix_theme.js?v=24",
    "/assets/solvronix_theme/js/sidebar.js?v=3",
    "/assets/solvronix_theme/js/command_palette.js?v=3",
    "/assets/solvronix_theme/js/progressive_forms.js?v=2",
    "/assets/solvronix_theme/js/notification_center.js?v=2",
    "/assets/solvronix_theme/js/module_cards.js?v=3",
]

boot_session = "solvronix_theme.boot.add_boot_data"

after_install = "solvronix_theme.setup.after_install"
after_migrate = "solvronix_theme.setup.after_migrate"

doc_events = {
    "Theme Settings": {
        "after_save": "solvronix_theme.events.theme_settings_after_save",
    }
}
