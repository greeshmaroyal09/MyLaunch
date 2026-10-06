import type { ScheduledTask } from './task'
import type { CalendarDayStatus } from './calendar'

export type DailySchedule = {
  date: string
  tasks: ScheduledTask[]
  generated: boolean
  availableMinutes: number
  calendarStatus: CalendarDayStatus
}

export type ScheduleSummary = {
  taskCount: number
  completedCount: number
  remainingCount: number
  plannedMinutes: number
}
