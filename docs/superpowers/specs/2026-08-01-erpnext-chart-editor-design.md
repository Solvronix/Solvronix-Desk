# ERPNext Chart Editor Design

## Goal

Extend Theme Studio so System Managers can edit the visual appearance, structure, and behavior of supported ERPNext charts. The system provides site-wide chart defaults plus sparse per-chart overrides. An individual reset falls back to the current global chart settings; a global reset restores Solvronix's built-in chart defaults.

The feature covers Workspace and Dashboard Charts, Dashboard Graphs, Query and Script Report charts, and Number Card mini charts or sparklines. It does not edit dataset values, report queries, source documents, filters, permissions, or business data.

## User Experience

### Entry points

The existing **Workspace & dashboard** area gains a **Chart System** subsection for global chart defaults and a searchable chart registry for individual overrides. In the read-only live Workspace preview, selecting a supported chart opens the same contextual inspector directly on that chart. No Customize button is added to normal ERPNext pages.

The registry supplies access to supported charts that cannot be reached from the Workspace preview, including report charts and Number Card mini charts. Entries show chart family, source name, context, override status, and whether the source is currently available.

### Inspector organization

The inspector displays only controls supported by the selected chart family and chart type:

- **Chart:** chart type, height, orientation, responsive sizing, and stacking.
- **Series:** per-series color, fill, opacity, line width and style, smoothing, point shape and size, bar width, radius, gap, and stack membership.
- **Axes:** X and Y visibility, scale type, minimum, maximum, interval, axis and grid colors, grid width, label visibility, rotation, and number format.
- **Legend:** visibility, position, alignment, marker style, text color, and text size.
- **Labels:** title and data-label visibility, font, color, formatting, and decimal precision.
- **Tooltip:** visibility, surface and text colors, border, value format, and shared or single-series behavior.
- **Animation and interaction:** animation enablement, duration, easing, hover emphasis, value selection, and supported navigation behavior.
- **Surface:** chart and card background, border, radius, padding, and shadow.
- **Advanced:** an allowlisted JSON object containing supported Frappe chart options that do not yet have a first-class control.

Number Card mini charts expose only their relevant subset. Controls such as axes and legends remain hidden when the target cannot render them. Unsupported combinations are disabled with a short reason rather than silently saved.

### Inheritance and reset

Every field shows one of three states: **System Default**, **Inherited from Global**, or **Overridden for this chart**. The effective value follows this order:

1. Per-chart override.
2. Active profile's global chart setting.
3. Solvronix system default.

Each overridden property has **Reset property**. The individual inspector has **Reset this chart**, which deletes that chart's override object and immediately reveals the global values. The global panel has **Reset all chart defaults**, which restores the built-in chart defaults but does not delete individual overrides. Consequently, charts with overrides retain them while all inherited properties fall back to system defaults.

All reset operations create normal Theme Studio history checkpoints and are reversible through undo and redo until the draft is discarded or published.

## Configuration Model

The canonical Theme Studio payload gains two objects:

```json
{
  "chart_defaults": {
    "surface": {},
    "axes": {},
    "legend": {},
    "labels": {},
    "tooltip": {},
    "animation": {},
    "interaction": {},
    "series_defaults": {},
    "advanced": {}
  },
  "chart_overrides": {
    "dashboard_chart:Sales Analytics": {
      "chart": {},
      "series": {},
      "axes": {}
    }
  }
}
```

Per-chart objects are sparse and contain only values that differ from the effective global configuration. Removing the last override removes the chart key. Theme profiles, drafts, imports, exports, versions, scheduled activation, and assignments carry both objects through the existing canonical configuration pipeline.

Existing `chart_background` and `chart_palette` values remain backward compatible. During normalization they seed the equivalent global surface and series colors when the new fields are absent. Existing payloads require no destructive migration, and generated CSS continues to emit the legacy chart variables for consumers outside the adapter.

### Stable chart identities

The chart registry derives deterministic identities from source metadata rather than DOM position:

- Dashboard Chart: `dashboard_chart:<document-name>`.
- Dashboard Graph: `dashboard_graph:<dashboard-name>:<graph-name>`.
- Report chart: `report_chart:<report-name>:<stable-slot>`.
- Number Card mini chart: `number_card:<document-name>`.

The family integration must supply both the stable identity and a human-readable descriptor. If a report exposes multiple unnamed charts, its adapter derives a stable slot from report metadata and the chart's declared key; raw render order is only a last-resort session identity and cannot receive a persisted override. Renamed or deleted sources appear as unavailable in the registry and may be removed explicitly; cleanup is never automatic during rendering.

## Architecture

### Chart schema

A declarative chart-property schema is the single source for labels, control types, validation ranges, defaults, inheritance display, chart-family capability rules, and mapping to Frappe options or rendered styles. Theme Studio control rendering and server sanitization consume equivalent schema definitions so unsupported or unsafe fields cannot bypass the UI through API payloads.

### Chart registry

The registry discovers supported persistent chart sources through server APIs and accepts runtime registrations from report and workspace adapters. It returns stable identity, family, source metadata, capabilities, and availability. It does not mutate charts or theme configuration.

### Family adapters

Each supported family implements a bounded adapter with the same contract:

