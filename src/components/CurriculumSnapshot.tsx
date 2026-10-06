import { ArrowRight, LockKeyhole } from 'lucide-react'
import { curriculum, getCurriculumTasks } from '../data/curriculum'
import type { TaskProgressMap } from '../domain/curriculum'
import type { DailySchedule } from '../domain/dailySchedule'
import { getCurriculumProgress } from '../services/ScheduleService'
import './curriculum.css'

type CurriculumSnapshotProps = {
  schedule: DailySchedule
  progressState: TaskProgressMap
  onViewRoadmap: () => void
  compact?: boolean
}

export function CurriculumSnapshot({ schedule, progressState, onViewRoadmap, compact = false }: CurriculumSnapshotProps) {
  const progress = getCurriculumProgress(curriculum, progressState)
  const taskLookup = new Map(getCurriculumTasks().map((task) => [task.id, task]))
  const todaySubjectIds = new Set(schedule.tasks.map((task) => task.id))
  const currentModules = curriculum.subjects.flatMap((subject) =>
    subject.modules
      .filter((module) => module.topics.some((topic) => topic.tasks.some((task) => todaySubjectIds.has(task.id))))
      .map((module) => `${subject.name} · ${module.title}`),
  )
  const nextTasks = getCurriculumTasks().filter((task) =>
    progressState[task.id] === 'AVAILABLE' && !todaySubjectIds.has(task.id),
  ).slice(0, 3)
  const lockedCount = Object.values(progressState).filter((state) => state === 'LOCKED').length

  return (
    <section className={`curriculum-snapshot${compact ? ' curriculum-snapshot-compact' : ''}`} aria-labelledby="curriculum-snapshot-title">
      <div className="snapshot-heading">
        <div>
          <div className="section-eyebrow">CURRICULUM</div>
          <h2 id="curriculum-snapshot-title">Your progression</h2>
        </div>
        <button className="roadmap-link" type="button" onClick={onViewRoadmap}>
          View roadmap <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="snapshot-progress-row">
        <div className="snapshot-progress-track"><span style={{ width: `${progress.completionPercent}%` }} /></div>
        <strong>{progress.completionPercent}%</strong>
        <span>{progress.completedTaskCount} of {progress.totalTaskCount} complete</span>
      </div>
      {!compact && <div className="snapshot-columns">
        <div>
          <div className="snapshot-label">CURRENT MODULES</div>
          {currentModules.length ? (
            <div className="snapshot-module-list">
              {currentModules.slice(0, 4).map((module) => <span key={module}>{module}</span>)}
              {currentModules.length > 4 && <small>+{currentModules.length - 4} more</small>}
            </div>
          ) : <p className="snapshot-empty">No active modules today.</p>}
        </div>
        <div>
          <div className="snapshot-label">NEXT AVAILABLE</div>
          {nextTasks.length ? (
            <div className="snapshot-next-list">
              {nextTasks.map((task) => <span key={task.id}>{taskLookup.get(task.id)?.subject}: {task.title}</span>)}
            </div>
          ) : <p className="snapshot-empty">Today's available work is scheduled.</p>}
        </div>
      </div>}
      {!compact && <div className="snapshot-locked"><LockKeyhole size={13} aria-hidden="true" /> {lockedCount} tasks locked until prerequisites are complete</div>}
    </section>
  )
}
