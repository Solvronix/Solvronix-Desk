# Changelog

## [2.0.0] — 2026-07-29 — Complete Theme Studio

### Added
- A complete searchable visual editor spanning colours, navigation, form controls, typography, cards, tables, dashboards, login branding, layout, accessibility, and advanced overrides
- Frappe Default, Light, Dark, High Contrast, Solvronix, and Forest profiles, plus custom profile create, update, duplicate, rename, delete, import, and export workflows
- Live Dashboard, Form, Table, and Login preview scenes with desktop/tablet/mobile modes, Frappe comparison, drag-and-drop layout, undo/redo, draft saving, and section reset
- Site, user, role, and company theme assignment; optional user profile selection; administrator locking; and scheduled profile activation
- WCAG AA contrast feedback and optional publish enforcement, high-contrast and large-text modes, stronger focus outlines, and colour-blind-friendly status palettes
- Theme version backups and restore-as-draft, JSON transfer, cache/reload controls, and enable/disable controls
- Opt-in custom CSS and JavaScript, custom CSS variables, DocType/page/workspace-scoped rules, class mappings, and raw theme JSON editing
- A `Theme Preference` DocType for persistent per-user profile choice

### Changed
- The full theme is resolved per request, so scheduled, user, role, and company profiles can produce different Desk CSS on the same site
- Theme settings now drive the real Frappe navbar, sidebar, controls, data views, workspaces, login page, branding, typography, and layout
- Theme publishing preserves legacy Theme Settings fields, broadcasts a refresh to connected users, and generates flash-free first-paint CSS

### Fixed
- Actual sidebar and top-toolbar colours now match Theme Studio preview tokens, including readable automatic foreground colours for active items
- Sticky toolbar settings no longer turn the toolbar into a body flex item or split the Desk into a large blank column
- Profile action buttons now reflect the selected profile, explain unavailable actions, and can duplicate the current unsaved theme instead of failing silently
- Theme CSS now uses one authoritative runtime style element, removes stale cached duplicates, and applies profile/layout changes without requiring a reload
- Publishing from Theme Studio automatically enables the published theme and preserves the newly selected colour mode
- Bundled profiles pass the Studio's WCAG contrast checks
- Scheduled activation refreshes runtime CSS, preferred colour mode, layout settings, and advanced mappings without a manual reload

## [1.4.0] — 2026-07-29 — Theme Studio

### Added
- A System Manager-only visual Theme Studio with a responsive live desk preview, desktop/tablet/mobile views, presets, undo/redo, and publish workflow
- Drag-and-drop preview blocks for quickly testing visual hierarchy and composition
- Fine-grained theme tokens for sidebar, navbar, page, card, and text colors, plus corner radius, shadow depth, and expanded sidebar width
- Validated server APIs for loading and publishing theme configurations

### Changed
- Theme Studio is available from `Ctrl+K` and the Theme Settings Actions menu
- Advanced theme tokens are included in boot-time CSS to keep the first paint flash-free
- Theme changes continue to publish through the existing realtime sync for all connected desk users

### Fixed
- Sidebar, expanded sidebar width, and visible top-toolbar colors now use the same tokens in Theme Studio and the real Desk
- Theme Studio now live-previews draft navigation colors on the actual Desk chrome and removes unpublished drafts when leaving the page
- Theme Studio preview now mirrors the real 36px toolbar and collapsed/expanded Frappe v16 sidebar instead of showing a generic dashboard shell

## [1.3.1] — 2026-07-18

### Fixed
- Workspace list API compatibility across Frappe v16 releases: Frappe renamed `frappe.desk.desktop.get_workspace_sidebar_items` to `get_workspaces` between v16.20 and v16.22, which broke the module switcher, All Options panel, and app launcher grid on Frappe ≥ v16.21. All three now call a new `solvronix_desk.api.get_workspaces` shim that resolves whichever method exists (and fails soft with empty data if neither does), so the app works on every Frappe v16 release — old (≤ v16.20) and new (≥ v16.21) alike. Reported by @mn3m-cs on Frappe v16.27.1.

## [1.3.0] — 2026-07-17 — Polish Pass

### Added
- Polish layer (`polish.css`): motion design tokens, layered card shadows with hover lift, gradient primary buttons with press states, brand-colored keyboard focus rings, thin floating scrollbars, brand-tinted text selection
- Frosted-glass treatment on transient surfaces — dropdowns, modals, command palette, notification and options panels — with smooth pop-in entrance animations
- Command palette detail pass: keycap-styled shortcut hints, brand accent bar on the selected row, refined section headers
- Tabular numerals across list views, report grids, and dashboard number cards so columns of figures align perfectly
- Chart refinements: softer gridlines, dimmed sibling bars on hover, elevated tooltip surface
- Skeleton shimmer on loading placeholders
- Login page: slow-drifting ambient color field behind the card (derived from your brand colors) and a soft card entrance animation
- All animations respect the operating system's reduced-motion preference

### Fixed
- Dark mode: dashboard chart tooltips rendered as a white box with invisible text (tooltip color variables were being overridden at a more specific scope with inverted palette values); tooltips now use a proper elevated dark surface with readable text
- Dark mode: base background for plain number widgets now explicitly covered

## [1.2.0] — 2026-07-17 — Personalization Pack

### Added
- Display density toggle (Comfortable / Compact) — compact mode fits more rows on screen; per-user, flash-free, with a site-wide default in Theme Settings
- Global font-size control — site default (Small / Default / Large) in Theme Settings plus per-user A− / A / A+ override in the All Options panel
- Auto dark mode — theme toggle now cycles Light → Dark → Auto; Auto follows the operating system (prefers-color-scheme) and switches live when the OS theme changes
- Named theme presets — save your current brand colors as a custom preset from Theme Settings; custom presets appear as swatches next to the built-in ones
- Appearance section in the All Options panel — theme mode, density, and font size controls in one place

### Changed
- Theme Settings gains a "Personalization Defaults" section (Default Theme Mode, Base Font Size, Default Density); the old "Start in Dark Mode" checkbox is deprecated (still honored as a fallback)
- Live theme sync now also carries the site font-size default — changing it in Theme Settings restyles every open tab without a reload

### Fixed
- Notification center was broken by a syntax error (typographic quotes used as string delimiters in the empty-state renderer)
- Packaging manifest still referenced the old app name and a nonexistent requirements.txt


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
