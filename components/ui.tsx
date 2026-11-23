'use client'

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Inbox, Info, Loader2, X } from 'lucide-react'
import { STATUS_LABEL, STATUS_TONE } from '@/lib/format'

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}

export function Card({ title, subtitle, actions, children, className = '', flush = false }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`card ${flush ? 'card-flush' : ''} ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {subtitle && <span className="card-subtitle">{subtitle}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function StatCard({ label, value, unit, icon, tone = 'primary', hint }: { label: string; value: ReactNode; unit?: string; icon: ReactNode; tone?: 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'neutral'; hint?: ReactNode }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon tone-${tone}`}>{icon}</span>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}{unit && <small> {unit}</small>}</strong>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </div>
  )
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`badge tone-${STATUS_TONE[status] ?? 'neutral'}`}><i />{label ?? STATUS_LABEL[status] ?? status}</span>
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const palette = ['#0b8fc0', '#2f9e7a', '#c27b3a', '#6b72c9', '#c25b7a', '#3b8a96']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const color = palette[h % palette.length]
  const text = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, color, background: `${color}1a` }} aria-hidden="true">{text}</span>
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon ?? <Inbox size={22} />}</span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  )
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return <div className="spinner-wrap" role="status"><Loader2 className="spin" size={20} /><span>{label}</span></div>
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return <div className="skeleton-list" aria-hidden="true">{Array.from({ length: rows }).map((_, i) => <span key={i} className="skeleton" />)}</div>
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertTriangle
  return <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}><Icon size={17} /><div>{children}</div></div>
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', dismissible = true }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg'; dismissible?: boolean }) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && dismissible) onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.modal-x)')?.focus(), 30)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.() }
  }, [open, onClose, dismissible])
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && dismissible) onClose() }}>
      <div ref={ref} className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <header className="modal-head">
          <div>
            {subtitle && <span className="card-subtitle">{subtitle}</span>}
            <h2 id={id}>{title}</h2>
          </div>
          {dismissible && <button type="button" className="icon-btn modal-x" aria-label="Tutup" onClick={onClose}><X size={18} /></button>}
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className={`field ${error ? 'field-error' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <span className="field-msg">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  )
}

export function Button({ children, variant = 'primary', loading, icon, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button {...props} className={`btn btn-${variant} ${className}`} disabled={props.disabled || loading}>
      {loading ? <Loader2 size={16} className="spin" /> : icon}
      {children}
    </button>
  )
}

/* ---------- Toast ---------- */
type Toast = { id: number; tone: 'success' | 'danger' | 'info'; message: string }
const ToastCtx = createContext<(message: string, tone?: Toast['tone']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, tone, message }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.tone === 'success' ? <CheckCircle2 size={17} /> : t.tone === 'danger' ? <AlertTriangle size={17} /> : <Info size={17} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

/* ---------- Konfirmasi ---------- */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Ya, lanjutkan', tone = 'danger', loading, onConfirm, onClose }: { open: boolean; title: string; message: ReactNode; confirmLabel?: string; tone?: 'danger' | 'primary'; loading?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant={tone} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <p className="muted-text">{message}</p>
    </Modal>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((it) => (
        <button key={it.value} role="tab" type="button" aria-selected={value === it.value} className={value === it.value ? 'active' : ''} onClick={() => onChange(it.value)}>
          {it.label}{it.count != null && <span className="tab-count">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}
