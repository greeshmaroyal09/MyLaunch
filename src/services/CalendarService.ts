import type { CalendarConfiguration, CalendarDate, CalendarDayStatus, LeaveRecord } from '../domain/calendar'
import { addDays, compareDates, getTodayDate, parseDateKey } from './DateService'

export const CalendarService = {
  getStatus(date: CalendarDate, configuration: CalendarConfiguration, leaves: LeaveRecord[]): CalendarDayStatus {
    if (leaves.some((leave) => leave.date === date && leave.status === 'ACTIVE')) return 'LEAVE'
    if (configuration.holidays.some((day) => day.date === date)
      || configuration.customNonLearningDays.some((day) => day.date === date)) return 'HOLIDAY'
    if (compareDates(date, configuration.academicStartDate) < 0
      || compareDates(date, configuration.academicEndDate) > 0) return 'HOLIDAY'
    const weekday = parseDateKey(date).getDay()
    return configuration.workingDays.includes(weekday) ? 'LEARNING_DAY' : 'HOLIDAY'
  },

  getStatusLabel(status: CalendarDayStatus): string {
    if (status === 'LEARNING_DAY') return 'Learning day'
    if (status === 'LEAVE') return 'Leave'
    return 'Holiday / non-learning day'
  },

  canMarkLeave(date: CalendarDate, configuration: CalendarConfiguration, leaves: LeaveRecord[]): boolean {
    return compareDates(date, getTodayDate()) >= 0
      && this.getStatus(date, configuration, leaves) === 'LEARNING_DAY'
  },

  addLeave(leaves: LeaveRecord[], date: CalendarDate, reason: string, configuration: CalendarConfiguration): LeaveRecord[] {
    if (!this.canMarkLeave(date, configuration, leaves) || leaves.some((leave) => leave.date === date)) return leaves
    const cleanReason = reason.trim()
    if (!cleanReason) return leaves
    return [...leaves, { date, reason: cleanReason, createdAt: new Date().toISOString(), status: 'ACTIVE' as const }]
      .sort((left, right) => left.date.localeCompare(right.date))
  },

  removeLeave(leaves: LeaveRecord[], date: CalendarDate): LeaveRecord[] {
    if (compareDates(date, getTodayDate()) < 0) return leaves
    return leaves.filter((leave) => leave.date !== date)
  },

  nextLearningDate(startDate: CalendarDate, configuration: CalendarConfiguration, leaves: LeaveRecord[]): CalendarDate {
    let candidate = startDate
    for (let offset = 0; offset < 370; offset += 1) {
      if (this.getStatus(candidate, configuration, leaves) === 'LEARNING_DAY') return candidate
      candidate = addDays(candidate, 1)
    }
    return startDate
  },

  previousLearningDate(startDate: CalendarDate, configuration: CalendarConfiguration, leaves: LeaveRecord[]): CalendarDate {
    let candidate = startDate
    for (let offset = 0; offset < 370; offset += 1) {
      if (this.getStatus(candidate, configuration, leaves) === 'LEARNING_DAY') return candidate
      candidate = addDays(candidate, -1)
    }
    return startDate
  },
}
