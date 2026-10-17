(() => {
  'use strict';
  window.validateProfileField = (id, raw, values) => {
    const value = raw.trim();
    if (!value) return '';
    if (['q-name', 'q-supervisor'].includes(id)) {
      if (!/^[\p{L}\p{M}]+(?: +[\p{L}\p{M}]+)*$/u.test(value)) return 'Use letters and spaces only. Numbers and special characters are not allowed.';
      if (value.length < 2 || value.length > 100) return 'Enter a name between 2 and 100 characters.';
    } else if (id.includes('email')) {
      if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address, such as name@example.com.';
    } else if (id.includes('phone')) {
      if (!/^9\d{9}$/.test(value)) return 'Enter a 10-digit Philippine mobile number starting with 9. The +63 prefix is already provided.';
    } else if (id === 'q-hours-required') {
      if (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 10000) return 'Enter required hours as a whole number from 1 to 10,000.';
    } else if (id === 'q-hours-rendered') {
      if (!Number.isInteger(Number(value)) || Number(value) < 0) return 'Enter completed hours as a whole number of 0 or more.';
      if (Number(values['q-hours-required']) > 0 && Number(value) > Number(values['q-hours-required'])) return 'Completed hours cannot exceed required hours.';
    } else if (id === 'q-year') {
      if (!['1st year', '2nd year', '3rd year', '4th year'].includes(value)) return 'Select a year level from 1st to 4th year.';
    } else if (id === 'q-start-date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) return 'Choose a valid start date.';
    } else {
      if (value.length < 2 || value.length > 200) return 'Enter between 2 and 200 characters.';
      if (!/[\p{L}]/u.test(value)) return 'Include a name or description, not only numbers or symbols.';
      if (/[<>\u0000-\u001f]/.test(value)) return 'Remove angle brackets and control characters.';
    }
    return '';
  };
})();
