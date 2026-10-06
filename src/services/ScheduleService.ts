import { curriculum, getCurriculumTasks } from '../data/curriculum'
import { seedCalendarConfiguration } from '../data/seedCalendar'
import type { Curriculum, CurriculumProgress, TaskProgressMap } from '../domain/curriculum'
import type { CalendarConfiguration, CalendarDate, CalendarDayStatus, LeaveRecord } from '../domain/calendar'
import type { DailySchedule, ScheduleSummary } from '../domain/dailySchedule'
import type { ProgressEvent, SkipType } from '../domain/progress'
import type { ScheduledTask, TaskProgressStatus } from '../domain/task'
import { CalendarService } from './CalendarService'
import { formatDate, getTodayDate } from './DateService'
import { RuleBasedScheduler } from './RuleBasedScheduler'

const scheduler = new RuleBasedScheduler()
const dailyLimitMinutes = 100

export type ScheduleResult = {
  schedule: DailySchedule
  progressState: TaskProgressMap
}

export const ScheduleService = {
  generateToday(date: CalendarDate, currentProgress: TaskProgressMap = {}): ScheduleResult {
    return this.generateForDate(date, currentProgress, seedCalendarConfiguration, [])
  },

  generateForDate(
    date: CalendarDate,
    currentProgress: TaskProgressMap,
    configuration: CalendarConfiguration,
    leaves: LeaveRecord[],
    excludedTaskIds: string[] = [],
    availableMinutes = dailyLimitMinutes,
  ): ScheduleResult {
    const calendarStatus = CalendarService.getStatus(date, configuration, leaves)
    if (calendarStatus !== 'LEARNING_DAY') {
      return {
        schedule: createEmptySchedule(date, calendarStatus),
        progressState: deriveProgressState(curriculum, currentProgress),
      }
    }
    return generateSchedule(date, currentProgress, availableMinutes, excludedTaskIds, calendarStatus)
  },

  restoreDate(
    date: CalendarDate,
    currentProgress: TaskProgressMap,
    events: ProgressEvent[],
    configuration: CalendarConfiguration,
    leaves: LeaveRecord[],
  ): ScheduleResult {
    const calendarStatus = CalendarService.getStatus(date, configuration, leaves)
    if (calendarStatus !== 'LEARNING_DAY') {
      return { schedule: createEmptySchedule(date, calendarStatus), progressState: deriveProgressState(curriculum, currentProgress) }
    }

    const curriculumTasks = new Map(getCurriculumTasks().map((task) => [task.id, task]))
      const dateEvents = events.filter((event) => event.date === date)
    const completedRows = dateEvents
      .filter((event) => event.type === 'TASK_COMPLETED')
        .map((event) => buildEventTask(event.taskId, date, 'Completed', curriculumTasks, undefined, undefined, event.plannedDate ?? event.date))
      .filter((task): task is ScheduledTask => task !== undefined)
    const skippedRows = dateEvents
      .filter((event) => event.type === 'TASK_SKIPPED')
        .map((event) => buildEventTask(event.taskId, date, 'Skipped', curriculumTasks, event.skipType, event.reason, event.plannedDate ?? event.date))
      .filter((task): task is ScheduledTask => task !== undefined)
    const excludedTaskIds = [...completedRows, ...skippedRows].map((task) => task.id)
    const completedMinutes = completedRows.reduce((total, task) => total + task.estimatedMinutes, 0)
    const generated = generateSchedule(
      date,
      currentProgress,
      Math.max(0, dailyLimitMinutes - completedMinutes),
      excludedTaskIds,
      calendarStatus,
    )
    const eventIds = new Set(excludedTaskIds)
    return {
      progressState: generated.progressState,
      schedule: {
        ...generated.schedule,
        tasks: [...completedRows, ...generated.schedule.tasks.filter((task) => !eventIds.has(task.id)), ...skippedRows],
      },
    }
  },

  completeTask(schedule: DailySchedule, progressState: TaskProgressMap, taskId: string): ScheduleResult {
    const taskToComplete = schedule.tasks.find((task) => task.id === taskId)
    if (!taskToComplete || taskToComplete.status !== 'Pending' || schedule.calendarStatus !== 'LEARNING_DAY') {
      return { schedule, progressState }
    }

    const updatedProgress = deriveProgressState(curriculum, { ...progressState, [taskId]: 'COMPLETED' })
    const tasks = schedule.tasks.map((task) => task.id === taskId
      ? { ...task, status: 'Completed' as const, progressStatus: 'COMPLETED' as const }
      : task)

    return {
      progressState: updatedProgress,
      schedule: { ...schedule, tasks },
    }
  },

  skipTask(
    schedule: DailySchedule,
    progressState: TaskProgressMap,
    taskId: string,
    skipType: SkipType = 'UNEXCUSED',
    reason?: string,
  ): ScheduleResult {
    const taskToSkip = schedule.tasks.find((task) => task.id === taskId)
    if (!taskToSkip || taskToSkip.status !== 'Pending' || schedule.calendarStatus !== 'LEARNING_DAY') {
      return { schedule, progressState }
    }

    const normalizedType: SkipType = skipType === 'EXCUSED' ? 'EXCUSED' : 'UNEXCUSED'
    const skippedTask = {
      ...taskToSkip,
      status: 'Skipped' as const,
      progressStatus: 'AVAILABLE' as const,
      skipType: normalizedType,
      skipReason: normalizedType === 'EXCUSED' ? (reason ?? '').trim() || undefined : undefined,
    }
    const updatedProgress = { ...deriveProgressState(curriculum, progressState), [taskId]: 'AVAILABLE' as const }

    return {
      progressState: updatedProgress,
      schedule: {
        ...schedule,
        tasks: schedule.tasks.map((task) => task.id === taskId ? skippedTask : task),
      },
    }
  },

  unskipTask(
    schedule: DailySchedule,
    progressState: TaskProgressMap,
    taskId: string,
  ): ScheduleResult {
    const taskToUnskip = schedule.tasks.find((task) => task.id === taskId)
    if (!taskToUnskip || taskToUnskip.status !== 'Skipped' || schedule.calendarStatus !== 'LEARNING_DAY') {
      return { schedule, progressState }
    }

    const updatedProgress = { ...deriveProgressState(curriculum, progressState), [taskId]: 'AVAILABLE' as const }
    return {
      progressState: updatedProgress,
      schedule: {
        ...schedule,
        tasks: schedule.tasks.map((task) => task.id === taskId ? { ...task, status: 'Pending' as const, progressStatus: 'AVAILABLE' as const, skipType: undefined, skipReason: undefined } : task),
      },
    }
  },

  getProgressState,
  getCurriculumProgress,

  getSummary(schedule: DailySchedule): ScheduleSummary {
    const plannedTasks = schedule.tasks.filter((task) => task.status !== 'Skipped')
    const completedCount = plannedTasks.filter((task) => task.status === 'Completed').length
    return {
      taskCount: plannedTasks.length,
      completedCount,
      remainingCount: plannedTasks.length - completedCount,
      plannedMinutes: plannedTasks.reduce((total, task) => total + task.estimatedMinutes, 0),
    }
  },
}

