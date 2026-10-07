import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { APP_STATE_SCHEMA_VERSION, type AppTheme } from '../domain/appState'
import { curriculum, getCurriculumTasks } from '../data/curriculum'
import { seedCalendarConfiguration } from '../data/seedCalendar'
import type { Application } from '../domain/application'
import type { Company } from '../domain/company'
import type { Opportunity } from '../domain/opportunity'
import type { CalendarDate } from '../domain/calendar'
import type { DailySchedule } from '../domain/dailySchedule'
import type { ProgressState, SkipType } from '../domain/progress'
import type { TaskProgressStatus, TaskStatus } from '../domain/task'
import type { Project, ProjectMilestone, ProjectTask } from '../domain/project'
import type { WeeklyTest } from '../domain/weeklyTest'
import { ApplicationService } from '../services/ApplicationService'
import { CalendarService } from '../services/CalendarService'
import { compareDates, getTodayDate, isDateKey, nextDay } from '../services/DateService'
import { ProgressService, createProgressState } from '../services/ProgressService'
import { OpportunityService } from '../services/OpportunityService'
import { ProjectService } from '../services/ProjectService'
import { ScheduleService } from '../services/ScheduleService'
import { StorageService } from '../services/StorageService'
import { WeeklyTestService } from '../services/WeeklyTestService'
import { ScheduleContext } from './scheduleContext'

const dailyLimitMinutes = 100

