# Workspace Theme Styling Inspector Design

## Goal

Make the live Workspace scene in Theme Studio visually editable without making the embedded ERPNext workspace operationally interactive. Clicking a visible workspace surface opens the existing contextual Theme Studio inspector with styling controls only. Workspace content, navigation, forms, links, and actions remain read-only.

## Scope

The feature covers these workspace styling groups:

- Page/background surfaces: page background and text colors.
- Cards and widgets: workspace/card background, text and muted text, border color, card radius, and shadow style.
- Text: text, muted text, and link colors.
- Buttons and shortcuts: primary and secondary button colors, secondary button text, button radius, and shadow style.

The feature does not edit workspace labels, links, shortcuts, chart data, widget configuration, document content, routes, or permissions. It does not add a general DOM/CSS editor.

## Interaction Design

The transparent workspace shield remains above the iframe. A click on the shield is treated only as a Theme Studio selection gesture:

1. Convert the click coordinates from the parent preview to iframe viewport coordinates.
2. Use the iframe document's hit-testing API to identify the visual element under the pointer without dispatching an event to it.
3. Classify the element as a button, card, text, or page/background surface using the deterministic selector and traversal rules below. An unmatched element falls back to the page/background group.
4. Add a temporary inspector highlight to the selected iframe element.
5. Open the existing floating contextual inspector with the group's canonical Theme Studio settings.
6. Position the inspector beside the selected element by translating its iframe-relative rectangle into parent-window coordinates.

The selected highlight is cleared when another target is selected, another preview scene is opened, the workspace iframe reloads, or the inspector closes. Wheel input on the shield continues to scroll the embedded workspace through the existing forwarding path. After forwarded scrolling, stage scrolling, window resizing, device-width transitions, or a theme change that may reflow the workspace, the inspector is repositioned from the selected element's current rectangle. If the node is detached or its rectangle is fully outside the visible iframe viewport, the inspector and highlight close. Partially clipped targets anchor to the visible intersection and the inspector remains clamped to the parent viewport.

## Styling Groups and Canonical Settings

The workspace groups extend the existing inspector catalog and reuse existing schema definitions and controls. `workspace_card_color` is the workspace-specific widget/card surface and is the only card background exposed by the Workspace card inspector. `card_background` remains available in the full Cards settings for shared non-workspace surfaces, avoiding two controls that compete for the same visible workspace surface:

| Inspector group | Canonical settings |
| --- | --- |
| Workspace background | `page_background`, `text_color`, `muted_text_color` |
| Workspace card | `workspace_card_color`, `text_color`, `muted_text_color`, `border_color`, `card_radius`, `shadow_style` |
| Workspace text | `text_color`, `muted_text_color`, `link_color` |
| Workspace button | `primary_button_color`, `secondary_button_color`, `secondary_button_text`, `button_radius`, `shadow_style` |

Changes continue through the existing canonical configuration, checkpoint/history, input synchronization, preview application, and server-generated CSS paths. The feature introduces no parallel settings store.

## Component Boundaries

### Workspace target classifier

Input: an iframe DOM element. Output: one workspace inspector ID and the exact ancestor element to highlight. It owns only selector precedence and fallback behavior. It does not render controls or mutate theme state.

Classification uses the following stable contract:

1. If the hit element is inside an interactive visual matching `button`, `.btn`, `[role="button"]`, `.shortcut-widget-box`, `.widget-control`, or `.dropdown-toggle`, classify it as Workspace button and highlight the nearest matching ancestor. This rule prevents text inside a button from being misclassified.
2. Otherwise, if the hit element or its nearest semantic text ancestor matches `a`, `h1` through `h6`, `p`, `label`, `small`, `.widget-title`, `.widget-subtitle`, `.link-content`, or `.text-muted`, classify it as Workspace text and highlight that nearest text element. This makes text inside cards directly selectable.
3. Otherwise, if the hit element is inside a surface matching `.widget`, `.widget-group`, `.number-card`, `.dashboard-widget-box`, `.card`, `.onboarding-widget-box`, `.links-widget-box`, `.quick-list-widget-box`, or `.custom-block`, classify it as Workspace card and highlight the nearest matching ancestor. Users select the card by clicking its non-text surface or padding.
4. Otherwise, highlight the nearest `.workspace-container`, `.layout-main-section`, `.page-container`, `.page-body`, or `body` ancestor and classify it as Workspace background. If none exists, use the iframe body or document element as the safe fallback.

