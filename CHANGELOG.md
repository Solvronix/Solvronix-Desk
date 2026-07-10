# Changelog

## [1.1.1] — 2026-07-01

### Fixed
- Realtime theme-sync events now scoped to the site's room — prevents cross-site broadcast on multi-tenant benches
- Removed manual install/uninstall instructions from README (installs are now managed via Frappe Cloud Marketplace)

## [1.1.0] — 2026-07-01

### Added
- RTL (right-to-left) support — command palette, language dropdown, and sidebar adapt their positioning automatically when the active language is RTL
- `enable_command_palette` boot flag — lets Theme Settings toggle the command palette per site

### Changed
- Language switch now reloads the desk to fully apply translations and boot data, replacing the previous no-reload switch
- Sidebar and command palette styling overhauled for RTL support and visual polish
- Language API validates the language code against installed Languages before saving, and invalidates cached bootinfo instead of relying on manual database commits

### Fixed
- Marketplace compatibility fixes — dependency declarations, added Terms of Service, updated Privacy Policy

## [1.0.0] — 2026-06-15

### Added
- Command Palette (Ctrl+K) — search DocTypes, navigate, create documents from anywhere
- White-label branding — company name, logo, favicon, browser tab title
- Auto color system — two brand colors generate full palette via CSS color-mix()
- Quick color presets — Solvronix, Forest, Midnight, Plum themes
- Slim icon sidebar — 64px icon rail, expands to 240px, state persisted per user
- Dark mode — flash-free toggle, synced to Frappe user preferences
- Modern login page — full-screen branded login experience
- Progressive forms — optional fields hidden by default, toggle to show
- Top toolbar — clock, Today's View, search, dark mode toggle, language switcher
- Language switcher — searchable list of enabled languages, instant switch
- All Options panel — slide-in panel showing all workspaces grouped by category
- User avatar dropdown — installed apps grid, edit profile, reset layout, logout
- Module Switcher (Ctrl+M) — searchable workspace switcher
- Real-time theme sync — color changes propagate instantly to all connected users
- Setup Guide Banner — first-run checklist for System Manager users
- Notification Center — enhanced notification styling
- Module Cards — styled workspace and module cards
