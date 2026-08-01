# ERPNext Chart Editor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. For this project, the user explicitly requested no subagents, so execute with `superpowers:executing-plans` in the current session.

**Goal:** Add schema-driven global and per-chart editing for supported ERPNext charts, with deterministic inheritance, reset behavior, safe publishing, and runtime reapplication.

**Architecture:** A versioned JSON schema drives Python sanitization and Theme Studio controls. Focused Python modules own chart configuration and permission-filtered discovery; a dedicated browser runtime owns chart registration, family adapters, effective-value merging, and reapplication. Theme Studio consumes those interfaces for global controls, a chart registry, guarded previews, and per-chart inspectors while the existing profile, history, draft, and publish pipeline remains authoritative.

**Tech Stack:** Python 3.10+, Frappe/ERPNext v15-v16 APIs, vanilla JavaScript, jQuery-based Frappe Page UI, Frappe Charts SVG/DOM, CSS custom properties, Python `unittest`, Node `node:test`.

**Design spec:** `docs/superpowers/specs/2026-08-01-erpnext-chart-editor-design.md`

---

## File map

**Create**

- `solvronix_desk/chart_schema.json` — canonical versioned property definitions, defaults, applicability, validation, and adapter mappings.
- `solvronix_desk/chart_config.py` — schema loading, legacy migration, validation, sparse inheritance, reset helpers, stable chart and series IDs.
- `solvronix_desk/chart_registry.py` — permission-filtered source enumeration and preview descriptors.
- `solvronix_desk/public/js/chart_runtime.js` — runtime coordinator, registrations, effective-value merge, refresh observation, and family adapters.
- `tests/test_chart_config.py` — configuration, migration, identity, validation, and reset tests.
- `tests/test_chart_registry.py` — discovery and permission tests with Frappe stubs.
- `tests/chart_runtime.test.js` — browser-runtime unit tests with fake charts and DOM.

**Modify**

- `solvronix_desk/theme_engine.py:24-137,336-380,529-585,677-680,756-1092` — add chart payload defaults, call chart normalization, preserve complete profile payloads, emit legacy CSS projections.
- `solvronix_desk/theme_api.py:14-85,88-113,118-180,340-364` — return chart schema/registry, enforce strict chart validation on all persistence paths, synchronize legacy projections, and deliver chart config at runtime.
- `solvronix_desk/hooks.py:25-55` — load `chart_runtime.js` after `theme_runtime.js` and bump changed asset versions.
- `solvronix_desk/solvronix_desk/page/theme_studio/theme_studio.js:9-137,197-227,299-379,397-478,636-775,899-1335,1391-1570,1621-1655,2005-2085,2307-2410` — chart state, schema controls, registry UI, guarded preview selection, inheritance/reset commands, preview and publish integration.
- `solvronix_desk/public/css/theme_studio.css:150-330` — chart editor groups, inheritance badges, registry, error states, selected-series controls, and responsive inspector layout.
- `solvronix_desk/public/css/solvronix_desk.css` and `solvronix_desk/public/css/dark_mode.css:666-751` — stable scoped runtime tokens for axes, grids, legends, labels, tooltips, series, and reduced motion.
- `tests/test_theme_engine.py` — integration coverage for canonical normalization and generated CSS.
- `tests/test_theme_studio.py` — public API, asset hook, permission, and markup contracts.
- `tests/theme_studio_behavior.test.js` — editor state, registry selection, reset, history, and guarded iframe behavior.
- `tests/test_theme_studio_preview_wiring.py` — static preview token and chart-selector wiring.
- `docs/theme-studio.md` — user-facing Chart System workflow and screenshots placeholder only after verified captures exist.
- `README.md` and `CHANGELOG.md` — capability map and release entry.

---

## Chunk 1: Canonical chart configuration

### Task 1: Add the versioned chart-property schema

**Files:**

- Create: `solvronix_desk/chart_schema.json`
- Create: `solvronix_desk/chart_config.py`
- Create: `tests/test_chart_config.py`

- [ ] **Step 1: Write the failing schema-loading tests**

