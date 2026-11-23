import 'server-only'

const TZ = 'Asia/Jakarta'

function parts(date: Date) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  })
  const map = Object.fromEntries(f.formatToParts(date).map((p) => [p.type, p.value]))
  return map as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', string>
}

/** Waktu server saat ini di zona Asia/Jakarta. */
export function nowJakarta(date = new Date()) {
  const p = parts(date)
  const dateStr = `${p.year}-${p.month}-${p.day}`
  const timeStr = `${p.hour}:${p.minute}:${p.second}`
  return {
    date: dateStr,
    time: timeStr,
    datetime: `${dateStr} ${timeStr}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
  }
}

export function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  return { start, end }
}
