(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const dateParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = name => dateParts.find(value => value.type === name).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  let profile = {};
  try { profile = JSON.parse(localStorage.getItem('ojt-profile') || '{}'); } catch {}
  get('field-name').textContent = profile['q-name'] || 'Your profile';
  const date = get('field-date');
  date.value = today;
  date.max = today;
  const requestedDate = new URLSearchParams(location.search).get('date');
  if (/^\d{4}-\d{2}-\d{2}$/.test(requestedDate || '') && requestedDate <= today && !Number.isNaN(Date.parse(requestedDate))) date.value = requestedDate;
  const ids = ['time-am-in', 'time-am-out', 'time-pm-in', 'time-pm-out', 'field-tasks', 'field-objectives'];
  const timeControls = new Map();
  ids.slice(0, 4).forEach(id => {
    const input = get(id);
    input.type = 'time';
    input.min = id.includes('-am-') ? '00:00' : '12:00';
    input.max = id === 'time-am-out' ? '12:59' : id.includes('-am-') ? '11:59' : '23:59';
    input.setAttribute('aria-label', `${id.includes('-am-') ? 'AM' : 'PM'} ${id.endsWith('-in') ? 'time in' : 'time out'}`);
    input.hidden = true;
    const am = id.includes('-am-');
    const group = document.createElement('div');
    group.className = 'report-time-picker';
    const hour = document.createElement('select');
    const minute = document.createElement('select');
    const label = input.getAttribute('aria-label');
    hour.setAttribute('aria-label', `${label} hour`);
    minute.setAttribute('aria-label', `${label} minute`);
    hour.add(new Option('Hour', ''));
    minute.add(new Option('Min', ''));
    for (let value = 1; value <= 12; value++) hour.add(new Option(String(value).padStart(2, '0'), String(value)));
    for (let value = 0; value < 60; value++) minute.add(new Option(String(value).padStart(2, '0'), String(value)));
    const period = document.createElement('span');
    period.className = 'report-time-period';
    const updatePeriod = () => { period.textContent = am && !(id === 'time-am-out' && hour.value === '12') ? 'AM' : 'PM'; };
    updatePeriod();
    const separator = document.createElement('span');
    separator.textContent = ':';
    separator.setAttribute('aria-hidden', 'true');
    group.append(hour, separator, minute, period);
    input.after(group);
    const update = () => {
      if (!hour.value) { input.value = ''; minute.value = ''; }
      else {
        if (!minute.value) minute.value = '0';
        const h = id === 'time-am-out' && hour.value === '12' ? 12 : Number(hour.value) % 12 + (am ? 0 : 12);
        input.value = `${String(h).padStart(2, '0')}:${String(minute.value).padStart(2, '0')}`;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      updatePeriod();
    };
    hour.addEventListener('change', update);
    minute.addEventListener('change', update);
    hour.disabled = minute.disabled = true;
    timeControls.set(id, { hour, minute, updatePeriod });
    input.addEventListener('change', () => {
      if (input.value && !input.checkValidity()) {
        input.value = '';
        dirty = true;
        hours();
        status.textContent = id === 'time-am-out' ? 'Morning time out accepts times through 12:59 PM.' : id.includes('-am-') ? 'AM time in accepts morning times only.' : 'PM accepts afternoon and evening times only.';
        input.focus();
      }
    });
  });
  ['hours-rendered', 'hours-remaining'].forEach(id => { get(id).readOnly = true; });
  const status = document.createElement('p');
  status.className = 'report-photo-hint';
  status.setAttribute('role', 'status');
  get('report-main').prepend(status);
  document.querySelector('.report-photo-hint:not([role])').textContent = '';
  const grid = get('photo-grid');
  const save = get('save-fab');
  const pickers = Array.from(document.querySelectorAll('#add-photo-row input'));
  pickers[0].setAttribute('capture', 'environment');
  pickers[1].multiple = true;
  let photos = [], urls = [], db, reports = [], dirty = false, busy = false;
  function draw() {
    urls.forEach(URL.revokeObjectURL);
    urls = [];
    grid.replaceChildren();
    photos.forEach((blob, index) => {
      const tile = document.createElement('div');
      tile.className = 'photo-slot has-image';
      const image = document.createElement('img');
      image.src = URL.createObjectURL(blob);
      urls.push(image.src);
      image.alt = `Report photo ${index + 1}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'slot-clear';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove photo ${index + 1}`);
      remove.addEventListener('click', () => { if (!busy) { photos.splice(index, 1); dirty = true; draw(); } });
      tile.append(image, remove);
      grid.append(tile);
    });
    get('photo-count').querySelector('strong').textContent = photos.length;
    pickers.forEach(picker => { picker.disabled = busy; });
  }
  const minutes = value => { if (!value) return null; const [h, m] = value.split(':').map(Number); return h * 60 + m; };
  function duration() {
    return window.reportMinutes({ fields: Object.fromEntries(ids.map(id => [id, get(id).value])) });
  }
  const format = value => `${Math.floor(value / 60)} hrs ${value % 60} mins`;
  function hours() {
    get('hours-rendered').value = format(duration());
    const required = Number(profile['q-hours-required'] || 0);
    if (!required) { get('hours-remaining').value = ''; get('hours-remaining').placeholder = 'Set required hours in profile'; return; }
    const previous = reports.filter(report => report.date !== date.value).reduce((sum, report) => sum + window.reportMinutes(report), 0);
    const hasTime = ids.slice(0, 4).some(id => get(id).value);
    const current = !hasTime && !dirty ? window.reportMinutes(reports.find(report => report.date === date.value) || {}) : duration();
    get('hours-remaining').value = format(Math.max(0, Math.round(required * 60 - Number(profile['q-hours-rendered'] || 0) * 60 - previous - current)));
  }
  function load() {
    const report = reports.find(item => item.date === date.value);
    ids.forEach(id => { get(id).value = report?.fields[id] || ''; });
    timeControls.forEach(({ hour, minute, updatePeriod }, id) => {
      const value = get(id).value;
      hour.value = value ? String(Number(value.slice(0, 2)) % 12 || 12) : '';
      minute.value = value ? String(Number(value.slice(3))) : '';
      updatePeriod();
    });
    photos = report?.photos.slice() || [];
    dirty = false;
    hours(); draw();
  }
  ids.forEach(id => {
    get(id).disabled = true;
    get(id).addEventListener('input', () => { dirty = true; hours(); });
  });
  date.disabled = true;
  let activeDate = date.value;
  date.addEventListener('change', () => {
    if (!date.value || !date.checkValidity() || (dirty && !confirm('Discard unsaved changes and open another date?'))) { date.value = activeDate; return; }
    activeDate = date.value; load();
  });
  function store(mode, action) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reports', mode), request = action(tx.objectStore('reports'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
  pickers.forEach(picker => picker.addEventListener('change', async () => {
    busy = true; save.disabled = true; date.disabled = true; draw();
    let skipped = 0;
    try {
      for (const blob of picker.files) {
        if (!blob.type.startsWith('image/') || blob.size > 20 * 1024 * 1024) { skipped++; continue; }
        const url = URL.createObjectURL(blob);
        try { const image = new Image(); image.src = url; await image.decode(); photos.push(blob); dirty = true; }
        catch { skipped++; } finally { URL.revokeObjectURL(url); }
      }
      status.textContent = skipped ? `${skipped} file(s) skipped. Choose supported images up to 20 MB each.` : 'Photos ready. Save your report to keep them.';
    } finally { picker.value = ''; busy = false; save.disabled = false; date.disabled = false; draw(); }
  }));
  save.addEventListener('click', async () => {
    if (busy) return;
    for (const id of ids.slice(0, 4)) {
      if (!get(id).checkValidity()) {
        status.textContent = 'Use morning times in AM and afternoon or evening times in PM.';
        get(id).reportValidity();
        return;
      }
    }
    for (const period of ['am', 'pm']) {
      const start = get(`time-${period}-in`), end = get(`time-${period}-out`);
      if (start.value && end.value && end.value <= start.value) {
        status.textContent = 'Time out must be later than time in.'; timeControls.get(`time-${period}-out`).hour.focus(); return;
      }
    }
    if (!ids.some(id => get(id).value.trim()) && !photos.length) {
      get('report-empty').showModal();
      return;
    }
    busy = true;
    const controls = Array.from(document.querySelectorAll('#report-main input, #report-main select, #report-main textarea, #report-main button, #field-date, #save-fab'));
    controls.forEach(control => { control.disabled = true; });
    const report = { date: date.value, name: get('field-name').textContent, fields: Object.fromEntries(ids.map(id => [id, get(id).value])), photos: photos.slice(), minutes: duration() };
    try {
      await store('readwrite', table => table.put(report));
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('ojt-report-updates');
        channel.postMessage('saved');
        channel.close();
      }
      reports = reports.filter(item => item.date !== report.date).concat(report);
      dirty = false; status.textContent = 'Report saved on this device.';
      get('report-saved').querySelector('p').textContent = window.isReportComplete(report) ? 'Your complete report is saved on this device.' : 'Saved as incomplete. You can finish the time log, tasks, objectives, and photos later from Home logs.';
      ids.forEach(id => { get(id).value = ''; });
      timeControls.forEach(({ hour, minute, updatePeriod }) => { hour.value = ''; minute.value = ''; updatePeriod(); });
      photos = [];
      pickers.forEach(picker => { picker.value = ''; });
      hours();
      get('report-saved').showModal();
    } catch { status.textContent = 'Unable to save. Check device storage and try again. Your changes are still here.'; }
    finally { busy = false; controls.forEach(control => { control.disabled = false; }); draw(); }
  });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  (async () => {
    try {
      db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('ojt-reports', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('reports', { keyPath: 'date' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      reports = await store('readonly', table => table.getAll());
      load(); save.disabled = false; date.disabled = false;
      ids.forEach(id => { get(id).disabled = false; });
      timeControls.forEach(({ hour, minute }) => { hour.disabled = minute.disabled = false; });
    } catch { status.textContent = 'Report storage is unavailable. Open the app through localhost or HTTPS, then reload.'; }
  })();
})();
