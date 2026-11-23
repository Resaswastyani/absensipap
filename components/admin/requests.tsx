'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { dateTime, shortDate, STATUS_LABEL } from '@/lib/format'
import { Alert, Avatar, Button, Card, EmptyState, Field, Modal, PageHeader, Skeleton, StatusBadge, Tabs, useToast } from '../ui'

type Req = { id: number; type: string; start_date: string; end_date: string; reason: string; status: string; review_note: string | null; reviewed_at: string | null; created_at: string; user_id: number; name: string; nik: string; department: string | null; reviewer_name: string | null }

function days(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1
}

export function AdminRequests() {
  const toast = useToast()
  const [tab, setTab] = useState<'menunggu' | 'disetujui' | 'ditolak' | ''>('menunggu')
  const [rows, setRows] = useState<Req[] | null>(null)
  const [pendingCount, setPendingCount] = useState<number | undefined>()
  const [error, setError] = useState('')
  const [review, setReview] = useState<{ req: Req; action: 'approve' | 'reject' } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api<Req[]>(`/api/admin/leave-requests${tab ? `?status=${tab}` : ''}`)
      setRows(data)
      if (tab === 'menunggu') setPendingCount(data.length)
      setError('')
    } catch (e) { setError(errorMessage(e)) }
  }, [tab])

  useEffect(() => { setRows(null); load() }, [load])

  const submit = async () => {
    if (!review) return
    setBusy(true)
    try {
      await api(`/api/admin/leave-requests/${review.req.id}`, { method: 'PATCH', body: { action: review.action, note: note.trim() || undefined } })
      toast(review.action === 'approve' ? 'Pengajuan disetujui.' : 'Pengajuan ditolak.')
      setReview(null)
      setNote('')
      load()
    } catch (e) {
      toast(errorMessage(e), 'danger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="PERSETUJUAN HR" title="Pengajuan karyawan" description="Tinjau pengajuan izin, sakit, cuti, dan koreksi absensi. Pengajuan yang disetujui otomatis tercatat di absensi." />
      <Tabs value={tab} onChange={setTab} items={[{ value: 'menunggu', label: 'Menunggu', count: pendingCount }, { value: 'disetujui', label: 'Disetujui' }, { value: 'ditolak', label: 'Ditolak' }, { value: '', label: 'Semua' }]} />
      {error && <Alert tone="danger">{error}</Alert>}
      <Card flush>
        {!rows ? <div className="pad"><Skeleton rows={5} /></div> : rows.length === 0 ? (
          <EmptyState title={tab === 'menunggu' ? 'Tidak ada pengajuan menunggu' : 'Belum ada data'} description={tab === 'menunggu' ? 'Semua pengajuan sudah ditinjau. 🎉' : undefined} />
        ) : (
          <ul className="request-list">
            {rows.map((r) => (
              <li key={r.id} className="request-item">
                <Avatar name={r.name} size={40} />
                <div className="request-main">
                  <div className="request-title"><strong>{r.name}</strong><span className="muted-text">NIK {r.nik}{r.department ? ` · ${r.department}` : ''}</span></div>
                  <div className="request-title"><span className="chip">{STATUS_LABEL[r.type] ?? r.type}</span><span className="request-date">{r.start_date === r.end_date ? shortDate(r.start_date) : `${shortDate(r.start_date)} – ${shortDate(r.end_date)}`} · {days(r.start_date, r.end_date)} hari</span><StatusBadge status={r.status} /></div>
                  <p>{r.reason}</p>
                  {r.review_note && <p className="review-note"><strong>Catatan:</strong> {r.review_note}</p>}
                  <small className="muted-text">Diajukan {dateTime(r.created_at)}{r.reviewer_name ? ` · ditinjau ${r.reviewer_name} ${dateTime(r.reviewed_at)}` : ''}</small>
                </div>
                {r.status === 'menunggu' && (
                  <div className="request-actions">
                    <Button variant="secondary" className="btn-sm" icon={<X size={15} />} onClick={() => { setNote(''); setReview({ req: r, action: 'reject' }) }}>Tolak</Button>
                    <Button variant="success" className="btn-sm" icon={<Check size={15} />} onClick={() => { setNote(''); setReview({ req: r, action: 'approve' }) }}>Setujui</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={review !== null} onClose={() => setReview(null)} size="sm" title={review?.action === 'approve' ? 'Setujui pengajuan?' : 'Tolak pengajuan?'} subtitle={review ? `${review.req.name} · ${STATUS_LABEL[review.req.type]}` : ''}
        footer={<><Button variant="secondary" onClick={() => setReview(null)}>Batal</Button><Button variant={review?.action === 'approve' ? 'success' : 'danger'} loading={busy} onClick={submit}>{review?.action === 'approve' ? 'Setujui' : 'Tolak'}</Button></>}>
        <div className="form-stack">
          {review?.action === 'approve' && review.req.type !== 'koreksi' && <Alert tone="info">Status absensi pada tanggal tersebut akan diisi otomatis sebagai <strong>{review.req.type}</strong>.</Alert>}
          {review?.action === 'approve' && review.req.type === 'koreksi' && <Alert tone="info">Setelah disetujui, lakukan koreksi jam di menu <strong>Absensi</strong>.</Alert>}
          <Field label={review?.action === 'reject' ? 'Alasan penolakan (wajib)' : 'Catatan (opsional)'} htmlFor="rv-note">
            <textarea id="rv-note" className="input" rows={3} maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
