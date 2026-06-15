(function () {
  if (!document.querySelector('.for-login, .for-forgot, .for-signup, .for-email-login')) return;

  // Fetch live brand CSS from API and inject as first <style> so our CSS vars
  // have the real Theme Settings values instead of the fallback hex codes.
  fetch('/api/method/solvronix_theme.api.get_theme_css')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.message) return;
      var s = document.createElement('style');
      s.id = 'st-login-vars';
      s.textContent = data.message;
      document.head.insertBefore(s, document.head.firstChild);
    })
    .catch(function () {});

  // When Frappe's JS shows a secondary login section (.for-forgot, .for-signup,
  // etc.) it calls jQuery .toggle(true) which sets inline style="display:block".
  // Our CSS can't override that with flex without breaking the initial hide.
  // So watch for the attribute change and upgrade block→flex ourselves.
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
