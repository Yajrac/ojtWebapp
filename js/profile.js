(() => {
  'use strict';
  let profile = {};
  try { profile = JSON.parse(localStorage.getItem('ojt-profile') || '{}'); } catch {}
  const text = (selector, value) => { const node = document.querySelector(selector); if (node) node.textContent = value; };
  text('.identity h2', profile['q-name'] || 'Your profile');
  text('.identity .role', [profile['q-course'], profile['q-year']].filter(Boolean).join(' · ') || 'Complete your profile details');
  const values = document.querySelectorAll('.info-value');
  ['q-email', 'q-phone', 'q-school', 'q-company'].forEach((key, index) => { values[index].textContent = profile[key] || 'Not set'; });
  text('.sup-name', profile['q-supervisor'] || 'Not set');
  text('.sup-role', profile['q-supervisor-role'] || 'Supervisor');
  document.querySelector('.sup-action')?.remove();
  const ring = document.querySelector('.progress-ring');
  const numbers = document.querySelectorAll('.progress-row .p-value');
  text('.progress-ring .ring-label', '—');
  numbers.forEach(node => { node.textContent = '—'; });
  async function load() {
    let db;
    try {
      db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('ojt-reports', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('reports', { keyPath: 'date' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const reports = await new Promise((resolve, reject) => {
        const tx = db.transaction('reports', 'readonly');
        const request = tx.objectStore('reports').getAll();
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
      const complete = reports.filter(window.isReportComplete);
      const rendered = Math.max(0, Number(profile['q-hours-rendered']) || 0) + reports.reduce((sum, report) => sum + window.reportMinutes(report) / 60, 0);
      const required = Math.max(0, Number(profile['q-hours-required']) || 0);
      const percent = required ? Math.min(100, rendered / required * 100) : 0;
      ring.style.setProperty('--pct', percent);
      ring.setAttribute('role', 'img');
      ring.setAttribute('aria-label', `${Math.round(percent)} percent complete`);
      const label = document.querySelector('.progress-ring .ring-label');
      label.textContent = `${Math.round(percent)}%`;
      const sub = document.createElement('span');
      sub.textContent = required ? 'complete' : 'set target';
      label.append(sub);
      const format = value => `${Number(value.toFixed(2))} hrs`;
      numbers[0].textContent = format(rendered);
      numbers[1].textContent = required ? format(Math.max(0, required - rendered)) : 'Not set';
      numbers[2].textContent = required ? format(required) : 'Not set';
    } catch {
      text('.progress-ring .ring-label', '—');
      const message = document.createElement('p');
      message.textContent = 'Unable to load progress. Reload to try again.';
      document.querySelector('.profile-progress').append(message);
    } finally { db?.close(); }
  }
  load();
  window.addEventListener('pageshow', event => { if (event.persisted) load(); });
})();
