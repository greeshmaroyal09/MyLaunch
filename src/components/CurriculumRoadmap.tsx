import { useState } from 'react'
import { Check, Circle, LockKeyhole, Play } from 'lucide-react'
import { curriculum } from '../data/curriculum'
import type { CurriculumTask, CurriculumTrack, TaskProgressMap } from '../domain/curriculum'
import type { TaskProgressStatus } from '../domain/task'
import type { ProgressSummary } from '../domain/progress'
import { getCurriculumProgress } from '../services/ScheduleService'
import './curriculum.css'

type CurriculumRoadmapProps = {
  progressState: TaskProgressMap
  progressSummary: ProgressSummary
  skippedTaskIds: string[]
  onToggleTask: (taskId: string) => void
}

export function CurriculumRoadmap({ progressState, progressSummary, skippedTaskIds, onToggleTask }: CurriculumRoadmapProps) {
  const [activeTrack, setActiveTrack] = useState<CurriculumTrack>('Primary')
  const totals = getCurriculumProgress(curriculum, progressState)
  const subjects = curriculum.subjects.filter((subject) => subject.track === activeTrack)

  return (
    <div className="curriculum-roadmap">
      <header className="curriculum-heading">
        <div>
          <div className="welcome-kicker">YOUR LEARNING PATH</div>
          <h1>Career roadmap</h1>
          <p>Planned learning, unlocked one prerequisite at a time.</p>
        </div>
        <div className="curriculum-count"><strong>{totals.completedTaskCount}/{totals.totalTaskCount}</strong><span>tasks complete</span></div>
      </header>

      <section className="curriculum-progress" aria-label="Overall curriculum progress">
        <div className="curriculum-progress-label"><span>Overall progress</span><strong>{totals.completionPercent}%</strong></div>
        <div className="curriculum-progress-track"><span style={{ width: `${totals.completionPercent}%` }} /></div>
      </section>
      <div className="roadmap-progress-note">{progressSummary.totalPoints} points · {progressSummary.totalXP} XP · Level {progressSummary.currentLevel.level} · {progressSummary.currentStreak}-day streak · longest {progressSummary.longestStreak}</div>

      <div className="curriculum-track-tabs" role="tablist" aria-label="Curriculum track">
        {(['Primary', 'AI / ML'] as const).map((track) => (
          <button
            key={track}
            className={activeTrack === track ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTrack === track}
            onClick={() => setActiveTrack(track)}
          >
            {track === 'Primary' ? 'Core career track' : 'AI / ML track'}
            <span>{curriculum.subjects.filter((subject) => subject.track === track).length}</span>
          </button>
        ))}
      </div>

      <div className="curriculum-subject-list">
        {subjects.map((subject) => {
          const subjectTasks = subject.modules.flatMap((module) => module.topics.flatMap((topic) => topic.tasks))
          const completedCount = subjectTasks.filter((task) => progressState[task.id] === 'COMPLETED').length
          const activeTask = subjectTasks.find((task) => {
            const state = progressState[task.id]
            return state === 'IN_PROGRESS' || state === 'AVAILABLE'
          })
          return (
            <section className="curriculum-subject" key={subject.id} aria-labelledby={`subject-${subject.id}`}>
              <header className="curriculum-subject-heading">
                <div>
                  <span className="curriculum-subject-index">{String(subject.order).padStart(2, '0')}</span>
                  <div>
                    <h2 id={`subject-${subject.id}`}>{subject.name}</h2>
                    <span className="curriculum-module-name">{activeTask ? subject.modules.find((module) => module.topics.some((topic) => topic.tasks.some((task) => task.id === activeTask.id)))?.title : subject.modules[0]?.title}</span>
                  </div>
                </div>
                <span className="subject-completion">{completedCount}/{subjectTasks.length}</span>
              </header>
              {subject.modules.map((module) => (
                <div className="curriculum-module" key={module.id}>
                  <div className="curriculum-module-progress">
                    <span>{module.title}</span>
                    <small>{module.topics.flatMap((topic) => topic.tasks).filter((task) => progressState[task.id] === 'COMPLETED').length}/{module.topics.flatMap((topic) => topic.tasks).length} complete</small>
                  </div>
                  {module.topics.map((topic) => (
                    <div className="curriculum-topic" key={topic.id}>
                      <div className="topic-heading"><span />{topic.title}</div>
                      {topic.tasks.map((task) => (
                        <CurriculumTaskRow key={task.id} task={task} status={progressState[task.id] ?? 'LOCKED'} skippedToday={skippedTaskIds.includes(task.id)} onToggleTask={onToggleTask} />
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          )
        })}
      </div>
      <p className="curriculum-note">This is a planned learning curriculum. Completion reflects activity in this browser session only.</p>
    </div>
  )
}

function CurriculumTaskRow({ task, status, skippedToday, onToggleTask }: { task: CurriculumTask; status: TaskProgressStatus; skippedToday: boolean; onToggleTask: (taskId: string) => void }) {
  const Icon = status === 'COMPLETED' ? Check : status === 'LOCKED' ? LockKeyhole : status === 'IN_PROGRESS' ? Play : Circle
  const prerequisiteNames = task.prerequisiteTaskIds.map((id) => {
    const prerequisite = curriculum.subjects.flatMap((subject) => subject.modules.flatMap((module) => module.topics.flatMap((topic) => topic.tasks))).find((item) => item.id === id)
    return prerequisite?.title
  }).filter(Boolean)
  const dependencyText = skippedToday ? 'Skipped today' : prerequisiteNames.length > 0 && status === 'LOCKED'
    ? `Complete ${prerequisiteNames.join(', ')} first`
    : status === 'AVAILABLE' ? 'Available to start' : status === 'IN_PROGRESS' ? 'In progress' : status === 'COMPLETED' ? 'Completed' : 'Locked'

  return (
    <div className={`curriculum-task curriculum-task-${status.toLowerCase()}`}>
      <button
        className="curriculum-task-state"
        type="button"
        aria-label={skippedToday ? `${task.title} skipped today` : status === 'COMPLETED' ? `Mark ${task.title} unfinished` : `Complete ${task.title}, earn ${task.estimatedMinutes} points and XP`}
        title={skippedToday ? 'Available next learning day' : status === 'COMPLETED' ? 'Mark unfinished' : status === 'LOCKED' ? dependencyText : `Earn ${task.estimatedMinutes} points and XP`}
        disabled={status === 'LOCKED' || skippedToday}
        onClick={() => onToggleTask(task.id)}
      ><Icon size={14} aria-hidden="true" /></button>
      <div className="curriculum-task-copy">
        <strong>{task.title}</strong>
        <span>{task.type} · {task.estimatedMinutes} min</span>
        {task.practiceResources && task.practiceResources.length > 0 && (
          <small className="curriculum-task-resources">
            {task.practiceResources.map((resource) => (
              <a
                key={`${resource.title}-${resource.url}`}
                href={resource.url}
                target="_blank"
                rel="noreferrer noopener"
                className="curriculum-task-resource-pill"
                title={resource.title}
              >
                {resource.title}
              </a>
            ))}
          </small>
        )}
        {status === 'LOCKED' && <small>{dependencyText}</small>}
      </div>
      <span className="curriculum-task-status">{dependencyText}</span>
    </div>
  )
}
