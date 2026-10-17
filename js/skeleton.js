/* Shared loading state. Photo pages also wait for their IndexedDB read. */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('page-loading');
  const photoPage = /\/gallery(?:-(?:upload|personal|document|daily-document))?\.html$/.test(location.pathname);
  let dataReady = !photoPage;
  let pageReady = document.readyState === 'complete';
  let main;
  let skeleton;
  let message;
  let finished = false;
  let overlay, overlayTimer;
  window.AppLoading = {
    show(text = 'Loading...') {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'app-loading-overlay';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        const spinner = document.createElement('span');
        spinner.className = 'app-loading-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        const label = document.createElement('p');
        overlay.append(spinner, label);
        document.body.append(overlay);
      }
      overlay.querySelector('p').textContent = text;
      overlay.hidden = false;
      clearTimeout(overlayTimer);
      overlayTimer = setTimeout(() => window.AppLoading.hide(), 8000);
    },
    hide() { if (overlay) overlay.hidden = true; clearTimeout(overlayTimer); }
  };
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const target = new URL(link.href, location.href);
    if (target.origin !== location.origin || !/\.html$|\/$/.test(target.pathname)) return;
    if (target.pathname === location.pathname && target.search === location.search) return;
    window.AppLoading.show();
  });
  const finish = () => {
    if (finished || !main || !dataReady || !pageReady) return;
    finished = true;
    root.classList.remove('page-loading');
    main.removeAttribute('aria-busy');
    skeleton?.remove();
    message?.remove();
    clearTimeout(fallback);
  };
  const fallback = setTimeout(() => { dataReady = pageReady = true; finish(); }, 8000);
  window.addEventListener('personal-photos-ready', () => { dataReady = true; finish(); }, { once: true });
  window.addEventListener('load', () => { pageReady = true; finish(); }, { once: true });
  window.addEventListener('pageshow', event => {
    window.AppLoading.hide();
    if (event.persisted) { dataReady = pageReady = true; finish(); }
  });
  function mount() {
    main = document.querySelector('main');
    if (!main) { root.classList.remove('page-loading'); clearTimeout(fallback); return; }
    main.setAttribute('aria-busy', 'true');
    skeleton = document.createElement('div');
    skeleton.className = 'page-skeleton';
    skeleton.setAttribute('aria-hidden', 'true');
    const path = location.pathname;
    let variant = 'dashboard';
    if (/gallery/.test(path)) variant = /upload/.test(path) ? 'upload' : /document/.test(path) ? 'document' : 'gallery';
    else if (/onboarding|report/.test(path)) variant = 'form';
    else if (/profile/.test(path)) variant = 'profile';
    else if (/index\.html$|\/$/.test(path)) variant = 'welcome';
    skeleton.dataset.layout = variant;
    const line = (kind = '') => `<span class="skeleton-block skeleton-line ${kind}"></span>`;
    const tile = `<div class="skeleton-tile"><span class="skeleton-block skeleton-image"></span>${line('short')}${line()}</div>`;
    skeleton.innerHTML = `<div class="skeleton-heading">${line('title')}${line('subtitle')}</div><div class="skeleton-content">${Array.from({ length: variant === 'welcome' ? 1 : variant === 'document' ? 8 : variant === 'gallery' ? 6 : 4 }, () => variant === 'gallery' || variant === 'document' ? tile : `<div class="skeleton-panel">${line('short')}${line()}${line()}<span class="skeleton-block skeleton-field"></span></div>`).join('')}</div>`;
    message = document.createElement('span');
    message.className = 'skeleton-announcement';
    message.setAttribute('role', 'status');
    message.textContent = 'Loading page...';
    main.prepend(skeleton, message);
    finish();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
