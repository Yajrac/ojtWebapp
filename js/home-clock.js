(() => {
  'use strict';
  const time = document.getElementById('clock-time');
  const date = document.getElementById('hero-date');
  const greeting = document.getElementById('greeting');
  const greetingText = document.createElement('span');
  const emoji = document.createElement('span');
  emoji.className = 'greeting-emoji';
  emoji.setAttribute('aria-hidden', 'true');
  greeting.replaceChildren(greetingText, document.createTextNode(' '), emoji);
  const zone = 'Asia/Manila';
  const clockFormat = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: true });
  const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const hourFormat = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', hourCycle: 'h23' });
  function update() {
    const now = new Date();
    time.textContent = clockFormat.format(now);
    date.textContent = dateFormat.format(now);
    const hour = Number(hourFormat.format(now));
    greetingText.textContent = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    emoji.textContent = hour < 12 ? '\u{1F31E}' : hour < 18 ? '\u{1F44B}' : '\u{1F319}';
  }
  update();
  setInterval(update, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
})();
