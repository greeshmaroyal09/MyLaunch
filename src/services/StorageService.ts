import { migrateTaskId } from '../data/curriculum'
import type { AppTheme, PersistedAppState } from '../domain/appState'
import { APP_STATE_SCHEMA_VERSION } from '../domain/appState'
import type { Application, ApplicationStatus } from '../domain/application'
import type { Company } from '../domain/company'
import type { Opportunity, OpportunitySource, OpportunityStatus, OpportunityType, WorkMode } from '../domain/opportunity'
import type { CalendarConfiguration, LeaveRecord } from '../domain/calendar'
import type { DailySchedule } from '../domain/dailySchedule'
import type { ProgressEvent, ProgressState } from '../domain/progress'
import type { Project, ProjectCategory, ProjectDifficulty, ProjectMilestone, ProjectMilestoneStatus, ProjectReadiness, ProjectStatus, ProjectTask, ProjectTaskStatus } from '../domain/project'
import type { TaskProgressStatus, TaskStatus, TaskType } from '../domain/task'
import type { WeeklyQuestionCategory, WeeklyTest, WeeklyTestStatus } from '../domain/weeklyTest'
import { isDateKey } from './DateService'

const STORAGE_KEY = 'mylaunch_state_v1'

export const StorageService = {
  load(): PersistedAppState | null {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed: unknown = JSON.parse(raw)
      const migrated = migratePersistedState(parsed)
      return isPersistedState(migrated) ? migrated : null
    } catch {
      return null
    }
  },

  save(state: PersistedAppState): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage can be unavailable or full; the app remains usable for this session.
    }
  },

  clear(): void {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage can be unavailable; clearing in-memory state is handled by the provider.
    }
  },
}

function isPersistedState(value: unknown): value is PersistedAppState {
  if (!isRecord(value) || value.schemaVersion !== APP_STATE_SCHEMA_VERSION) return false
  if (value.theme !== 'light' && value.theme !== 'dark') return false
  if (!isProgressState(value.progress) || !isCalendarConfiguration(value.calendarConfiguration)) return false
  if (!Array.isArray(value.leaveRecords) || !value.leaveRecords.every(isLeaveRecord)) return false
  if (!Array.isArray(value.weeklyTests) || !value.weeklyTests.every(isWeeklyTest)) return false
  if (!Array.isArray(value.projects) || !value.projects.every(isProject)) return false
  if (!Array.isArray(value.companies) || !value.companies.every(isCompany)) return false
  if (!Array.isArray(value.opportunities) || !value.opportunities.every(isOpportunity)) return false
  if (!Array.isArray(value.applications) || !value.applications.every(isApplication)) return false
  if (!isDateKey(value.currentDate) || !isRecord(value.schedulesByDate)) return false
  return Object.entries(value.schedulesByDate).every(([date, schedule]) =>
    isDateKey(date) && isDailySchedule(schedule) && schedule.date === date,
  )
}

function migratePersistedState(value: unknown): unknown {
  if (!isRecord(value)) return value

  let migrated = value
  if (migrated.schemaVersion === 1) {
    migrated = { ...migrated, schemaVersion: APP_STATE_SCHEMA_VERSION, theme: 'light', weeklyTests: [], projects: [], companies: [], opportunities: [], applications: [] }
  }
  if (migrated.schemaVersion === 2) {
    migrated = { ...migrated, schemaVersion: APP_STATE_SCHEMA_VERSION, theme: 'light', projects: [], companies: [], opportunities: [], applications: [] }
  }
  if (migrated.schemaVersion === 3) {
    migrated = { ...migrated, schemaVersion: APP_STATE_SCHEMA_VERSION, theme: 'light', companies: [], opportunities: [], applications: [] }
  }
  if (migrated.schemaVersion === 4) {
    migrated = { ...migrated, schemaVersion: APP_STATE_SCHEMA_VERSION, theme: isAppTheme(migrated.theme) ? migrated.theme : 'light' }
  }

  if (migrated.schemaVersion !== APP_STATE_SCHEMA_VERSION) return migrated

  return {
    ...migrated,
    progress: migrateProgressState(migrated.progress),
    schedulesByDate: migrateSchedulesByDate(migrated.schedulesByDate),
  }
}

function migrateProgressState(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.taskProgress) || !Array.isArray(value.events) || !Array.isArray(value.qualifyingDates)) return value

  const mergedTaskProgress: Record<string, string> = {}
  for (const [taskId, status] of Object.entries(value.taskProgress)) {
    if (typeof status !== 'string') continue
    const migratedId = migrateTaskId(taskId)
    const existing = mergedTaskProgress[migratedId]
    const priority = ['LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED']
    const priorRank = existing ? priority.indexOf(existing) : -1
    const currentRank = priority.indexOf(status)
    const nextStatus = priorRank >= currentRank ? existing ?? status : status
    mergedTaskProgress[migratedId] = nextStatus ?? status
  }

  const events = value.events.map((event) => {
    if (!isRecord(event) || typeof event.taskId !== 'string') return event
    return { ...event, taskId: migrateTaskId(event.taskId) }
  })

  return {
    ...value,
    taskProgress: mergedTaskProgress,
    events,
    qualifyingDates: Array.from(new Set(value.qualifyingDates)),
  }
}

