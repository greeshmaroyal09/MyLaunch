import { Flame, Trophy } from 'lucide-react'
import type { ProgressSummary } from '../domain/progress'

export function ProgressMiniSummary({ progress, compact = false }: { progress: ProgressSummary; compact?: boolean }) {
  return (
    <section className={`progress-mini${compact ? ' progress-mini-compact' : ''}`} aria-label="Progress summary">
      <div className="progress-mini-level">
        <div className="progress-mini-level-heading">
          <span>LEVEL {progress.currentLevel.level}</span>
          <strong>{progress.currentLevel.nextLevelXP === null ? 'MAX' : `${progress.currentLevel.xpIntoLevel} / ${progress.currentLevel.xpForNextLevel} XP`}</strong>
        </div>
        <div className="progress-mini-track" role="progressbar" aria-label="Progress to next level" aria-valuenow={progress.currentLevel.progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress.currentLevel.progressPercent}%` }} />
        </div>
      </div>
      <div className="progress-mini-stat"><Flame size={14} aria-hidden="true" /><span>{progress.currentStreak} day streak</span></div>
      <div className="progress-mini-stat"><Trophy size={14} aria-hidden="true" /><span>{progress.longestStreak} longest</span></div>
      <div className="progress-mini-stat"><span className="progress-mini-check">✓</span><span>{progress.completedTaskCount}/{progress.totalTaskCount} tasks · {progress.curriculumCompletionPercent}%</span></div>
    </section>
  )
}
