/* ================================================================
   Solvronix Desk — Dark Mode (v1.2.0: light | dark | auto)
   Flash-free IIFE at top, then post-boot toggle button injection.
   "auto" follows the OS via prefers-color-scheme and switches live.
   Stores mode in localStorage (instant) + User.desk_theme (cross-device).
   Legacy key st_dark_mode ("1"/"0") is still read as a fallback.
   ================================================================ */

/* ── 1. Flash-free init — runs SYNCHRONOUSLY before DOM loads ── */
(function () {
  try {
    var mode = localStorage.getItem("st_theme_mode");
    if (!mode) {
      /* Legacy fallback from pre-1.2.0 installs */
      var legacy = localStorage.getItem("st_dark_mode");
      if (legacy === "1") mode = "dark";
      else if (legacy === "0") mode = "light";
    }
    if (!mode && window.frappe && frappe.boot && frappe.boot.st_theme_mode_default) {
      mode = frappe.boot.st_theme_mode_default;
    }
    var dark = mode === "dark" ||
      (mode === "auto" && window.matchMedia &&
       window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) {
      var html = document.documentElement;
      html.setAttribute("data-theme", "dark");
      /* Set background immediately — CSS hasn't loaded yet, so without this
         the page flashes white before dark_mode.css applies. */
      html.style.backgroundColor = "#0F1117";
    }
  } catch (e) { /* storage blocked */ }
}());

/* ── 2. Mode helpers ───────────────────────────────────────────── */
function stIsDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function stGetThemeMode() {
  try {
    var m = localStorage.getItem("st_theme_mode");
    if (m === "light" || m === "dark" || m === "auto") return m;
    var legacy = localStorage.getItem("st_dark_mode");
    if (legacy === "1") return "dark";
    if (legacy === "0") return "light";
  } catch (e) {}
  return (window.frappe && frappe.boot && frappe.boot.st_theme_mode_default) || "light";
}