Within each rule, normal DOM `closest` behavior selects the nearest matching ancestor. The ordered rules are the only cross-group tie breaker.

### Workspace selection controller

Input: a shield click event. It resolves the iframe document safely, performs coordinate conversion and hit testing, calls the classifier, stores the selected workspace target, and opens the inspector. Any cross-origin, missing-document, missing-hit-test, or detached-node failure returns without enabling iframe interaction.

### Inspector integration

The existing inspector renderer remains the only edit box. Workspace entries are added to its catalog. Inspector positioning accepts a translated rectangle/anchor so it can position against an iframe element. A workspace re-anchor helper translates the current iframe-relative rectangle, intersects it with the visible iframe rectangle, and either repositions or clears the selection according to the lifecycle rules. Existing non-workspace preview inspector behavior remains unchanged.

### Safety guards

The iframe keeps `pointer-events: none`, the shield stays above it, the iframe body remains `inert`, and capture-phase guards continue blocking click, submit, and keyboard activation. Selection uses read-only DOM inspection only; it never calls `click()`, dispatches an event, focuses a control, changes a route, or removes guards.

## State and Lifecycle

The studio stores a transient workspace selection containing the inspector ID and selected iframe element. This state is not saved as theme configuration.

- Workspace iframe load clears stale selection before installing guards and applying preview state.
- Closing the inspector clears both regular-preview and workspace highlights.
- Leaving the Workspace scene clears workspace selection and restores the existing default inspector behavior for the destination scene.
- Reapplying theme settings preserves and repositions the current selection when the iframe node is still connected and visible; otherwise it clears safely.
- Preview pause, rejected navigation, and unavailable/error states clear workspace selection.
- Forwarded wheel scrolling schedules one re-anchor after scrolling; stage scrolling, window resizing, and device-width transitions use the same helper.

## Error Handling

All iframe DOM access stays within guarded `try/catch` boundaries because sandbox, CSP, navigation, or teardown can make the document inaccessible. Failures are silent and safe: no inspector opens, no workspace action runs, and the existing preview error handling remains authoritative. Unsupported or changed workspace markup falls back to the page/background styling group rather than exposing arbitrary controls.

## Accessibility

Click-to-select is a pointer enhancement for the visual preview, matching the requested interaction. The shield remains `aria-hidden` and non-focusable, and the iframe remains hidden from assistive technology; it does not pretend to offer meaningful keyboard traversal of read-only workspace content. Every exposed setting remains available through Theme Studio's full, labelled, keyboard-operable settings sections. After a pointer selection, the contextual inspector retains its existing live region, labelled form controls, and keyboard-operable close button. Selected targets receive a visual outline that does not change layout.

## Testing Strategy

Implementation follows test-first development.

Behavior tests will verify:

- The inspector catalog exposes only the approved workspace styling keys.
- Selector precedence classifies buttons, cards/widgets, text/links, and fallback background correctly.
- Text inside a button selects the button, text inside a card selects text, and card padding selects the card.
- Parent-to-iframe coordinate conversion and parent-window rectangle translation are correct.
- A shield click opens the appropriate inspector without invoking the underlying element.
- Missing or inaccessible iframe documents fail closed.
- Workspace reload, close, scene change, rejected navigation, pause, detached targets, and fully clipped targets clear transient selection/highlight.
- Forwarded wheel scroll, stage scroll, window resize, device transition, and theme reflow re-anchor visible targets; partially clipped targets use their visible intersection.
- Existing read-only guards, inert body, route allowlist, wheel forwarding, CSS injection, and non-workspace contextual inspectors remain intact.

Static UI tests will verify that the shield is selectable, the workspace inspector can be displayed, and selected iframe targets have injected outline styling. The full JavaScript and Python test suites will be run after the focused tests pass.

## Acceptance Criteria

- Clicking a workspace background, card/widget, text/link, or button opens the relevant Theme Studio styling controls.
- Edits update the live workspace preview through the existing theme configuration and CSS preview pipeline.
- Workspace content and actions cannot be activated by mouse, keyboard, or form submission from the preview.
- Scrolling, workspace selection, loading/error states, and all other preview scenes continue to work.
- No content-editing or action controls appear in the workspace inspector.