type RuntimeState = {
  schedule: DailySchedule
  progress: ProgressState
  calendarConfiguration: typeof seedCalendarConfiguration
  leaveRecords: ReturnType<typeof CalendarService.addLeave>
  schedulesByDate: Record<string, DailySchedule>
  selectedCalendarDate: CalendarDate
  weeklyTests: WeeklyTest[]
  projects: Project[]
  companies: Company[]
  opportunities: Opportunity[]
  applications: Application[]
  theme: AppTheme
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RuntimeState>(createInitialState)

  useEffect(() => {
    StorageService.save({
      schemaVersion: APP_STATE_SCHEMA_VERSION,
      progress: state.progress,
      schedulesByDate: { ...state.schedulesByDate, [state.schedule.date]: state.schedule },
      currentDate: getTodayDate(),
      selectedCalendarDate: state.selectedCalendarDate,
      calendarConfiguration: state.calendarConfiguration,
      leaveRecords: state.leaveRecords,
      weeklyTests: state.weeklyTests,
      projects: state.projects,
      companies: state.companies,
      opportunities: state.opportunities,
      applications: state.applications,
      theme: state.theme,
    })
  }, [state])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  function setTheme(theme: AppTheme) {
    setState((current) => current.theme === theme ? current : { ...current, theme })
  }

  function completeTask(taskId: string) {
    setState((current) => {
      const taskProgressStatus = current.progress.taskProgress[taskId]
      if (taskProgressStatus === 'COMPLETED') {
        const progress = ProgressService.uncompleteTask(current.progress, taskId)
        if (progress === current.progress) return current
        const progressState = ScheduleService.getProgressState(curriculum, {
          ...progress.taskProgress,
          [taskId]: 'IN_PROGRESS',
        })
        const schedule = updateTaskInSchedule(current.schedule, taskId, 'Pending', progressState[taskId])
        const schedulesByDate = Object.fromEntries(Object.entries(current.schedulesByDate).map(([date, savedSchedule]) => [
          date,
          updateTaskInSchedule(savedSchedule, taskId, 'Pending', progressState[taskId]),
        ]))
        return {
          ...current,
          schedule,
          schedulesByDate: { ...schedulesByDate, [schedule.date]: schedule },
          progress: { ...progress, taskProgress: progressState },
        }
      }

      if (taskProgressStatus === 'LOCKED') return current
      const taskDefinition = getCurriculumTasks(curriculum).find((item) => item.id === taskId)
      if (!taskDefinition) return current
      const task = current.schedule.tasks.find((item) => item.id === taskId)
      const plannedDate = task?.plannedDate
        ?? task?.dueDate
        ?? findPlannedDate(current, taskId)
      const scheduledTask = {
        ...taskDefinition,
        status: 'Pending' as const,
        progressStatus: taskProgressStatus ?? 'AVAILABLE',
        dueDate: plannedDate,
        plannedDate,
      }
      const completionTask = task?.status === 'Pending' ? task : scheduledTask
      const completion = ProgressService.completeTask(current.progress, completionTask, current.schedule.date)
      if (completion === current.progress) return current
      const next = ScheduleService.completeTask(current.schedule, current.progress.taskProgress, taskId)
      const progressState = ScheduleService.getProgressState(curriculum, completion.taskProgress)
      const schedule = updateTaskInSchedule(next.schedule, taskId, 'Completed', 'COMPLETED')
      const schedulesByDate = Object.fromEntries(Object.entries(current.schedulesByDate).map(([date, savedSchedule]) => [
        date,
        updateTaskInSchedule(savedSchedule, taskId, 'Completed', 'COMPLETED'),
      ]))
      const updatedProgress = { ...completion, taskProgress: progressState }
      const weeklyTests = WeeklyTestService.ensureTest({
        date: current.schedule.date,
        events: updatedProgress.events,
        calendarConfiguration: current.calendarConfiguration,
        leaveRecords: current.leaveRecords,
        tests: current.weeklyTests,
      })
      return { ...current, schedule, schedulesByDate: { ...schedulesByDate, [schedule.date]: schedule }, progress: updatedProgress, weeklyTests }
    })
  }

  function skipTask(taskId: string, skipType: SkipType = 'UNEXCUSED', reason?: string) {
    setState((current) => {
      const task = current.schedule.tasks.find((item) => item.id === taskId)
      if (!task) return current
      const progress = ProgressService.skipTask(current.progress, task, current.schedule.date, skipType, reason)
      if (progress === current.progress) return current
      const next = ScheduleService.skipTask(current.schedule, current.progress.taskProgress, taskId, skipType, reason)
      const updatedProgress = { ...progress, taskProgress: next.progressState }
      return {
        ...current,
        schedule: next.schedule,
        schedulesByDate: { ...current.schedulesByDate, [next.schedule.date]: next.schedule },
        progress: updatedProgress,
      }
    })
  }

  function unskipTask(taskId: string) {
    setState((current) => {
      const task = current.schedule.tasks.find((item) => item.id === taskId)
      if (!task || task.status !== 'Skipped') return current
      const progress = ProgressService.unskipTask(current.progress, taskId, current.schedule.date)
      if (progress === current.progress) return current
      const next = ScheduleService.unskipTask(current.schedule, current.progress.taskProgress, taskId)
      return {
        ...current,
        schedule: next.schedule,
        schedulesByDate: { ...current.schedulesByDate, [next.schedule.date]: next.schedule },
        progress: { ...progress, taskProgress: next.progressState },
      }
    })
  }

  function continueAhead() {
    setState((current) => {
      let candidate = nextDay(current.schedule.date)
      for (let step = 0; step < 365; step += 1) {
        const status = CalendarService.getStatus(candidate, current.calendarConfiguration, current.leaveRecords)
        if (status === 'LEARNING_DAY') {
          const restored = ScheduleService.restoreDate(
            candidate,
            current.progress.taskProgress,
            current.progress.events,
            current.calendarConfiguration,
            current.leaveRecords,
          )
          return {
            ...current,
            schedule: restored.schedule,
            selectedCalendarDate: candidate,
            schedulesByDate: { ...current.schedulesByDate, [candidate]: restored.schedule },
            progress: { ...current.progress, taskProgress: restored.progressState },
          }
        }
        candidate = nextDay(candidate)
      }
      return current
    })
  }

  function navigateToDate(date: CalendarDate) {
    if (!isDateKey(date)) return
    setState((current) => {
      if (CalendarService.getStatus(date, current.calendarConfiguration, current.leaveRecords) !== 'LEARNING_DAY') return current
      const savedSchedule = current.schedulesByDate[date]
      const schedule = savedSchedule?.calendarStatus === 'LEARNING_DAY'
        ? reconcileSchedule(savedSchedule, current.progress)
        : ScheduleService.restoreDate(
          date,
          current.progress.taskProgress,
          current.progress.events,
          current.calendarConfiguration,
          current.leaveRecords,
        ).schedule
      return {
        ...current,
        schedule,
        selectedCalendarDate: date,
        schedulesByDate: { ...current.schedulesByDate, [date]: schedule },
      }
    })
  }

  function inspectDate(date: CalendarDate) {
    if (!isDateKey(date)) return
    setState((current) => {
      const currentDate = getTodayDate()
      const status = CalendarService.getStatus(date, current.calendarConfiguration, current.leaveRecords)
      const savedSchedule = current.schedulesByDate[date]
      let inspectedSchedule = savedSchedule
      if (!savedSchedule || savedSchedule.calendarStatus !== status) {
        if (compareDates(date, currentDate) < 0 && !savedSchedule) {
          inspectedSchedule = emptySchedule(date, status)
        } else {
          inspectedSchedule = ScheduleService.restoreDate(
            date,
            current.progress.taskProgress,
            current.progress.events,
            current.calendarConfiguration,
            current.leaveRecords,
          ).schedule
        }
      } else {
        inspectedSchedule = reconcileSchedule(savedSchedule, current.progress)
      }
      return {
        ...current,
        selectedCalendarDate: date,
        schedulesByDate: { ...current.schedulesByDate, [date]: inspectedSchedule },
      }
    })
  }

  function markLeave(date: CalendarDate, reason: string) {
    setState((current) => {
      const leaves = CalendarService.addLeave(current.leaveRecords, date, reason, current.calendarConfiguration)
      if (leaves === current.leaveRecords) return current
      const schedule = ScheduleService.restoreDate(
        date,
        current.progress.taskProgress,
        current.progress.events,
        current.calendarConfiguration,
        leaves,
      ).schedule
      const schedulesByDate = { ...current.schedulesByDate, [date]: schedule }
      return {
        ...current,
        leaveRecords: leaves,
        schedulesByDate,
        schedule: date === current.schedule.date ? schedule : current.schedule,
      }
    })
  }

  function removeLeave(date: CalendarDate) {
    setState((current) => {
      const leaves = CalendarService.removeLeave(current.leaveRecords, date)
      if (leaves === current.leaveRecords) return current
      const schedule = ScheduleService.restoreDate(
        date,
        current.progress.taskProgress,
        current.progress.events,
        current.calendarConfiguration,
        leaves,
      ).schedule
      return {
        ...current,
        leaveRecords: leaves,
        schedulesByDate: { ...current.schedulesByDate, [date]: schedule },
        schedule: date === current.schedule.date ? schedule : current.schedule,
      }
    })
  }

  function ensureWeeklyTest(date: CalendarDate) {
    setState((current) => {
      const weeklyTests = WeeklyTestService.ensureTest({
        date,
        events: current.progress.events,
        calendarConfiguration: current.calendarConfiguration,
        leaveRecords: current.leaveRecords,
        tests: current.weeklyTests,
      })
      return weeklyTests === current.weeklyTests ? current : { ...current, weeklyTests }
    })
  }

  function startWeeklyTest(testId: string, date: CalendarDate) {
    setState((current) => {
      const ensured = WeeklyTestService.ensureTest({
        date,
        events: current.progress.events,
        calendarConfiguration: current.calendarConfiguration,
        leaveRecords: current.leaveRecords,
        tests: current.weeklyTests,
      })
      const weeklyTests = WeeklyTestService.startTest(ensured, testId, date)
      return weeklyTests === current.weeklyTests ? current : { ...current, weeklyTests }
    })
  }

  function answerWeeklyQuestion(testId: string, questionId: string, answerId: string) {
    setState((current) => {
      const weeklyTests = WeeklyTestService.answerQuestion(current.weeklyTests, testId, questionId, answerId)
      return weeklyTests === current.weeklyTests ? current : { ...current, weeklyTests }
    })
  }

  function postponeWeeklyTest(testId: string, newDate: CalendarDate, today: CalendarDate) {
    setState((current) => {
      const ensured = WeeklyTestService.ensureTest({
        date: today,
        events: current.progress.events,
        calendarConfiguration: current.calendarConfiguration,
        leaveRecords: current.leaveRecords,
        tests: current.weeklyTests,
      })
      const weeklyTests = WeeklyTestService.postponeTest(
        ensured,
        testId,
        newDate,
        today,
        current.calendarConfiguration,
        current.leaveRecords,
      )
      return weeklyTests === current.weeklyTests ? current : { ...current, weeklyTests }
    })
  }

  function submitWeeklyTest(testId: string, date: CalendarDate) {
    setState((current) => {
      const submitted = WeeklyTestService.submitTest(current.weeklyTests, testId, date)
      if (!submitted.completed) return submitted.tests === current.weeklyTests ? current : { ...current, weeklyTests: submitted.tests }
      const progress = ProgressService.completeWeeklyTest(current.progress, submitted.completed, date)
      return { ...current, weeklyTests: submitted.tests, progress }
    })
  }

  function createProject(input: Parameters<typeof ProjectService.createProject>[0]) {
    let createdProject: Project | null = null
    setState((current) => {
      try {
        const nextProject = ProjectService.createProject(input)
        createdProject = nextProject
        return { ...current, projects: [...current.projects, nextProject] }
      } catch {
        return current
      }
    })
    return createdProject
  }

  function updateProject(projectId: string, updates: Partial<Project>) {
    setState((current) => {
      const project = current.projects.find((item) => item.id === projectId)
      if (!project) return current
      const nextProject = ProjectService.updateProject(project, updates)
      return { ...current, projects: current.projects.map((item) => item.id === projectId ? nextProject : item) }
    })
  }

  function deleteProject(projectId: string) {
    setState((current) => ({
      ...current,
      projects: current.projects.filter((project) => project.id !== projectId),
    }))
  }

  function addProjectTask(projectId: string, input: Parameters<typeof ProjectService.addProjectTask>[1]) {
    setState((current) => {
      const project = current.projects.find((item) => item.id === projectId)
      if (!project) return current
      const nextProject = ProjectService.addProjectTask(project, input)
      return { ...current, projects: current.projects.map((item) => item.id === projectId ? nextProject : item) }
    })
  }

  function updateProjectTask(projectId: string, taskId: string, updates: Partial<ProjectTask>) {
    setState((current) => {
      const project = current.projects.find((item) => item.id === projectId)
      if (!project) return current
      const nextProject = ProjectService.updateProjectTask(project, taskId, updates)
      return { ...current, projects: current.projects.map((item) => item.id === projectId ? nextProject : item) }
    })
  }

  function deleteProjectTask(projectId: string, taskId: string) {
    setState((current) => {
      const project = current.projects.find((item) => item.id === projectId)
      if (!project) return current
      const nextProject = ProjectService.deleteProjectTask(project, taskId)
      return { ...current, projects: current.projects.map((item) => item.id === projectId ? nextProject : item) }
    })
  }

  function addProjectMilestone(projectId: string, input: Parameters<typeof ProjectService.addMilestone>[1]) {
    setState((current) => {
      const project = current.projects.find((item) => item.id === projectId)
      if (!project) return current
      const nextProject = ProjectService.addMilestone(project, input)
      return { ...current, projects: current.projects.map((item) => item.id === projectId ? nextProject : item) }
    })
  }

  function updateProjectMilestone(projectId: string, milestoneId: string, updates: Partial<ProjectMilestone>) {
    setState((current) => {
      const project = current.projects.find((item) => item.id === projectId)
      if (!project) return current
      const nextProject = ProjectService.updateMilestone(project, milestoneId, updates)
      return { ...current, projects: current.projects.map((item) => item.id === projectId ? nextProject : item) }
    })
  }

  function deleteProjectMilestone(projectId: string, milestoneId: string) {
    setState((current) => {
      const project = current.projects.find((item) => item.id === projectId)
      if (!project) return current
      const nextProject = ProjectService.deleteMilestone(project, milestoneId)
      return { ...current, projects: current.projects.map((item) => item.id === projectId ? nextProject : item) }
    })
  }

  function createCompany(name: string, website?: string, careersUrl?: string, notes?: string) {
    const trimmedName = name.trim()
    if (!trimmedName) return null
    const existing = state.companies.find((company) => company.name.toLowerCase() === trimmedName.toLowerCase())
    const now = new Date().toISOString()
    const company: Company = existing
      ? { ...existing, website: website?.trim() || existing.website, careersUrl: careersUrl?.trim() || existing.careersUrl, notes: notes?.trim() || existing.notes, updatedAt: now }
      : {
        id: `company-${now}-${Math.abs(Math.random())}`,
        name: trimmedName,
        website: website?.trim() || undefined,
        careersUrl: careersUrl?.trim() || undefined,
        notes: notes?.trim() || undefined,
        opportunitiesCount: 0,
        createdAt: now,
        updatedAt: now,
      }

    setState((current) => ({
      ...current,
      companies: existing
        ? current.companies.map((item) => item.id === existing.id ? company : item)
        : current.companies.some((item) => item.id === company.id) ? current.companies : [...current.companies, company],
    }))
    return company
  }

  function updateCompany(companyId: string, updates: Partial<Company>) {
    setState((current) => ({
      ...current,
      companies: current.companies.map((company) => company.id === companyId ? { ...company, ...updates, updatedAt: new Date().toISOString() } : company),
    }))
  }

  function deleteCompany(companyId: string) {
    setState((current) => {
      const nextCompanies = current.companies.filter((company) => company.id !== companyId)
      const nextOpportunities = current.opportunities.filter((opportunity) => opportunity.companyId !== companyId)
      return {
        ...current,
        companies: nextCompanies,
        opportunities: nextOpportunities,
        applications: current.applications.filter((application) => !nextOpportunities.some((opportunity) => opportunity.id === application.opportunityId)),
      }
    })
  }

  function createOpportunity(input: Parameters<typeof OpportunityService.createOpportunity>[0]) {
    const company = state.companies.find((item) => item.id === input.companyId)
    if (!company && !input.companyName) return null
    let nextOpportunity: Opportunity
    try {
      nextOpportunity = OpportunityService.createOpportunity(input, company)
    } catch {
      return null
    }

    setState((current) => {
      const currentCompany = current.companies.find((item) => item.id === nextOpportunity.companyId)
      if (!currentCompany) return current
      const opportunityCount = current.opportunities.filter((item) => item.companyId === currentCompany.id).length + 1
      const nextCompanies = current.companies.map((item) => item.id === currentCompany.id
        ? { ...item, opportunitiesCount: opportunityCount, updatedAt: new Date().toISOString() }
        : item)
      return { ...current, opportunities: [...current.opportunities, nextOpportunity], companies: nextCompanies }
    })
    return nextOpportunity
  }

  function updateOpportunity(opportunityId: string, updates: Partial<Opportunity>) {
    setState((current) => {
      const opportunity = current.opportunities.find((item) => item.id === opportunityId)
      if (!opportunity) return current
      const nextOpportunity = OpportunityService.updateOpportunity(opportunity, updates)
      const nextCompanies = current.companies.map((company) => company.id === opportunity.companyId ? { ...company, opportunitiesCount: current.opportunities.filter((item) => item.companyId === company.id).length, updatedAt: new Date().toISOString() } : company)
      return { ...current, opportunities: current.opportunities.map((item) => item.id === opportunityId ? nextOpportunity : item), companies: nextCompanies }
    })
  }

  function deleteOpportunity(opportunityId: string) {
    setState((current) => {
      const opportunity = current.opportunities.find((item) => item.id === opportunityId)
      if (!opportunity) return current
      const nextCompanies = current.companies.map((company) => company.id === opportunity.companyId ? { ...company, opportunitiesCount: Math.max(0, company.opportunitiesCount - 1), updatedAt: new Date().toISOString() } : company)
      return {
        ...current,
        opportunities: current.opportunities.filter((item) => item.id !== opportunityId),
        applications: current.applications.filter((application) => application.opportunityId !== opportunityId),
        companies: nextCompanies,
      }
    })
  }

  function createApplication(opportunityId: string, input: Omit<Parameters<typeof ApplicationService.createApplication>[0], 'opportunityId'>) {
    let createdApplication: Application | null = null
    setState((current) => {
      const opportunity = current.opportunities.find((item) => item.id === opportunityId)
      if (!opportunity) return current
      const nextApplication = ApplicationService.createApplication({ ...input, opportunityId })
      createdApplication = nextApplication
      return { ...current, applications: [...current.applications, nextApplication] }
    })
    return createdApplication
  }

  function updateApplication(applicationId: string, updates: Partial<Application>) {
    setState((current) => ({
      ...current,
      applications: current.applications.map((application) => application.id === applicationId ? ApplicationService.updateApplication(application, updates) : application),
    }))
  }

  function deleteApplication(applicationId: string) {
    setState((current) => ({
      ...current,
      applications: current.applications.filter((application) => application.id !== applicationId),
    }))
  }

  return (
    <ScheduleContext.Provider value={{ ...state, setTheme, completeTask, skipTask, unskipTask, continueAhead, navigateToDate, inspectDate, markLeave, removeLeave, ensureWeeklyTest, startWeeklyTest, answerWeeklyQuestion, postponeWeeklyTest, submitWeeklyTest, createProject, updateProject, deleteProject, addProjectTask, updateProjectTask, deleteProjectTask, addProjectMilestone, updateProjectMilestone, deleteProjectMilestone, createCompany, updateCompany, deleteCompany, createOpportunity, updateOpportunity, deleteOpportunity, createApplication, updateApplication, deleteApplication }}>
      {children}
    </ScheduleContext.Provider>
  )
}

