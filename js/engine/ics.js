// Builds an .ics calendar file so deadlines land in the user's own calendar.

function stamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * @param {{date: string, label: string, detail?: string}[]} events all-day events (ISO dates)
 * @param {string} uidPrefix
 */
export function buildIcs(events, uidPrefix = 'billo') {
  const body = events.map((e, i) => {
    const day = e.date.replace(/-/g, '');
    return [
      'BEGIN:VEVENT',
      `UID:${uidPrefix}-${i}-${day}@billo.app`,
      `DTSTAMP:${stamp()}`,
      `DTSTART;VALUE=DATE:${day}`,
      `SUMMARY:${escapeText(`Billo: ${e.label}`)}`,
      `DESCRIPTION:${escapeText(e.detail || 'Deadline from your Billo bill check.')}`,
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(`7 days left: ${e.label}`)}`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Billo//Bill Deadlines//EN', 'CALSCALE:GREGORIAN', ...body, 'END:VCALENDAR'].join('\r\n');
}