function stResolveDark(mode) {
  if (mode === "dark") return true;
  if (mode === "auto") {
    return !!(window.matchMedia &&
              window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  return false;
}

function stApplyDark(dark) {
  var html = document.documentElement;
  if (dark) {
    html.setAttribute("data-theme", "dark");
    html.style.backgroundColor = "#0F1117";
  } else {
    html.removeAttribute("data-theme");
    html.style.backgroundColor = "";
  }
}

function stSetThemeMode(mode) {
  if (mode !== "light" && mode !== "dark" && mode !== "auto") mode = "light";
  try {
    localStorage.setItem("st_theme_mode", mode);
    /* Keep the legacy key coherent for any old cached scripts */
    localStorage.setItem("st_dark_mode", stResolveDark(mode) ? "1" : "0");
  } catch (e) {}
  stApplyDark(stResolveDark(mode));
  stUpdateToggleIcon();

  /* Persist to Frappe user preferences (non-blocking).
     Uses our own API (frappe.db.set_value) NOT frappe.client.set_value —
     doc.save() would publish a realtime doc_update event back to this
     browser and cause the "document modified after you opened it" dialog. */
  if (window.frappe && frappe.session && frappe.session.user !== "Guest") {
    var deskTheme = mode === "auto" ? "Automatic" : (mode === "dark" ? "Dark" : "Light");
    frappe.call({
      method: "solvronix_desk.api.set_user_theme",
      args: { theme: deskTheme },
      callback: function () {}
    });
  }
}

/* Kept for backward compatibility (user-dropdown "Toggle Theme" action) */
function stSetDark(on) {
  stSetThemeMode(on ? "dark" : "light");
}

/* Toolbar button: cycle light → dark → auto → light */
function stToggleDark() {
  var order = ["light", "dark", "auto"];
  var next = order[(order.indexOf(stGetThemeMode()) + 1) % order.length];
  stSetThemeMode(next);
  var labels = { light: "Light", dark: "Dark", auto: "Auto (follows your OS)" };
  if (window.frappe && frappe.show_alert) {
    frappe.show_alert({ message: frappe._("Theme: ") + labels[next], indicator: "blue" }, 2);
  }
}

/* ── 3. Follow OS changes while in auto mode ───────────────────── */
if (window.matchMedia) {
  var stMq = window.matchMedia("(prefers-color-scheme: dark)");
  var stOnOsChange = function () {
    if (stGetThemeMode() === "auto") {
      stApplyDark(stMq.matches);
      stUpdateToggleIcon();
    }
  };
  if (stMq.addEventListener) stMq.addEventListener("change", stOnOsChange);
  else if (stMq.addListener) stMq.addListener(stOnOsChange);
}

/* ── 4. Update toggle button icon ─────────────────────────────── */
var ST_THEME_ICONS = {
  /* sun */
  light: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.929zm13.021 13.021 1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zM1 11h3v2H1v-2zm19 0h3v2h-3v-2zM4.929 20.485 3.515 19.07l2.121-2.121 1.414 1.414-2.121 2.121zm13.021-13.021L19.364 5.05l1.414 1.414-2.121 2.121-1.414-1.414z"/></svg>',
  /* moon */
  dark: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>',
  /* half-filled circle = auto */
  auto: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2v16a8 8 0 0 1 0-16z"/></svg>'
};

function stUpdateToggleIcon() {
  var btn = document.getElementById("st-dark-toggle");
  if (!btn) return;
  var mode = stGetThemeMode();
  btn.innerHTML = ST_THEME_ICONS[mode] || ST_THEME_ICONS.light;
  var titles = {
    light: "Theme: Light — click for Dark",
    dark:  "Theme: Dark — click for Auto",
    auto:  "Theme: Auto (follows OS) — click for Light"
  };
  btn.title = titles[mode] || "Toggle theme";
}

/* ── 5. Inject toggle button into the toolbar ─────────────────── */
function stInjectDarkToggle() {
  var existing = document.getElementById("st-dark-toggle");
  if (existing) {
    /* Button already created by solvronix_desk.js in the correct position —
       just update its icon and wire it if needed. */
    stUpdateToggleIcon();
    return;
  }

  /* Fallback: toolbar exists but button wasn't pre-created — inject it */
  var tbRight = document.querySelector("#st-top-toolbar .st-tb-right");
  if (!tbRight) return;

  var btn = document.createElement("button");
  btn.id = "st-dark-toggle";
  btn.className = "st-tb-btn st-tb-qn-btn";
  btn.addEventListener("click", function () { stToggleDark(); });

  /* Insert after the first separator (after search bar) */
  var firstSep = tbRight.querySelector(".st-tb-sep");
  if (firstSep && firstSep.nextSibling) {
    tbRight.insertBefore(btn, firstSep.nextSibling);
  } else {
    tbRight.insertBefore(btn, tbRight.firstChild);
  }
  stUpdateToggleIcon();
}

/* ── 6. Sync with server preference on boot ───────────────────── */
function stSyncDarkFromBoot() {
  try {
    /* If user has never set a local preference, follow server desk_theme */
    if (localStorage.getItem("st_theme_mode") === null &&
        localStorage.getItem("st_dark_mode") === null) {
      var serverTheme = frappe.boot &&
                        frappe.boot.user &&
                        frappe.boot.user.desk_theme;
      var mode = null;
      if (serverTheme === "Dark") mode = "dark";
      else if (serverTheme === "Light") mode = "light";
      else if (serverTheme === "Automatic") mode = "auto";
      if (mode) {
        localStorage.setItem("st_theme_mode", mode);
        localStorage.setItem("st_dark_mode", stResolveDark(mode) ? "1" : "0");
        stApplyDark(stResolveDark(mode));
      }
    }
  } catch (e) {}
}

/* ── 7. Boot entry point ──────────────────────────────────────── */
$(document).ready(function () {
  stSyncDarkFromBoot();

  /* Wait for our toolbar to be injected by solvronix_desk.js,
     then add the toggle button */
  var attempts = 0;
  var poll = setInterval(function () {
    attempts++;
    var tbRight = document.querySelector("#st-top-toolbar .st-tb-right");
    if (tbRight) {
      stInjectDarkToggle();
      clearInterval(poll);
    } else if (attempts > 30) {
      clearInterval(poll);
    }
  }, 200);

  /* Re-inject on SPA navigation in case it gets lost */
  $(document).on("page-change", function () {
    if (!document.getElementById("st-dark-toggle") &&
        document.getElementById("st-top-toolbar")) {
      stInjectDarkToggle();
    }
  });
});
