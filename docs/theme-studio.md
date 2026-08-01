# Theme Studio visual guide

Theme Studio is the visual control centre for Solvronix Desk. This guide shows the complete editor, every settings group, responsive preview modes, publishing workflow, and the contextual property inspector used by the Dashboard, Form, Table, Login, Workspace, and Charts previews.

Open Theme Studio from `Ctrl+K` or visit `/desk/theme-studio` as a System Manager.

Light, Dark, and Auto update the Desk and preview immediately without turning a preview into a saved user preference. Auto follows live operating-system colour-scheme changes. A user's explicit toolbar choice remains in force when a site theme or profile refreshes; leaving Theme Studio restores the mode that was active before editing.

## Editor and preview workflow

| Main colours overview | Dashboard preview — desktop |
|:---:|:---:|
| ![Theme Studio main colours overview](screenshots/theme-studio/overview/01-overview-main-colours.png) | ![Dashboard desktop preview](screenshots/theme-studio/overview/13-preview-dashboard-desktop.png) |

| Dashboard preview — tablet | Dashboard preview — mobile |
|:---:|:---:|
| ![Dashboard tablet preview](screenshots/theme-studio/overview/14-preview-dashboard-tablet.png) | ![Dashboard mobile preview](screenshots/theme-studio/overview/15-preview-dashboard-mobile.png) |

| Form preview | Table preview |
|:---:|:---:|
| ![Form preview](screenshots/theme-studio/overview/16-preview-form.png) | ![Table preview](screenshots/theme-studio/overview/17-preview-table.png) |

| Login preview | Search theme controls |
|:---:|:---:|
| ![Login preview](screenshots/theme-studio/overview/18-preview-login.png) | ![Search Theme Studio controls](screenshots/theme-studio/overview/19-search-theme-controls.png) |

| Compare with Frappe default | Publish theme status |
|:---:|:---:|
| ![Compare theme with Frappe default](screenshots/theme-studio/overview/20-compare-with-default.png) | ![Published theme status](screenshots/theme-studio/overview/21-publish-theme-status.png) |

![Complete main colour controls](screenshots/theme-studio/overview/22-main-colours-controls.png)

## Complete settings reference

### Navbar and sidebar

| Colours and navigation states | Sidebar behaviour and sizing |
|:---:|:---:|
| ![Navbar and sidebar controls part one](screenshots/theme-studio/controls/02-navbar-sidebar-part-01.png) | ![Navbar and sidebar controls part two](screenshots/theme-studio/controls/02-navbar-sidebar-part-02.png) |

![Navbar and sidebar controls part three](screenshots/theme-studio/controls/02-navbar-sidebar-part-03.png)

### Buttons and fields

| Button geometry | Button and field colours |
|:---:|:---:|
| ![Buttons and fields controls part one](screenshots/theme-studio/controls/03-buttons-fields-part-01.png) | ![Buttons and fields controls part two](screenshots/theme-studio/controls/03-buttons-fields-part-02.png) |

![Buttons and fields controls part three](screenshots/theme-studio/controls/03-buttons-fields-part-03.png)

### Typography

| Font family and base scale | Detailed typography scale |
|:---:|:---:|
| ![Typography controls part one](screenshots/theme-studio/controls/04-typography-part-01.png) | ![Typography controls part two](screenshots/theme-studio/controls/04-typography-part-02.png) |

### Cards, lists, and tables

| Card surfaces | List and table states |
|:---:|:---:|
| ![Cards lists and tables controls part one](screenshots/theme-studio/controls/05-cards-lists-tables-part-01.png) | ![Cards lists and tables controls part two](screenshots/theme-studio/controls/05-cards-lists-tables-part-02.png) |

### Workspace and dashboard

| Workspace surfaces | Number cards, charts, and dashboard options |
|:---:|:---:|
| ![Workspace and dashboard controls part one](screenshots/theme-studio/controls/06-workspace-dashboard-part-01.png) | ![Workspace and dashboard controls part two](screenshots/theme-studio/controls/06-workspace-dashboard-part-02.png) |

