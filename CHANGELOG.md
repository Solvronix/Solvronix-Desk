# Changelog

## [Unreleased]

## [2.1.0] — 2026-08-07 — Icon Rail Sidebar

### Added
- Icon Rail sidebar layout (Theme Studio → Navbar & Sidebar → Sidebar Layout), on by default: a slim, always-visible column topped with the company logo, with one compact icon per installed app (e.g. ERPNext, CRM, Frappe HR) below it, each using that app's own icon in a theme-colored tile that follows the site's brand/accent color automatically. Beside it, Frappe's own workspace sidebar list still renders normally. New apps/workspaces appear automatically; the rail can also collapse to icon-only. Administrators can switch back to the classic single-column Tree layout at any time.
- Theme Studio Chart System with schema-driven global defaults and permission-filtered individual editors for Dashboard Charts, Dashboard Graphs, Query/Script Report charts, and Number Card sparklines
- Visual, structural, and behavioral chart controls for surfaces, palettes, individual series, axes, legends, labels, tooltips, animation, interaction, and safe advanced options
- Layered chart reset behavior: property and chart resets inherit global values, while the global reset restores built-in system defaults

### Changed
- Theme Studio is now the single user-facing configuration experience for visual themes, branding, Smart Home, and Command Palette settings
- Opening Theme Settings redirects to Theme Studio; administrators retain an explicit raw-settings maintenance action
- Branding image controls in Theme Studio now use Frappe attachment fields instead of requiring manually entered URLs
- Theme Studio now uses a readable control and preview typography scale instead of 6–10px interface text
- Theme Studio's login scene now mirrors the public login card, branding, image background, fields, links, and light/dark token behavior
- Dashboard, Form, Table, and Login previews now support click-to-select property editing in a floating inspector beside the selected item
- Published profile and realtime theme refreshes now update chart configuration atomically without changing chart data or callbacks

