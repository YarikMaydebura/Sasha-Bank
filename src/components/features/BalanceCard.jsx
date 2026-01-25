import { useNavigate } from 'react-router-dom'
import { History, ArrowLeftRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

export function BalanceCard({ balance, className }) {
  const navigate = useNavigate()

  return (
    <Card variant="highlight" className={cn('glow-pulse', className)}>
      <div className="text-center">
        <p className="text-pastel-purple-light text-sm mb-1">Your Balance</p>
        <p className="text-coin-gold text-5xl font-bold mb-4">
          🪙 {balance}
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/history')}
          >
            <History className="w-4 h-4" />
            History
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/trade')}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Trade
          </Button>
        </div>
      </div>
    </Card>
  )
}
