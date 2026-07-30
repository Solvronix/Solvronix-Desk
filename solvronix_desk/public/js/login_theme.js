/* =============================================================================
   Solvronix Desk — Public Login Runtime
   Applies server branding before authentication and keeps Frappe's secondary
   login states aligned with the custom full-screen layout.
   ============================================================================= */
(function () {
  /* Exit on non-authentication website pages where these selectors do not exist. */
  if (!document.querySelector('.for-login, .for-forgot, .for-signup, .for-email-login')) return;

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
      if (branding.company_name) document.title = branding.company_name;
      if (branding.favicon) {
        document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]').forEach(function (link) {
          link.href = branding.favicon;
        });
      }
      var head = document.querySelector('.for-login .page-card-head, .for-login .page-card .page-card-head');
      if (head) {
        if (branding.logo && !head.querySelector('.st-login-company-logo')) {
          var image = document.createElement('img');
          image.className = 'st-login-company-logo';
          image.src = branding.logo;
          image.alt = branding.company_name || '';
          head.insertBefore(image, head.firstChild);
        }
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
        document.querySelectorAll('.powered-by, .page-card .powered-by').forEach(function (element) {
          element.remove();
        });
      }
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