```python
def test_schema_has_one_versioned_definition_for_required_groups():
    schema = CHART_CONFIG.load_schema()
    assert schema["version"] == 1
    assert set(schema["groups"]) == {
        "chart", "surface", "series_defaults", "axes", "legend",
        "labels", "tooltip", "animation", "interaction", "advanced",
    }

def test_each_property_declares_default_type_and_applicability():
    for group in CHART_CONFIG.load_schema()["groups"].values():
        for definition in group.values():
            assert {"type", "default", "applies_to"} <= set(definition)
```

- [ ] **Step 2: Run the focused tests and confirm the module is missing**

Run: `python -m unittest tests.test_chart_config -v`

Expected: FAIL because `solvronix_desk.chart_config` does not exist.

- [ ] **Step 3: Create the canonical schema artifact**

Start with the approved groups and explicit safe ranges. The artifact must include at least these representative definitions before filling the remainder from the spec:

```json
{
  "version": 1,
  "groups": {
    "chart": {
      "type": {"type": "enum", "default": "source", "values": ["source", "bar", "line", "area", "pie", "donut", "percentage"], "applies_to": ["full"]},
      "height": {"type": "integer", "default": 240, "min": 80, "max": 900, "applies_to": ["full", "sparkline"]},
      "orientation": {"type": "enum", "default": "vertical", "values": ["vertical", "horizontal"], "applies_to": ["bar"]},
      "stacked": {"type": "boolean", "default": false, "applies_to": ["bar", "area"]}
    },
    "surface": {
      "background": {"type": "color", "default": "#FFFFFF", "applies_to": ["full", "sparkline"]}
    }
  },
  "advanced_allowlist": ["truncateLegends", "maxLegendPoints", "maxSlices"]
}
```

Add every approved control to this artifact; use `applies_to` tags rather than duplicated family schemas.

- [ ] **Step 4: Implement cached schema loading and schema-path iteration**

```python
SCHEMA_PATH = Path(__file__).with_name("chart_schema.json")

@lru_cache(maxsize=1)
def load_schema():
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

def property_definitions():
    for group, fields in load_schema()["groups"].items():
        for key, definition in fields.items():
            yield f"{group}.{key}", definition
```

- [ ] **Step 5: Run tests and commit**

Run: `python -m unittest tests.test_chart_config -v`

Expected: PASS.

```powershell
git add solvronix_desk/chart_schema.json solvronix_desk/chart_config.py tests/test_chart_config.py
git commit -m "feat(theme-studio): add canonical chart schema"
```

### Task 2: Implement migration, strict validation, inheritance, and reset

**Files:**

- Modify: `solvronix_desk/chart_config.py`
- Modify: `tests/test_chart_config.py`

- [ ] **Step 1: Add failing tests for the required state semantics**

```python
def test_legacy_colors_migrate_once_and_global_reset_does_not_reseed():
    migrated = normalize_payload({"chart_background": "#112233", "chart_palette": ["#445566"]})
    assert migrated["chart_system_version"] == 1
    assert migrated["chart_defaults"]["surface"]["background"] == "#112233"
    reset = reset_global(migrated)
    assert reset["chart_defaults"] == {}
    assert normalize_payload(reset)["chart_defaults"] == {}

def test_equal_valued_individual_override_remains_owned_until_reset():
    config = normalize_payload({"chart_system_version": 1, "chart_defaults": {"chart": {"height": 300}}, "chart_overrides": {"v1|dashboard_chart|4:Test": {"chart": {"height": 300}}}})
    effective, ownership = resolve_chart(config, "v1|dashboard_chart|4:Test")
    assert effective["chart"]["height"] == 300
    assert ownership["chart.height"] == "individual"

def test_unknown_advanced_or_prototype_keys_reject_the_whole_payload(self):
    with self.assertRaises(CHART_CONFIG.ChartConfigError):
        CHART_CONFIG.normalize_payload({"chart_system_version": 1, "chart_defaults": {"advanced": {"__proto__": {}}}}, strict=True)
```

- [ ] **Step 2: Run the focused tests and verify semantic failures**

Run: `python -m unittest tests.test_chart_config -v`

Expected: FAIL for missing `normalize_payload`, `resolve_chart`, and reset helpers.

- [ ] **Step 3: Implement recursive schema validation without silent coercion in strict persistence mode**

Add `ChartConfigError`, `normalize_payload`, `migrate_legacy`, `validate_group`, and `validate_advanced`. `ChartConfigError` stores ordered `(path, message)` pairs and formats them for the API. `normalize_payload` deep-copies input, performs version migration, validates every owned group, prunes empty dictionaries, and synchronizes legacy projections. Strict mode collects field paths and rejects the operation; non-strict reads drop unknown keys but never execute or preserve them.

