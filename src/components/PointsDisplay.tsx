import { Star } from 'lucide-react'
import type { ProgressSummary } from '../domain/progress'
import './components.css'

export function PointsDisplay({ progress }: { progress: ProgressSummary }) {
  return (
    <div className="points-display" aria-label={`Total points ${progress.totalPoints}, ${progress.totalXP} experience points, level ${progress.currentLevel.level}`}>
      <div className="points-icon"><Star size={19} fill="currentColor" aria-hidden="true" /></div>
      <div>
        <div className="points-label">TOTAL POINTS <span>LEVEL {progress.currentLevel.level}</span></div>
        <div className="points-value">{progress.totalPoints.toLocaleString()} <span>PTS</span></div>
        <div className="points-xp">{progress.totalXP.toLocaleString()} XP</div>
      </div>
    </div>
  )
}