function createInitialState(): RuntimeState {
  const stored = StorageService.load()
  const today = getTodayDate()
  const demoCompanyIds = new Set(['company-demo-acme', 'company-demo-nova'])
  const demoOpportunityIds = new Set(['opportunity-demo-1', 'opportunity-demo-2'])
  const calendarConfiguration = stored?.calendarConfiguration ?? seedCalendarConfiguration
  let progress = stored?.progress ?? createProgressState()
  const leaveRecords = stored?.leaveRecords ?? []
  let weeklyTests = WeeklyTestService.refreshStatuses(stored?.weeklyTests ?? [], today)
  const projects = (stored?.projects ?? []).map((project) => ProjectService.ensureProject(project))
  const companies = (stored?.companies ?? []).filter((company) => !demoCompanyIds.has(company.id))
  const opportunities = (stored?.opportunities ?? [])
    .filter((opportunity) => !demoOpportunityIds.has(opportunity.id))
    .map((opportunity) => OpportunityService.ensureOpportunity(opportunity))
  const applications = (stored?.applications ?? []).filter((application) => !demoOpportunityIds.has(application.opportunityId))
  const schedulesByDate = { ...(stored?.schedulesByDate ?? {}) }
  const todayStatus = CalendarService.getStatus(today, calendarConfiguration, leaveRecords)
  let schedule = schedulesByDate[today]

  if (todayStatus !== 'LEARNING_DAY') {
    schedule = emptySchedule(today, todayStatus)
  } else if (!schedule || schedule.calendarStatus !== todayStatus) {
    const generated = ScheduleService.restoreDate(
      today,
      progress.taskProgress,
      progress.events,
      calendarConfiguration,
      leaveRecords,
    )
    schedule = generated.schedule
    progress = { ...progress, taskProgress: generated.progressState }
  } else {
    schedule = reconcileSchedule(schedule, progress)
    progress = {
      ...progress,
      taskProgress: reconcileProgressMap(progress.taskProgress, schedule),
    }
  }
  schedulesByDate[today] = schedule
  weeklyTests = WeeklyTestService.ensureTest({
    date: today,
    events: progress.events,
    calendarConfiguration,
    leaveRecords,
    tests: weeklyTests,
  })

  return {
    schedule,
    progress,
    calendarConfiguration,
    leaveRecords,
    schedulesByDate,
    selectedCalendarDate: stored && isDateKey(stored.selectedCalendarDate) ? stored.selectedCalendarDate : today,
    weeklyTests,
    projects,
    companies,
    opportunities,
    applications,
    theme: stored?.theme ?? 'light',
  }
}