- [ ] **Step 4: Implement explicit-presence merge and reset helpers**

Implement `deep_overlay` as a recursive copy that treats key presence as ownership. Add `resolve_chart(config, chart_id)`, `reset_property(config, chart_id, property_path)`, `reset_chart(config, chart_id)`, and `reset_global(config)`. `resolve_chart` returns both the effective nested values and a flat property-path ownership map. Reset helpers deep-copy their input, remove only the requested owned keys, prune empty ancestors, synchronize projections, and return the normalized copy.

Do not remove equal-valued owned keys. Prune only empty dictionaries created by explicit reset.

- [ ] **Step 5: Add stable identity and series-key tests, then implementation**

Test punctuation, Unicode, duplicate display labels, reordered series, malformed versions, and session-only unnamed series. Implement one length-prefixed identity codec shared by registry and runtime payloads:

```python
def encode_identity(family, *segments):
    return "v1|" + "|".join([family] + [f"{len(value)}:{value}" for value in map(str, segments)])

def stable_series_key(kind, source_key):
    if not source_key:
        return None
    return f"{kind}:{quote(str(source_key), safe='')}"
```

- [ ] **Step 6: Run tests and commit**

Run: `python -m unittest tests.test_chart_config -v`

Expected: PASS.

```powershell
git add solvronix_desk/chart_config.py tests/test_chart_config.py
git commit -m "feat(theme-studio): validate chart inheritance and resets"
```

### Task 3: Integrate chart payloads with the existing theme engine

**Files:**

- Modify: `solvronix_desk/theme_engine.py:24-137,336-380,529-585,677-680,756-1092`
- Modify: `tests/test_theme_engine.py`

- [ ] **Step 1: Write failing engine integration tests**

Cover default version and empty sparse objects, one-time legacy migration, complete-profile replacement, legacy CSS projections, and strict-vs-read normalization.

```python
def test_sanitize_config_includes_versioned_chart_payload():
    config = ENGINE.sanitize_config({}, validate_contrast=False)
    self.assertEqual(config["chart_system_version"], 1)
    self.assertEqual(config["chart_defaults"], {})
    self.assertEqual(config["chart_overrides"], {})
```

- [ ] **Step 2: Run the focused engine tests**

Run: `python -m unittest tests.test_theme_engine -v`

Expected: FAIL because chart payloads are absent.

- [ ] **Step 3: Delegate chart normalization from `sanitize_config`**

Import `chart_config`, add the three canonical fields to `DEFAULT_CONFIG`, and call `chart_config.normalize_payload` after existing scalar sanitization. Keep `chart_background` and `chart_palette` as synchronized projections, not a second source of truth.

- [ ] **Step 4: Preserve whole-profile chart ownership**

Update `profiles`, `published_config`, and `resolve_config` so a selected profile's chart payload replaces the base chart payload while ordinary legacy scalar fields retain existing fallback behavior. Add a focused helper rather than special-casing in multiple callers:

```python
def resolve_profile_config(base, selected):
    resolved = sanitize_config(selected, base, validate_contrast=False)
    if selected and "chart_system_version" in selected:
        for key in ("chart_system_version", "chart_defaults", "chart_overrides"):
            resolved[key] = deepcopy(selected[key])
    return resolved
```

- [ ] **Step 5: Emit chart CSS projections and run tests**

Ensure `--st-chart-bg` and `--st-chart-1` through `--st-chart-5` come from normalized chart globals. Keep the existing selectors until the new runtime adapter is installed.

