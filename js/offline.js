(() => {
  'use strict';
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const root = new URL('../', document.currentScript.src);
  const register = () => navigator.serviceWorker.register(new URL('sw.js', root), { scope: root.pathname, updateViaCache: 'none' })
    .catch(error => console.warn('Offline setup failed. Retry while online.', error));
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
})();
