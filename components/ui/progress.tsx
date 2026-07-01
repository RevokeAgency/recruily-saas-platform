'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'

import { cn } from '@/lib/utils'

function Progress({
  className,
  /** Opt into the brand-gradient fill (quota/usage widgets). Default is a plain
   *  bg-primary indicator so existing `[&>div]:bg-*` color overrides (pipeline
   *  funnels, score-distribution bars with per-band semantic colors) keep working —
   *  an unconditional gradient background-image can't be un-set by a color-only
   *  override, so it's opt-in rather than the default. */
  gradient = false,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { gradient?: boolean }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        'bg-[rgba(12,26,22,.08)] relative h-1.5 w-full overflow-hidden rounded-full',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          'h-full w-full flex-1 transition-transform duration-200 ease-out',
          gradient ? 'bg-[image:var(--rv-gradient)]' : 'bg-primary',
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
