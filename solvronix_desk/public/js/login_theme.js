/* =============================================================================
   Solvronix Desk — Public Login Runtime
   Applies server branding before authentication and keeps Frappe's secondary
   login states aligned with the custom full-screen layout.
   ============================================================================= */
(function () {
  /* Exit on non-authentication website pages where these selectors do not exist. */
  if (!document.querySelector('.for-login, .for-forgot, .for-signup, .for-email-login')) return;

  /* Public pages do not run Desk's dark-mode runtime. Resolve the published
     Light/Dark/Auto preference here so /login matches Theme Studio. */
  function applyPreferredMode(mode) {
    mode = String(mode || 'Light').toLowerCase();
    var media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    var dark = mode === 'dark' || (mode === 'auto' && media && media.matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (mode === 'auto' && media && media.addEventListener && !media.__stLoginBound) {
      media.__stLoginBound = true;
      media.addEventListener('change', function (event) {
        document.documentElement.setAttribute('data-theme', event.matches ? 'dark' : 'light');
      });
    }
  }

  /* Frappe v16 nests .page-card-head inside .login-content.page-card. Size
     only the outer card; the nested head must stay within its content box. */
  function normalizeCardGeometry() {
    var width = Math.min(420, Math.floor(window.innerWidth * 0.92)) + 'px';
    document.querySelectorAll(
	  '.for-login .login-content.page-card, .for-forgot .login-content.page-card, ' +
	  '.for-signup .login-content.page-card'
    ).forEach(function (element) {
      element.style.setProperty('box-sizing', 'border-box', 'important');
      element.style.setProperty('width', width, 'important');
      element.style.setProperty('max-width', width, 'important');
      element.style.setProperty('margin-left', 'auto', 'important');
      element.style.setProperty('margin-right', 'auto', 'important');
    });
    document.querySelectorAll(
	  '.for-login .page-card-head, .for-forgot .page-card-head, .for-signup .page-card-head'
    ).forEach(function (head) {
	  head.style.setProperty('box-sizing', 'border-box', 'important');
	  head.style.setProperty('width', '100%', 'important');
	  head.style.setProperty('max-width', '100%', 'important');
	  head.style.setProperty('margin', '0', 'important');
	  head.style.setProperty('padding-left', '0', 'important');
	  head.style.setProperty('padding-right', '0', 'important');
	});
  }

  /* Replace Frappe's generic cube with the configured company identity. A
     clean initials mark is used only when the saved File URL cannot load. */
  function installCompanyLogo(head, branding) {
    head.querySelectorAll('.app-logo, .st-login-company-logo, .st-login-company-fallback')
      .forEach(function (element) { element.remove(); });
    var initials = String(branding.company_name || 'Company').trim().split(/\s+/)
      .slice(0, 2).map(function (word) { return word.charAt(0); }).join('').toUpperCase();
    function fallback() {
      var mark = document.createElement('div');
      mark.className = 'st-login-company-fallback';
      mark.textContent = initials || 'C';
      head.insertBefore(mark, head.firstChild);
    }
    if (!branding.logo) {
      fallback();
      return;
    }
    var image = document.createElement('img');
    image.className = 'st-login-company-logo';
    image.src = branding.logo;
    image.alt = branding.company_name || '';
    image.addEventListener('error', function () {
      image.remove();
      fallback();
    }, { once: true });
    head.insertBefore(image, head.firstChild);
  }

  normalizeCardGeometry();
  window.addEventListener('resize', normalizeCardGeometry);

  /* ── 1. LIVE THEME TOKENS ─────────────────────────────────────────────────
     Replace static fallbacks with the resolved site-wide login CSS. */
  fetch('/api/method/solvronix_desk.api.get_theme_css')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.message) return;
      var s = document.createElement('style');
      s.id = 'st-login-vars';
      s.textContent = data.message;
      document.head.appendChild(s);
    })
    .catch(function () {});

  /* ── 2. BRAND CONTENT / DOCUMENT METADATA ─────────────────────────────────
     Branding is public display data required before a user has a Desk session. */
  fetch('/api/method/solvronix_desk.api.get_branding')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var branding = data && data.message;
      if (!branding) return;
      applyPreferredMode(branding.preferred_mode);
      if (branding.company_name) document.title = branding.company_name;
      if (branding.favicon) {
        document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]').forEach(function (link) {
          link.href = branding.favicon;
        });
      }
      var head = document.querySelector('.for-login .page-card-head, .for-login .page-card .page-card-head');
      if (head) {
        installCompanyLogo(head, branding);
        var title = head.querySelector('h4, h3, h2');
        if (title && branding.login_heading) title.textContent = branding.login_heading;
        var description = head.querySelector('p, .text-muted');
        if (description && branding.login_description) description.textContent = branding.login_description;
      }
      if (branding.footer_text) {
        var footer = document.createElement('div');
        footer.className = 'st-login-custom-footer';
        footer.textContent = branding.footer_text;
        document.body.appendChild(footer);
      }
      if (branding.hide_powered) {
		document.documentElement.classList.add('st-hide-powered');
        document.querySelectorAll('.powered-by, .page-card .powered-by').forEach(function (element) {
          element.remove();
        });
	  } else {
		document.documentElement.classList.remove('st-hide-powered');
      }
	  normalizeCardGeometry();
    })
    .catch(function () {});

  /* ── 3. SECONDARY AUTH SCREEN LAYOUT REPAIR ────────────────────────────────
     Frappe shows forgot/signup sections with inline display:block. Observe that
     transition and upgrade only visible sections to the centred flex layout. */
  var secondarySections = document.querySelectorAll(
    '.for-forgot, .for-signup, .for-email-login, .for-login-with-email-link'
  );

  if (secondarySections.length && window.MutationObserver) {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type === 'attributes' && m.attributeName === 'style') {
          var el = m.target;
          if (el.style.display === 'block') {
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.minHeight = '100vh';
            el.style.padding = '40px 20px';
            el.style.background = 'transparent';
          }
        }
      });
    });

    secondarySections.forEach(function (s) {
      observer.observe(s, { attributes: true, attributeFilter: ['style'] });
    });
  }
}());
