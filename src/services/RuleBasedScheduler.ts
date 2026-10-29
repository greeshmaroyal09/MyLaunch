import type { DailySchedule } from '../domain/dailySchedule'
import type { TaskProgressMap } from '../domain/curriculum'
import type { ScheduledTask, TaskDefinition } from '../domain/task'

export type ScheduleInput = {
  date: string
  tasks: TaskDefinition[]
  progressState: TaskProgressMap
  availableMinutes: number
  excludedTaskIds?: string[]
}

export function compareScheduledTasks(left: ScheduledTask, right: ScheduledTask): number {
  // 1. Direct prerequisite relationship: prerequisites MUST precede dependent tasks
  if (right.prerequisiteTaskIds?.includes(left.id)) return -1
  if (left.prerequisiteTaskIds?.includes(right.id)) return 1

  // 2. Paired tasks: Learn MUST precede Practice
  if (left.pairedTaskId === right.id || (left.topic && left.topic === right.topic)) {
    if (left.type === 'Learn' && right.type !== 'Learn') return -1
    if (right.type === 'Learn' && left.type !== 'Learn') return 1
  }

  // 3. Status priority: Completed before Pending before Skipped
  const statusRank: Record<string, number> = { Completed: 0, Pending: 1, Skipped: 2 }
  const statusDiff = (statusRank[left.status] ?? 1) - (statusRank[right.status] ?? 1)
  if (statusDiff !== 0) return statusDiff

  // 4. Progress status: IN_PROGRESS before AVAILABLE before LOCKED
  const progressRank: Record<string, number> = { IN_PROGRESS: 0, AVAILABLE: 1, LOCKED: 2, COMPLETED: 0 }
  const progressDiff = (progressRank[left.progressStatus] ?? 1) - (progressRank[right.progressStatus] ?? 1)
  if (progressDiff !== 0) return progressDiff

  // 5. Learn tasks before Practice tasks generally
  if (left.type !== right.type) return left.type === 'Learn' ? -1 : 1

  return (left.dueDate || '').localeCompare(right.dueDate || '')
}

export function sortScheduledTasks(tasks: ScheduledTask[]): ScheduledTask[] {
  return [...tasks].sort(compareScheduledTasks)
}

export class RuleBasedScheduler {
  generate(input: ScheduleInput): DailySchedule {
    const excluded = new Set(input.excludedTaskIds ?? [])
    const taskMap = new Map(input.tasks.map((task) => [task.id, task]))
    const isCompleted = (prerequisiteId: string) => input.progressState[prerequisiteId] === 'COMPLETED'

    const isDirectlyEligible = (task: TaskDefinition) => {
      const dueDate = shiftDate(input.date, task.dueOffsetDays)
      const progressStatus = input.progressState[task.id] ?? 'LOCKED'
      if (dueDate > input.date || excluded.has(task.id)) return false
      if (!(progressStatus === 'AVAILABLE' || progressStatus === 'IN_PROGRESS')) return false
      return task.prerequisiteTaskIds.every(isCompleted)
    }

    const groupedCandidates = new Map<string, Array<{
      task: TaskDefinition
      originalIndex: number
      dueDate: string
      progressStatus: ScheduleInput['progressState'][string]
    }>>()

    for (const task of input.tasks) {
      const dueDate = shiftDate(input.date, task.dueOffsetDays)
      if (dueDate > input.date || excluded.has(task.id)) continue

      let eligible = false
      let progressStatus = input.progressState[task.id] ?? 'LOCKED'

      if (isDirectlyEligible(task)) {
        eligible = true
      } else if (task.type === 'Practice' && task.pairedTaskId) {
        const pairedLearnTask = taskMap.get(task.pairedTaskId)
        if (pairedLearnTask && isDirectlyEligible(pairedLearnTask)) {
          const otherPrerequisites = task.prerequisiteTaskIds.filter((id) => id !== task.pairedTaskId)
          if (otherPrerequisites.every(isCompleted)) {
            eligible = true
            progressStatus = 'LOCKED'
          }
        }
      }

      if (!eligible) continue

      const groupKey = task.pairedTaskId ? [task.id, task.pairedTaskId].sort().join('::') : task.id
      const entry = { task, originalIndex: input.tasks.indexOf(task), dueDate, progressStatus }
      const group = groupedCandidates.get(groupKey) ?? []
      group.push(entry)
      groupedCandidates.set(groupKey, group)
    }

    const groups = [...groupedCandidates.values()].map((tasks) => {
      const orderedTasks = [...tasks].sort((left, right) => {
        // 1. Prerequisite awareness: dependent tasks must follow prerequisites
        if (right.task.prerequisiteTaskIds?.includes(left.task.id)) return -1
        if (left.task.prerequisiteTaskIds?.includes(right.task.id)) return 1

        // 2. Paired tasks: Learn must precede Practice
        if (left.task.pairedTaskId === right.task.id || (left.task.topic && left.task.topic === right.task.topic)) {
          if (left.task.type === 'Learn' && right.task.type !== 'Learn') return -1
          if (right.task.type === 'Learn' && left.task.type !== 'Learn') return 1
        }

        const dueOrder = left.dueDate.localeCompare(right.dueDate)
        if (dueOrder !== 0) return dueOrder

        if (left.task.type !== right.task.type) return left.task.type === 'Learn' ? -1 : 1

        const availabilityOrder = Number(right.progressStatus === 'IN_PROGRESS') - Number(left.progressStatus === 'IN_PROGRESS')
        if (availabilityOrder !== 0) return availabilityOrder

        if (left.task.required !== right.task.required) return left.task.required ? -1 : 1
        const priorityOrder = right.task.priority - left.task.priority
        if (priorityOrder !== 0) return priorityOrder
        return left.originalIndex - right.originalIndex
      })
      return {
        tasks: orderedTasks,
        dueDate: orderedTasks[0].dueDate,
        totalMinutes: orderedTasks.reduce((total, item) => total + item.task.estimatedMinutes, 0),
        progressStatus: orderedTasks.some((item) => item.progressStatus === 'IN_PROGRESS') ? 'IN_PROGRESS' : 'AVAILABLE',
      }
    }).sort((left, right) => {
      // 1. Cross-group prerequisite awareness
      const leftIds = new Set(left.tasks.map((t) => t.task.id))
      const rightIds = new Set(right.tasks.map((t) => t.task.id))
      const rightDependsOnLeft = right.tasks.some((t) => t.task.prerequisiteTaskIds.some((id) => leftIds.has(id)))
      if (rightDependsOnLeft) return -1
      const leftDependsOnRight = left.tasks.some((t) => t.task.prerequisiteTaskIds.some((id) => rightIds.has(id)))
      if (leftDependsOnRight) return 1

      const dueOrder = left.dueDate.localeCompare(right.dueDate)
      if (dueOrder !== 0) return dueOrder
      const availabilityOrder = Number(right.progressStatus === 'IN_PROGRESS') - Number(left.progressStatus === 'IN_PROGRESS')
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
        const allPrereqsComplete = task.prerequisiteTaskIds.every(isCompleted)
        selected.push({
          ...task,
          status: 'Pending',
          progressStatus: allPrereqsComplete ? 'IN_PROGRESS' : 'LOCKED',
          dueDate: taskEntry.dueDate,
          plannedDate: input.date,
        })
      }
      remainingMinutes -= group.totalMinutes
    }

    return {
      date: input.date,
      tasks: sortScheduledTasks(selected),
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
