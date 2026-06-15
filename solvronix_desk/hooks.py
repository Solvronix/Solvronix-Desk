app_name = "solvronix_desk"
app_title = "Solvronix Desk"
app_publisher = "Solvronix"
app_description = "Professional white-label theme for Frappe/ERPNext v15 and v16"
app_email = "sales@solvronix.com"
app_license = "MIT"
app_color = "#E8610A"
app_icon = "octicon octicon-paintcan"
app_version = "1.0.0"

web_include_css = ["/assets/solvronix_desk/css/login.css?v=5"]
web_include_js = ["/assets/solvronix_desk/js/login_theme.js?v=2"]

app_include_css = [
    "/assets/solvronix_desk/css/solvronix_desk.css?v=35",
    "/assets/solvronix_desk/css/sidebar.css?v=13",
    "/assets/solvronix_desk/css/command_palette.css?v=4",
    "/assets/solvronix_desk/css/smart_home.css?v=2",
    "/assets/solvronix_desk/css/progressive_forms.css?v=3",
    "/assets/solvronix_desk/css/notification_center.css?v=3",
    "/assets/solvronix_desk/css/dark_mode.css?v=11",
    "/assets/solvronix_desk/css/module_cards.css?v=1",
]
app_include_js = [
    "/assets/solvronix_desk/js/dark_mode.js?v=7",
    "/assets/solvronix_desk/js/solvronix_desk.js?v=32",
    "/assets/solvronix_desk/js/sidebar.js?v=3",
    "/assets/solvronix_desk/js/command_palette.js?v=3",
    "/assets/solvronix_desk/js/progressive_forms.js?v=2",
    "/assets/solvronix_desk/js/notification_center.js?v=2",
    "/assets/solvronix_desk/js/module_cards.js?v=3",
]

boot_session = "solvronix_desk.boot.add_boot_data"

after_install = "solvronix_desk.setup.after_install"
after_migrate = "solvronix_desk.setup.after_migrate"

doc_events = {
    "Theme Settings": {
        "after_save": "solvronix_desk.events.theme_settings_after_save",
    }
}
