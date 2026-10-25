import type { ReactNode } from 'react'

interface ShellCardProps {
  title?: string
  children: ReactNode
  foot?: ReactNode
  className?: string
  'aria-label'?: string
}

export function ShellCard({
  title,
  children,
  foot,
  className = '',
  'aria-label': ariaLabel,
}: ShellCardProps) {
  return (
    <section
      className={`shell-card ${className}`.trim()}
      aria-label={ariaLabel ?? title}
    >
      {title ? <h2 className="shell-card__title">{title}</h2> : null}
      {children}
      {foot ? <div className="shell-card__foot">{foot}</div> : null}
    </section>
  )
}
