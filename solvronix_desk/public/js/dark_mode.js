/* ================================================================
   Solvronix Desk — Dark Mode
   Flash-free IIFE at top, then post-boot toggle button injection.
   Stores in localStorage (instant) + Frappe desk_theme (cross-device).
   ================================================================ */

/* ── 1. Flash-free init — runs SYNCHRONOUSLY before DOM loads ── */
(function () {
  try {
    if (localStorage.getItem("st_dark_mode") === "1") {
      var html = document.documentElement;
      html.setAttribute("data-theme", "dark");
      /* Set background immediately — CSS hasn't loaded yet, so without this
         the page flashes white before dark_mode.css applies. */
      html.style.backgroundColor = "#0F1117";
    }
  } catch (e) { /* storage blocked */ }
}());

/* ── 2. Dark mode helpers ──────────────────────────────────────── */
function stIsDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function stSetDark(on) {
  if (on) {
    document.documentElement.setAttribute("data-theme", "dark");
    try { localStorage.setItem("st_dark_mode", "1"); } catch (e) {}
  } else {
    document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("st_dark_mode", "0"); } catch (e) {}
  }
  stUpdateToggleIcon(on);

  /* Persist to Frappe user preferences (non-blocking).
     Uses our own API (frappe.db.set_value) NOT frappe.client.set_value.
     frappe.client.set_value calls doc.save() which triggers on_update hooks
     and publishes a realtime doc_update event — that event comes back to this
     browser and causes the "document modified after you opened it" dialog. */
  if (frappe && frappe.session && frappe.session.user !== "Guest") {
    frappe.call({
      method: "solvronix_desk.api.set_user_theme",
      args: { theme: on ? "Dark" : "Light" },
      callback: function () {}
    });
  }
}

function stToggleDark() {
  stSetDark(!stIsDark());
}

/* ── 3. Update toggle button icon ─────────────────────────────── */
function stUpdateToggleIcon(dark) {
  var btn = document.getElementById("st-dark-toggle");
  if (!btn) return;
  btn.innerHTML = dark
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.929zm13.021 13.021 1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zM1 11h3v2H1v-2zm19 0h3v2h-3v-2zM4.929 20.485 3.515 19.07l2.121-2.121 1.414 1.414-2.121 2.121zm13.021-13.021L19.364 5.05l1.414 1.414-2.121 2.121-1.414-1.414z"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>';
  btn.title = dark ? "Switch to Light Mode" : "Switch to Dark Mode";
}

/* ── 4. Inject toggle button into the toolbar ─────────────────── */
function stInjectDarkToggle() {
  var existing = document.getElementById("st-dark-toggle");
  if (existing) {
    /* Button already created by solvronix_desk.js in the correct position —
       just update its icon and wire it if needed. */
    stUpdateToggleIcon(stIsDark());
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
  stUpdateToggleIcon(stIsDark());
}

/* ── 5. Sync with server preference on boot ───────────────────── */
function stSyncDarkFromBoot() {
  try {
    var localPref = localStorage.getItem("st_dark_mode");
    /* If user has never set a local preference, follow server */
    if (localPref === null) {
      var serverTheme = frappe.boot &&
                        frappe.boot.user &&
                        frappe.boot.user.desk_theme;
      if (serverTheme === "Dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("st_dark_mode", "1");
      } else if (serverTheme === "Light" || serverTheme === "Automatic") {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("st_dark_mode", "0");
      }
    }
  } catch (e) {}
}

/* ── 6. Boot entry point ──────────────────────────────────────── */
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
