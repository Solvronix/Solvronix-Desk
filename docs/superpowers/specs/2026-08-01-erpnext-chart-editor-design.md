# ERPNext Chart Editor Design

## Goal

Extend Theme Studio so System Managers can edit the visual appearance, structure, and behavior of supported ERPNext charts. The system provides site-wide chart defaults plus sparse per-chart overrides. An individual reset falls back to the current global chart settings; a global reset restores Solvronix's built-in chart defaults.

The feature covers Workspace and Dashboard Charts, Dashboard Graphs, Query and Script Report charts, and Number Card mini charts or sparklines. It does not edit dataset values, report queries, source documents, filters, permissions, or business data.

## User Experience

### Entry points

The existing **Workspace & dashboard** area gains a **Chart System** subsection for global chart defaults and a searchable chart registry for individual overrides. In the read-only live Workspace preview, selecting a supported chart opens the same contextual inspector directly on that chart. No Customize button is added to normal ERPNext pages.

The registry supplies access to supported charts that cannot be reached from the Workspace preview, including report charts and Number Card mini charts. Entries show chart family, source name, context, override status, and whether the source is currently available. Selecting an entry asks its family adapter to open a guarded, read-only preview inside Theme Studio. The inspector opens only after that preview registers its stable identity, capabilities, series metadata, and current data shape. A source that cannot produce a stable identity or a permitted preview remains visible as unsupported and cannot receive persisted overrides.

### Inspector organization

The inspector displays only controls supported by the selected chart family and chart type:

- **Chart:** chart type, height, orientation, responsive sizing, and stacking.
- **Series:** per-series color, fill, opacity, line width and style, smoothing, point shape and size, bar width, radius, gap, and stack membership.
- **Axes:** X and Y visibility, scale type, minimum, maximum, interval, axis and grid colors, grid width, label visibility, rotation, and number format.
- **Legend:** visibility, position, alignment, marker style, text color, and text size.
- **Labels:** title and data-label visibility, font, color, formatting, and decimal precision.
- **Tooltip:** visibility, surface and text colors, border, value format, and shared or single-series behavior.
- **Animation and interaction:** animation enablement, duration, easing, hover emphasis, value selection, and highlight behavior. Navigation targets and callbacks are never editable.
- **Surface:** chart and card background, border, radius, padding, and shadow.
- **Advanced:** an allowlisted JSON object containing supported Frappe chart options that do not yet have a first-class control.

Number Card mini charts expose only their relevant subset. Controls such as axes and legends remain hidden when the target cannot render them. Unsupported combinations are disabled with a short reason rather than silently saved.

### Inheritance and reset

Every field shows one of three states: **System Default**, **Inherited from Global**, or **Overridden for this chart**. The effective value follows this order:

1. Per-chart override.
2. Active profile's global chart setting.
3. Solvronix system default.

Each overridden property has **Reset property**. The individual inspector has **Reset this chart**, which deletes that chart's override object and immediately reveals the global values. The global panel has **Reset all chart defaults**, which removes every sparse global chart value and restores the built-in chart defaults but does not delete individual overrides. Consequently, charts with overrides retain them while all inherited properties fall back to system defaults.

Override ownership is determined by key presence, not value inequality. If an administrator explicitly sets an individual value equal to the current global value, it remains an override and will not follow a later global change. Values are removed only by an explicit property or chart reset.

All reset operations create normal Theme Studio history checkpoints and are reversible through undo and redo until the draft is discarded or published.

## Configuration Model

The canonical Theme Studio payload gains two objects:

```json
{
  "chart_system_version": 1,
  "chart_defaults": {
    "chart": {},
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
      "series": {
        "dataset:net_total": {}
      },
      "axes": {}
    }
  }
}
```

Per-chart objects are sparse in the sense that they contain only explicitly owned values; they are not automatically minimized when an owned value happens to equal a global value. Removing the last override removes the chart key. Theme profiles, drafts, imports, exports, versions, scheduled activation, and assignments carry the version and both objects through the existing canonical configuration pipeline.

`chart_system_version` makes legacy conversion deterministic. A payload with no version is normalized once: existing `chart_background` and `chart_palette` values seed sparse global surface and series defaults when they differ from the legacy built-in values, then version 1 is recorded. After versioning, `chart_defaults` is authoritative and the legacy fields are synchronized output projections used by existing controls and generated CSS. Old controls update the corresponding new global paths, and imports or round trips cannot create two competing values. Global reset removes the sparse new values and synchronizes the legacy projections to built-in defaults; normalization never seeds them again after version 1 exists.

The server rejects an unknown newer schema version and migrates known older versions before normalization. Versioning, defaults, validation, capability metadata, and property-to-option mappings come from one packaged, versioned chart-schema artifact. The server loads the artifact directly and sends the same schema to Theme Studio; the client does not maintain a handwritten equivalent list.

### Series identities

Per-series configuration is keyed by stable source metadata, never render order or translated display text. Family adapters use declared dataset keys, report fieldnames, or persistent source-series names and prefix the key by kind, such as `dataset:net_total`. Labels are presentation only. Duplicate or unlabeled series that lack a stable source key can be previewed with session styling but cannot receive a persisted series override; the inspector explains this limitation. Reordering, localization, and filtered-out series therefore cannot move an override to another dataset.

### Stable chart identities

