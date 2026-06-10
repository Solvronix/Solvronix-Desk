app_name = "solvronix_theme"
app_title = "Solvronix Theme"
app_publisher = "Solvronix"
app_description = "Professional white-label theme for Frappe/ERPNext v15 and v16"
app_email = "sales@solvronix.com"
app_license = "MIT"
app_color = "#E8610A"
app_icon = "octicon octicon-paintcan"
app_version = "1.0.0"

app_include_css = ["/assets/solvronix_theme/css/solvronix_theme.css"]
app_include_js = ["/assets/solvronix_theme/js/solvronix_theme.js"]

after_install = "solvronix_theme.setup.after_install"
after_migrate = "solvronix_theme.setup.after_migrate"
