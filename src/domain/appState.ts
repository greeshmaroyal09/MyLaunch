import type { CalendarConfiguration, LeaveRecord } from './calendar'
import type { ProgressState } from './progress'
import type { DailySchedule } from './dailySchedule'
import type { Application } from './application'
import type { Company } from './company'
import type { Opportunity } from './opportunity'
import type { Project } from './project'
import type { WeeklyTest } from './weeklyTest'

export const APP_STATE_SCHEMA_VERSION = 5
export type AppTheme = 'light' | 'dark'

export type PersistedAppState = {
  schemaVersion: typeof APP_STATE_SCHEMA_VERSION
  progress: ProgressState
  schedulesByDate: Record<string, DailySchedule>
  currentDate: string
  selectedCalendarDate: string
  calendarConfiguration: CalendarConfiguration
  leaveRecords: LeaveRecord[]
  weeklyTests: WeeklyTest[]
  projects: Project[]
  companies: Company[]
  opportunities: Opportunity[]
  applications: Application[]
  theme: AppTheme
}
