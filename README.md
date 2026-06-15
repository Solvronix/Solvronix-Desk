# Solvronix Desk

**Professional white-label theme for Frappe/ERPNext v15 and v16**

Built on [Frappe](https://frappeframework.com) · by [Solvronix](https://solvronix.com)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](license.txt)
[![Frappe](https://img.shields.io/badge/Frappe-v15%2Fv16-0089FF)](https://frappeframework.com)

---

## What it is

Solvronix Desk is a drop-in Frappe app that transforms any Frappe or ERPNext installation with a
professional dark-navy-and-orange brand identity. Colors and branding are configured through a simple
**Theme Settings** form — no code changes, no redeploys.

## Features

- Dynamic CSS variables injected from **Theme Settings** (colors apply on next page load)
- Custom sidebar, navbar, and button color theming
- White-label branding: company logo, favicon, and browser tab title
- Module switcher dropdown with keyboard shortcut (`Ctrl+M`)
- Quick nav bar (Home / Theme Settings / Notifications) pinned to sidebar bottom
- Login page customization (background and card colors)
- Custom CSS override field for advanced tweaks
- Powered-by badge toggle

## Screenshot

> _Configure your colors, logo, and branding — then watch the desk transform._

## Installation

```bash
# 1. Get the app
bench get-app solvronix_theme <github_url>

# 2. Install on your site
bench --site <your-site> install-app solvronix_theme

# 3. Build assets
bench build --app solvronix_theme
```

## Configuration

Navigate to **Theme Settings** in your Frappe desk (or go to `/app/theme-settings`) to configure:

| Section | Fields |
|---|---|
| **Branding** | Company name, Logo, Favicon, Tagline |
| **Colors** | Primary color, Sidebar bg, Navbar bg, Sidebar text, Button text |
| **Login Page** | Login background, Login card color, Show powered-by |
| **Advanced** | Custom CSS, Hide Frappe branding |

After saving, click **Preview Theme** to apply changes to the current tab immediately, or reload the
page for a full refresh.

## Supports

- Frappe v15, v16
- ERPNext v15, v16

## Publisher

**Solvronix** · [solvronix.com](https://solvronix.com) · sales@solvronix.com

## License

MIT — see [license.txt](license.txt)
# Solvronix-Desk
