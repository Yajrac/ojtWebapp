(() => {
  'use strict';
  const container = document.querySelector('[data-daily-photos="document"]');
  const dialog = document.querySelector('#document-options');
  const form = dialog.querySelector('form');
  const button = form.querySelector('[data-confirm-document]');
  const error = form.querySelector('[data-document-error]');
  const sizes = { a4: [210, 297], letter: [215.9, 279.4], legal: [215.9, 355.6] };
  const printStyle = document.createElement('style');
  document.head.append(printStyle);
  let action = 'layout', busy = false;
  function apply() {
    const [w, h] = sizes[form.elements.paper.value] || sizes.a4;
    container.style.setProperty('--paper-w', w);
    container.style.setProperty('--paper-h', h);
    printStyle.textContent = `@media print { @page { size: ${w}mm ${h}mm; margin: 0; } }`;
    return [w, h];
  }
  function update() {
    document.querySelectorAll('[data-daily-action]').forEach(control => {
      control.disabled = !container.querySelector('.photo-sheet') && control.dataset.dailyAction !== 'layout';
    });
    apply();
  }
  window.addEventListener('daily-document-ready', update);
  update();
  document.querySelectorAll('[data-daily-action]').forEach(control => control.addEventListener('click', () => {
    action = control.dataset.dailyAction;
    button.textContent = action === 'layout' ? 'Apply layout' : action === 'print' ? 'Print' : `Download ${action.toUpperCase()}`;
    form.querySelector('[data-export-hint]').hidden = action === 'layout' || action === 'print';
    error.textContent = '';
    dialog.showModal();
  }));
  form.querySelector('[data-cancel-document]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const [w, h] = apply();
    if (action === 'layout') { dialog.close(); return; }
    const sheets = Array.from(container.querySelectorAll('.photo-sheet'));
    if (!sheets.length) { error.textContent = 'No report photos to export.'; return; }
    busy = true;
    const controls = Array.from(form.querySelectorAll('input, select, button'));
    controls.forEach(control => { control.disabled = true; });
    const original = button.textContent;
    button.textContent = 'Preparing...';
    try {
      if (action === 'print') {
        await Promise.all(Array.from(container.querySelectorAll('img'), image => image.decode()));
        dialog.close();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        window.print();
      } else {
        const name = form.elements.filename.value.trim().replace(/\.(pdf|docx)$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '') || 'Daily-Internship-Photos';
        if (action === 'pdf') await window.downloadPhotoPDF(sheets, w, h, `${name}.pdf`);
        else await window.downloadPhotoDOCX(sheets, w, h, `${name}.docx`);
        dialog.close();
      }
    } catch { error.textContent = 'Unable to export. Check that all photos load, then try again.'; }
    finally { busy = false; controls.forEach(control => { control.disabled = false; }); button.textContent = original; }
  });
})();
