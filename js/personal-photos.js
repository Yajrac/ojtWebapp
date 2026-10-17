/* Personal photos stay on this device in IndexedDB. */
(() => {
  'use strict';
  const upload = document.querySelector('.upload-photo-grid');
  const collection = document.querySelector('[data-personal-collection]');
  const documentGrid = document.querySelector('[data-personal-document]');
  if (!upload && !collection && !documentGrid) return;
  const status = document.createElement('p');
  status.className = 'gallery-note photo-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  (upload || collection || documentGrid).before(status);
  const urls = new Set();
  const dirty = new Set();
  const announce = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle('photo-error', error);
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const url = blob => {
    const value = URL.createObjectURL(blob);
    urls.add(value);
    return value;
  };
  let db;
  const transaction = (mode, action) => new Promise((resolve, reject) => {
    const tx = db.transaction('photos', mode);
    const request = action(tx.objectStore('photos'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Save interrupted'));
  });
  const failure = () => announce('Unable to save changes. Check device storage and try again. Keep this page open to retain unsaved changes.', true);
  const modal = document.querySelector('.photo-save-modal');
  let lastSaveButton;
  if (modal) {
    modal.querySelector('[data-close-photo-modal]').addEventListener('click', () => modal.close());
    modal.addEventListener('close', () => {
      modal.querySelector('img').removeAttribute('src');
      lastSaveButton?.focus();
    });
  }

  function setupUpload() {
    const pickerLabel = element('label', 'upload-picker', 'Select photos');
    const picker = element('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.multiple = true;
    pickerLabel.append(picker);
    const hint = element('p', 'gallery-note', 'Select one or more images, up to 20 MB each. On a laptop, use Ctrl or Shift to select multiple photos.');
    pickerLabel.append(hint);
    const save = element('button', 'gallery-button primary', 'Save photos');
    save.type = 'button';
    save.disabled = true;
    const captionLabel = element('label', 'upload-picker', 'Group label (optional)');
    captionLabel.hidden = true;
    const caption = element('input');
    caption.type = 'text';
    caption.maxLength = 160;
    caption.placeholder = 'e.g. Week 1';
    captionLabel.append(caption);
    upload.before(pickerLabel);
    upload.before(captionLabel);
    upload.after(save);
    let pending = [];
    caption.addEventListener('input', () => {
      if (caption.value || pending.length) dirty.add('batch');
      else dirty.delete('batch');
    });
    const release = value => { URL.revokeObjectURL(value); urls.delete(value); };
    const update = () => {
      captionLabel.hidden = !pending.length;
      save.disabled = !pending.length;
      save.textContent = pending.length === 1 ? 'Save photo' : `Save photos${pending.length ? ` (${pending.length})` : ''}`;
      if (pending.length || caption.value) dirty.add('batch'); else dirty.delete('batch');
    };
    picker.addEventListener('change', async () => {
      const files = Array.from(picker.files);
      if (!files.length) return;
      picker.disabled = true;
      save.disabled = true;
      upload.querySelectorAll('button, input').forEach(control => { control.disabled = true; });
      let rejected = 0;
      for (const blob of files) {
        if (!blob.type.startsWith('image/') || blob.size > 20 * 1024 * 1024) { rejected++; continue; }
        const preview = url(blob);
        try {
          const check = new Image();
          check.src = preview;
          await check.decode();
        } catch { release(preview); rejected++; continue; }
        const record = { id: `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`, blob, caption: '', createdAt: Date.now(), preview };
        pending.push(record);
        const card = element('article', 'upload-photo-card');
        const image = element('img');
        image.src = preview;
        image.alt = blob.name || 'Selected photo';
        const remove = element('button', 'upload-delete', '');
        remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
        remove.setAttribute('aria-label', `Remove ${blob.name || 'photo'}`);
        remove.title = 'Remove photo';
        remove.type = 'button';
        remove.addEventListener('click', () => {
          pending = pending.filter(item => item !== record);
          release(preview);
          card.remove();
          update();
        });
        card.append(image, remove);
        upload.append(card);
      }
      picker.value = '';
      picker.disabled = false;
      upload.querySelectorAll('button, input').forEach(control => { control.disabled = false; });
      update();
      announce(`${pending.length} photo(s) ready to save.${rejected ? ` ${rejected} file(s) skipped: choose a supported image up to 20 MB.` : ''}`, Boolean(rejected));
    });
    save.addEventListener('click', async () => {
      if (!pending.length) return;
      picker.disabled = true;
      save.disabled = true;
      caption.disabled = true;
      upload.querySelectorAll('button, input').forEach(control => { control.disabled = true; });
      const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const savedAt = Date.now();
      const batch = pending.map((record, index) => ({ ...record, groupId, label: caption.value.trim(), caption: '', createdAt: savedAt + index / 1000 }));
      try {
        await transaction('readwrite', store => {
          let request;
          for (const { id, blob, caption, createdAt, groupId, label } of batch) request = store.put({ id, blob, caption, createdAt, groupId, label });
          return request;
        });
      } catch {
        failure();
        picker.disabled = false;
        caption.disabled = false;
        upload.querySelectorAll('button, input').forEach(control => { control.disabled = false; });
        update();
        return;
      }
      pending = [];
      upload.replaceChildren();
      picker.value = '';
      picker.disabled = false;
      caption.value = '';
      caption.disabled = false;
      update();
      announce(`${batch.length} photo(s) saved on this device. Select more photos to upload again.`);
      if (modal) {
        modal.querySelector('#photo-save-title').textContent = batch.length === 1 ? 'Photo saved successfully' : `${batch.length} photos saved successfully`;
        modal.querySelector('#photo-save-description').textContent = 'Your photos are saved on this device. The upload field is ready for your next selection.';
        modal.querySelector('img').src = batch[0].preview;
        modal.querySelector('img').alt = batch[0].label || 'Saved photo';
        const text = modal.querySelector('.photo-save-caption');
        text.textContent = batch[0].label;
        text.hidden = !text.textContent;
        lastSaveButton = picker;
        modal.addEventListener('close', () => batch.forEach(record => release(record.preview)), { once: true });
        modal.showModal();
      } else batch.forEach(record => release(record.preview));
    });
  }
  async function init() {
    announce('Loading your photos…');
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('ojt-personal-photos', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => announce('Close other OJT tabs, then reload to open photo storage.', true);
    });
    db.onversionchange = () => db.close();
    const records = await transaction('readonly', store => store.getAll());
    records.sort((a, b) => a.createdAt - b.createdAt);
    if (upload) {
      upload.replaceChildren();
      setupUpload();
    } else {
      const grid = collection || documentGrid;
      grid.replaceChildren();
      const groups = new Map();
      records.forEach(record => {
        const key = record.groupId || `legacy-${record.caption || record.id}`;
        if (!groups.has(key)) groups.set(key, { label: record.label ?? record.caption ?? '', photos: [] });
        groups.get(key).photos.push(record);
      });
      if (documentGrid) {
        const rows = [];
        let previousKey;
        records.forEach(record => {
          const key = record.groupId || `legacy-${record.caption || record.id}`;
          let row = rows[rows.length - 1];
          if (!row || row.photos.length === 4 || (key !== previousKey && (record.label || record.caption))) {
            row = { label: key !== previousKey ? (record.label ?? record.caption ?? '') : '', photos: [] };
            rows.push(row);
          }
          row.photos.push(record);
          previousKey = key;
        });
        for (let start = 0; start < rows.length; start += 5) {
          const sheet = element('section', 'photo-sheet');
          const layout = element('div', 'photo-sheet-grid');
          rows.slice(start, start + 5).forEach(row => {
            const block = element('div', 'photo-document-row');
            if (row.label) block.append(element('h3', 'photo-document-label', row.label));
            const photos = element('div', 'photo-document-images');
            row.photos.forEach(record => {
              const figure = element('figure');
              const image = element('img');
              image.src = url(record.blob);
              image.alt = record.label || record.caption || 'Personal photo';
              figure.append(image);
              photos.append(figure);
            });
            block.append(photos);
            layout.append(block);
          });
          sheet.append(layout);
          grid.append(sheet);
        }
      }
      groups.forEach(group => {
        if (documentGrid) return;
        const section = element('section', 'personal-photo-group');
        let label = group.label || 'Untitled group';
        const groupId = group.photos[0].groupId || `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const open = element('button', 'photo-group-open');
        open.type = 'button';
        open.setAttribute('aria-label', `Open ${label}, ${group.photos.length} photos`);
        const stack = element('span', 'photo-group-stack');
        stack.setAttribute('aria-hidden', 'true');
        group.photos.slice(0, 4).forEach((record, index) => {
          const image = element('img');
          image.src = url(record.blob);
          image.alt = '';
          image.style.setProperty('--stack-index', index);
          stack.append(image);
        });
        open.append(stack, element('span', 'photo-group-title', label), element('span', 'photo-group-count', `${group.photos.length} photo${group.photos.length === 1 ? '' : 's'}`));
        open.addEventListener('click', () => {
          const viewer = element('dialog', 'photo-group-viewer');
          const heading = element('h2', '', label);
          heading.id = 'photo-group-viewer-title';
          viewer.setAttribute('aria-labelledby', heading.id);
          const close = element('button', 'photo-viewer-close');
          close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
          close.setAttribute('aria-label', 'Close album');
          close.title = 'Close album';
          close.type = 'button';
          close.autofocus = true;
          close.addEventListener('click', () => viewer.close());
          const header = element('div', 'photo-group-viewer-header');
          header.append(heading, close);
          const photos = element('div', 'photo-group-viewer-grid');
          const feedback = element('p', 'gallery-note');
          feedback.setAttribute('role', 'status');
          const viewerUrls = [];
          let busy = false;
          const lock = value => {
            busy = value;
            viewer.querySelectorAll('button, input').forEach(control => { control.disabled = value; });
          };
          viewer.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
          const tools = element('div', 'photo-album-tools');
          const titleForm = element('form', 'photo-album-title-form');
          const titleLabel = element('label', '', 'Album title');
          const titleInput = element('input');
          titleInput.type = 'text';
          titleInput.maxLength = 160;
          titleInput.value = group.label;
          titleInput.placeholder = 'e.g. Week 1';
          titleLabel.append(titleInput);
          const rename = element('button', 'gallery-button photo-title-save');
          rename.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/></svg>';
          rename.setAttribute('aria-label', 'Save album title');
          rename.title = 'Save title';
          rename.type = 'submit';
          titleForm.append(titleLabel, rename);
          const addLabel = element('label', 'photo-album-add', 'Add photos to this album');
          const addInput = element('input');
          addInput.type = 'file';
          addInput.accept = 'image/*';
          addInput.multiple = true;
          addLabel.append(addInput);
          tools.append(titleForm, addLabel);
          const refreshAlbum = () => {
            label = group.label || 'Untitled group';
            stack.querySelectorAll('img').forEach(image => {
              URL.revokeObjectURL(image.src);
              urls.delete(image.src);
            });
            stack.replaceChildren();
            group.photos.slice(0, 4).forEach((record, index) => {
              const image = element('img');
              image.src = url(record.blob);
              image.alt = '';
              image.style.setProperty('--stack-index', index);
              stack.append(image);
            });
            photos.querySelectorAll('img').forEach(image => { image.alt = label; });
            photos.querySelectorAll('button').forEach(button => { button.setAttribute('aria-label', `Delete photo from ${label}`); });
            heading.textContent = label;
            open.querySelector('.photo-group-title').textContent = label;
            open.querySelector('.photo-group-count').textContent = `${group.photos.length} photo${group.photos.length === 1 ? '' : 's'}`;
            open.setAttribute('aria-label', `Open ${label}, ${group.photos.length} photos`);
            const count = document.querySelector('[data-photo-count]');
            if (count) count.textContent = `${records.length} saved photo${records.length === 1 ? '' : 's'}`;
          };
          titleForm.addEventListener('submit', async event => {
            event.preventDefault();
            if (busy) return;
            lock(true);
            const nextLabel = titleInput.value.trim();
            try {
              await transaction('readwrite', store => {
                let request;
                group.photos.forEach(record => { request = store.put({ ...record, groupId, label: nextLabel, caption: '' }); });
                return request;
              });
              group.label = nextLabel;
              group.photos.forEach(record => Object.assign(record, { groupId, label: nextLabel, caption: '' }));
              refreshAlbum();
              feedback.textContent = 'Album title updated.';
            } catch { feedback.textContent = 'Unable to save the title. Please try again.'; }
            finally { lock(false); }
          });
          addInput.addEventListener('change', async () => {
            const selected = Array.from(addInput.files);
            if (!selected.length || busy) return;
            lock(true);
            feedback.textContent = 'Adding photos...';
            const additions = [];
            let skipped = 0;
            try {
              const createdAt = Date.now();
              for (const blob of selected) {
                if (!blob.type.startsWith('image/') || blob.size > 20 * 1024 * 1024) { skipped++; continue; }
                const preview = URL.createObjectURL(blob);
                try {
                  const image = new Image();
                  image.src = preview;
                  await image.decode();
                  additions.push({ id: `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`, blob, groupId, label: group.label, caption: '', createdAt: createdAt + additions.length / 1000 });
                } catch { skipped++; }
                finally { URL.revokeObjectURL(preview); }
              }
              if (!additions.length) { feedback.textContent = 'Choose supported images up to 20 MB each.'; return; }
              await transaction('readwrite', store => {
                let request;
                group.photos.forEach(record => { request = store.put({ ...record, groupId }); });
                additions.forEach(record => { request = store.put(record); });
                return request;
              });
              group.photos.forEach(record => { record.groupId = groupId; });
              group.photos.push(...additions);
              records.push(...additions);
              additions.forEach(appendPhoto);
              refreshAlbum();
              feedback.textContent = `${additions.length} photo(s) added.${skipped ? ` ${skipped} unsupported or oversized file(s) skipped.` : ''}`;
            } catch { feedback.textContent = 'Unable to add photos. Check device storage and try again.'; }
            finally { addInput.value = ''; lock(false); }
          });
          function appendPhoto(record) {
            const tile = element('figure', 'saved-photo-tile');
            const image = element('img');
            const imageUrl = url(record.blob);
            viewerUrls.push(imageUrl);
            image.src = imageUrl;
            image.alt = label;
            const remove = element('button', 'saved-photo-delete');
            remove.type = 'button';
            remove.setAttribute('aria-label', `Delete photo from ${label}`);
            remove.title = 'Delete photo';
            remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
            remove.addEventListener('click', async () => {
              if (busy) return;
              if (!window.confirm('Permanently delete this saved photo?')) return;
              lock(true);
              try {
                await transaction('readwrite', store => store.delete(record.id));
              } catch {
                lock(false);
                feedback.textContent = 'Unable to delete this photo. Please try again.';
                return;
              }
              group.photos = group.photos.filter(item => item.id !== record.id);
              const index = records.findIndex(item => item.id === record.id);
              if (index !== -1) records.splice(index, 1);
              tile.remove();
              URL.revokeObjectURL(imageUrl);
              urls.delete(imageUrl);
              stack.querySelectorAll('img').forEach(item => {
                URL.revokeObjectURL(item.src);
                urls.delete(item.src);
              });
              stack.replaceChildren();
              group.photos.slice(0, 4).forEach((item, index) => {
                const thumbnail = element('img');
                thumbnail.src = url(item.blob);
                thumbnail.alt = '';
                thumbnail.style.setProperty('--stack-index', index);
                stack.append(thumbnail);
              });
              const total = group.photos.length;
              open.querySelector('.photo-group-count').textContent = `${total} photo${total === 1 ? '' : 's'}`;
              open.setAttribute('aria-label', `Open ${label}, ${total} photos`);
              const counter = document.querySelector('[data-photo-count]');
              if (counter) counter.textContent = `${records.length} saved photo${records.length === 1 ? '' : 's'}`;
              feedback.textContent = 'Photo deleted.';
              announce('Photo deleted from this device.');
              lock(false);
              if (!total) {
                section.remove();
                viewer.close();
                if (!records.length) grid.append(element('p', 'gallery-empty', 'No personal photos yet. Open Upload Photos to add your first photo.'));
              } else {
                (photos.querySelector('button') || close).focus();
              }
            });
            tile.append(image, remove);
            photos.append(tile);
          }
          group.photos.forEach(appendPhoto);
          viewer.append(header, tools, feedback, photos);
          viewer.addEventListener('close', () => {
            viewerUrls.forEach(value => { URL.revokeObjectURL(value); urls.delete(value); });
            viewer.remove();
            if (open.isConnected) open.focus();
            else document.querySelector('.photo-group-open, a[href="./gallery-upload.html"]')?.focus();
          }, { once: true });
          document.body.append(viewer);
          viewer.showModal();
        });
        section.append(open);
        grid.append(section);
      });
      if (!records.length) grid.append(element('p', 'gallery-empty', 'No personal photos yet. Open Upload Photos to add your first photo.'));
      const count = document.querySelector('[data-photo-count]');
      if (count) count.textContent = `${records.length} saved photo${records.length === 1 ? '' : 's'}`;
      if (documentGrid) setupDocument(records.length);
    }
    announce(upload ? 'Select photos, then add one optional label for the group.' : '');
  }
  function setupDocument(count) {
    const dialog = document.querySelector('#document-options');
    const form = dialog.querySelector('form');
    const size = form.elements.paper;
    const sizes = { a4: [210, 297], letter: [215.9, 279.4], legal: [215.9, 355.6] };
    const printStyle = element('style');
    document.head.append(printStyle);
    let action = 'layout';
    function apply() {
      const [width, height] = sizes[size.value] || sizes.a4;
      documentGrid.style.setProperty('--paper-w', width);
      documentGrid.style.setProperty('--paper-h', height);
      printStyle.textContent = `@media print { @page { size: ${width}mm ${height}mm; margin: 0; } }`;
      documentGrid.hidden = false;
      document.querySelector('[data-paper-summary]').textContent = `${size.selectedOptions[0].textContent} · 4 columns × 5 rows · Up to 20 photos per page`;
    }
    apply();
    document.querySelectorAll('[data-document-action]').forEach(button => {
      button.disabled = !count && button.dataset.documentAction !== 'layout';
      button.addEventListener('click', () => {
        action = button.dataset.documentAction;
        dialog.querySelector('[data-confirm-document]').textContent = action === 'layout' ? 'Apply layout' : action === 'pdf' ? 'Download PDF' : 'Continue to print';
        dialog.querySelector('[data-document-error]').textContent = '';
        dialog.querySelector('[data-export-hint]').hidden = action !== 'pdf';
        dialog.showModal();
      });
    });
    dialog.querySelector('[data-cancel-document]').addEventListener('click', () => dialog.close());
    form.addEventListener('submit', async event => {
      event.preventDefault();
      apply();
      if (action === 'pdf') {
        const button = dialog.querySelector('[data-confirm-document]');
        const controls = Array.from(form.querySelectorAll('button, input, select'));
        const error = dialog.querySelector('[data-document-error]');
        const filename = (form.elements.filename.value.trim().replace(/\.pdf$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '') || 'OJT-Personal-Photos') + '.pdf';
        controls.forEach(control => { control.disabled = true; });
        button.textContent = 'Preparing PDF...';
        error.textContent = '';
        const preventClose = event => event.preventDefault();
        dialog.addEventListener('cancel', preventClose);
        try {
          const [width, height] = sizes[size.value] || sizes.a4;
          await window.downloadPhotoPDF(Array.from(documentGrid.querySelectorAll('.photo-sheet')), width, height, filename);
          announce(`Download started: ${filename}`);
          dialog.close();
        } catch {
          error.textContent = 'Unable to create the PDF. Please try again with fewer photos or check that all images can be displayed.';
        } finally {
          controls.forEach(control => { control.disabled = false; });
          button.textContent = 'Download PDF';
          dialog.removeEventListener('cancel', preventClose);
        }
        return;
      }
      dialog.close();
      if (action === 'layout') return;
      await Promise.all(Array.from(documentGrid.querySelectorAll('img'), image => image.decode().catch(() => {})));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.print();
    });
  }
  window.addEventListener('beforeunload', event => {
    if (dirty.size) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('pagehide', event => {
    if (!event.persisted) urls.forEach(value => URL.revokeObjectURL(value));
  });
  window.addEventListener('pageshow', event => { if (event.persisted && !upload) location.reload(); });
  init().catch(() => announce('Photo storage is unavailable. Open this app through localhost or HTTPS and allow browser storage, then reload.', true));
})();
