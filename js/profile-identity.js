(() => {
  'use strict';
  function render() {
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem('ojt-profile') || '{}'); } catch {}
    const name = profile['q-name']?.trim() || 'Your profile';
    document.querySelectorAll('[data-profile-name]').forEach(node => { node.textContent = name; });
    const summary = [profile['q-company'], profile['q-year'], profile['q-course']].filter(Boolean).join(' · ');
    document.querySelectorAll('[data-profile-summary]').forEach(node => { node.textContent = summary ? ` · ${summary}` : ''; });
  }
  render();
  window.addEventListener('pageshow', render);
  window.addEventListener('storage', event => { if (event.key === 'ojt-profile') render(); });
})();
