(() => {
  'use strict';
  window.reportMinutes = report => {
    const fields = report.fields || {};
    const minutes = value => {
      if (!/^\d{2}:\d{2}$/.test(value || '')) return null;
      const [h, m] = value.split(':').map(Number);
      return h < 24 && m < 60 ? h * 60 + m : null;
    };
    const ai = minutes(fields['time-am-in']), ao = minutes(fields['time-am-out']);
    const pi = minutes(fields['time-pm-in']), po = minutes(fields['time-pm-out']);
    if (ai !== null && po !== null && ao === null && pi === null) return Math.max(0, po - ai);
    return (ai !== null && ao !== null ? Math.max(0, ao - ai) : 0) + (pi !== null && po !== null ? Math.max(0, po - pi) : 0);
  };
  window.isReportComplete = report => {
    const fields = report.fields || {};
    let hasSession = false;
    const crossDay = fields['time-am-in'] && fields['time-pm-out'] && !fields['time-am-out'] && !fields['time-pm-in'] && window.reportMinutes(report) > 0;
    for (const period of ['am', 'pm']) {
      const start = fields[`time-${period}-in`] || '';
      const end = fields[`time-${period}-out`] || '';
      if (Boolean(start) !== Boolean(end) && !crossDay) return false;
      if (start && end) {
        if (end <= start) return false;
        hasSession = true;
      }
    }
    return Boolean(hasSession || crossDay) && Boolean(fields['field-tasks']?.trim()) && Boolean(fields['field-objectives']?.trim()) && Array.isArray(report.photos) && report.photos.length > 0;
  };
})();