Run: `python -m unittest tests.test_theme_engine -v`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add solvronix_desk/theme_engine.py tests/test_theme_engine.py
git commit -m "feat(theme-studio): integrate chart config with profiles"
```

## Chunk 2: Permissioned discovery and persistence

### Task 4: Build the permission-filtered chart registry API

**Files:**

- Create: `solvronix_desk/chart_registry.py`
- Create: `tests/test_chart_registry.py`
- Modify: `solvronix_desk/theme_api.py:14-63`
- Modify: `tests/test_theme_studio.py`

- [ ] **Step 1: Write failing registry tests with Frappe stubs**

Test:

- System Manager gate runs before discovery.
- `Dashboard Chart`, `Dashboard`, `Number Card`, and `Report` records are filtered through `frappe.has_permission`.
- Dynamic reports return `requires_runtime_preview=True` without invented stable slots.
- Inaccessible stale IDs return only `{id, available: false}`.
- Preview descriptors never include query/script source, credentials, or unrestricted document fields.

- [ ] **Step 2: Run registry tests and verify failure**

Run: `python -m unittest tests.test_chart_registry -v`

Expected: FAIL because the registry module/API does not exist.

- [ ] **Step 3: Implement bounded registry functions**

Define `SAFE_DESCRIPTOR_FIELDS = {"id", "family", "label", "context", "available", "preview_kind", "requires_filters"}`. Implement `list_chart_sources`, one source loader for each supported family, and `opaque_stale_entries`. Each loader uses Frappe permission-aware APIs, re-checks `has_permission` per returned document, encodes identity through `chart_config`, and returns only safe descriptor fields. Never return report code or raw query content.

- [ ] **Step 4: Expose schema and registry in `studio_state`**

Add:

```python
"chart_schema": chart_config.load_schema(),
"chart_registry": chart_registry.list_chart_sources(frappe.session.user),
```

Do not expose this metadata from guest or general runtime endpoints.

- [ ] **Step 5: Run tests and commit**

Run: `python -m unittest tests.test_chart_registry tests.test_theme_studio -v`

Expected: PASS.

```powershell
git add solvronix_desk/chart_registry.py solvronix_desk/theme_api.py tests/test_chart_registry.py tests/test_theme_studio.py
git commit -m "feat(theme-studio): expose permitted chart registry"
```

### Task 5: Make every persistence path use one strict contract

**Files:**

- Modify: `solvronix_desk/theme_api.py:68-85,88-141,145-244,276-302`
- Modify: `tests/test_theme_studio.py`
- Modify: `tests/test_chart_config.py`

- [ ] **Step 1: Add failing endpoint tests**

For Save Draft, Publish, profile create/update/duplicate/import, version restore, schedule, and assignment, assert malformed IDs, unknown schema versions, unsafe advanced keys, and invalid numeric relationships reject the full operation with field paths. Assert unavailable but previously authorized stable sources remain publishable and inert.

- [ ] **Step 2: Run the focused tests**

Run: `python -m unittest tests.test_chart_config tests.test_theme_studio -v`

Expected: FAIL where endpoints still call permissive `sanitize_config`.

- [ ] **Step 3: Add one strict persistence helper**

```python
def validate_persisted_config(config, base=None):
    try:
        return theme_engine.sanitize_config(config, base, strict_charts=True)
    except chart_config.ChartConfigError as error:
        frappe.throw(frappe.as_json({"chart_errors": error.errors}))
```

Route all mutating config endpoints through it. Reads and live previews remain fail-soft but must strip unsafe values.

- [ ] **Step 4: Synchronize legacy projections atomically**

Extend `sync_legacy_fields` to use normalized global chart background and palette projections. Assert global reset persists built-in legacy fields and cannot reseed the old custom colors.

- [ ] **Step 5: Run tests and commit**

Run: `python -m unittest tests.test_chart_config tests.test_theme_studio -v`

Expected: PASS.

```powershell
git add solvronix_desk/theme_api.py tests/test_chart_config.py tests/test_theme_studio.py
git commit -m "feat(theme-studio): validate chart settings on persistence"
```

## Chunk 3: Desk runtime and chart family adapters

### Task 6: Add the runtime coordinator and common adapter contract

**Files:**

- Create: `solvronix_desk/public/js/chart_runtime.js`
- Create: `tests/chart_runtime.test.js`
- Modify: `solvronix_desk/hooks.py:25-55`
- Modify: `tests/test_theme_studio.py`

- [ ] **Step 1: Write a Node test harness and failing coordinator tests**

Load the IIFE with `vm`, fake `window`, `document`, `MutationObserver`, `frappe.router`, and chart elements. Test registration, explicit-presence merge, one apply per config revision, detached cleanup, recoverable adapter failure, reduced motion, and runtime refresh.

```javascript
test("individual values override globals even when equal by value", () => {
  const effective = runtime.resolveEffective(config, chartId);
  assert.equal(effective.values.chart.height, 300);
  assert.equal(effective.ownership["chart.height"], "individual");
});
```

- [ ] **Step 2: Run the runtime tests and confirm failure**

Run: `node --test tests/chart_runtime.test.js`

Expected: FAIL because `chart_runtime.js` is missing.

- [ ] **Step 3: Implement a small public runtime surface**

Expose only:

```javascript
window.solvronixChartRuntime = {
  register,
  unregister,
  refresh,
  setConfig,
  resolveEffective,
  describe
};
```

Internally keep `Map` registrations keyed by stable ID, a monotonically increasing config revision, an applying guard, one MutationObserver, and one route listener. Dispatch `st-chart-runtime-warning` for recoverable failures.

- [ ] **Step 4: Wire boot and realtime configuration**

Read `frappe.boot.st_theme_config` initially and listen for `st-theme-runtime-refresh` so `theme_runtime.js` and chart runtime receive the same resolved payload. Add `chart_runtime.js` after `theme_runtime.js` in `hooks.py`, then bump the changed query versions.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/chart_runtime.test.js`