#### Chart System

The Chart System appears in **Workspace & dashboard** and uses one server-supplied schema for both validation and controls. It has two editing layers:

- **Global chart defaults** apply to every supported chart unless that chart owns an override.
- **Individual charts** lists only sources the current System Manager can read. Selecting an entry opens its focused inspector; clicking a chart in the read-only live Workspace preview opens the same inspector and can expose stable per-series controls.

Supported families are Dashboard Chart, Dashboard Graph, Query/Script Report chart, and Number Card sparkline. Full charts expose chart structure, surface, default and individual series, axes, legend, labels, tooltip, animation, interaction, and the allowlisted advanced options (`truncateLegends`, `maxLegendPoints`, and `maxSlices`). Sparklines show only controls their runtime adapter supports.

Each field includes an ownership label:

- **system** — the built-in default is active;
- **global** — the Theme Studio global value is active;
- **individual** — the selected chart or series explicitly owns the value.

Use the reset button beside a property to remove only that explicit value. **Reset this chart** removes all overrides for the selected chart and falls back to global values. **Reset global charts** removes global ownership and falls back to built-in system defaults; individual overrides remain intact. Equal-valued overrides remain explicitly owned until reset.

Chart editing changes presentation and supported constructor options only. It does not edit report queries, chart datasets, filters, callbacks, credentials, or business records. Dynamic or unavailable sources remain inert until a compatible chart is present in a permitted runtime preview. Invalid values stay out of the canonical draft and block Save Draft/Publish until corrected.

### Smart Home and features

![Smart Home and feature controls](screenshots/theme-studio/controls/07-smart-home-features-part-01.png)

### Login and branding

| Company branding | Login background and card |
|:---:|:---:|
| ![Login and branding controls part one](screenshots/theme-studio/controls/08-login-branding-part-01.png) | ![Login and branding controls part two](screenshots/theme-studio/controls/08-login-branding-part-02.png) |

![Login and branding controls part three](screenshots/theme-studio/controls/08-login-branding-part-03.png)

### Layout

| Page width and spacing | Header and sticky layout options |
|:---:|:---:|
| ![Layout controls part one](screenshots/theme-studio/controls/09-layout-part-01.png) | ![Layout controls part two](screenshots/theme-studio/controls/09-layout-part-02.png) |

### Accessibility

| Contrast and text options | Focus and colour-blind options |
|:---:|:---:|
| ![Accessibility controls part one](screenshots/theme-studio/controls/10-accessibility-part-01.png) | ![Accessibility controls part two](screenshots/theme-studio/controls/10-accessibility-part-02.png) |

### Developer options

| Custom CSS | Custom JavaScript and variables |
|:---:|:---:|
| ![Developer options part one](screenshots/theme-studio/controls/11-developer-options-part-01.png) | ![Developer options part two](screenshots/theme-studio/controls/11-developer-options-part-02.png) |

![Developer options part three](screenshots/theme-studio/controls/11-developer-options-part-03.png)

### Profiles and deployment

| Profile assignment | Publishing, scheduling, and recovery |
|:---:|:---:|
| ![Profiles and deployment part one](screenshots/theme-studio/controls/12-profiles-deployment-part-01.png) | ![Profiles and deployment part two](screenshots/theme-studio/controls/12-profiles-deployment-part-02.png) |

## Contextual preview property editor

Click a highlighted preview element to open its focused settings card beside the item. The card prefers the right side and automatically moves to the left when space is limited. Changes update both the preview and the canonical Theme Studio setting.

### Dashboard

| Top toolbar | Sidebar |
|:---:|:---:|
| ![Dashboard toolbar contextual settings](screenshots/theme-studio/floating/01-dashboard-toolbar.png) | ![Dashboard sidebar contextual settings](screenshots/theme-studio/floating/02-dashboard-sidebar.png) |

