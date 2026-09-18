const escape = (s) =>
  String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
const stamp = (s) =>
  new Date(s)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
// Fold by UTF-8 byte length; RFC 5545 specifies a 75-octet line limit.
function fold(line) {
  let result = '',
    part = '';
  for (const char of line) {
    if (Buffer.byteLength(part + char) > 74) {
      result += part + '\r\n';
      part = ' ';
    }
    part += char;
  }
  return result + part;
}
export function calendar(session, origin) {
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Common//Volunteering//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${session.id}@common-volunteering`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(session.starts_at)}`,
      `DTEND:${stamp(session.ends_at)}`,
      `SUMMARY:${escape(session.title)}`,
      `LOCATION:${escape(session.address)}`,
      `DESCRIPTION:${escape('Hosted by ' + session.organisation_name + '. ' + session.requirements + '\nAdding this event to your calendar does not reserve a place.')}`,
      `URL:${origin}/opportunities/${session.id}`,
      `STATUS:${session.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .map(fold)
      .join('\r\n') + '\r\n'
  );
}