function reconcileSchedule(schedule: DailySchedule, progress: ProgressState): DailySchedule {
  const completedOnDate = new Set(progress.events
    .filter((event) => event.type === 'TASK_COMPLETED' && event.date === schedule.date)
    .map((event) => event.taskId))
  const completedBeforeDate = new Set(progress.events
    .filter((event) => event.type === 'TASK_COMPLETED' && compareDates(event.date, schedule.date) < 0)
    .map((event) => event.taskId))
  const skippedIds = new Set(progress.events.filter((event) => event.type === 'TASK_SKIPPED' && event.date === schedule.date).map((event) => event.taskId))
  return {
    ...schedule,
    tasks: schedule.tasks.flatMap((task) => {
      if (completedBeforeDate.has(task.id)) return []
      if (completedOnDate.has(task.id) || task.status === 'Completed') {
        return [{ ...task, status: 'Completed' as const, progressStatus: 'COMPLETED' as const }]
      }
      if (skippedIds.has(task.id)) return [{ ...task, status: 'Skipped', progressStatus: 'AVAILABLE' }]
      return [task]
    }),
  }
}

function reconcileProgressMap(progress: ProgressState['taskProgress'], schedule: DailySchedule): ProgressState['taskProgress'] {
  const reconciled = { ...progress }
  for (const task of schedule.tasks) {
    if (task.status === 'Completed') reconciled[task.id] = 'COMPLETED'
    else if (task.status === 'Pending' && reconciled[task.id] !== 'COMPLETED') reconciled[task.id] = 'IN_PROGRESS'
  }
  return reconciled
}