### Fixed
- The classic sidebar's own branding header (`#st-company-header`, shown beside the Icon Rail) no longer shows the company logo a second time next to the company name — it's text-only by design now, since the Icon Rail's own brand tile is the logo's one dedicated home in the sidebar chrome
- Icon Rail app tiles and the collapse chevron are now actually visible — `frappe.utils.icon()`'s svg renders via the `--icon-fill`/`--icon-stroke` custom properties Frappe's own CSS declares, not `color`/currentColor, so setting `color` on the tile had no effect: every icon silently rendered with whichever `--icon-stroke` happened to be ambient on the page, invisible against the tile's own accent-colored background — every tile appeared as a blank color swatch
- `publish_theme_config` (the whitelisted API Theme Studio's Publish action calls) now also protects the site's company logo/name/favicon/tagline when switching profiles, independent of the editor's own safeguard above — closing the same class of bug for any direct API call, script, or future code path that doesn't go through Theme Studio's UI, without overriding a deliberate clear on an already-active profile
- The Icon Rail's own logo tile no longer goes stale after a live theme update — publishing a new company logo/name previously refreshed the classic sidebar's header on every open Desk tab but left the rail showing the old logo until a full reload
- The Icon Rail's list column no longer gets forced open on mobile (≤767px) on every page change — that forced Frappe's own `.expanded` class into a full-screen overlay with a dimming scrim that reappeared immediately after being tapped shut, permanently covering Desk content; mobile now keeps its native collapsed/overlay toggle untouched
- Icon Rail background/active-color field descriptions in Theme Settings now correctly describe the automatic fallback (the site's accent color) instead of a color that was never actually used
- Loading a theme profile (built-in or custom) in Theme Studio no longer silently erases the site's company logo/name/favicon/tagline when published - every profile's stored config carries these as blank unless it explicitly sets them, since a profile is a reusable visual theme, not a site's identity; they're now always preserved from the current site config unless the profile deliberately overrides them
- The active workspace's label in the Icon Rail no longer appears blank; padding is tighter throughout, and the rail can now collapse to dots-only via a toggle at its base, matching the classic sidebar's own collapse behavior
- The classic sidebar's own "Workspaces" quick-list no longer duplicates the new Icon Rail column — it now only shows when Sidebar Layout is Tree, and updates immediately if the layout is changed live
- Icon Rail's list column no longer renders broken (item labels bleeding out of a zero-width collapsed container) — it now stays fully expanded via Frappe's own `.expanded` sidebar state instead of a custom collapse/hide CSS rule
- Sidebar layout changes (Tree ↔ Icon Rail) now apply live to every open Desk tab the moment a theme is published, matching every other Theme Studio setting — previously this required a full page reload, since it's the only setting read from boot data rather than applied via CSS variables
- Icon rail no longer renders partly underneath the fixed top toolbar
- Icon rail width no longer shows "undefined" or silently clamps to its minimum after a Theme Settings document is saved for the first time — Frappe's Int-field save serialization writes an unset field as 0 (not None), which was previously misread as a deliberate override

## [2.0.1] — 2026-08-03

### Fixed
- Today's View header still linked "All Workspaces" to the old broken `/desk/home` route after the widget-based dashboard rewrite landed; it now points at the stable `/desk/all-apps` page like the "Your Apps" widget already did
- Dashboard chart grid (`.grid-col-2`) grew unbounded across resize cycles — Frappe Charts' own resize observer fed back into a grid track sized by content instead of the container, pushing the second column off-screen over time. Tracks are now capped at their fair share of the container
- Theme Studio's floating widget-inspector panel stayed open when switching sections in the left control panel, stranding a stale panel referencing the previous widget; section switches now close it the same way its own close button does

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
- Theme Studio is now the single user-facing configuration experience for visual themes, branding, Smart Home, and Command Palette settings
- Opening Theme Settings redirects to Theme Studio; administrators retain an explicit raw-settings maintenance action (Theme Studio's `...` menu → "Open raw Theme Settings")
- Branding image controls in Theme Studio now use Frappe attachment fields instead of requiring manually entered URLs
- Theme Studio now uses a readable control and preview typography scale instead of 6–10px interface text
- Theme Studio's login scene now mirrors the public login card, branding, image background, fields, links, and light/dark token behavior
- Dashboard, Form, Table, and Login previews now support click-to-select property editing in a floating inspector beside the selected item
- Published profile and realtime theme refreshes now update chart configuration atomically without changing chart data or callbacks

### Fixed
- Public login now applies Theme Studio's Light/Dark/Auto mode and uses equal border-box sizing for the card head and form body
- Hide-powered now removes generated footer content; login branding replaces Frappe's cube and enforces symmetric card geometry across Frappe versions
- Frappe v16's nested login card head now stays inside one clipped, rounded outer card instead of extending past its right edge
- Actual sidebar and top-toolbar colours now match Theme Studio preview tokens, including readable automatic foreground colours for active items
- Sticky toolbar settings no longer turn the toolbar into a body flex item or split the Desk into a large blank column
- Profile action buttons now reflect the selected profile, explain unavailable actions, and can duplicate the current unsaved theme instead of failing silently
- Theme CSS now uses one authoritative runtime style element, removes stale cached duplicates, and applies profile/layout changes without requiring a reload
- Publishing from Theme Studio automatically enables the published theme and preserves the newly selected colour mode
- Theme runtime initialization now handles an empty initial Frappe route, allowing Light, Dark, High Contrast, density, and profile state to initialize reliably
- Sidebar hover/active labels, icons, and primary buttons now use theme-aware automatic contrast colours so controls remain visible with light, dark, or custom palettes
- List-view reload/menu controls retain their icon width and current theme colour, while EditorJS workspace section headings inherit the active text token
- Selecting Dark or Auto in Theme Studio now derives a complete mode-appropriate surface palette instead of treating a light custom palette as already dark
- Light and Dark modes now receive complete independent surface palettes, while High Contrast emits its dedicated colour and focus treatment consistently
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

## [1.4.0] — 2026-07-31 — Today's View Apps Grid

### Added
- Today's View now shows an "Your Apps" grid right below the KPI cards — the same workspace launcher cards (icons, colors, hover states) as the full "All Apps" grid, so you can jump into any workspace straight from the dashboard instead of navigating elsewhere first. Shows up to 8 workspaces with a "View All Workspaces" link to the full grid. Prompted by #8.
- New dedicated `/desk/all-apps` page for the full workspace grid. Previously this only lived at the bare `/desk` route, which "Enable Smart Home" redirects away from — meaning the grid (and the "View All Workspaces" link) had no reliable way to be reached on any site with Smart Home on. It now has its own stable route, unaffected by Smart Home or any site's own Workspace naming.

## [1.3.5] — 2026-07-31

### Fixed
- The "All Options" panel had several strings never wrapped for translation (toolbar button, panel title, search placeholder, "Loading…", "No workspaces found.", the "All Workspaces"/"General" group headers, "Appearance"/"Density"/"Compact"/"Comfortable") — now wrapped in `frappe._()`. Searching the panel with a query that matched nothing left it silently blank with zero feedback; it now shows a "No results" message, reusing the same translatable string Command Palette already uses for its own search. While testing this fix in Arabic, found the same gap on the Today's View dashboard (greeting, KPI labels, Recent Documents/Quick Create/Needs Attention cards, empty states) and the Setup Guide banner — all now wrapped too. Added the app's first `translations/ar.csv` with Arabic entries for all of the above (43 strings). Reported as #11.

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
