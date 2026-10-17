(() => {
  'use strict';
  const list = document.querySelector('#home-report-logs');
  if (!list) return;
  const counter = document.querySelector('[data-report-count]');
  const node = (tag, className, text) => {
    const value = document.createElement(tag);
    if (className) value.className = className;
    if (text) value.textContent = text;
    return value;
  };
  const time = value => {
    if (!value) return '—';
    const [h, m] = value.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  };
  let loading = false;
  let lastReports;
  function updateProgress(reports) {
    const progress = document.getElementById('progress-hours');
    if (!progress) return;
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem('ojt-profile') || '{}'); } catch {}
    const required = Math.max(0, Number(profile['q-hours-required']) || 0);
    const initial = Math.max(0, Number(profile['q-hours-rendered']) || 0);
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = name => parts.find(item => item.type === name).value;
    const today = `${part('year')}-${part('month')}-${part('day')}`;
    const completed = reports.filter(report => window.isReportComplete(report) && report.date <= today);
    const saved = reports.filter(report => report.date <= today);
    const hours = report => window.reportMinutes(report) / 60;
    const rendered = initial + saved.reduce((sum, report) => sum + hours(report), 0);
    const thisDay = saved.filter(report => report.date === today).reduce((sum, report) => sum + hours(report), 0);
    const percent = required ? Math.min(100, rendered / required * 100) : 0;
    const format = value => Number(value.toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 });
    progress.querySelector('[data-hours-summary]').textContent = required ? `${format(rendered)} / ${format(required)} hrs required` : `${format(rendered)} hrs rendered · Set required hours in profile`;
    progress.querySelector('.pct').textContent = `${Math.round(percent)}%`;
    progress.querySelector('.pct-sub').textContent = required ? 'complete' : 'set target';
    progress.querySelector('[data-hours-day]').textContent = `${format(thisDay)} hrs`;
    progress.querySelector('[data-hours-remaining]').textContent = required ? `${format(Math.max(0, required - rendered))} hrs` : 'Not set';
    const estimate = progress.querySelector('[data-estimated-end]');
    const remaining = Math.max(0, required - rendered);
    const workedDays = saved.filter(report => hours(report) > 0);
    const dailyAverage = workedDays.length ? workedDays.reduce((sum, report) => sum + hours(report), 0) / workedDays.length : 8;
    progress.querySelector('[data-estimate-basis]').textContent = workedDays.length ? `Avg ${format(dailyAverage)} hrs/day · Mon–Fri` : '8 hrs/day estimate · Mon–Fri';
    if (!required) estimate.textContent = 'Not set';
    else if (!remaining) estimate.textContent = 'Completed';
    else {
      const start = profile['q-start-date'] > today ? profile['q-start-date'] : today;
      const end = new Date(`${start}T12:00:00Z`);
      if (start === today) end.setUTCDate(end.getUTCDate() + 1);
      let days = Math.ceil(remaining / dailyAverage);
      while (days > 0) {
        if (end.getUTCDay() !== 0 && end.getUTCDay() !== 6) days--;
        if (days > 0) end.setUTCDate(end.getUTCDate() + 1);
      }
      estimate.textContent = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    }
    progress.querySelector('[data-reports-complete]').textContent = String(completed.length);
    const ring = progress.querySelector('#ring-fg');
    const circumference = 2 * Math.PI * 50;
    ring.style.strokeDasharray = String(circumference);
    ring.style.strokeDashoffset = String(circumference * (1 - percent / 100));
    const graphic = progress.querySelector('.ring-wrap');
    graphic.setAttribute('role', 'img');
    graphic.setAttribute('aria-label', required ? `${format(rendered)} of ${format(required)} hours, ${Math.round(percent)} percent complete` : `${format(rendered)} hours rendered. Required hours not set.`);
  }
  async function load() {
    if (loading) return;
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
      reports.sort((a, b) => b.date.localeCompare(a.date));
      lastReports = reports;
      updateProgress(reports);
      list.replaceChildren();
      counter.textContent = `${reports.length} report${reports.length === 1 ? '' : 's'}`;
      if (!reports.length) list.append(node('li', 'home-reports-empty', 'No reports yet. Save your first report from the Report page.'));
      const limit = Number(list.dataset.limit) || reports.length;
      reports.slice(0, limit).forEach(report => {
        const item = node('li', 'log-item');
        const link = node('a', 'home-report-link');
        link.href = `${list.dataset.reportHref || './pages/report.html'}?date=${encodeURIComponent(report.date)}`;
        const date = new Date(`${report.date}T12:00:00Z`);
        const badge = node('div', 'log-date');
        badge.append(node('span', 'd', String(date.getUTCDate())), node('span', 'm', date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()));
        const info = node('div', 'log-info');
        info.append(node('p', 'log-day', date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', timeZone: 'UTC' })));
        const fields = report.fields || {};
        const sessions = ['am', 'pm'].filter(period => fields[`time-${period}-in`] || fields[`time-${period}-out`]).map(period => `${time(fields[`time-${period}-in`])} – ${time(fields[`time-${period}-out`])}`);
        info.append(node('p', 'log-range', sessions.join(' / ') || 'No time log'));
        const complete = window.isReportComplete(report);
        info.append(node('span', `report-completion ${complete ? 'complete' : 'incomplete'}`, complete ? 'Complete' : 'Incomplete'));
        const hours = node('span', 'log-hours', `${(window.reportMinutes(report) / 60).toFixed(1)}h`);
        link.append(badge, info, hours);
        item.append(link);
        list.append(item);
      });
    } catch {
      const summary = document.querySelector('[data-hours-summary]');
      if (summary) summary.textContent = 'Unable to load hours. Reload to try again.';
      list.replaceChildren(node('li', 'home-reports-empty', 'Unable to load saved reports. Reload to try again.'));
      counter.textContent = '';
    } finally { db?.close(); loading = false; }
  }
  window.addEventListener('pageshow', load);
  window.addEventListener('focus', load);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  window.addEventListener('storage', event => { if (event.key === 'ojt-profile') load(); });
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('ojt-report-updates');
    channel.addEventListener('message', load);
  }
  setInterval(() => { if (!document.hidden && lastReports) updateProgress(lastReports); }, 60000);
  load();
})();