| Heading | Number cards |
|:---:|:---:|
| ![Dashboard heading contextual settings](screenshots/theme-studio/floating/03-dashboard-heading.png) | ![Dashboard metrics contextual settings](screenshots/theme-studio/floating/04-dashboard-metrics.png) |

| Chart | Activity card |
|:---:|:---:|
| ![Dashboard chart contextual settings](screenshots/theme-studio/floating/05-dashboard-chart.png) | ![Dashboard activity contextual settings](screenshots/theme-studio/floating/06-dashboard-activity.png) |

![Dashboard quick actions contextual settings](screenshots/theme-studio/floating/07-dashboard-quick-actions.png)

### Form

| Form heading | Form card |
|:---:|:---:|
| ![Form heading contextual settings](screenshots/theme-studio/floating/08-form-heading.png) | ![Form card contextual settings](screenshots/theme-studio/floating/09-form-card.png) |

| Form fields | Form actions |
|:---:|:---:|
| ![Form fields contextual settings](screenshots/theme-studio/floating/10-form-fields.png) | ![Form actions contextual settings](screenshots/theme-studio/floating/11-form-actions.png) |

### Table

| Table heading | Data grid |
|:---:|:---:|
| ![Table heading contextual settings](screenshots/theme-studio/floating/12-table-heading.png) | ![Table grid contextual settings](screenshots/theme-studio/floating/13-table-grid.png) |

![Table status contextual settings](screenshots/theme-studio/floating/14-table-status.png)

### Login

| Background | Card |
|:---:|:---:|
| ![Login background contextual settings](screenshots/theme-studio/floating/15-login-background.png) | ![Login card contextual settings](screenshots/theme-studio/floating/16-login-card.png) |

| Branding | Fields |
|:---:|:---:|
| ![Login branding contextual settings](screenshots/theme-studio/floating/17-login-branding.png) | ![Login fields contextual settings](screenshots/theme-studio/floating/18-login-fields.png) |

![Login button contextual settings](screenshots/theme-studio/floating/19-login-button.png)

### Workspace (live, styling-only)

In the live Workspace scene, click a surface to open the existing Theme Studio contextual inspector. Chart hit testing has priority over generic cards, and the inspector classifies selections into five groups:

- Workspace background
- Card/widget (including number cards)
- Text/link
- Button/shortcut
- Supported chart or Number Card sparkline

For a **Workspace shortcut**, the inspector exposes brand colour, shortcut style, card background, radius, and shadow. For a **Number card**, it exposes number-card colour, text, muted text, border, radius, and shadow. Generic cards and buttons retain their standard contextual controls, so these subtypes do not add extra inspector groups.

Generic Workspace controls remain styling-only. Supported charts additionally expose compatible visual, structural, and behavioral chart properties, but their data and actions remain read-only. Workspace content, links, buttons, forms, routes, and actions cannot be activated. Scrolling and the Workspace picker continue to work.

### Charts (hybrid visual preview)

The **Charts** scene appears immediately after **Workspace** in the preview toolbar. It provides line/area, bar, donut, and Number Card preview families. Global editing starts with deterministic sample data; selecting a supported individual source loads its current, permission-checked ERPNext values and marks the card **ERPNext data**.

Click any sample to open its chart inspector. An unbound sample edits global chart defaults and does not create an individual override. Selecting an entry under **Individual charts** automatically switches to the Charts scene, highlights the matching preview family, keeps the chart's stable registry identity, opens its individual inspector, and requests real data for ordinary Dashboard Charts and document-based Number Cards. Custom sources, report charts that need runtime filters, empty sources, and unavailable records show an explicit fallback status instead of presenting sample values as ERPNext data.

Changes to chart type, colours, fill, line width and style, points, bar radius, surface, axes, grid, legend, labels, tooltip, animation, interaction, and supported sizing update the gallery immediately. **Reset this chart** falls back to the current global values; **Reset global charts** falls back to built-in defaults without deleting individual overrides.