1. Identify and register the chart.
2. Read its source configuration and runtime capabilities.
3. Merge system defaults, global settings, and sparse overrides.
4. Validate the requested structure against the current data shape.
5. Apply supported constructor options and scoped SVG or HTML presentation.
6. Reapply after data refresh, filter changes, route changes, or chart recreation.
7. Report a recoverable warning without preventing the original chart from rendering.

Adapters preserve the source data and callbacks required by ERPNext. Structural changes rebuild only the affected chart when the underlying Frappe chart API requires reconstruction. Pure presentation changes use scoped variables and styles when possible.

### Runtime coordinator

A single coordinator owns active chart registrations and observes supported chart lifecycles. It calculates effective settings once per revision, asks the matching family adapter to apply them, and avoids recursive re-render loops. It clears detached runtime instances on route changes while retaining persisted configuration by stable identity.

### Theme Studio integration

The existing canonical configuration, dirty state, checkpoints, input synchronization, preview application, profile, and publish flows remain authoritative. Chart controls do not maintain a parallel settings store.

The live Workspace shield keeps the iframe read-only. A shield click is translated into the iframe, classified as a supported chart target, and resolved through the chart registry. The underlying chart, filter, link, or action is never activated. The existing contextual inspector opens with that chart's effective settings and re-anchors after scroll, resize, or chart refresh.

## Application and Publishing

Draft edits apply to Theme Studio previews and the guarded live Workspace preview only. Publishing makes the same normalized payload available to the real Desk and starts or refreshes the runtime coordinator through the existing theme refresh mechanism.

Profile switching replaces both global chart defaults and per-chart overrides with the selected profile's payload. User, role, company, and site assignments follow the existing profile resolution rules. A user cannot edit chart configuration unless they already have permission to edit Theme Studio.

## Validation and Safety

- Colors accept sanitized hex values consistent with the existing Theme Studio color controls.
- Numeric fields are clamped to schema-defined ranges; enum values must be explicitly allowed.
- Axis minimum, maximum, and interval are checked together. Invalid ranges retain the last valid rendering and show a field-level error.
- A chart-type change is applied only when its data shape and family adapter support the target type. Incompatible changes remain in the draft as invalid only while the user is editing and cannot be published.
- Advanced options are data-only JSON. Functions, executable strings, event handlers, HTML, prototype keys, unknown keys, and options that replace source data or callbacks are rejected.
- Adapter failures are isolated per chart. The original ERPNext chart remains visible, and a non-blocking warning identifies the ignored customization.
- Workspace preview iframe access remains guarded for missing documents, navigation, teardown, CSP, and origin failures.

## Accessibility

All first-class controls are labelled and keyboard operable. Disabled controls explain why the selected chart does not support them. Color controls retain the existing WCAG warning and enforcement behavior where text or essential graphical contrast is measurable. Animations respect `prefers-reduced-motion`; the effective duration becomes zero unless an administrator previews an explicit override, and published behavior never forces motion for a user requesting reduced motion.

The chart registry exposes family and override state as text, not color alone. The contextual inspector remains a labelled live region with an accessible close button.

## Testing

### Configuration and server tests

- Defaults, sanitization, range clamping, enums, advanced-option allowlisting, and prototype-key rejection.
- Effective merge order for system, global, and individual values.
- Reset property, reset chart, and reset global semantics, including undo and redo checkpoints.
- Sparse override removal and legacy `chart_background` or `chart_palette` compatibility.
- Profile, import, export, version, schedule, and assignment round trips.
- Stable identity generation and unavailable-source handling.

### JavaScript behavior tests

- Capability-driven controls for every supported chart family.
- Series-specific line, point, bar, area, and color mappings.
- Axis, grid, legend, label, tooltip, animation, interaction, surface, and advanced mappings.
- Compatible and incompatible chart-type transitions.
- Reapplication after filter changes, data refresh, route changes, iframe reload, and theme/profile switching.
- Runtime isolation when one adapter fails and protection against recursive renders.
- Workspace shield selection opens the correct inspector without activating the chart.
- Number Card mini charts omit irrelevant controls.

### Regression and browser verification

- Existing Theme Studio color synchronization, preview scenes, read-only workspace guards, history, profiles, draft, publish, and non-chart contextual inspectors continue to pass.
- Light, dark, high-contrast, and color-blind profiles render chart controls and chart output consistently.
- Real ERPNext Workspace/Dashboard Charts, Dashboard Graphs, report charts, and Number Card mini charts are visually checked after publish, refresh, filtering, and navigation.
- Full Python and JavaScript suites run after focused tests pass.

## Acceptance Criteria

- A System Manager can edit global visual, structural, and behavioral chart defaults from Theme Studio.
- A supported chart can be selected from the live Workspace preview or chart registry and given sparse individual overrides.
- Effective values visibly follow individual, global, then system-default inheritance.
- Resetting a property or chart falls back to global values; resetting global values falls back to built-in defaults without deleting individual overrides.
- All supported chart families apply their relevant settings after render and re-render without changing business data.
- Invalid or unsupported options cannot break the original ERPNext chart or be published.
- Drafts, publishing, profiles, history, assignments, and legacy chart colors remain compatible.

## Non-goals

- Editing chart data, report SQL or scripts, filters, source documents, permissions, or navigation actions.
- Adding Customize buttons to normal ERPNext pages.
- Providing an unrestricted DOM, CSS, JavaScript, callback, or arbitrary Frappe option editor.
- Persisting overrides for charts that cannot be assigned a stable source identity.
