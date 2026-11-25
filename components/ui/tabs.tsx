'use client'

import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('inline-flex h-10 max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground [scrollbar-width:none]', className)} {...props} />
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn('inline-flex h-full shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger }
