import { useState } from 'react'
import { BookOpenText, Check, Circle, Code2, Coffee, Database, ExternalLink, Puzzle, SkipForward } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PracticeResource, ScheduledTask, SkipType } from '../domain/task'

type TaskItemProps = {
  task: ScheduledTask
  onComplete?: (taskId: string) => void
  onSkip?: (taskId: string, skipType?: SkipType, reason?: string) => void
  onUnskip?: (taskId: string) => void
  compact?: boolean
  prerequisiteTitles?: string[]
  eventMessage?: string
}

const subjectIcons: Record<string, LucideIcon> = {
  Java: Coffee,
  DSA: Puzzle,
  SQL: Database,
  Python: Code2,
  'Operating Systems': BookOpenText,
  'Machine Learning': BookOpenText,
}

function renderResourceLinks(resources: PracticeResource[] | undefined) {
  if (!resources || resources.length === 0) return null

  return (
    <div className="task-resource-panel" aria-label="Practice resources">
      <span className="task-resource-label">Practice Resources</span>
      <ul className="task-resource-list">
        {resources.map((resource) => (
          <li key={`${resource.title}-${resource.url}`} className="task-resource-item">
            <a
              className="task-resource-link"
              href={resource.url}
              target="_blank"
              rel="noreferrer noopener"
              title={resource.title}
            >
              <span className="task-resource-meta">
                <span className="task-resource-name">{resource.title}</span>
                {resource.type && <span className="task-resource-platform">{resource.type}</span>}
              </span>
              {resource.difficulty && <span className="task-resource-difficulty">{resource.difficulty}</span>}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TaskItem({ task, onComplete, onSkip, onUnskip, compact = false, prerequisiteTitles = [], eventMessage }: TaskItemProps) {
  const Icon = subjectIcons[task.subject] ?? BookOpenText
  const completed = task.status === 'Completed'
  const skipped = task.status === 'Skipped'
  const [skipType, setSkipType] = useState<SkipType>('UNEXCUSED')
  const [reason, setReason] = useState('')
  const [skipMenuOpen, setSkipMenuOpen] = useState(false)
  const skipLabel = task.skipType === 'EXCUSED' ? 'Excused skip' : 'Unexcused skip'

  const submitSkip = () => {
    const trimmedReason = skipType === 'EXCUSED' ? reason.trim() : ''
    if (skipType === 'EXCUSED' && !trimmedReason) return
    onSkip?.(task.id, skipType, trimmedReason)
    setSkipMenuOpen(false)
    setReason('')
  }

  return (
    <li className={`task-row${completed ? ' task-row-completed' : ''}${skipped ? ' task-row-skipped' : ''}${compact ? ' task-row-compact' : ''}`}>
      <span className="task-icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
      <span className="task-copy">
        <strong>{task.subject}</strong>
        <span className="task-title-line">
          <span className="task-name">{task.title}</span>
          <span className={`task-type task-type-${task.type.toLowerCase()}`}>{task.type}</span>
        </span>
        {task.pairedTaskId && <small className="task-prerequisite">{task.type === 'Learn' ? 'Learn + practice pair' : 'Practice for the paired lesson'}</small>}
        {!compact && prerequisiteTitles.length > 0 && <small className="task-prerequisite">Prerequisite completed: {prerequisiteTitles.join(', ')}</small>}
        {!compact && eventMessage && <small className="task-event-message">{eventMessage}</small>}
        {!compact && skipped && task.skipReason && <small className="task-event-message">Reason: {task.skipReason}</small>}
        {!compact && skipped && <small className="task-event-message">{skipLabel}</small>}
        {renderResourceLinks(task.practiceResources)}
      </span>
      <span className="task-reward"><strong>{task.estimatedMinutes} min</strong><small>{skipped ? (task.skipType === 'EXCUSED' ? 'Excused skip' : '-10 pts / XP') : `+${task.estimatedMinutes} pts / XP`}</small></span>
      {compact ? (
        <span className={`task-status-dot${completed ? ' is-completed' : ''}${skipped ? ' is-skipped' : ''}`} aria-label={task.status} title={task.status}>
          {completed ? <Check size={11} aria-hidden="true" /> : skipped ? <SkipForward size={11} aria-hidden="true" /> : <Circle size={8} aria-hidden="true" />}
        </span>
      ) : (
        skipped ? (
          <span className="task-skip-actions">
            <span className="task-skip-badge" aria-label="Skipped">{task.skipType === 'EXCUSED' ? 'Excused' : 'Unexcused'}</span>
            {onUnskip && <button className="task-unskip" type="button" onClick={() => onUnskip(task.id)}>Unskip</button>}
          </span>
        ) : (
          <span className="task-actions">
            <button
              className={`task-complete${completed ? ' is-completed' : ''}`}
              type="button"
              aria-label={completed ? `Mark ${task.title} unfinished` : `Complete ${task.title}, earn ${task.estimatedMinutes} points and XP`}
              title={completed ? 'Mark unfinished' : `Earn ${task.estimatedMinutes} points and XP`}
              disabled={(task.status !== 'Pending' && !completed) || !onComplete}
              onClick={() => onComplete?.(task.id)}
            >
              {completed ? <Check size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
            </button>
            <button
              className="task-skip"
              type="button"
              aria-label={`Skip ${task.title}`}
              disabled={task.status !== 'Pending' || !onSkip}
              onClick={() => setSkipMenuOpen((open) => !open)}
            >
              <SkipForward size={14} aria-hidden="true" />
            </button>
          </span>
        )
      )}
      {!compact && !skipped && skipMenuOpen && (
        <div className="task-skip-menu" aria-label="Skip reason choice">
          <label>
            <span>Skip type</span>
            <select value={skipType} onChange={(event) => setSkipType(event.target.value as SkipType)}>
              <option value="UNEXCUSED">Unexcused</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </label>
          {skipType === 'EXCUSED' && (
            <label>
              <span>Reason</span>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="faculty meeting, club meeting, assignment..."
              />
            </label>
          )}
          <div className="task-skip-menu-actions">
            <button type="button" className="task-skip-cancel" onClick={() => setSkipMenuOpen(false)}>Cancel</button>
            <button type="button" className="task-skip-confirm" disabled={skipType === 'EXCUSED' && !reason.trim()} onClick={submitSkip}>Confirm</button>
          </div>
        </div>
      )}
    </li>
  )
}
