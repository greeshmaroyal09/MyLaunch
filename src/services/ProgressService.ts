import { curriculum, getCurriculumTasks } from '../data/curriculum'
import type { ProgressState, ProgressSummary, SkipType } from '../domain/progress'
import type { ScheduledTask } from '../domain/task'
import type { WeeklyTest } from '../domain/weeklyTest'
import { calculateBalance, calculateTaskReward, skipPenalty } from './PointsCalculator'
import { calculateLevel } from './LevelCalculator'
import { calculateStreaks, type IsLearningDate } from './StreakCalculator'

export function createProgressState(taskProgress: ProgressState['taskProgress'] = {}): ProgressState {
  return { taskProgress, events: [], qualifyingDates: [] }
}

export const ProgressService = {
  completeTask(state: ProgressState, task: ScheduledTask, date: string): ProgressState {
    const eventId = `complete:${task.id}`
    if (task.status !== 'Pending' || state.events.some((event) => event.id === eventId)) return state

    const reward = calculateTaskReward(task.estimatedMinutes)
    const plannedDate = task.plannedDate ?? task.dueDate ?? date
    return {
      ...state,
      taskProgress: { ...state.taskProgress, [task.id]: 'COMPLETED' },
      events: [...state.events, {
        id: eventId,
        taskId: task.id,
        date,
        plannedDate,
        type: 'TASK_COMPLETED',
        pointsDelta: reward.points,
        xpDelta: reward.xp,
      }],
      qualifyingDates: [...new Set([...state.qualifyingDates, date])].sort(),
    }
  },

  uncompleteTask(state: ProgressState, taskId: string): ProgressState {
    const removedEvents = state.events.filter((event) => event.type === 'TASK_COMPLETED' && event.taskId === taskId)
    if (state.taskProgress[taskId] !== 'COMPLETED' && removedEvents.length === 0) return state

    const events = state.events.filter((event) => event.type !== 'TASK_COMPLETED' || event.taskId !== taskId)
    const removedDates = new Set(removedEvents.map((event) => event.date))
    const remainingCompletionDates = new Set(events
      .filter((event) => event.type === 'TASK_COMPLETED')
      .map((event) => event.date))

    return {
      ...state,
      taskProgress: { ...state.taskProgress, [taskId]: 'AVAILABLE' },
      events,
      qualifyingDates: state.qualifyingDates.filter((date) => !removedDates.has(date) || remainingCompletionDates.has(date)),
    }
  },

  skipTask(state: ProgressState, task: ScheduledTask, date: string, skipType: SkipType = 'UNEXCUSED', reason?: string): ProgressState {
    const eventId = `skip:${task.id}:${date}`
    if (task.status !== 'Pending' || state.events.some((event) => event.id === eventId)) return state

    const normalizedType: SkipType = skipType === 'EXCUSED' ? 'EXCUSED' : 'UNEXCUSED'
    const penalty = normalizedType === 'UNEXCUSED' ? -skipPenalty : 0
    const cleanReason = normalizedType === 'EXCUSED' ? (reason ?? '').trim() : undefined

    const plannedDate = task.plannedDate ?? task.dueDate ?? date
    return {
      ...state,
      taskProgress: { ...state.taskProgress, [task.id]: 'AVAILABLE' },
      events: [...state.events, {
        id: eventId,
        taskId: task.id,
        date,
        plannedDate,
        type: 'TASK_SKIPPED',
        pointsDelta: penalty,
        xpDelta: penalty,
        skipType: normalizedType,
        reason: cleanReason || undefined,
      }],
    }
  },

  unskipTask(state: ProgressState, taskId: string, date?: string): ProgressState {
    const skipEvents = state.events.filter((event) => event.type === 'TASK_SKIPPED' && event.taskId === taskId)
    if (skipEvents.length === 0) return state
    const matchDate = date ?? skipEvents[skipEvents.length - 1].date
    const skipEvent = skipEvents.find((event) => event.date === matchDate) ?? skipEvents[skipEvents.length - 1]
    if (!skipEvent) return state

    const remainingEvents = state.events.filter((event) => !(event.type === 'TASK_SKIPPED' && event.taskId === taskId && event.date === skipEvent.date && event.id === skipEvent.id))
    return {
      ...state,
      taskProgress: { ...state.taskProgress, [taskId]: 'AVAILABLE' },
      events: remainingEvents,
    }
  },

  completeWeeklyTest(state: ProgressState, test: WeeklyTest, date: string): ProgressState {
    const eventId = `weekly-test:${test.id}`
    if (test.status !== 'COMPLETED' || state.events.some((event) => event.id === eventId)) return state
    return {
      ...state,
      events: [...state.events, {
        id: eventId,
        taskId: test.id,
        date,
        type: 'WEEKLY_TEST_COMPLETED',
        pointsDelta: 25,
        xpDelta: 25,
      }],
    }
  },

  getSummary(state: ProgressState, asOfDate: string, isLearningDate?: IsLearningDate): ProgressSummary {
    const tasks = getCurriculumTasks(curriculum)
    const completedTaskIds = tasks.filter((task) => state.taskProgress[task.id] === 'COMPLETED').map((task) => task.id)
    const skippedTaskIds = [...new Set(state.events.filter((event) => event.type === 'TASK_SKIPPED').map((event) => event.taskId))]
    const totalXP = calculateBalance(state.events, 'xpDelta')
    const streak = calculateStreaks(state.qualifyingDates, asOfDate, isLearningDate)
    return {
      totalPoints: calculateBalance(state.events, 'pointsDelta'),
      totalXP,
      currentLevel: calculateLevel(totalXP),
      ...streak,
      completedTaskIds,
      skippedTaskIds,
      completedTaskCount: completedTaskIds.length,
      totalTaskCount: tasks.length,
      curriculumCompletionPercent: tasks.length === 0 ? 0 : Math.round(completedTaskIds.length / tasks.length * 100),
    }
  },
}
