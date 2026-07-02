import { cn } from '@/lib/utils'

/**
 * Loading placeholder that mirrors the shape of the content it
 * stands in for. Use blocks sized like the real UI, not generic bars.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-lg bg-foreground/[0.07]', className)}
      {...props}
    />
  )
}

export { Skeleton }
