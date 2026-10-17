(() => {
  'use strict';
  const calendar = document.querySelector('.home-calendar');
  if (!calendar) return;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  const part = name => Number(parts.find(value => value.type === name).value);
  const today = { year: part('year'), month: part('month') - 1, day: part('day') };
  let year = today.year;
  let month = today.month;
  const heading = calendar.querySelector('[data-calendar-month]');
  const days = calendar.querySelector('[data-calendar-days]');
  const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' });
  function render() {
    heading.textContent = monthFormat.format(new Date(Date.UTC(year, month, 1)));
    days.replaceChildren();
    const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
    for (let index = 0; index < 42; index++) {
      const date = new Date(Date.UTC(year, month, index - firstDay + 1));
      const cell = document.createElement('time');
      cell.className = 'calendar-date';
      cell.textContent = date.getUTCDate();
      cell.dateTime = date.toISOString().slice(0, 10);
      cell.setAttribute('aria-label', dateFormat.format(date));
      if (date.getUTCMonth() !== month) cell.classList.add('outside-month');
      if (date.getUTCFullYear() === today.year && date.getUTCMonth() === today.month && date.getUTCDate() === today.day) {
        cell.classList.add('is-today');
        cell.setAttribute('aria-current', 'date');
      }
      days.append(cell);
    }
  }
  function move(delta) {
    const date = new Date(Date.UTC(year, month + delta, 1));
    year = date.getUTCFullYear();
    month = date.getUTCMonth();
    render();
  }
  calendar.querySelector('[data-calendar-prev]').addEventListener('click', () => move(-1));
  calendar.querySelector('[data-calendar-next]').addEventListener('click', () => move(1));
  calendar.querySelector('[data-calendar-today]').addEventListener('click', () => { year = today.year; month = today.month; render(); });
  render();
})();
