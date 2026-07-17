/* ================================================================
   Solvronix Desk — Personalization (v1.2.0)
   Density (comfortable/compact) + per-user font scale.
   Site defaults come from Theme Settings via boot; per-user
   overrides live in localStorage and win over the site default.
   Follows the flash-free pattern of dark_mode.js: a synchronous
   IIFE applies stored preferences before the desk renders.
   ================================================================ */

/* ── 1. Flash-free init — runs SYNCHRONOUSLY before DOM loads ── */
(function () {
  var html = document.documentElement;
  try {
    /* Density: user override → boot default → whatever desk.html rendered */
    var density = localStorage.getItem("st_density");
    if (!density && window.frappe && frappe.boot && frappe.boot.st_density_default) {
      density = frappe.boot.st_density_default;
    }
    if (density === "compact" || density === "comfortable") {
      html.setAttribute("data-density", density);
    }

    /* Font scale: user override (number, percent) beats the site default,
       which is already applied by the #st-inline-theme :root rule. */
    var scale = parseFloat(localStorage.getItem("st_font_scale"));
    if (scale && scale >= 75 && scale <= 140) {
      html.style.fontSize = scale + "%";
    }
  } catch (e) { /* storage blocked */ }
}());

/* ── 2. Density helpers ────────────────────────────────────────── */
function stGetDensity() {
  return document.documentElement.getAttribute("data-density") === "compact"
    ? "compact" : "comfortable";
}

function stSetDensity(mode) {
  mode = mode === "compact" ? "compact" : "comfortable";
  document.documentElement.setAttribute("data-density", mode);
  try { localStorage.setItem("st_density", mode); } catch (e) {}
  document.dispatchEvent(new CustomEvent("st:density-changed", { detail: mode }));
}

function stToggleDensity() {
  stSetDensity(stGetDensity() === "compact" ? "comfortable" : "compact");
}

/* ── 3. Font-scale helpers ─────────────────────────────────────── */
var ST_FONT_STEPS = [85, 92.5, 100, 107.5, 115, 125];

function stGetFontScale() {
  try {
    var v = parseFloat(localStorage.getItem("st_font_scale"));
    if (v && v >= 75 && v <= 140) return v;
  } catch (e) {}
  return null; /* null = follow site default */
}

function stSetFontScale(pct) {
  var html = document.documentElement;
  if (pct === null) {
    /* Reset: drop the inline override, site default (:root rule) takes over */
    html.style.fontSize = "";
    try { localStorage.removeItem("st_font_scale"); } catch (e) {}
  } else {
    pct = Math.min(140, Math.max(75, pct));
    html.style.fontSize = pct + "%";
    try { localStorage.setItem("st_font_scale", String(pct)); } catch (e) {}
  }
  document.dispatchEvent(new CustomEvent("st:font-changed", { detail: pct }));
}

function stAdjustFont(direction) {
  /* direction: +1 (larger) | -1 (smaller) | 0 (reset to site default) */
  if (direction === 0) { stSetFontScale(null); return; }
  var current = stGetFontScale();
  if (current === null) {
    /* Start from the effective site default */
    var rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    current = Math.round((rootSize / 16) * 1000) / 10; /* px → % */
  }
  /* Snap to nearest step, then move */
  var idx = 0, best = Infinity;
  ST_FONT_STEPS.forEach(function (s, i) {
    var d = Math.abs(s - current);
    if (d < best) { best = d; idx = i; }
  });
  idx = Math.min(ST_FONT_STEPS.length - 1, Math.max(0, idx + direction));
  stSetFontScale(ST_FONT_STEPS[idx]);
}
