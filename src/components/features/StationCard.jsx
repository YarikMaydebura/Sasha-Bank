import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/utils'

export function StationCard({
  icon,
  title,
  subtitle,
  cost,
  href,
  badge,
  disabled = false,
  className,
}) {
  const navigate = useNavigate()

  return (
    <Card
      hoverable={!disabled}
      onClick={disabled ? undefined : () => navigate(href)}
      className={cn(
        'relative flex flex-col items-center text-center py-5',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Badge (e.g., mission count) */}
      {badge !== undefined && badge > 0 && (
        <div className="absolute -top-2 -right-2">
          <Badge variant="pink" size="sm">
            {badge}
          </Badge>
        </div>
      )}

      {/* Icon */}
      <span className="text-4xl mb-2">{icon}</span>

      {/* Title */}
      <h3 className="text-white font-semibold text-sm">{title}</h3>

      {/* Cost or subtitle */}
      {cost && (
        <p className="text-coin-gold text-xs mt-1">{cost}</p>
      )}
      {subtitle && !cost && (
        <p className="text-slate-400 text-xs mt-1">{subtitle}</p>
      )}
    </Card>
  )
}
