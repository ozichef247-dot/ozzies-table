/**
 * All ordering rules run on UK wall-clock time (Europe/London), whatever the server's timezone.
 * A "wall" value is milliseconds since epoch for the UK local date/time read as if it were UTC.
 * That keeps date arithmetic simple and deadlines correct across BST/GMT changes.
 */
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export const pad = (n: number) => String(n).padStart(2, '0')

export function ukParts(d: Date = new Date()) {
  const p: Record<string, string> = {}
  for (const x of fmt.formatToParts(d)) p[x.type] = x.value
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute }
}

/** Current UK wall-clock time as a wall value. */
export function ukNow(now: Date = new Date()) {
  const p = ukParts(now)
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi)
}

export function todayUK(now: Date = new Date()) {
  const p = ukParts(now)
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

export function wall(date: string, time = '00:00') {
  const [y, m, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return Date.UTC(y, m - 1, d, h, mi)
}

export function addDays(date: string, n: number) {
  return new Date(wall(date) + n * 864e5).toISOString().slice(0, 10)
}

export function dow(date: string) {
  return new Date(wall(date)).getUTCDay()
}

export function fmtDate(date: string, long = false) {
  const d = new Date(wall(date))
  return long
    ? `${DOW_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MON_LONG[d.getUTCMonth()]}`
    : `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`
}

export function fmtWall(ms: number) {
  const d = new Date(ms)
  return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

export function fmtShortWall(ms: number) {
  const d = new Date(ms)
  return `${DOW[d.getUTCDay()]} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

/** A real timestamp (ISO string) shown in UK time. */
export function fmtStamp(iso: string) {
  const p = ukParts(new Date(iso))
  return fmtWall(Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi))
}

export const hhmm = (t: string) => t.slice(0, 5)
