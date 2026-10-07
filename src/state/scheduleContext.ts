import { createContext } from 'react'
import type { Application } from '../domain/application'
import type { AppTheme } from '../domain/appState'
import type { Company } from '../domain/company'
import type { Opportunity } from '../domain/opportunity'
import type { ProgressState, SkipType } from '../domain/progress'
import type { DailySchedule } from '../domain/dailySchedule'
import type { CalendarConfiguration, CalendarDate, LeaveRecord } from '../domain/calendar'
import type { Project, ProjectTask } from '../domain/project'
import type { WeeklyTest } from '../domain/weeklyTest'
import type { CreateApplicationInput } from '../services/ApplicationService'
import type { ProjectCreateInput, ProjectMilestoneInput, ProjectTaskInput } from '../services/ProjectService'
import type { CreateOpportunityInput } from '../services/OpportunityService'

export type ScheduleContextValue = {
  schedule: DailySchedule
  progress: ProgressState
  calendarConfiguration: CalendarConfiguration
  leaveRecords: LeaveRecord[]
  schedulesByDate: Record<string, DailySchedule>
  selectedCalendarDate: CalendarDate
  weeklyTests: WeeklyTest[]
  projects: Project[]
  companies: Company[]
  opportunities: Opportunity[]
  applications: Application[]
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  completeTask: (taskId: string) => void
  skipTask: (taskId: string, skipType?: SkipType, reason?: string) => void
  unskipTask: (taskId: string) => void
  continueAhead: () => void
  navigateToDate: (date: CalendarDate) => void
  inspectDate: (date: CalendarDate) => void
  markLeave: (date: CalendarDate, reason: string) => void
  removeLeave: (date: CalendarDate) => void
  ensureWeeklyTest: (date: CalendarDate) => void
  startWeeklyTest: (testId: string, date: CalendarDate) => void
  answerWeeklyQuestion: (testId: string, questionId: string, answerId: string) => void
  postponeWeeklyTest: (testId: string, newDate: CalendarDate, today: CalendarDate) => void
  submitWeeklyTest: (testId: string, date: CalendarDate) => void
  createProject: (input: ProjectCreateInput) => Project | null
  updateProject: (projectId: string, updates: Partial<Project>) => void
  deleteProject: (projectId: string) => void
  addProjectTask: (projectId: string, input: ProjectTaskInput) => void
  updateProjectTask: (projectId: string, taskId: string, updates: Partial<ProjectTask>) => void
  deleteProjectTask: (projectId: string, taskId: string) => void
  addProjectMilestone: (projectId: string, input: ProjectMilestoneInput) => void
  updateProjectMilestone: (projectId: string, milestoneId: string, updates: Partial<Project['milestones'][number]>) => void
  deleteProjectMilestone: (projectId: string, milestoneId: string) => void
  createCompany: (name: string, website?: string, careersUrl?: string, notes?: string) => Company | null
  updateCompany: (companyId: string, updates: Partial<Company>) => void
  deleteCompany: (companyId: string) => void
  createOpportunity: (input: CreateOpportunityInput) => Opportunity | null
  updateOpportunity: (opportunityId: string, updates: Partial<Opportunity>) => void
  deleteOpportunity: (opportunityId: string) => void
  createApplication: (opportunityId: string, input: Omit<CreateApplicationInput, 'opportunityId'>) => Application | null
  updateApplication: (applicationId: string, updates: Partial<Application>) => void
  deleteApplication: (applicationId: string) => void
}

export const ScheduleContext = createContext<ScheduleContextValue | null>(null)