Run: `python -m unittest tests.test_theme_studio -v`

Expected: PASS.

```powershell
git add solvronix_desk/public/js/chart_runtime.js solvronix_desk/hooks.py tests/chart_runtime.test.js tests/test_theme_studio.py
git commit -m "feat(theme-studio): add chart runtime coordinator"
```

### Task 7: Implement supported family adapters and scoped presentation

**Files:**

- Modify: `solvronix_desk/public/js/chart_runtime.js`
- Modify: `tests/chart_runtime.test.js`
- Modify: `solvronix_desk/public/css/solvronix_desk.css`
- Modify: `solvronix_desk/public/css/dark_mode.css:666-751`
- Modify: `tests/test_theme_studio_preview_wiring.py`

- [ ] **Step 1: Add failing fixtures for every chart family**

Create fake instances/descriptors for Dashboard Chart, Dashboard Graph, Query/Script Report chart, and Number Card sparkline. Assert stable series keys, constructor-option mapping, type compatibility checks, and original-data/callback preservation.

- [ ] **Step 2: Add failing visual mapping tests**

For line, area, bar, pie/donut/percentage, and sparkline output, assert scoped CSS variables/classes affect only the registered chart. Cover axes, grids, legend, labels, tooltip, surface, point size, line width, bar radius/gap, opacity, and animation.

- [ ] **Step 3: Implement adapters behind one interface**

```javascript
const adapters = {
  dashboard_chart: makeFullChartAdapter("dashboard_chart"),
  dashboard_graph: makeFullChartAdapter("dashboard_graph"),
  report_chart: makeFullChartAdapter("report_chart"),
  number_card: makeSparklineAdapter()
};
```

Each adapter implements `identify`, `capabilities`, `readSource`, `validateShape`, `apply`, and `dispose`. Rebuild only when constructor options changed; otherwise update scoped tokens/classes. On data-shape mismatch, keep the original chart and emit a warning.

- [ ] **Step 4: Add stable scoped CSS tokens**

Set variables on the chart root, such as `--st-chart-axis`, `--st-chart-grid`, `--st-chart-label`, `--st-chart-line-width`, and series-specific `--st-chart-series-N`, then target known Frappe Chart SVG classes. Keep dark-mode selectors from overriding explicit chart values. Add a `prefers-reduced-motion: reduce` rule that disables chart transitions.

- [ ] **Step 5: Test re-render lifecycles**