function migrateSchedulesByDate(value: unknown): unknown {
  if (!isRecord(value)) return value

  const migrated = Object.fromEntries(Object.entries(value).map(([date, schedule]) => [date, migrateSchedule(schedule)]))
  return migrated
}

function migrateSchedule(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.tasks)) return value

  return {
    ...value,
    tasks: value.tasks.map((task) => {
      if (!isRecord(task)) return task
      const mappedTask = { ...task }
      mappedTask.id = migrateTaskId(String(task.id))
      if (typeof mappedTask.pairedTaskId === 'string') mappedTask.pairedTaskId = migrateTaskId(mappedTask.pairedTaskId)
      if (Array.isArray(mappedTask.prerequisiteTaskIds)) {
        mappedTask.prerequisiteTaskIds = mappedTask.prerequisiteTaskIds.map((prerequisiteId) => typeof prerequisiteId === 'string' ? migrateTaskId(prerequisiteId) : prerequisiteId)
      }
      if (Array.isArray(mappedTask.legacyTaskIds)) {
        mappedTask.legacyTaskIds = mappedTask.legacyTaskIds.map((legacyTaskId) => typeof legacyTaskId === 'string' ? migrateTaskId(legacyTaskId) : legacyTaskId)
      }
      return mappedTask
    }),
  }
}

function isAppTheme(value: unknown): value is AppTheme {
  return value === 'light' || value === 'dark'
}

function isProgressState(value: unknown): value is ProgressState {
  if (!isRecord(value) || !isRecord(value.taskProgress) || !Array.isArray(value.events) || !Array.isArray(value.qualifyingDates)) return false
  const statuses = ['LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED']
  return Object.values(value.taskProgress).every((status) => typeof status === 'string' && statuses.includes(status))
    && value.events.every(isProgressEvent)
    && value.qualifyingDates.every(isDateKey)
}

function isProgressEvent(value: unknown): value is ProgressEvent {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.taskId === 'string'
    && isDateKey(value.date)
    && (value.plannedDate === undefined || isDateKey(value.plannedDate))
    && (value.type === 'TASK_COMPLETED' || value.type === 'TASK_SKIPPED' || value.type === 'WEEKLY_TEST_COMPLETED')
    && typeof value.pointsDelta === 'number'
    && Number.isFinite(value.pointsDelta)
    && typeof value.xpDelta === 'number'
    && Number.isFinite(value.xpDelta)
    && (value.skipType === undefined || value.skipType === 'EXCUSED' || value.skipType === 'UNEXCUSED')
    && (value.reason === undefined || typeof value.reason === 'string')
}

function isCompany(value: unknown): value is Company {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.website === undefined || typeof value.website === 'string')
    && (value.careersUrl === undefined || typeof value.careersUrl === 'string')
    && (value.notes === undefined || typeof value.notes === 'string')
    && typeof value.opportunitiesCount === 'number'
    && Number.isFinite(value.opportunitiesCount)
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
}

