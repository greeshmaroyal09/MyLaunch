import type { ScheduledTask, SkipType } from '../domain/task'
import { TaskItem } from './TaskItem'

type TaskListProps = {
  tasks: ScheduledTask[]
  onComplete?: (taskId: string) => void
  onSkip?: (taskId: string, skipType?: SkipType, reason?: string) => void
  onUnskip?: (taskId: string) => void
  compact?: boolean
  taskTitlesById?: Record<string, string>
  eventMessagesByTaskId?: Record<string, string>
}

export function TaskList({ tasks, onComplete, onSkip, onUnskip, compact = false, taskTitlesById = {}, eventMessagesByTaskId = {} }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="empty-schedule">No work is scheduled for this day.</p>
  }

  return (
    <ul className={`task-list${compact ? ' task-list-compact' : ''}`}>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onComplete={onComplete}
          onSkip={onSkip}
          onUnskip={onUnskip}
          compact={compact}
          prerequisiteTitles={task.prerequisiteTaskIds.map((id) => taskTitlesById[id]).filter(Boolean)}
          eventMessage={eventMessagesByTaskId[task.id]}
        />
      ))}
    </ul>
  )
}