Assert filter refresh, MutationObserver replacement, route change, and theme/profile refresh re-register or reapply once without loops.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/chart_runtime.test.js`

Run: `python -m unittest tests.test_theme_studio_preview_wiring -v`

Expected: PASS.

```powershell
git add solvronix_desk/public/js/chart_runtime.js solvronix_desk/public/css/solvronix_desk.css solvronix_desk/public/css/dark_mode.css tests/chart_runtime.test.js tests/test_theme_studio_preview_wiring.py
git commit -m "feat(theme-studio): style supported ERPNext charts"
```

## Chunk 4: Theme Studio editor and guarded previews

### Task 8: Build global and per-chart schema-driven controls

**Files:**

- Modify: `solvronix_desk/solvronix_desk/page/theme_studio/theme_studio.js:197-478,636-775,1391-1570,1621-1655,2005-2085`
- Modify: `solvronix_desk/public/css/theme_studio.css:150-330`
- Modify: `tests/theme_studio_behavior.test.js`

- [ ] **Step 1: Add failing editor-state tests**

Test schema group rendering, applicability badges, inherited/global/individual status, equal-valued ownership, per-property reset, chart reset, global reset, undo/redo checkpoints, built-in-profile read-only behavior, and invalid control buffers not mutating `studio.config`.

- [ ] **Step 2: Run the focused editor tests**

Run: `node --test tests/theme_studio_behavior.test.js`

Expected: FAIL for missing Chart System UI and helpers.

- [ ] **Step 3: Add focused chart editor state methods**

Keep the main class as the coordinator and add narrow `_chart_schema_definition`, `_chart_effective_state`, `_set_chart_value`, `_reset_chart_property`, `_reset_chart`, and `_reset_global_charts` methods. They traverse dotted paths without `eval`, reject prototype keys, and delegate validation to the schema. Every successful mutation calls `_checkpoint()` before changing canonical config, prunes only explicit-reset empties, calls `changed()`, and re-renders the selected controls without losing focus.

- [ ] **Step 4: Render global controls and individual inspector**

Add the Chart System subsection under Workspace & Dashboard. Render groups from `state.chart_schema`, not a duplicated JS list. The global panel shows applicability text. The individual inspector filters by registered capabilities and shows ownership badges plus reset buttons.

- [ ] **Step 5: Style the editor states**

Add keyboard-visible controls, ownership badges that do not rely on color alone, invalid field messages, compact series tabs, registry status text, and responsive inspector overflow. Reuse existing Theme Studio variables.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/theme_studio_behavior.test.js`

Expected: PASS.

```powershell
git add solvronix_desk/solvronix_desk/page/theme_studio/theme_studio.js solvronix_desk/public/css/theme_studio.css tests/theme_studio_behavior.test.js
git commit -m "feat(theme-studio): add inheritable chart controls"
```

### Task 9: Add registry selection and guarded preview providers

**Files:**

- Modify: `solvronix_desk/solvronix_desk/page/theme_studio/theme_studio.js:899-1335,1391-1570`
- Modify: `solvronix_desk/public/css/theme_studio.css`
- Modify: `tests/theme_studio_behavior.test.js`
- Modify: `tests/test_theme_studio.py`

- [ ] **Step 1: Add failing registry and shield tests**

Cover searchable permitted entries, opaque stale entries, unsupported entries, persistent source preview, required report filters, dynamic report runtime registration, Number Card preview, iframe route allowlisting, chart hit-test precedence over generic cards, and no underlying action activation.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/theme_studio_behavior.test.js`

Run: `python -m unittest tests.test_theme_studio -v`

Expected: FAIL for missing registry markup and chart classification.

- [ ] **Step 3: Render and bind the chart registry**

Add search/family/status filters and a selection handler that requests the descriptor's preview provider. Do not put source names into the DOM for opaque unavailable entries. Surface permission/filter failures without clearing unrelated draft changes.

- [ ] **Step 4: Extend guarded iframe routes and selection**

Allow only server-returned, same-origin preview routes. Install existing read-only guards before marking the preview ready. Give chart containers highest classifier precedence, resolve them through `solvronixChartRuntime.describe`, and store stable chart ID plus runtime element in transient selection state.

- [ ] **Step 5: Preserve selection lifecycle**

Re-anchor after chart refresh, scroll, resize, and device-width changes. Clear on detach, unsupported navigation, permission failure, scene exit, iframe reload, or inspector close. Never persist DOM references.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/theme_studio_behavior.test.js`

Run: `python -m unittest tests.test_theme_studio -v`

Expected: PASS.

```powershell
git add solvronix_desk/solvronix_desk/page/theme_studio/theme_studio.js solvronix_desk/public/css/theme_studio.css tests/theme_studio_behavior.test.js tests/test_theme_studio.py
git commit -m "feat(theme-studio): add guarded chart selection"
```

### Task 10: Complete draft, publish, profile, and runtime refresh integration

**Files:**

- Modify: `solvronix_desk/solvronix_desk/page/theme_studio/theme_studio.js:1690-1845,2005-2085,2307-2410`
- Modify: `solvronix_desk/public/js/theme_runtime.js:160-191,214-243`
- Modify: `tests/theme_studio_behavior.test.js`
- Modify: `tests/chart_runtime.test.js`
- Modify: `tests/test_theme_studio.py`