function isOpportunity(value: unknown): value is Opportunity {
  const types: OpportunityType[] = ['INTERNSHIP', 'FULL_TIME', 'OFF_CAMPUS', 'CAMPUS', 'OTHER']
  const modes: WorkMode[] = ['REMOTE', 'HYBRID', 'ON_SITE', 'UNSPECIFIED']
  const sources: OpportunitySource[] = ['Company Careers', 'LinkedIn', 'Unstop', 'Referral', 'College', 'Job Portal', 'Other']
  const statuses: OpportunityStatus[] = ['OPEN', 'CLOSED', 'DRAFT']
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.companyId === 'string'
    && typeof value.companyName === 'string'
    && typeof value.roleTitle === 'string'
    && types.includes(value.opportunityType as OpportunityType)
    && (value.location === undefined || typeof value.location === 'string')
    && modes.includes(value.workMode as WorkMode)
    && sources.includes(value.source as OpportunitySource)
    && (value.applicationUrl === undefined || typeof value.applicationUrl === 'string')
    && (value.companyUrl === undefined || typeof value.companyUrl === 'string')
    && (value.description === undefined || typeof value.description === 'string')
    && Array.isArray(value.requiredSkills)
    && value.requiredSkills.every((entry) => typeof entry === 'string')
    && Array.isArray(value.preferredSkills)
    && value.preferredSkills.every((entry) => typeof entry === 'string')
    && isRecord(value.eligibility)
    && Array.isArray(value.eligibility.eligibleGraduationYears)
    && value.eligibility.eligibleGraduationYears.every((entry) => typeof entry === 'number')
    && (value.eligibility.minimumGraduationYear === undefined || typeof value.eligibility.minimumGraduationYear === 'number')
    && (value.eligibility.maximumGraduationYear === undefined || typeof value.eligibility.maximumGraduationYear === 'number')
    && (value.eligibility.batchText === undefined || typeof value.eligibility.batchText === 'string')
    && (value.eligibility.minimumCGPA === undefined || typeof value.eligibility.minimumCGPA === 'number')
    && Array.isArray(value.eligibility.degreeRequirements)
    && value.eligibility.degreeRequirements.every((entry) => typeof entry === 'string')
    && Array.isArray(value.eligibility.branchRequirements)
    && value.eligibility.branchRequirements.every((entry) => typeof entry === 'string')
    && Array.isArray(value.eligibility.experienceRequirements)
    && value.eligibility.experienceRequirements.every((entry) => typeof entry === 'string')
    && (value.applicationOpeningDate === undefined || isDateKey(value.applicationOpeningDate))
    && (value.applicationDeadline === undefined || isDateKey(value.applicationDeadline))
    && statuses.includes(value.status as OpportunityStatus)
    && (value.notes === undefined || typeof value.notes === 'string')
    && Array.isArray(value.projectIds)
    && value.projectIds.every((entry) => typeof entry === 'string')
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
}

