(() => {
  'use strict';
  const container = document.querySelector('[data-daily-photos]');
  if (!container) return;
  const documentView = container.dataset.dailyPhotos === 'document';
  let urls = [], loading = false;
  const node = (tag, cls, text) => {
    const item = document.createElement(tag);
    if (cls) item.className = cls;
    if (text) item.textContent = text;
    return item;
  };
  async function load() {
    if (loading) return;
    if (documentView && document.querySelector('#document-options[open]')) return;
    loading = true;
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
      reports.sort((a, b) => a.date.localeCompare(b.date));
      urls.forEach(value => URL.revokeObjectURL(value));
      urls = [];
      container.replaceChildren();
      const selected = documentView ? new URLSearchParams(location.search).get('date') : null;
      reports.forEach((report, index) => {
        if (!report.photos?.length || (selected && report.date !== selected)) return;
        const date = new Date(`${report.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
        if (documentView) {
          for (let start = 0; start < report.photos.length; start += 20) {
            const sheet = node('section', 'photo-sheet');
            const layout = node('div', 'photo-sheet-grid');
            const page = report.photos.slice(start, start + 20);
            for (let rowIndex = 0; rowIndex < page.length; rowIndex += 4) {
              const row = node('div', 'photo-document-row');
              if (rowIndex === 0) row.append(node('h3', 'photo-document-label', `${date} - DAY ${index + 1}${start ? ' (continued)' : ''}`));
              const photos = node('div', 'photo-document-images');
              page.slice(rowIndex, rowIndex + 4).forEach((blob, photoIndex) => {
                const figure = node('figure');
                const image = node('img');
                image.src = URL.createObjectURL(blob);
                urls.push(image.src);
                image.alt = `Internship photo ${start + rowIndex + photoIndex + 1}, ${date}`;
                figure.append(image);
                photos.append(figure);
              });
              row.append(photos);
              layout.append(row);
            }
            sheet.append(layout);
            container.append(sheet);
          }
          return;
        }
        const section = node('section', documentView ? 'document-day' : 'gallery-day');
        if (documentView) section.append(node('h3', '', `${date} - DAY ${index + 1}`));
        else {
          const header = node('header', 'gallery-day-header');
          const info = node('div');
          const heading = node('div', 'daily-day-heading');
          heading.append(node('span', 'daily-day-badge', `DAY ${index + 1}`), node('h2', '', date));
          info.append(heading, node('p', '', `${report.photos.length} photo${report.photos.length === 1 ? '' : 's'}`));
          const link = node('a', 'gallery-button', 'View daily document');
          link.href = `./gallery-daily-document.html?date=${encodeURIComponent(report.date)}`;
          header.append(info, link);
          section.append(header);
        }
        const photos = node('div', documentView ? 'document-photo-row' : 'gallery-grid');
        report.photos.forEach((blob, photoIndex) => {
          const figure = node('figure', documentView ? '' : 'gallery-photo');
          const image = node('img');
          const url = URL.createObjectURL(blob);
          urls.push(url);
          image.src = url;
          image.alt = `Internship photo ${photoIndex + 1}, ${date}`;
          image.loading = 'lazy';
          figure.append(image);
          if (!documentView) figure.append(node('figcaption', '', `Photo ${photoIndex + 1}`));
          photos.append(figure);
        });
        section.append(photos);
        container.append(section);
      });
      if (!container.children.length) container.append(node('p', 'gallery-empty', 'No saved report photos yet. Add photos to a report and save it to see them here.'));
    } catch {
      container.replaceChildren(node('p', 'gallery-empty', 'Unable to load report photos. Reload to try again.'));
    } finally {
      db?.close(); loading = false;
      window.dispatchEvent(new Event('personal-photos-ready'));
      if (documentView) window.dispatchEvent(new Event('daily-document-ready'));
    }
  }
  load();
  window.addEventListener('pageshow', event => { if (event.persisted) load(); });
  window.addEventListener('focus', load);
})();