- [ ] **Step 1: Write failing end-to-end state tests**

Assert draft preview sends chart config, profile load replaces complete chart payload, built-in edit requires duplication, publish rejects active invalid buffers, successful realtime refresh updates the chart runtime, and global/individual reset survives save/reload.

- [ ] **Step 2: Run focused tests**

Run: `node --test tests/theme_studio_behavior.test.js tests/chart_runtime.test.js`

Expected: FAIL for incomplete integration.

- [ ] **Step 3: Connect preview and publish flows**

On `apply`, send the normalized chart config to the iframe runtime and selected chart preview. On Save Draft/Profile Update/Publish, block if any chart control buffer is invalid, then rely on server strict validation. On success, replace local state with the normalized response so legacy projections and pruned resets remain canonical.

- [ ] **Step 4: Connect resolved runtime refresh atomically**

After `theme_runtime.js` replaces its config, call `solvronixChartRuntime.setConfig(config)` before dispatching or finishing layout work. Ensure preview events are scoped and published events reapply the resolved assigned profile.

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test tests/theme_studio_behavior.test.js tests/chart_runtime.test.js`

Run: `python -m unittest tests.test_theme_studio tests.test_theme_engine -v`

Expected: PASS.

```powershell
git add solvronix_desk/solvronix_desk/page/theme_studio/theme_studio.js solvronix_desk/public/js/theme_runtime.js tests/theme_studio_behavior.test.js tests/chart_runtime.test.js tests/test_theme_studio.py tests/test_theme_engine.py
git commit -m "feat(theme-studio): publish chart customizations"
```

## Chunk 5: Documentation and verification

### Task 11: Update docs after verified UI capture

**Files:**

- Modify: `docs/theme-studio.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Add: `docs/screenshots/theme-studio/controls/06-chart-system-*.png` only if captured from the working UI

- [ ] **Step 1: Update user-facing documentation**

Document global defaults, chart registry, per-chart inspector, ownership labels, Reset property, Reset chart, Reset global, supported families, Advanced allowlist, and unsupported-source behavior.

- [ ] **Step 2: Update capability map and changelog**

Mention visual + structure + behavior editing, full supported-family scope, and layered reset semantics. Do not claim arbitrary properties or data editing.

- [ ] **Step 3: Capture and inspect screenshots only from a running ERPNext site**

Capture global controls, a line-series override, a bar-series override, and the registry. Inspect each image before linking it. If a live site is unavailable, omit screenshots and record the limitation in the handoff.

- [ ] **Step 4: Run documentation/static tests and commit**

Run: `python -m unittest tests.test_theme_studio tests.test_theme_studio_preview_wiring -v`

Expected: PASS.

```powershell
git add docs/theme-studio.md README.md CHANGELOG.md docs/screenshots/theme-studio
git commit -m "docs(theme-studio): document chart customization"
```

### Task 12: Full verification and completion audit

**Files:**

- Verify all changed files; no new implementation is expected unless a test exposes a defect.

- [ ] **Step 1: Run all Python tests**

Run: `python -m unittest discover -s tests -p "test_*.py" -v`

Expected: all tests PASS.

- [ ] **Step 2: Run all JavaScript tests**

Run: `node --test tests/*.test.js`

Expected: all tests PASS.

- [ ] **Step 3: Run syntax and whitespace checks**

Run: `python -m compileall -q solvronix_desk tests`

Run: `git diff --check`

Expected: both exit 0 with no errors.

- [ ] **Step 4: Perform live ERPNext verification when a site is available**

Verify Workspace/Dashboard Chart, Dashboard Graph, Query/Script Report chart, and Number Card sparkline in light and dark modes. For each: edit globally, override individually, reset chart to global, reset global to built-in, refresh/filter/navigate, publish, reload, and switch profiles. Confirm business data and chart actions were never modified.

- [ ] **Step 5: Review scope and status**

Run: `git status --short`

Run: `git log --oneline --decorate -15`

Expected: only intentional work remains and each task has a focused commit.

- [ ] **Step 6: Commit any verification-only fixes separately**

If verification exposed changes, rerun the focused failing test and the full suites before committing:

Stage only the exact files named by `git diff --name-only`, then commit them with `git commit -m "fix(theme-studio): address chart editor verification"`.
