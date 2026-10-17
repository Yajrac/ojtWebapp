(() => {
  'use strict';
  const button = document.querySelector('[data-reset-test-data]');
  const status = document.querySelector('[data-reset-status]');
  button.addEventListener('click', async () => {
    if (!confirm('Delete the saved profile, reports, and photos on this browser? This cannot be undone.')) return;
    button.disabled = true;
    status.textContent = 'Removing test data...';
    try {
      for (const [name, storeName] of [['ojt-reports', 'reports'], ['ojt-personal-photos', 'photos']]) {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(name, 1);
          request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: storeName === 'reports' ? 'date' : 'id' });
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          request.onblocked = () => { status.textContent = 'Close other OJT tabs to continue resetting.'; };
        });
        try {
          await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).clear();
            tx.oncomplete = resolve;
            tx.onerror = tx.onabort = () => reject(tx.error);
          });
        } finally { db.close(); }
      }
      localStorage.removeItem('ojt-profile');
      location.replace('../index.html');
    } catch {
      status.textContent = 'Reset could not finish. Some data may already be removed. Close other OJT tabs and try again.';
      button.disabled = false;
    }
  });
})();
