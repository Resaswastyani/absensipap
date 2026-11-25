'use client'

import type { ReactNode } from 'react'
import { toast, Toaster } from 'sonner'
import { AlertTriangle, CheckCircle2, Inbox, Info, Loader2 } from 'lucide-react'
import { STATUS_LABEL, STATUS_TONE } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button as UIButton } from './ui/button'
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { Label, Skeleton as UISkeleton, TooltipProvider } from './ui/misc'
import { Tabs as UITabs, TabsList, TabsTrigger } from './ui/tabs'

export type Tone = 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'neutral'

export const TONE: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  danger: 'bg-destructive/10 text-destructive',
  neutral: 'bg-muted text-muted-foreground',
}

/* ---------- Layout halaman ---------- */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.01em] sm:text-[1.65rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </div>
  )
}

export function Card({ title, description, actions, children, className, flush = false }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <UICard className={cn(flush && 'overflow-hidden', className)}>
      {(title || actions) && (
        <CardHeader className={cn(flush && 'pb-4')}>
          <div className="min-w-0">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      {flush ? <div className={cn(title || actions ? 'border-t' : '')}>{children}</div> : <CardContent className={cn((title || actions) && 'pt-4')}>{children}</CardContent>}
    </UICard>
  )
}

export function StatCard({ label, value, unit, icon, tone = 'primary', hint, className }: { label: string; value: ReactNode; unit?: string; icon: ReactNode; tone?: Tone; hint?: ReactNode; className?: string }) {
  return (
    <UICard className={cn('p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] leading-snug text-muted-foreground sm:text-sm">{label}</span>
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4', TONE[tone])}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold sm:text-[1.7rem]">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </UICard>
  )
}

export function Badge({ tone = 'neutral', children, dot = true, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap', TONE[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={(STATUS_TONE[status] ?? 'neutral') as Tone}>{label ?? STATUS_LABEL[status] ?? status}</Badge>
}

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const palette = ['#0a85b8', '#15924f', '#b4641c', '#5a62c9', '#b8486f', '#2f8591']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const color = palette[h % palette.length]
  const text = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
  return (
    <span aria-hidden="true" className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold', className)} style={{ width: size, height: size, fontSize: size * 0.36, color, background: `${color}1f` }}>
      {text}
    </span>
  )
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
      <span className="mb-2 grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground [&_svg]:size-5">{icon ?? <Inbox />}</span>
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return <div role="status" className="flex items-center gap-2 p-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{label}</div>
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => <UISkeleton key={i} className={cn('h-5', i % 2 ? 'w-full' : 'w-5/6')} />)}
    </div>
  )
}

export function Alert({ tone = 'info', children, className }: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode; className?: string }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertTriangle
  const styles = {
    info: 'border-info/25 bg-info/5 text-info',
    warning: 'border-warning/30 bg-warning/5 text-warning',
    danger: 'border-destructive/25 bg-destructive/5 text-destructive',
    success: 'border-success/25 bg-success/5 text-success',
  }[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm', styles, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 leading-relaxed [&_strong]:font-semibold">{children}</div>
    </div>
  )
}

/* ---------- Tombol ---------- */
type LegacyVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline' | 'link'
const VARIANT = { primary: 'default', secondary: 'outline', outline: 'outline', ghost: 'ghost', danger: 'destructive', success: 'success', link: 'link' } as const

export function Button({ children, variant = 'primary', size, loading, icon, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: LegacyVariant; size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm'; loading?: boolean; icon?: ReactNode }) {
  return (
    <UIButton {...props} variant={VARIANT[variant]} size={size} className={className} disabled={props.disabled || loading}>
      {loading ? <Loader2 className="animate-spin" /> : icon}
      {children}
    </UIButton>
  )
}

/* ---------- Form ---------- */
export function Field({ label, hint, error, children, htmlFor, className }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={cn('grid min-w-0 gap-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-[13px] text-destructive">{error}</p> : hint ? <p className="text-[13px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/* ---------- Dialog ---------- */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg'; dismissible?: boolean }) {
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size]
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && dismissible) onClose() }}>
      <DialogContent
        className={width}
        showClose={dismissible}
        onInteractOutside={(e) => { if (!dismissible) e.preventDefault() }}
        onEscapeKeyDown={(e) => { if (!dismissible) e.preventDefault() }}
        aria-describedby={description ? undefined : undefined}
      >
        <div className="px-5 pt-5 pr-12 sm:px-6 sm:pt-6">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description ? <DialogDescription className="mt-1 text-sm text-muted-foreground">{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </div>
        <div className="grid grid-cols-1 gap-4 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t bg-muted/40 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:rounded-b-xl sm:px-6 sm:pb-4 [&>*]:w-full sm:[&>*]:w-auto">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Ya, lanjutkan', tone = 'danger', loading, onConfirm, onClose }: { open: boolean; title: string; message: ReactNode; confirmLabel?: string; tone?: 'danger' | 'primary'; loading?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant={tone} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <p className="text-sm text-muted-foreground">{message}</p>
    </Modal>
  )
}

/* ---------- Tabs (segmented) ---------- */
export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[]; className?: string }) {
  return (
    <UITabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList className={cn('w-full sm:w-auto', className)}>
        {items.map((it) => (
          <TabsTrigger key={it.value} value={it.value} className="flex-1 sm:flex-none">
            {it.label}
            {it.count != null && <span className="rounded-full bg-warning/15 px-1.5 text-xs text-warning">{it.count}</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </UITabs>
  )
}

/* ---------- Toast (sonner) ---------- */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      {children}
      <Toaster position="top-right" richColors closeButton toastOptions={{ className: 'font-sans' }} />
    </TooltipProvider>
  )
}

// Fungsi stabil (bukan dibuat ulang tiap render) agar aman dipakai sebagai dependensi hook.
function notify(message: string, tone: 'success' | 'danger' | 'info' = 'success') {
  if (tone === 'success') toast.success(message)
  else if (tone === 'danger') toast.error(message)
  else toast.info(message)
}

export function useToast() {
  return notify
}

/* ---------- Tabel ---------- */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="w-full overflow-x-auto">{children}</div>
}
