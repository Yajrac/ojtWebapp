(() => {
  const form = document.querySelector('.setup-profile-form');
  try {
    const saved = JSON.parse(localStorage.getItem('ojt-profile') || '{}');
    form.querySelectorAll('input[id], select[id], textarea[id]').forEach(input => {
      if (typeof saved[input.id] === 'string') {
        input.value = saved[input.id];
        if (['q-school', 'q-course'].includes(input.id) && saved[input.id] && !input.value) {
          input.value = 'other';
          document.getElementById(`${input.id}-other`).value = saved[input.id];
        }
      }
    });
  } catch {}
  ['q-school', 'q-course'].forEach(id => {
    const select = document.getElementById(id);
    const other = document.getElementById(`${id}-other`);
    const container = document.querySelector(`[data-other-field="${id}"]`);
    const toggle = () => {
      const active = select.value === 'other';
      container.hidden = !active;
      other.disabled = !active;
      other.required = active;
      if (!active) { other.setCustomValidity(''); other.removeAttribute('aria-invalid'); document.getElementById(`${other.id}-error`)?.setAttribute('hidden', ''); }
    };
    select.addEventListener('change', () => {
      toggle();
      if (select.value === 'other') other.focus();
    });
    toggle();
  });
  const phoneFields = new Map();
  ['q-phone', 'q-supervisor-phone'].forEach(id => {
    const input = document.getElementById(id);
    const wrapper = document.createElement('div');
    wrapper.className = 'ph-phone-field';
    const prefix = document.createElement('input');
    prefix.type = 'text';
    prefix.value = '+63';
    prefix.readOnly = true;
    prefix.tabIndex = -1;
    prefix.setAttribute('aria-label', 'Philippines country code, fixed +63');
    input.before(wrapper);
    wrapper.append(prefix, input);
    const saved = input.value.replace(/\D/g, '');
    input.value = saved.startsWith('63') && saved.length === 12 ? saved.slice(2) : saved.startsWith('0') && saved.length === 11 ? saved.slice(1) : saved;
    input.placeholder = '9XXXXXXXXX';
    input.autocomplete = 'tel-national';
    phoneFields.set(id, input);
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 10); });
  });
  const inputs = Array.from(form.querySelectorAll('input[id], select[id], textarea[id]'));
  const capitalizeName = input => {
    if (['q-name', 'q-supervisor'].includes(input.id)) input.value = input.value.trim().replace(/(^|\s)(\p{L})/gu, (_, space, letter) => space + letter.toLocaleUpperCase());
  };
  form.noValidate = true;
  const errors = new Map();
  const touched = new Set();
  const values = () => Object.fromEntries(inputs.map(input => [input.id, input.value.trim()]));
  function validate(input) {
    if (input.disabled) return true;
    input.setCustomValidity('');
    const value = input.value.trim();
    let error = input.required && !value ? 'This field is required.' : window.validateProfileField(input.id, input.value, values());
    if (!error && !input.validity.valid) error = 'Enter a valid value for this field.';
    input.setCustomValidity(error);
    input.setAttribute('aria-invalid', String(Boolean(error)));
    const message = errors.get(input.id);
    message.textContent = error;
    message.hidden = !error;
    return !error;
  }
  inputs.forEach(input => {
    if (input.type === 'text') input.maxLength = ['q-name', 'q-supervisor'].includes(input.id) ? 100 : 200;
    if (input.type === 'email') input.maxLength = 254;
    if (input.type === 'tel') { input.maxLength = 10; input.inputMode = 'numeric'; }
    const error = document.createElement('p');
    error.id = `${input.id}-error`;
    error.className = 'onboarding-field-error';
    error.hidden = true;
    error.setAttribute('aria-live', 'polite');
    (phoneFields.has(input.id) ? input.parentElement : input).after(error);
    errors.set(input.id, error);
    input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), error.id].filter(Boolean).join(' '));
    input.addEventListener('blur', () => { touched.add(input.id); input.value = input.value.trim(); capitalizeName(input); validate(input); });
    input.addEventListener('input', () => {
      if (touched.has(input.id)) validate(input);
      if (input.id === 'q-hours-required' && touched.has('q-hours-rendered')) validate(document.getElementById('q-hours-rendered'));
    });
  });
  let submitting = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    inputs.forEach(input => { touched.add(input.id); input.value = input.value.trim(); capitalizeName(input); });
    const invalid = inputs.filter(input => !validate(input));
    if (invalid.length) { invalid[0].focus(); return; }
    try {
      const profile = Object.fromEntries(Array.from(form.querySelectorAll('input[id], select[id], textarea[id]'), input => [input.id, input.value.trim()]));
      phoneFields.forEach((input, id) => { profile[id] = input.value ? `+63${input.value}` : ''; });
      ['q-school', 'q-course'].forEach(id => {
        if (profile[id] === 'other') profile[id] = profile[`${id}-other`];
        delete profile[`${id}-other`];
      });
      localStorage.setItem('ojt-profile', JSON.stringify(profile));
      submitting = true;
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Preparing your workspace...';
      window.AppLoading?.show('Preparing your workspace...');
      await new Promise(resolve => setTimeout(resolve, 900));
      location.replace('../Home.html');
    } catch {
      submitting = false;
      window.AppLoading?.hide();
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = false;
      submit.textContent = 'Continue to Home';
      event.preventDefault();
      alert('Unable to save your profile. Allow browser storage and try again.');
    }
  });
})();
