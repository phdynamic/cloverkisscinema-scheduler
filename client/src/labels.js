// Theatre-flavoured names for post states. Keys match the API's status values.
export const STATUS_LABELS = {
  pending: 'Awaiting the Manager',
  scheduled: 'On the Marquee',
  draft: 'Rough Cuts',
  sent: 'Premiered',
  failed: 'Projector Jam',
  rejected: 'Sent Back',
};

export const TAB_ORDER = ['pending', 'scheduled', 'draft', 'sent', 'failed', 'rejected'];

export const TAB_HINTS = {
  pending: 'Submitted and waiting for the manager to approve',
  scheduled: 'Approved and queued to post',
  draft: 'Not submitted yet',
  sent: 'Posted to Bluesky',
  failed: 'Something went wrong while posting',
  rejected: 'The manager sent these back with a note',
};

// ISO string -> value for <input type="datetime-local"> in the viewer's timezone.
export function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value) {
  return value ? new Date(value).toISOString() : null;
}

export function formatWhen(iso) {
  if (!iso) return 'No time set';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function graphemeLength(text) {
  try {
    return [...new Intl.Segmenter().segment(text)].length;
  } catch {
    return text.length;
  }
}
