/** All dates in the app are Europe/Prague local dates as YYYY-MM-DD strings. */

const TZ = 'Europe/Prague';

const dateFmt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFmt = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function pragueToday(): string {
  return dateFmt.format(new Date());
}

export function pragueNowHM(): string {
  // cs-CZ formats as "H:mm" or "HH:mm"; normalize to HH:MM
  const [h, m] = timeFmt.format(new Date()).split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday: 1 = Monday … 7 = Sunday */
export function isoWeekday(date: string): number {
  const d = new Date(`${date}T12:00:00Z`);
  const wd = d.getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function isWeekend(date: string): boolean {
  return isoWeekday(date) >= 6;
}

/** Monday of the week containing `date` */
export function weekStart(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

export function compareHM(a: string, b: string): number {
  return a.localeCompare(b);
}

export function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHM(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export const WEEKDAY_NAMES_CS = [
  '',
  'Pondělí',
  'Úterý',
  'Středa',
  'Čtvrtek',
  'Pátek',
  'Sobota',
  'Neděle',
];

export const WEEKDAY_SHORT_CS = ['', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export function formatDateCs(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
}

export function formatDateShortCs(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d}. ${m}.`;
}
