'use client'

import { useState } from 'react'
import { BarChart3, Check, Table2 } from 'lucide-react'
import { dayName, longDate, shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Card, Skeleton } from '../kit'
import { Button } from '../ui/button'

export type TrendRow = { work_date: string; hadir: number; terlambat: number; izin: number }

// Urutan & warna seri tetap (warna divalidasi CVD di globals.css: --chart-1..3).
// Warna mengikuti status, bukan urutan — menyembunyikan satu seri tidak mengubah warna seri lain.
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

export function AttendanceTrend({ days, rows, today, loading, className }: { days: string[]; rows: TrendRow[]; today?: string; loading: boolean; className?: string }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [active, setActive] = useState<number | null>(null)
  const [on, setOn] = useState<Record<Key, boolean>>({ hadir: true, terlambat: true, izin: true })

  const visible = SERIES.filter((s) => on[s.key])
  const toggle = (k: Key) => setOn((prev) => {
    const next = { ...prev, [k]: !prev[k] }
    return Object.values(next).some(Boolean) ? next : prev // minimal satu status tetap tampil
  })

  const data = days.map((d) => {
    const r = rows.find((x) => x.work_date === d)
    const v: Record<Key, number> = { hadir: Number(r?.hadir ?? 0), terlambat: Number(r?.terlambat ?? 0), izin: Number(r?.izin ?? 0) }
    return { date: d, v, total: visible.reduce((sum, s) => sum + v[s.key], 0) }
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
      className={className}
      actions={
        <Button variant="ghost" size="sm" onClick={() => setView(view === 'chart' ? 'table' : 'chart')} aria-pressed={view === 'table'}>
          {view === 'chart' ? <><Table2 /> Tabel</> : <><BarChart3 /> Grafik</>}
        </Button>
      }
    >
      {/* Filter status — sekaligus legenda */}
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter status">
        {SERIES.map((s) => {
          const pressed = on[s.key]
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={pressed}
              onClick={() => toggle(s.key)}
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                pressed ? 'bg-background text-foreground hover:bg-accent' : 'border-dashed text-muted-foreground hover:bg-accent',
              )}
            >
              <span className="grid size-3.5 place-items-center rounded-[4px] border" style={pressed ? { background: s.color, borderColor: s.color } : undefined}>
                {pressed && <Check className="size-2.5 text-white" strokeWidth={3} />}
              </span>
              {s.label}
            </button>
          )
        })}
      </div>

      {loading ? <Skeleton rows={6} /> : view === 'table' ? (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[13px] text-muted-foreground">
                <th className="px-1 py-2 font-medium">Tanggal</th>
                {visible.map((s) => <th key={s.key} className="px-1 py-2 text-right font-medium">{s.label}</th>)}
                <th className="px-1 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.map((d) => (
                <tr key={d.date} className="border-b last:border-0">
                  <td className="px-1 py-2">{dayName(d.date).slice(0, 3)}, {shortDate(d.date)}</td>
                  {visible.map((s) => <td key={s.key} className="px-1 py-2 text-right">{d.v[s.key]}</td>)}
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
            <div className="relative h-52 w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:h-56" aria-hidden="true">
              {ticks.map((t) => (
                <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>{t}</span>
              ))}
            </div>

            {/* Area plot */}
            <div className="relative h-52 min-w-0 flex-1 sm:h-56" onMouseLeave={() => setActive(null)}>
              {ticks.map((t) => (
                <div key={t} aria-hidden="true" className={cn('absolute inset-x-0 border-t', t === 0 ? 'border-border' : 'border-border/60')} style={{ bottom: `${(t / top) * 100}%` }} />
              ))}

              {empty && (
                <div className="absolute inset-0 grid place-items-center">
                  <p className="rounded-md bg-card px-3 py-1.5 text-sm text-muted-foreground">Belum ada data untuk status yang dipilih</p>
                </div>
              )}

              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                {data.map((d, i) => {
                  const segs = visible.filter((s) => d.v[s.key] > 0)
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      aria-label={`${longDate(d.date)}: ${visible.map((s) => `${s.label} ${d.v[s.key]}`).join(', ')}, total ${d.total}`}
                      className={cn('relative flex h-full items-end justify-center rounded-md outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40', active === i && 'bg-muted/60')}
                    >
                      {d.total > 0 && (
                        <span className="flex w-full max-w-6 flex-col-reverse gap-[2px] transition-[height] duration-300" style={{ height: `${(d.total / top) * 100}%` }}>
                          {segs.map((s, j) => (
                            <span
                              key={s.key}
                              className={cn('block w-full min-h-[3px]', j === segs.length - 1 && 'rounded-t-[4px]')}
                              style={{ flexGrow: d.v[s.key], flexBasis: 0, background: s.color }}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Tooltip di samping kolom agar batang yang di-hover tetap terlihat */}
              {a && (
                <div
                  role="status"
                  className="pointer-events-none absolute top-0 z-10 w-48 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
                  style={active! < n / 2
                    ? { left: `calc(${((active! + 1) / n) * 100}% + 6px)` }
                    : { right: `calc(${((n - active!) / n) * 100}% + 6px)` }}
                >
                  <p className="text-xs text-muted-foreground">{longDate(a.date)}</p>
                  <ul className="mt-2 grid gap-1.5 text-sm">
                    {visible.map((s) => (
                      <li key={s.key} className="flex items-center gap-2">
                        <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                        <span className="font-semibold tabular-nums">{a.v[s.key]}</span>
                        <span className="truncate text-muted-foreground">{s.label}</span>
                      </li>
                    ))}
                  </ul>
                  {visible.length > 1 && <p className="mt-2 border-t pt-2 text-sm"><span className="font-semibold tabular-nums">{a.total}</span> <span className="text-muted-foreground">total</span></p>}
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
        </div>
      )}
    </Card>
  )
}