function isApplication(value: unknown): value is Application {
  const statuses: ApplicationStatus[] = ['SAVED', 'PLANNED', 'APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'EXPIRED']
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.opportunityId === 'string'
    && (value.appliedDate === undefined || isDateKey(value.appliedDate))
    && statuses.includes(value.status as ApplicationStatus)
    && typeof value.currentStage === 'string'
    && (value.notes === undefined || typeof value.notes === 'string')
    && (value.nextActionDate === undefined || isDateKey(value.nextActionDate))
    && typeof value.lastUpdated === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false
  const categories: ProjectCategory[] = ['SDE / Backend', 'DSA / Systems', 'AI / ML', 'Data', 'Full Stack', 'Cloud / DevOps', 'Academic / Research', 'Other']
  const difficulties: ProjectDifficulty[] = ['Beginner', 'Intermediate', 'Advanced']
  const statuses: ProjectStatus[] = ['IDEA', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']
  return typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.description === 'string'
    && categories.includes(value.category as ProjectCategory)
    && difficulties.includes(value.difficulty as ProjectDifficulty)
    && statuses.includes(value.status as ProjectStatus)
    && Array.isArray(value.techStack)
    && value.techStack.every((entry) => typeof entry === 'string')
    && isDateKey(value.startDate)
    && (value.targetCompletionDate === undefined || isDateKey(value.targetCompletionDate))
    && typeof value.progress === 'number'
    && Number.isFinite(value.progress)
    && value.progress >= 0 && value.progress <= 100
    && Array.isArray(value.associatedSubjects)
    && value.associatedSubjects.every((entry) => typeof entry === 'string')
    && Array.isArray(value.tasks) && value.tasks.every(isProjectTask)
    && Array.isArray(value.milestones) && value.milestones.every(isProjectMilestone)
    && (value.repositoryUrl === undefined || typeof value.repositoryUrl === 'string')
    && (value.deploymentUrl === undefined || typeof value.deploymentUrl === 'string')
    && (value.demoUrl === undefined || typeof value.demoUrl === 'string')
    && typeof value.readmeStatus === 'boolean'
    && typeof value.documentationStatus === 'boolean'
    && typeof value.resumeReady === 'boolean'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && isPortfolioReadiness(value.portfolioReadiness)
}

function isProjectTask(value: unknown): value is ProjectTask {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.projectId === 'string'
    && typeof value.title === 'string'
    && typeof value.description === 'string'
    && typeof value.estimatedMinutes === 'number'
    && Number.isFinite(value.estimatedMinutes)
    && value.estimatedMinutes >= 0
    && ['TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'].includes(value.status as ProjectTaskStatus)
    && typeof value.order === 'number'
    && Number.isInteger(value.order)
    && (value.milestoneId === undefined || typeof value.milestoneId === 'string')
}

function isProjectMilestone(value: unknown): value is ProjectMilestone {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.projectId === 'string'
    && typeof value.title === 'string'
    && typeof value.description === 'string'
    && typeof value.order === 'number'
    && Number.isInteger(value.order)
    && ['PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(value.status as ProjectMilestoneStatus)
    && Array.isArray(value.taskIds)
    && value.taskIds.every((entry) => typeof entry === 'string')
}

function isPortfolioReadiness(value: unknown): value is ProjectReadiness {
  return isRecord(value)
    && typeof value.implementationComplete === 'boolean'
    && typeof value.repositoryAvailable === 'boolean'
    && typeof value.readmeAvailable === 'boolean'
    && typeof value.deploymentAvailable === 'boolean'
    && typeof value.documentationComplete === 'boolean'
    && typeof value.resumeReady === 'boolean'
    && typeof value.portfolioReady === 'boolean'
}

function isWeeklyTest(value: unknown): value is WeeklyTest {
  const statuses: WeeklyTestStatus[] = ['NOT_AVAILABLE', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'MISSED']
  const categories: WeeklyQuestionCategory[] = ['CURRENT_WEEK', 'RECENT_REVIEW', 'CUMULATIVE_REVIEW']
  if (!isRecord(value)) return false
  const questionIds = value.questionIds
  const questionCategories = value.questionCategories
  const answers = value.answers
  if (typeof value.id !== 'string'
    || !isDateKey(value.weekStartDate)
    || !isDateKey(value.weekEndDate)
    || !isDateKey(value.scheduledDate)
    || !isDateKey(value.originalScheduledDate)
    || !statuses.includes(value.status as WeeklyTestStatus)
    || !Array.isArray(questionIds)
    || !questionIds.every((id) => typeof id === 'string')
    || new Set(questionIds).size !== questionIds.length
    || !isRecord(questionCategories)
    || !questionIds.every((id) => categories.includes(questionCategories[id] as WeeklyQuestionCategory))
    || !isRecord(answers)
    || !Object.entries(answers).every(([id, answer]) => questionIds.includes(id) && typeof answer === 'string')
    || typeof value.createdAt !== 'string') return false

  const result = value.result
  if (result === undefined) return true
  if (!isRecord(result)) return false
  return ['score', 'totalQuestions', 'correctCount', 'incorrectCount', 'percentage', 'currentWeekCorrect', 'currentWeekTotal', 'reviewCorrect', 'reviewTotal'].every((key) => typeof result[key] === 'number' && Number.isFinite(result[key]))
    && Array.isArray(result.topicsNeedingReview)
    && result.topicsNeedingReview.every((topic) => typeof topic === 'string')
    && isDateKey(result.submittedAt)
}

function isCalendarConfiguration(value: unknown): value is CalendarConfiguration {
  return isRecord(value)
    && isDateKey(value.academicStartDate)
    && isDateKey(value.academicEndDate)
    && value.academicStartDate <= value.academicEndDate
    && Array.isArray(value.workingDays)
    && value.workingDays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    && Array.isArray(value.holidays)
    && value.holidays.every(isCalendarEntry)
    && Array.isArray(value.customNonLearningDays)
    && value.customNonLearningDays.every(isCalendarEntry)
}

function isCalendarEntry(value: unknown): boolean {
  return isRecord(value) && isDateKey(value.date) && typeof value.label === 'string'
}

function isLeaveRecord(value: unknown): value is LeaveRecord {
  return isRecord(value)
    && isDateKey(value.date)
    && typeof value.reason === 'string'
    && typeof value.createdAt === 'string'
    && value.status === 'ACTIVE'
}

function isDailySchedule(value: unknown): value is DailySchedule {
  return isRecord(value)
    && isDateKey(value.date)
    && Array.isArray(value.tasks)
    && typeof value.generated === 'boolean'
    && Number.isFinite(value.availableMinutes)
    && ['LEARNING_DAY', 'HOLIDAY', 'LEAVE'].includes(String(value.calendarStatus))
    && value.tasks.every(isScheduledTask)
}

function isScheduledTask(value: unknown): boolean {
  const taskTypes: TaskType[] = ['Learn', 'Practice', 'Revision', 'Problem Solving', 'Project Work']
  const taskStatuses: TaskStatus[] = ['Pending', 'Completed', 'Skipped']
  const progressStatuses: TaskProgressStatus[] = ['LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED']
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.subject === 'string'
    && typeof value.type === 'string'
    && taskTypes.includes(value.type as TaskType)
    && typeof value.description === 'string'
    && typeof value.estimatedMinutes === 'number'
    && Number.isFinite(value.estimatedMinutes)
    && value.estimatedMinutes >= 0
    && typeof value.priority === 'number'
    && typeof value.required === 'boolean'
    && Array.isArray(value.prerequisiteTaskIds)
    && value.prerequisiteTaskIds.every((id) => typeof id === 'string')
    && taskStatuses.includes(value.status as TaskStatus)
    && progressStatuses.includes(value.progressStatus as TaskProgressStatus)
    && isDateKey(value.dueDate)
    && (value.plannedDate === undefined || isDateKey(value.plannedDate))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
