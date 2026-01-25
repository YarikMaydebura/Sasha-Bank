import { cn } from '../../lib/utils'

export function PageWrapper({
  children,
  noPadding = false,
  noScroll = false,
  withNav = false,
  className,
}) {
  return (
    <main
      className={cn(
        'min-h-screen bg-bg-dark',
        !noScroll && 'overflow-y-auto scrollbar-hide',
        !noPadding && 'px-4 py-4',
        withNav && 'pb-24', // Space for bottom nav
        className
      )}
    >
      {children}
    </main>
  )
}
