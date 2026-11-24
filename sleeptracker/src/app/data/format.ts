/**
 * Small date/time helpers shared by the data classes and pages.
 * Kept in one place so every screen formats times the same way.
 */

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** 27_120_000 ms -> "7h 32m" */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / MS_PER_MINUTE));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

/** Date -> "11:41 PM" */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** True when both dates fall on the same calendar day (local time). */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/** Midnight at the start of the given date's day. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "Today", "Yesterday", or e.g. "Monday, Nov 23" */
export function dayLabel(date: Date, now: Date = new Date()): string {
  if (isSameDay(date, now)) {
    return 'Today';
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

/**
 * Converts a Date into the local-time ISO format that <ion-datetime> expects
 * ("YYYY-MM-DDTHH:mm"). Date.toISOString() can't be used because it is in UTC.
 */
export function toLocalISO(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export { MS_PER_HOUR, MS_PER_MINUTE };