The chart registry derives deterministic, versioned identities from source metadata rather than DOM position. Identity segments are length-prefixed or equivalently encoded by a shared identity helper, so punctuation in names cannot create collisions. The examples below are human-readable representations rather than the serialized wire format:

- Dashboard Chart: `dashboard_chart:<document-name>`.
- Dashboard Graph: `dashboard_graph:<dashboard-name>:<graph-name>`.
- Report chart: `report_chart:<report-name>:<stable-slot>`.
- Number Card mini chart: `number_card:<document-name>`.

The family integration must supply both the stable identity and a human-readable descriptor. Persistent Dashboard Chart, Dashboard Graph, Number Card, and Report documents are enumerated server-side when the current user has both Theme Studio edit access and read access to the source. Reports whose static metadata declares charts can be listed before they are visited. Dynamic Query or Script Report charts register after their permitted report route renders in the guarded preview; raw render order is only a session identity and cannot receive a persisted override.

Selecting a registry row invokes a family preview provider. Persistent chart and Number Card providers render a read-only preview from the permitted source API. A report provider loads the report in the guarded iframe using its saved or default filters; if required filters are unresolved, the row requests those filters inside Theme Studio before the preview can register. The preview supplies capabilities and data shape to the inspector without enabling report actions. Renamed or deleted sources appear as unavailable and may be removed explicitly; cleanup is never automatic during rendering.

Registry APIs enforce Frappe permission checks for each source type and return only descriptors the user may read. Runtime registrations are accepted only from a currently permitted source context. A stale override whose source is no longer readable is shown as an opaque **Unavailable chart** entry without leaking its former label or metadata; it can be deleted but not edited.

## Architecture

### Chart schema

A packaged declarative chart-property schema is the single source for labels, control types, validation ranges, defaults, inheritance display, chart-family and chart-type applicability, and mapping to Frappe options or rendered styles. Server sanitization loads this artifact, and the Theme Studio API returns that exact schema and version for client control rendering. Unknown properties or incompatible schema versions cannot bypass the UI through API payloads.

Global defaults may contain a valid property that applies only to some families or chart types. The global UI labels its applicability, the server validates it against the schema rather than the currently rendered charts, and adapters ignore it for non-applicable targets. The value remains available if a chart later changes to a supported type. Family-specific invalid values are rejected rather than coerced into another family's setting.

### Chart registry

The registry discovers permitted persistent chart sources through server APIs and accepts runtime registrations from report and workspace adapters. It returns stable identity, family, filtered source metadata, capabilities, availability, and a preview-provider reference. It does not mutate charts or theme configuration.

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

Chart edits belong to the payload currently open for editing: either **Current custom theme** or one selected editable custom profile. Built-in profiles remain immutable and must be duplicated before editing. Each published assignment resolves one complete profile payload; base, user, role, company, and scheduled profiles do not merge chart overrides with one another. Profile switching therefore replaces both global chart defaults and per-chart overrides with the winning profile's payload according to the existing profile-resolution rules. A user cannot view source metadata or edit chart configuration unless they have both Theme Studio edit access and the required source permission.

Theme Studio may temporarily display invalid text or an incompatible selection in the active control buffer so the user can correct it, but invalid values never enter the canonical draft. Save Draft, profile create or update, import, version restore, scheduling, assignment, and Publish all run the same server normalization and static schema validation; any invalid property rejects the whole operation with field paths. Imports migrate supported older schema versions before validation.

Publication validity is static and deterministic. Data-dependent incompatibility caused later by report filters or changing datasets does not invalidate an otherwise schema-valid published profile: the family adapter retains the original chart for that render and reports a recoverable warning. An unavailable but well-formed stable identity also does not block publication and has no runtime effect. An identity that is malformed, unversioned, or references a source the editor was never authorized to configure is rejected when it is first added or imported.

## Validation and Safety

- Colors accept sanitized hex values consistent with the existing Theme Studio color controls.
- Numeric fields are clamped to schema-defined ranges; enum values must be explicitly allowed.
- Axis minimum, maximum, and interval are checked together. Invalid ranges retain the last valid rendering and show a field-level error.
- A chart-type change is previewed only when its current data shape and family adapter support the target type. Incompatible edits remain only in the active control buffer; they do not mutate or save the canonical draft.
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
- Reset property, reset chart, and reset global semantics, including equal-valued intentional overrides and undo or redo checkpoints.
- Sparse override removal, one-time legacy migration, synchronized projections, and global reset after customized legacy colors.
- Profile, import, export, version, schedule, and assignment round trips.
- Stable chart and series identity generation, reordered or duplicate series, permission-filtered discovery, and unavailable-source handling.
- Invalid save, import, restore, schedule, assignment, and publish rejection through the shared validation contract.

### JavaScript behavior tests

- Capability-driven controls for every supported chart family.
- Series-specific line, point, bar, area, and color mappings.
- Axis, grid, legend, label, tooltip, animation, interaction, surface, and advanced mappings.
- Compatible and incompatible chart-type transitions.
- Reapplication after filter changes, data refresh, route changes, iframe reload, and theme/profile switching.
- Runtime isolation when one adapter fails and protection against recursive renders.
- Workspace shield selection opens the correct inspector without activating the chart.
- Registry selection loads guarded previews for unvisited report and Number Card sources, including required-filter and permission failure states.
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
