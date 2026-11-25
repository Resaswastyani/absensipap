'use client'

import { useState } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { dayName, longDate, shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Card, Skeleton } from '../kit'
import { Button } from '../ui/button'

export type TrendRow = { work_date: string; hadir: number; terlambat: number; izin: number }

// Urutan & warna seri tetap (warna divalidasi CVD di globals.css: --chart-1..3).
const SERIES = [
  { key: 'hadir', label: 'Tepat waktu', color: 'var(--chart-1)' },
  { key: 'terlambat', label: 'Terlambat', color: 'var(--chart-2)' },
  { key: 'izin', label: 'Izin / sakit / cuti', color: 'var(--chart-3)' },
] as const
type Key = (typeof SERIES)[number]['key']

/** Skala sumbu Y yang "bulat": 4 interval, kelipatan 1/2/5/10/… */
function niceScale(max: number) {
  if (max <= 4) return { top: 4, step: 1 }
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw && Number.isInteger(s)) ?? Math.ceil(raw)
  return { top: step * 4, step }
}

export function AttendanceTrend({ days, rows, today, loading }: { days: string[]; rows: TrendRow[]; today?: string; loading: boolean }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [active, setActive] = useState<number | null>(null)

  const data = days.map((d) => {
    const r = rows.find((x) => x.work_date === d)
    const v = { hadir: Number(r?.hadir ?? 0), terlambat: Number(r?.terlambat ?? 0), izin: Number(r?.izin ?? 0) }
    return { date: d, ...v, total: v.hadir + v.terlambat + v.izin }
  })
  const { top, step } = niceScale(Math.max(0, ...data.map((d) => d.total)))
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step)
  const empty = data.every((d) => d.total === 0)
  const n = data.length || 7
  const a = active != null ? data[active] : null

  return (
    <Card
      title="Tren 7 hari"
      description="Jumlah karyawan per status kehadiran"
      className="xl:col-span-2"
      actions={
        <Button variant="ghost" size="sm" onClick={() => setView(view === 'chart' ? 'table' : 'chart')} aria-pressed={view === 'table'}>
          {view === 'chart' ? <><Table2 /> Tabel</> : <><BarChart3 /> Grafik</>}
        </Button>
      }
    >
      {loading ? <Skeleton rows={6} /> : view === 'table' ? (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[13px] text-muted-foreground">
                <th className="px-1 py-2 font-medium">Tanggal</th>
                {SERIES.map((s) => <th key={s.key} className="px-1 py-2 text-right font-medium">{s.label}</th>)}
                <th className="px-1 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.map((d) => (
                <tr key={d.date} className="border-b last:border-0">
                  <td className="px-1 py-2">{dayName(d.date).slice(0, 3)}, {shortDate(d.date)}</td>
                  {SERIES.map((s) => <td key={s.key} className="px-1 py-2 text-right">{d[s.key as Key]}</td>)}
                  <td className="px-1 py-2 text-right font-medium">{d.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 sm:gap-3">
            {/* Sumbu Y */}
            <div className="relative h-56 w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:h-64" aria-hidden="true">
              {ticks.map((t) => (
                <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>{t}</span>
              ))}
            </div>

            {/* Area plot */}
            <div className="relative h-56 min-w-0 flex-1 sm:h-64" onMouseLeave={() => setActive(null)}>
              {ticks.map((t) => (
                <div key={t} aria-hidden="true" className={cn('absolute inset-x-0 border-t', t === 0 ? 'border-border' : 'border-border/60')} style={{ bottom: `${(t / top) * 100}%` }} />
              ))}

              {empty && (
                <div className="absolute inset-0 grid place-items-center">
                  <p className="rounded-md bg-card px-3 py-1.5 text-sm text-muted-foreground">Belum ada data kehadiran pada periode ini</p>
                </div>
              )}

              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                {data.map((d, i) => {
                  const segs = SERIES.filter((s) => d[s.key as Key] > 0)
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      aria-label={`${longDate(d.date)}: ${SERIES.map((s) => `${s.label} ${d[s.key as Key]}`).join(', ')}, total ${d.total}`}
                      className={cn('relative flex h-full items-end justify-center rounded-md outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40', active === i && 'bg-muted/60')}
                    >
                      {d.total > 0 && (
                        <span className="flex w-full max-w-6 flex-col-reverse gap-[2px]" style={{ height: `${(d.total / top) * 100}%` }}>
                          {segs.map((s, j) => (
                            <span
                              key={s.key}
                              className={cn('block w-full min-h-[3px]', j === segs.length - 1 && 'rounded-t-[4px]')}
                              style={{ flexGrow: d[s.key as Key], flexBasis: 0, background: s.color }}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Tooltip */}
              {a && (
                <div
                  role="status"
                  className="pointer-events-none absolute top-0 z-10 w-48 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
                  // Di samping kolom (bukan di atasnya) agar batang yang di-hover tetap terlihat.
                  style={active! < n / 2
                    ? { left: `calc(${((active! + 1) / n) * 100}% + 6px)` }
                    : { right: `calc(${((n - active!) / n) * 100}% + 6px)` }}
                >
                  <p className="text-xs text-muted-foreground">{longDate(a.date)}</p>
                  <ul className="mt-2 grid gap-1.5 text-sm">
                    {SERIES.map((s) => (
                      <li key={s.key} className="flex items-center gap-2">
                        <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                        <span className="font-semibold tabular-nums">{a[s.key as Key]}</span>
                        <span className="truncate text-muted-foreground">{s.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 border-t pt-2 text-sm"><span className="font-semibold tabular-nums">{a.total}</span> <span className="text-muted-foreground">total</span></p>
                </div>
              )}
            </div>
          </div>

          {/* Sumbu X */}
          <div className="mt-2 ml-8 grid sm:ml-9" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-hidden="true">
            {data.map((d) => (
              <div key={d.date} className={cn('text-center text-xs leading-tight text-muted-foreground', d.date === today && 'font-semibold text-foreground')}>
                <div>{dayName(d.date).slice(0, 3)}</div>
                <div className="tabular-nums">{Number(d.date.slice(8, 10))}</div>
              </div>
            ))}
          </div>

          {/* Legenda */}
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
            {SERIES.map((s) => (
              <li key={s.key} className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />{s.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
