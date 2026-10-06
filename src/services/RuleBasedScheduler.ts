import type { DailySchedule } from '../domain/dailySchedule'
import type { TaskProgressMap } from '../domain/curriculum'
import type { TaskDefinition } from '../domain/task'

export type ScheduleInput = {
  date: string
  tasks: TaskDefinition[]
  progressState: TaskProgressMap
  availableMinutes: number
  excludedTaskIds?: string[]
}

export class RuleBasedScheduler {
  generate(input: ScheduleInput): DailySchedule {
    const excluded = new Set(input.excludedTaskIds ?? [])
    const groupedCandidates = new Map<string, Array<{
      task: TaskDefinition
      originalIndex: number
      dueDate: string
      progressStatus: ScheduleInput['progressState'][string]
    }>>()

    for (const task of input.tasks) {
      const dueDate = shiftDate(input.date, task.dueOffsetDays)
      const progressStatus = input.progressState[task.id] ?? 'LOCKED'
      if (dueDate > input.date || excluded.has(task.id)) continue
      if (!(progressStatus === 'AVAILABLE' || progressStatus === 'IN_PROGRESS')) continue
      if (!task.prerequisiteTaskIds.every((prerequisiteId) => input.progressState[prerequisiteId] === 'COMPLETED')) continue

      const groupKey = task.pairedTaskId ?? task.id
      const entry = { task, originalIndex: input.tasks.indexOf(task), dueDate, progressStatus }
      const group = groupedCandidates.get(groupKey) ?? []
      group.push(entry)
      groupedCandidates.set(groupKey, group)
    }

    const groups = [...groupedCandidates.values()].map((tasks) => {
      const orderedTasks = [...tasks].sort((left, right) => {
        const dueOrder = left.dueDate.localeCompare(right.dueDate)
        if (dueOrder !== 0) return dueOrder
        const availabilityOrder = Number(left.progressStatus === 'IN_PROGRESS') - Number(right.progressStatus === 'IN_PROGRESS')
        if (availabilityOrder !== 0) return availabilityOrder
        if (left.task.required !== right.task.required) return left.task.required ? -1 : 1
        const priorityOrder = right.task.priority - left.task.priority
        if (priorityOrder !== 0) return priorityOrder
        if (left.task.type !== right.task.type) return left.task.type === 'Learn' ? -1 : 1
        return left.originalIndex - right.originalIndex
      })
      return {
        tasks: orderedTasks,
        dueDate: orderedTasks[0].dueDate,
        totalMinutes: orderedTasks.reduce((total, item) => total + item.task.estimatedMinutes, 0),
        progressStatus: orderedTasks.some((item) => item.progressStatus === 'IN_PROGRESS') ? 'IN_PROGRESS' : 'AVAILABLE',
      }
    }).sort((left, right) => {
      const dueOrder = left.dueDate.localeCompare(right.dueDate)
      if (dueOrder !== 0) return dueOrder
      const availabilityOrder = Number(left.progressStatus === 'IN_PROGRESS') - Number(right.progressStatus === 'IN_PROGRESS')
      if (availabilityOrder !== 0) return availabilityOrder
      const leftPriority = left.tasks.reduce((max, item) => Math.max(max, item.task.priority), 0)
      const rightPriority = right.tasks.reduce((max, item) => Math.max(max, item.task.priority), 0)
      if (leftPriority !== rightPriority) return rightPriority - leftPriority
      const leftSeed = left.tasks[0]?.originalIndex ?? 0
      const rightSeed = right.tasks[0]?.originalIndex ?? 0
      return leftSeed - rightSeed
    })

    const selected: DailySchedule['tasks'] = []
    let remainingMinutes = Math.max(0, input.availableMinutes)

    for (const group of groups) {
      if (group.totalMinutes > remainingMinutes) continue
      for (const taskEntry of group.tasks) {
        const task = taskEntry.task
        selected.push({
          ...task,
          status: 'Pending',
          progressStatus: 'IN_PROGRESS',
          dueDate: taskEntry.dueDate,
          plannedDate: input.date,
        })
      }
      remainingMinutes -= group.totalMinutes
    }

    return {
      date: input.date,
      tasks: selected,
      generated: true,
      availableMinutes: input.availableMinutes,
      calendarStatus: 'LEARNING_DAY',
    }
  }
}

function shiftDate(date: string, offsetDays: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + offsetDays))
  return shifted.toISOString().slice(0, 10)
}
