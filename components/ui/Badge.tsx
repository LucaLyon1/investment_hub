interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'orange'
  className?: string
}

const variantClasses = {
  default: 'bg-zinc-100 text-zinc-700',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  yellow: 'bg-yellow-50 text-yellow-700',
  blue: 'bg-blue-50 text-blue-700',
  purple: 'bg-purple-50 text-purple-700',
  orange: 'bg-orange-50 text-orange-700',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

export function assetClassBadge(assetClass: string) {
  const map: Record<string, 'blue' | 'green' | 'purple' | 'orange'> = {
    stock: 'blue',
    etf: 'green',
    bond: 'purple',
    commodity: 'orange',
  }
  return map[assetClass] ?? 'default'
}

export function signalBadgeVariant(signal: string): BadgeProps['variant'] {
  const map: Record<string, BadgeProps['variant']> = {
    buy: 'green',
    sell: 'red',
    hold: 'yellow',
    rebalance: 'blue',
    risk_flag: 'orange',
    news: 'default',
  }
  return map[signal] ?? 'default'
}
