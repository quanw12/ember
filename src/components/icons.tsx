interface IconProps {
  className?: string
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export function FlameIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden="true">
      <path d="M12 3 C15 6.5 17 9 17 12.5 A5 5 0 0 1 7 12.5 C7 9 9 6.5 12 3 Z" />
      <path d="M12 12.5 C13 13.6 13.4 14.4 13.4 15.2 A1.4 1.4 0 0 1 10.6 15.2 C10.6 14.4 11 13.6 12 12.5 Z" strokeWidth="1.3" />
    </svg>
  )
}

export function DumbbellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden="true">
      <path d="M4 9v6" /><path d="M7.5 7v10" /><path d="M16.5 7v10" /><path d="M20 9v6" /><path d="M7.5 12h9" />
    </svg>
  )
}

export function RouteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden="true">
      <path d="M4 18 C8 18 7 7 12 7 C17 7 16 17 20 17" />
      <circle cx="4" cy="18" r="1.6" /><circle cx="20" cy="17" r="1.6" />
    </svg>
  )
}

export function TrendIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden="true">
      <path d="M4 17 L10 11 L13.5 14.5 L20 8" /><path d="M15.5 8 H20 V12.5" />
    </svg>
  )
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" /><path d="M5.5 19.5 C6.5 15 17.5 15 18.5 19.5" />
    </svg>
  )
}
