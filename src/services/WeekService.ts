import type { CalendarConfiguration, CalendarDate, LeaveRecord } from '../domain/calendar'
import type { ProgressEvent } from '../domain/progress'
import type { WeekModel } from '../domain/weeklyTest'
import { CalendarService } from './CalendarService'
import { addDays, compareDates, nextDay, parseDateKey, previousDay } from './DateService'

export function getWeekModel(date: CalendarDate, events: ProgressEvent[], calendar: CalendarConfiguration, leaves: LeaveRecord[] = []): WeekModel {
  const weekday = parseDateKey(date).getDay()
  const daysSinceMonday = (weekday + 6) % 7
  const startDate = addDays(date, -daysSinceMonday)
  const endDate = addDays(startDate, 6)
  const weekEvents = events.filter((event) =>
    event.type === 'TASK_COMPLETED' && compareDates(event.date, startDate) >= 0 && compareDates(event.date, endDate) <= 0,
  )
  const skippedTaskIds = [...new Set(events
    .filter((event) => event.type === 'TASK_SKIPPED' && compareDates(event.date, startDate) >= 0 && compareDates(event.date, endDate) <= 0)
    .map((event) => event.taskId))]
  const eligibleReviewTaskIds = [...new Set(events
    .filter((event) => event.type === 'TASK_COMPLETED' && compareDates(event.date, endDate) <= 0)
    .map((event) => event.taskId))]
  const learningDates: CalendarDate[] = []
  for (let current = startDate; compareDates(current, endDate) <= 0; current = nextDay(current)) {
    if (CalendarService.getStatus(current, calendar, leaves) === 'LEARNING_DAY') learningDates.push(current)
  }

  return {
    id: `week:${startDate}`,
    startDate,
    endDate,
    weeklyTestDate: endDate,
    learningDates,
    completedTaskIds: [...new Set(weekEvents.map((event) => event.taskId))],
    skippedTaskIds,
    eligibleReviewTaskIds: eligibleReviewTaskIds.filter((taskId) => taskId.length > 0),
  }
}

export function getPreviousWeekRange(weekStart: CalendarDate): { startDate: CalendarDate; endDate: CalendarDate } {
  const startDate = addDays(weekStart, -7)
  return { startDate, endDate: previousDay(weekStart) }
}

export function getRecentReviewTaskIds(week: WeekModel, events: ProgressEvent[]): string[] {
  const previous = getPreviousWeekRange(week.startDate)
  return [...new Set(events
    .filter((event) => event.type === 'TASK_COMPLETED'
      && compareDates(event.date, previous.startDate) >= 0
      && compareDates(event.date, previous.endDate) <= 0)
    .map((event) => event.taskId))]
}

export function getOlderReviewTaskIds(week: WeekModel, events: ProgressEvent[]): string[] {
  const previous = getPreviousWeekRange(week.startDate)
  return [...new Set(events
    .filter((event) => event.type === 'TASK_COMPLETED' && compareDates(event.date, previous.startDate) < 0)
    .map((event) => event.taskId))]
}
