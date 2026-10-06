export type CalendarDate = string
export type CalendarDayStatus = 'LEARNING_DAY' | 'HOLIDAY' | 'LEAVE'

export type CalendarDayEntry = {
  date: CalendarDate
  label: string
}

export type CalendarConfiguration = {
  academicStartDate: CalendarDate
  academicEndDate: CalendarDate
  workingDays: number[]
  holidays: CalendarDayEntry[]
  customNonLearningDays: CalendarDayEntry[]
}

export type LeaveRecord = {
  date: CalendarDate
  reason: string
  createdAt: string
  status: 'ACTIVE'
}
