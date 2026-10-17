(() => {
  'use strict';
  const button = document.querySelector('[data-delete-all-photos]');
  const status = document.querySelector('[data-reset-status]');
  button.addEventListener('click', async () => {
    if (!confirm('Delete all personal photos and report photos on this browser? Profile details and report text will remain. This cannot be undone.')) return;
    const buttons = document.querySelectorAll('.profile-reset button');
    buttons.forEach(control => { control.disabled = true; });
    status.textContent = 'Deleting photos...';
    try {
      for (const [name, storeName] of [['ojt-personal-photos', 'photos'], ['ojt-reports', 'reports']]) {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(name, 1);
          request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: storeName === 'reports' ? 'date' : 'id' });
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          request.onblocked = () => { status.textContent = 'Close other OJT tabs to continue.'; };
        });
        try {
          await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            if (storeName === 'photos') store.clear();
            else {
              const request = store.openCursor();
              request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) return;
                cursor.update({ ...cursor.value, photos: [] });
                cursor.continue();
              };
            }
            tx.oncomplete = resolve;
            tx.onerror = tx.onabort = () => reject(tx.error);
          });
        } finally { db.close(); }
      }
      location.reload();
    } catch {
      status.textContent = 'Unable to finish deleting photos. Some may already be removed. Close other OJT tabs and try again.';
      buttons.forEach(control => { control.disabled = false; });
    }
  });
})();
