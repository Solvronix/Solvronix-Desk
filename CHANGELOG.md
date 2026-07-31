# Changelog

## [1.3.4] — 2026-07-31

### Fixed
- Theme chrome (toolbar, branding, dynamic colors, sidebar extras) rendered on top of Frappe's Setup Wizard during first-run onboarding. `onDeskReady()` ran unconditionally on every desk page load with no check for setup state; it now skips entirely while `frappe.boot.setup_complete` is falsy, so Setup Wizard stays Frappe's clean, standalone flow. Reported as #9.

## [1.3.3] — 2026-07-31

### Fixed
- Workspace dashboard widgets (metric cards/charts) failed to render after navigating Today's View → Home → any workspace, until "Reset Desktop Layout" was performed. The "All Apps" grid (`module_cards.js`) rendered itself via `container.innerHTML =` directly into `.layout-main-section` — the exact DOM node Frappe's `frappe.workspace` singleton owns for its EditorJS instance (`.editor-js-container` / `#editorjs`) across every workspace navigation, Home included. This destroyed those nodes with no teardown; the next workspace's widgets rendered into a re-created but never-reattached, detached editor holder — invisible to the user. The grid now hides (instead of destroys) the real workspace content and restores it when navigating away, so Frappe's singleton is never corrupted. Reported as #7.
- Browser URL/breadcrumb could get stuck on "Today's View" (`smart-home`) while the actually-rendered page was something else entirely (e.g. a List View), most often right after a full page reload. Our boot-time safety-net redirect read `frappe.get_route()` synchronously inside `$(document).ready`, but Frappe's own router resolves the real route asynchronously — reading it too early could see an empty route and wrongly hijack the URL to `smart-home` while the real page's async render kept going underneath it. The check now runs inside a one-time `frappe.router.on("change", ...)` listener, which only fires once the real route is fully resolved.
- Clicking the Home icon (to Today's View) could briefly flash the previous workspace's real dashboard content before Today's View settled in. The grid's restore logic re-looked-up the workspace container at restore time, which could still point at the outgoing page if Frappe hadn't finished switching pages yet. It now restores the exact container reference captured when the content was hidden, removing the timing dependency entirely.
- Navigating to a bare `/desk` URL (e.g. clicking the breadcrumb Home icon) while "Enable Smart Home" is on could leave the URL/route empty while Today's View rendered anyway, with the previous workspace's sidebar stuck on screen. Frappe core silently substitutes an empty page name with `frappe.boot.home_page` at the content level only, without ever updating the route — a split-brain state Frappe's own sidebar logic isn't built to detect, and one that could make our own grid inject into the wrong, stale container. We now turn that silent substitution into a real navigation, so the route, the rendered page, and the sidebar all agree.

## [1.3.2] — 2026-07-30

### Fixed
- Login page: decorative background card overflowed behind the login form. `.page-card-head` is nested inside `.login-content.page-card` on this Frappe version (not a sibling box, which the original CSS assumed) — both independently forced the same 420px width, and the parent's own horizontal padding left less room than the child demanded, so the child overflowed the parent's right edge. The child no longer sets its own width/background/shape; the parent is now the single real card box, with uniform rounded corners. Reported as #5.

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
