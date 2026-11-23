'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus, Send } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { dateTime, shortDate, STATUS_LABEL, todayLocal } from '@/lib/format'
import { Alert, Button, Card, ConfirmDialog, EmptyState, Field, Modal, PageHeader, Skeleton, StatusBadge, useToast } from '../ui'

type Req = { id: number; type: string; start_date: string; end_date: string; reason: string; status: string; review_note: string | null; reviewed_at: string | null; created_at: string; reviewer_name: string | null }

const TYPES = [
  { value: 'izin', label: 'Izin', hint: 'Keperluan pribadi/keluarga' },
  { value: 'sakit', label: 'Sakit', hint: 'Sertakan keterangan dokter ke HR bila ada' },
  { value: 'cuti', label: 'Cuti', hint: 'Cuti tahunan / khusus' },
  { value: 'koreksi', label: 'Koreksi absensi', hint: 'Lupa absen atau data keliru' },
]

export function EmployeeRequests() {
  const toast = useToast()
  const [rows, setRows] = useState<Req[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(() => api<Req[]>('/api/leave-requests').then(setRows).catch((e) => setError(errorMessage(e))), [])
  useEffect(() => { load() }, [load])

  const cancel = async () => {
    if (!cancelId) return
    setCancelling(true)
    try {
      await api(`/api/leave-requests/${cancelId}`, { method: 'DELETE' })
      toast('Pengajuan dibatalkan.')
      setCancelId(null)
      load()
    } catch (e) {
      toast(errorMessage(e), 'danger')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="LAYANAN HR" title="Pengajuan" description="Ajukan izin, sakit, cuti, atau koreksi absensi. Status akan diperbarui setelah ditinjau HR."
        actions={<Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Buat pengajuan</Button>} />
      {error && <Alert tone="danger">{error}</Alert>}
      <Card title="Riwayat pengajuan" subtitle="SEMUA PENGAJUAN" flush>
        {!rows ? <div className="pad"><Skeleton rows={4} /></div> : rows.length === 0 ? (
          <EmptyState title="Belum ada pengajuan" description="Pengajuan yang Anda buat akan muncul di sini." />
        ) : (
          <ul className="request-list">
            {rows.map((r) => (
              <li key={r.id} className="request-item">
                <div className="request-main">
                  <div className="request-title"><strong>{STATUS_LABEL[r.type] ?? r.type}</strong><StatusBadge status={r.status} /></div>
                  <span className="request-date">{r.start_date === r.end_date ? shortDate(r.start_date) : `${shortDate(r.start_date)} – ${shortDate(r.end_date)}`}</span>
                  <p>{r.reason}</p>
                  {r.review_note && <p className="review-note"><strong>Catatan HR:</strong> {r.review_note}</p>}
                  <small className="muted-text">Diajukan {dateTime(r.created_at)}{r.reviewer_name ? ` · ditinjau ${r.reviewer_name}` : ''}</small>
                </div>
                {r.status === 'menunggu' && <Button variant="ghost" className="btn-sm" onClick={() => setCancelId(r.id)}>Batalkan</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RequestForm open={open} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); toast('Pengajuan terkirim ke HR.'); load() }} />
      <ConfirmDialog open={cancelId !== null} title="Batalkan pengajuan?" message="Pengajuan yang dibatalkan tidak dapat diaktifkan kembali." confirmLabel="Ya, batalkan" loading={cancelling} onConfirm={cancel} onClose={() => setCancelId(null)} />
    </div>
  )
}

function RequestForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState('izin')
  const [start, setStart] = useState(todayLocal())
  const [end, setEnd] = useState(todayLocal())
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (open) { setType('izin'); setStart(todayLocal()); setEnd(todayLocal()); setReason(''); setError('') } }, [open])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api('/api/leave-requests', { method: 'POST', body: { type, start_date: start, end_date: end < start ? start : end, reason } })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Pengajuan baru" subtitle="FORMULIR HR" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="req-form" loading={loading} icon={<Send size={15} />}>Kirim pengajuan</Button></>}>
      <form id="req-form" className="form-stack" onSubmit={submit}>
        <Field label="Jenis pengajuan">
          <div className="choice-grid">
            {TYPES.map((t) => (
              <label key={t.value} className={`choice ${type === t.value ? 'checked' : ''}`}>
                <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} />
                <strong>{t.label}</strong><small>{t.hint}</small>
              </label>
            ))}
          </div>
        </Field>
        <div className="form-row">
          <Field label="Tanggal mulai" htmlFor="req-start"><input id="req-start" className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
          <Field label="Tanggal selesai" htmlFor="req-end"><input id="req-end" className="input" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} required /></Field>
        </div>
        <Field label="Alasan / keterangan" htmlFor="req-reason" hint={`${reason.length}/500 karakter`}>
          <textarea id="req-reason" className="input" rows={4} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === 'koreksi' ? 'cth. Lupa check-out pada 12 Nov, pulang pukul 17:05.' : 'Jelaskan alasan pengajuan Anda.'} required />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
      </form>
    </Modal>
  )
}
