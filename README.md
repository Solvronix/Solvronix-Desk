# Solvronix Desk

> A professional white-label theme for Frappe/ERPNext v16 that makes your ERP look and feel like a modern SaaS product.

[![Available on Frappe Cloud Marketplace](https://img.shields.io/badge/Frappe%20Cloud-Marketplace-0089FF)](https://cloud.frappe.io/marketplace/apps/solvronix_desk)

**Available on Frappe Cloud Marketplace** — install Solvronix Desk on your Frappe Cloud site in one click: [cloud.frappe.io/marketplace/apps/solvronix_desk](https://cloud.frappe.io/marketplace/apps/solvronix_desk)

![Solvronix Desk](docs/screenshots/smart-home.png)

---

## The Problem

ERPNext is powerful. But the default interface is overwhelming — too many menus, outdated design, and non-technical users struggle to find anything. Businesses reject ERPNext because it "doesn't look professional" or "is too hard to use."

**Solvronix Desk solves this.** Install it once and your ERPNext looks and feels like a tool people actually enjoy using — without touching a single line of your business logic.

---

## What You Get

### Command Palette — `Ctrl+K`
Press `Ctrl+K` from anywhere. Type what you're looking for — a document, a list, a setting — and navigate instantly. No menu hunting. No memorizing paths.

### White-Label Branding
Open Theme Studio, enter your company name, upload your logo, pick your two brand colors, then publish. The entire system — sidebar, navbar, login page, buttons — instantly becomes your brand.

### Theme Studio — Visual Drag & Drop Editor
Open **Theme Studio** from `Ctrl+K` or `/desk/theme-studio`. It is now the single user-facing home for theme settings, branding, feature toggles, and visual editing. Preview the result on dashboard, form, table, and login scenes; drag dashboard blocks into a new order; compare desktop/tablet/mobile and Frappe Default views; undo or reset changes; save a draft; then publish.

Theme Studio includes Light, Dark, High Contrast, Frappe Default, Solvronix, and Forest profiles. System Managers can create, duplicate, rename, update, delete, import, export, schedule, and restore profiles. Themes can be assigned site-wide or by user, role, and company, while optional per-user profile selection and administrator locking control who can personalize the Desk.

Every Studio token is rendered into the real Desk and login page, including the top toolbar and actual Frappe sidebar. Publishing creates a restorable backup and refreshes connected sessions without requiring an asset rebuild.

#### Theme Studio visual guide

See the [complete Theme Studio visual guide](docs/theme-studio.md) for every settings group, responsive preview mode, publishing workflow, and contextual property editor.

[![Theme Studio contextual property editor](docs/screenshots/theme-studio/floating/05-dashboard-chart.png)](docs/theme-studio.md)

#### Theme Studio capability map

| Area | Included controls |
|---|---|
| Presets and profiles | Bundled presets, custom profiles, duplicate, rename, delete, import/export |
| Main colours | Brand, accent, page/card/text/link/border, and semantic status colours |
| Navbar and sidebar | Background/text/icon/active/hover colours, width, mode, auto-collapse, logo placement |
| Buttons and forms | Button sizing/shape, inputs, focus, checkbox/toggle, dropdown, read-only/disabled |
| Typography | Font family or web font, base/heading/label/table sizes, weight, line height |
| Cards, lists, and tables | Surface, shadow, radius, row height/states, density, report grid |
| Workspace and dashboard | Cards, shortcuts, number cards, charts/palette, icons, width, empty states |
| Login branding | Logo, image/gradient, card opacity, title, copy, favicon, footer, optional platform credit |
| Layout | Full/boxed width, margins, gaps, spacing, global radius, header height, sticky regions |
| Assignment and activation | Site/user/role/company profiles, user permission, admin lock, scheduled activation |
| Preview and recovery | Live Desk preview, four scenes, devices, draft, undo/redo, versions, reset, cache reload |
| Accessibility | WCAG AA warning/enforcement, high contrast, large text, focus outlines, colour-blind palettes |
| Developer tools | Custom CSS/JS, CSS variables, DocType/page/workspace rules, class mappings, raw JSON |

Custom JavaScript is disabled by default and should only be enabled for trusted administrator-authored code. Hiding platform branding should only be used where your licensing and implementation permit it.

### Quick Color Presets
Four one-click starting points appear in Theme Studio. Pick one and the brand and accent colors update instantly. Includes Solvronix (Navy + Orange), Forest (Green + Gold), Midnight (Slate + Violet), and Plum (Purple + Amber). Use as-is or fine-tune every token afterward.

### Auto Color System
You set one brand color. The system automatically generates your complete color palette — backgrounds, hover states, borders, shadows — using CSS `color-mix()`. Change your brand color and everything updates instantly. No developer needed.

### Slim Icon Sidebar
A 64px icon rail instead of the default wide sidebar. Expands to 240px on click. Saves screen space, reduces visual clutter. State is saved per user.

### Dark Mode — Light / Dark / Auto
One click cycles between light, dark, and auto. Auto follows your operating system theme and switches live when the OS does. Both modes respect your brand colors. Works on every page.

### Display Density — Comfortable / Compact
A display density toggle. Compact mode tightens list rows, forms, and menus so power users see more data per screen. Per-user, with a site-wide default in Theme Studio.

### Font Size Control
Set a site-wide base font size in Theme Studio, and let each user fine-tune with A− / A / A+ from the All Options panel.

### Modern Login Page
A full-screen branded login experience with your company logo and colors, a slow-drifting ambient color backdrop generated from your brand palette, and a soft card entrance animation. First impression that sets the right tone for your team.

### Premium Motion & Depth
A polish layer across the whole desk: smooth, consistent transitions on every interactive element, layered card shadows with a subtle hover lift, gradient primary buttons with press feedback, and brand-colored keyboard focus rings. All animations respect your operating system's reduced-motion setting.

### Frosted-Glass Overlays
Dropdowns, modals, the command palette, and the notification and options panels render as translucent frosted surfaces with smooth pop-in entrances — while content cards stay solid and readable.

---

## Full Feature List

### Progressive Forms
Optional fields are hidden by default — forms look clean out of the box. A "Show More" toggle reveals them when needed. Reduces cognitive load for new users.

### Top Toolbar
A persistent top bar adds a live clock, a **Today's View** shortcut, the global search, dark mode toggle, and language switcher — all in one row, always visible.

### Language Switcher
A searchable dropdown lists all enabled system languages. Selecting one applies it instantly — no page reload required. Respects Frappe's translation layer.

### All Options Panel
A slide-in panel (triggered from the toolbar) shows every workspace grouped by category, plus an **Appearance** section with theme mode, density, and font-size controls. Lets users explore and personalize without navigating away from their current page.

### User Avatar Dropdown
Clicking the user avatar opens a dropdown with an installed apps grid, edit profile, reset workspace layout, and logout — all in one place.

### Module Switcher — `Ctrl+M`
Press `Ctrl+M` from anywhere to open a searchable workspace switcher. Type a module name and press Enter to jump to it instantly.

### Named Theme Presets
Save visual configurations as reusable profiles in Theme Studio. Built-in starting points (Solvronix, Forest, Midnight, Plum) make it quick to establish a base before refining the full design system.

### Real-Time Theme Sync
When a System Manager publishes Theme Studio, color, branding, layout, and feature changes propagate to connected users through Frappe's realtime layer.

### Refined Data & Charts
Tabular numerals keep columns of figures perfectly aligned in list views, report grids, and dashboard number cards. Charts get softer gridlines, hover focus on bars, and elevated tooltips that stay fully readable in dark mode.

### Details Everywhere
Keycap-styled keyboard hints, thin floating scrollbars, brand-tinted text selection, shimmer on loading placeholders, and a brand accent on the selected command-palette row.

### Setup Guide Banner
On first launch, a checklist banner guides System Manager users through the initial configuration steps: set company name, upload logo, choose brand colors. Dismisses permanently once complete.

---

## Screenshots

| Login Page | Today's View |
|:---:|:---:|
| ![Login Page](docs/screenshots/login.png) | ![Today's View](docs/screenshots/smart-home.png) |

| Theme Studio / Settings | Dark Mode |
|:---:|:---:|
| ![Theme Settings](docs/screenshots/theme-settings.png) | ![Dark Mode](docs/screenshots/dark-mode.png) |

| Command Palette | Slim Sidebar |
|:---:|:---:|
| ![Command Palette](docs/screenshots/command-palette.png) | ![Slim Sidebar](docs/screenshots/sidebar.png) |

---

## Requirements

| Requirement | Version |
|---|---|
| Frappe Framework | v16 |
| ERPNext | v16 (optional — works on any Frappe app) |
| Python | 3.10+ |
| Node | 18+ |

---

## Setup Your Branding (5 minutes)

Open **Theme Studio** with `Ctrl+K` or visit `/desk/theme-studio`.

| Field | What it does |
|---|---|
| Company Name | Shown in the navbar — replaces "ERPNext" |
| Company Logo | Shown in the navbar and login page |
| Brand Color | Sets sidebar, navbar, and login page background |
| Accent Color | Sets buttons, active states, and highlights |

**Tip:** The **Quick Presets** row above the color pickers lets you apply a complete color pair in one click. Click any swatch → both fields update → click **Save**.

Click **Save** — the entire system updates instantly.

---

## How the Color System Works

You only need to pick **two colors**. Everything else is generated automatically.

```
Brand Color  →  sidebar background, navbar, login page
               + auto-generates: hover tints, border colors, page tint

Accent Color →  buttons, active sidebar item, highlights
               + auto-generates: button hover, pressed state
```

This means any company — whether their brand is navy, green, red, or black — gets a complete, consistent color system from just two color pickers.

**Example:** Set Brand Color to `#006B3C` (green). Sidebar becomes green, login page becomes green, page background becomes a very light green tint. Set it back to `#1B3F7E` (navy) and everything reverts. No code, no rebuild.

---

## Default Colors

| Color | Hex | Used For |
|---|---|---|
| Brand | `#1B3F7E` | Sidebar, navbar, login |
| Accent | `#F57C00` | Buttons, active items |
| Page Background | Auto-generated | Light tint of brand color |
| Cards / Forms | `#FFFFFF` | All content surfaces |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `↑` `↓` | Move through results |
| `Enter` | Open selected item |
| `Esc` | Close palette |

---

## Compatibility

| Frappe Version | Status |
|---|---|
| v16 (all releases, v16.0 – v16.27+) | ✅ Fully supported |
| v15 | ⚠️ Not tested |
| v14 | ❌ Not supported |

Solvronix Desk tracks Frappe v16 API changes across minor releases — internal shims resolve renamed core methods automatically, so the app works on older production benches and the latest releases alike.

Works with ERPNext and any other Frappe-based application.

---

---

## License

MIT License — free to use, modify, and distribute commercially.

See [LICENSE](license.txt) for full details.

---

## About Solvronix

Solvronix builds Frappe/ERPNext products for businesses globally, based in Lahore, Pakistan.

- Website: [solvronix.com](https://solvronix.com)
- Email: sales@solvronix.com
- WhatsApp: +92 307 9484220

**Other products:**
- [Edvronix](https://solvronix.com/edvronix) — School management system built on ERPNext. Fee collection, attendance, timetables, parent portal, and more.

---

## Support

Something not working? Open an issue on [GitHub Issues](https://github.com/Solvronix/Solvronix-Desk/issues) or contact us directly.

- Email: sales@solvronix.com
- WhatsApp: +92 307 9484220

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.
