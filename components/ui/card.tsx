import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card" className={cn('flex min-w-0 flex-col rounded-xl border bg-card text-card-foreground shadow-xs', className)} {...props} />
}
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6', className)} {...props} />
}
function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 data-slot="card-title" className={cn('text-base font-semibold leading-tight tracking-tight', className)} {...props} />
}
function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="card-description" className={cn('mt-1 text-sm text-muted-foreground', className)} {...props} />
}
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-5 py-5 sm:px-6', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent }
