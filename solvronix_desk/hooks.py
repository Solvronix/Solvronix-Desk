app_name = "solvronix_desk"
app_title = "Solvronix Desk"
app_publisher = "Solvronix"
app_description = "Professional white-label theme for Frappe/ERPNext"
app_email = "sales@solvronix.com"
app_license = "MIT"
app_color = "#E8610A"
app_icon = "octicon octicon-paintcan"
app_version = "1.3.1"

required_apps = []

web_include_css = ["/assets/solvronix_desk/css/login.css?v=6"]
web_include_js = ["/assets/solvronix_desk/js/login_theme.js?v=2"]

app_include_css = [
    "/assets/solvronix_desk/css/solvronix_desk.css?v=42",
    "/assets/solvronix_desk/css/sidebar.css?v=18",
    "/assets/solvronix_desk/css/command_palette.css?v=4",
    "/assets/solvronix_desk/css/smart_home.css?v=2",
    "/assets/solvronix_desk/css/progressive_forms.css?v=3",
    "/assets/solvronix_desk/css/notification_center.css?v=3",
    "/assets/solvronix_desk/css/polish.css?v=2",
    "/assets/solvronix_desk/css/dark_mode.css?v=12",
    "/assets/solvronix_desk/css/module_cards.css?v=2",
    "/assets/solvronix_desk/css/density.css?v=2",
]
app_include_js = [
    "/assets/solvronix_desk/js/dark_mode.js?v=8",
    "/assets/solvronix_desk/js/personalization.js?v=1",
    "/assets/solvronix_desk/js/solvronix_desk.js?v=38",
    "/assets/solvronix_desk/js/sidebar.js?v=3",
    "/assets/solvronix_desk/js/command_palette.js?v=5",
    "/assets/solvronix_desk/js/progressive_forms.js?v=4",
    "/assets/solvronix_desk/js/notification_center.js?v=4",
    "/assets/solvronix_desk/js/module_cards.js?v=5",
]

boot_session = "solvronix_desk.boot.add_boot_data"

after_install = "solvronix_desk.setup.after_install"
after_migrate = "solvronix_desk.setup.after_migrate"

doc_events = {
    "Theme Settings": {
        "after_save": "solvronix_desk.events.theme_settings_after_save",
    }
}