function emptySchedule(date: CalendarDate, calendarStatus: DailySchedule['calendarStatus']): DailySchedule {
  return { date, tasks: [], generated: true, availableMinutes: dailyLimitMinutes, calendarStatus }
}

function updateTaskInSchedule(
  schedule: DailySchedule,
  taskId: string,
  status: TaskStatus,
  progressStatus: TaskProgressStatus,
): DailySchedule {
  if (!schedule.tasks.some((task) => task.id === taskId)) return schedule
  return {
    ...schedule,
    tasks: schedule.tasks.map((task) => task.id === taskId ? { ...task, status, progressStatus } : task),
  }
}

function findPlannedDate(state: RuntimeState, taskId: string): CalendarDate {
  let candidate = nextDay(state.schedule.date)
  for (let step = 0; step < 365; step += 1) {
    if (CalendarService.getStatus(candidate, state.calendarConfiguration, state.leaveRecords) === 'LEARNING_DAY') {
      const schedule = ScheduleService.generateForDate(
        candidate,
        state.progress.taskProgress,
        state.calendarConfiguration,
        state.leaveRecords,
      ).schedule
      if (schedule.tasks.some((task) => task.id === taskId)) return candidate
    }
    candidate = nextDay(candidate)
  }
  return state.schedule.date
}