function createEmptySchedule(date: CalendarDate, calendarStatus: CalendarDayStatus): DailySchedule {
  return { date, tasks: [], generated: true, availableMinutes: dailyLimitMinutes, calendarStatus }
}

function buildEventTask(
  taskId: string,
  date: CalendarDate,
  status: 'Completed' | 'Skipped',
  taskLookup: Map<string, ReturnType<typeof getCurriculumTasks>[number]>,
  skipType?: SkipType,
  skipReason?: string,
  plannedDate?: string,
): ScheduledTask | undefined {
  const task = taskLookup.get(taskId)
  if (!task) return undefined
  return {
    ...task,
    status,
    progressStatus: status === 'Completed' ? 'COMPLETED' : 'AVAILABLE',
    dueDate: date,
    plannedDate: plannedDate ?? date,
    skipType: status === 'Skipped' ? skipType : undefined,
    skipReason: status === 'Skipped' ? skipReason : undefined,
  }
}

function generateSchedule(
  date: CalendarDate,
  currentProgress: TaskProgressMap,
  availableMinutes: number,
  excludedTaskIds: string[] = [],
  calendarStatus: CalendarDayStatus = 'LEARNING_DAY',
): ScheduleResult {
  const progressState = deriveProgressState(curriculum, currentProgress)
  const schedule = scheduler.generate({
    date,
    tasks: getCurriculumTasks(curriculum),
    progressState,
    availableMinutes,
    excludedTaskIds,
  })
  const updatedProgress = { ...progressState }
  for (const task of schedule.tasks) updatedProgress[task.id] = 'IN_PROGRESS'

  return {
    schedule: { ...schedule, availableMinutes: dailyLimitMinutes, calendarStatus },
    progressState: updatedProgress,
  }
}

export function deriveProgressState(source: Curriculum, currentProgress: TaskProgressMap = {}): TaskProgressMap {
  const allTasks = source.subjects.flatMap((subject) =>
    subject.modules.flatMap((module) => module.topics.flatMap((topic) => topic.tasks)),
  )
  const completed = new Set(
    allTasks.filter((task) => currentProgress[task.id] === 'COMPLETED').map((task) => task.id),
  )

  return Object.fromEntries(allTasks.map((task) => {
    if (completed.has(task.id)) return [task.id, 'COMPLETED' satisfies TaskProgressStatus]
    const prerequisitesComplete = task.prerequisiteTaskIds.every((id) => completed.has(id))
    if (!prerequisitesComplete) return [task.id, 'LOCKED' satisfies TaskProgressStatus]
    const previous = currentProgress[task.id]
    return [task.id, previous === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'AVAILABLE']
  }))
}

export function getProgressState(source: Curriculum, currentProgress: TaskProgressMap = {}): TaskProgressMap {
  return deriveProgressState(source, currentProgress)
}

export function getCurriculumProgress(source: Curriculum, progressState: TaskProgressMap): CurriculumProgress {
  const totalTaskCount = getCurriculumTasks(source).length
  const completedTaskCount = Object.values(progressState).filter((status) => status === 'COMPLETED').length
  return {
    progressByTaskId: progressState,
    completedTaskCount,
    totalTaskCount,
    completionPercent: totalTaskCount === 0 ? 0 : Math.round(completedTaskCount / totalTaskCount * 100),
  }
}

export function getLocalDate(): CalendarDate {
  return getTodayDate()
}

export function formatScheduleDate(date: CalendarDate, options?: Intl.DateTimeFormatOptions): string {
  return formatDate(date, options)
}
