/* Run in the head before app pages render. */
(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const welcome = new URL('index.html', root);
  const home = new URL('Home.html', root);
  const onboarding = new URL('pages/onboarding.html', root);
  function check() {
    let profile;
    try { profile = JSON.parse(localStorage.getItem('ojt-profile') || 'null'); } catch {}
    const ready = typeof profile?.['q-name'] === 'string' && Boolean(profile['q-name'].trim());
    const path = location.pathname;
    const isWelcome = path === welcome.pathname || path === root.pathname;
    const isOnboarding = path === onboarding.pathname;
    if (!ready && !isWelcome && !isOnboarding) location.replace(welcome.href);
    else if (ready && isWelcome) location.replace(home.href);
  }
  check();
  window.addEventListener('pageshow', check);
  window.addEventListener('storage', event => { if (event.key === 'ojt-profile' || event.key === null) check(); });
})();
