import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/utils'

export function BigMissionsSection({ missions = [], count = 0 }) {
  const navigate = useNavigate()

  const activeMissions = missions.filter((m) => m.status === 'assigned')
  const completedMissions = missions.filter((m) => m.status === 'completed')

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <h2 className="text-lg font-bold text-white">Missions</h2>
        </div>
        <button
          onClick={() => navigate('/missions')}
          className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
        >
          View All ({count})
        </button>
      </div>

      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{count}</div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{activeMissions.length}</div>
            <div className="text-xs text-slate-400">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{completedMissions.length}</div>
            <div className="text-xs text-slate-400">Done</div>
          </div>
        </div>

        {/* Mission Preview */}
        {activeMissions.length === 0 ? (
          <div className="text-center py-6 border-t border-white/10">
            <span className="text-4xl block mb-2">✨</span>
            <p className="text-slate-400 text-sm mb-2">All missions complete!</p>
            <p className="text-slate-500 text-xs">Check back for new missions</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 border-t border-white/10 pt-4">
              {activeMissions.slice(0, 3).map((mission) => (
                <div
                  key={mission.id}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => navigate('/missions')}
                >
                  <span className="text-xl flex-shrink-0">
                    {mission.type === 'game' ? '🎮' : mission.type === 'punishment' ? '😈' : '🎯'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{mission.generated_text || mission.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-coin-gold text-xs font-semibold">
                        {mission.reward || 5}🪙
                      </span>
                      {mission.requires_confirmation && (
                        <Badge size="sm" className="text-[8px] bg-purple-500/30">
                          Needs confirm
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {activeMissions.length > 3 && (
                <div
                  className="text-center py-2 text-slate-400 text-xs cursor-pointer hover:text-slate-300"
                  onClick={() => navigate('/missions')}
                >
                  +{activeMissions.length - 3} more missions
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => navigate('/missions')}
                className="w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-300 text-sm font-medium transition-all"
              >
                View All Missions
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
