import * as React from 'react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full min-w-0 rounded-md border border-input bg-background text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(fieldBase, 'h-10 px-3 py-1 file:border-0 file:bg-transparent file:text-sm', className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(fieldBase, 'min-h-24 px-3 py-2 leading-relaxed', className)} {...props} />
}

/** Select bawaan browser bergaya shadcn — paling nyaman di HP (memakai picker native). */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(fieldBase, 'h-10 appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pl-3 pr-9', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2371717a' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}
    >
      {children}
    </select>
  )
}

export { Input, Textarea, NativeSelect }
