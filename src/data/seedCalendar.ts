import type { CalendarConfiguration } from '../domain/calendar'

export const seedCalendarConfiguration: CalendarConfiguration = {
  academicStartDate: '2026-09-01',
  academicEndDate: '2027-06-30',
  workingDays: [1, 2, 3, 4, 5],
  holidays: [],
  customNonLearningDays: [],
}
