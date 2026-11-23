export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function parseDate(date: string) {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}

/** "2026-11-23" → "Senin, 23 November 2026" */
export function longDate(date: string) {
  const { y, m, d, dow } = parseDate(date)
  return `${DAYS[dow]}, ${d} ${MONTHS[m - 1]} ${y}`
}

/** "2026-11-23" → "23 Nov 2026" */
export function shortDate(date: string | null | undefined) {
  if (!date) return '—'
  const { y, m, d } = parseDate(date)
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`
}

export function dayName(date: string) {
  return DAYS[parseDate(date).dow]
}

export function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

/** "2026-11-23 08:02:11" → "08:02" */
export function hm(datetime: string | null | undefined) {
  if (!datetime) return '—'
  const t = datetime.length > 8 ? datetime.slice(11) : datetime
  return t.slice(0, 5)
}

export function duration(from: string | null, to: string | null) {
  if (!from || !to) return '—'
  const ms = Date.parse(to.replace(' ', 'T')) - Date.parse(from.replace(' ', 'T'))
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const mins = Math.round(ms / 60000)
  return `${Math.floor(mins / 60)}j ${String(mins % 60).padStart(2, '0')}m`
}

export function dateTime(datetime: string | null | undefined) {
  if (!datetime) return '—'
  return `${shortDate(datetime)}, ${hm(datetime)}`
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
}

export const STATUS_LABEL: Record<string, string> = {
  hadir: 'Hadir', terlambat: 'Terlambat', izin: 'Izin', sakit: 'Sakit', cuti: 'Cuti', alpha: 'Alpha',
  belum: 'Belum hadir', menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak', dibatalkan: 'Dibatalkan',
  koreksi: 'Koreksi absensi',
}

export const STATUS_TONE: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  hadir: 'success', disetujui: 'success', terlambat: 'warning', menunggu: 'warning',
  izin: 'info', sakit: 'info', cuti: 'info', koreksi: 'info',
  alpha: 'danger', ditolak: 'danger', belum: 'neutral', dibatalkan: 'neutral',
}

export function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function greeting(hour = new Date().getHours()) {
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}
