import { curriculum, getCurriculumTasks } from '../data/curriculum'
import type { Application } from '../domain/application'
import type { CalendarConfiguration, CalendarDate, LeaveRecord } from '../domain/calendar'
import type { ProgressState, ProgressSummary } from '../domain/progress'
import type { Project } from '../domain/project'
import type { Subject } from '../domain/curriculum'
import type { WeeklyTest } from '../domain/weeklyTest'
import { CalendarService } from './CalendarService'
import { CareerService } from './CareerService'
import { ProgressService } from './ProgressService'
import { getWeekModel } from './WeekService'

export type ProgressTrackFilter = 'Primary' | 'AI / ML' | 'All'

export type SubjectProgress = {
  subject: Subject
  completedTaskCount: number
  totalTaskCount: number
  completionPercent: number
  completedMinutes: number
  plannedMinutes: number
}

export type ProgressDashboardData = {
  summary: ProgressSummary
  subjectProgress: SubjectProgress[]
  totalCompletedMinutes: number
  weekly: { startDate: CalendarDate; learningDaysCompleted: number; tasksCompleted: number; minutesCompleted: number }
  recentActivity: Array<{
    id: string
    date: CalendarDate
    title: string
    subject: string
    action: 'Completed' | 'Skipped'
    pointsDelta: number
    xpDelta: number
  }>
  projects: { total: number; inProgress: number; completed: number; portfolioReady: number; completedTasks: number; totalTasks: number }
  assessments: { completed: number; latest?: WeeklyTest }
  career: ReturnType<typeof CareerService.getOverview> & { totalApplications: number }
}

export function getProgressDashboardData(input: {
  progress: ProgressState
  date: CalendarDate
  calendarConfiguration: CalendarConfiguration
  leaveRecords: LeaveRecord[]
  weeklyTests: WeeklyTest[]
  projects: Project[]
  applications: Application[]
}): ProgressDashboardData {
  const isLearningDate = (date: CalendarDate) =>
    CalendarService.getStatus(date, input.calendarConfiguration, input.leaveRecords) === 'LEARNING_DAY'
  const summary = ProgressService.getSummary(input.progress, input.date, isLearningDate)
  const tasks = getCurriculumTasks(curriculum)
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const completedIds = new Set(summary.completedTaskIds)
  const subjectProgress = curriculum.subjects.map((subject) => {
    const subjectTasks = subject.modules.flatMap((module) => module.topics.flatMap((topic) => topic.tasks))
    const completedTasks = subjectTasks.filter((task) => completedIds.has(task.id))
    return {
      subject,
      completedTaskCount: completedTasks.length,
      totalTaskCount: subjectTasks.length,
      completionPercent: subjectTasks.length === 0 ? 0 : Math.round(completedTasks.length / subjectTasks.length * 100),
      completedMinutes: completedTasks.reduce((total, task) => total + task.estimatedMinutes, 0),
      plannedMinutes: subjectTasks.reduce((total, task) => total + task.estimatedMinutes, 0),
    }
  })
  const week = getWeekModel(input.date, input.progress.events, input.calendarConfiguration, input.leaveRecords)
  const completedThisWeek = input.progress.events.filter((event) =>
    event.type === 'TASK_COMPLETED' && event.date >= week.startDate && event.date <= input.date,
  )
  const weeklyTaskIds = new Set(completedThisWeek.map((event) => event.taskId))
  const completedDates = new Set(input.progress.qualifyingDates.filter((date) =>
    date >= week.startDate && date <= input.date && isLearningDate(date),
  ))
  const taskEvents = input.progress.events
    .filter((event) => event.type === 'TASK_COMPLETED' || event.type === 'TASK_SKIPPED')
    .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id))
    .slice(0, 8)
    .flatMap((event) => {
      const task = taskById.get(event.taskId)
      if (!task) return []
      return [{
        id: event.id,
        date: event.date,
        title: task.title,
        subject: task.subject,
        action: event.type === 'TASK_COMPLETED' ? 'Completed' as const : 'Skipped' as const,
        pointsDelta: event.pointsDelta,
        xpDelta: event.xpDelta,
      }]
    })
  const completedTests = input.weeklyTests
    .filter((test) => test.status === 'COMPLETED' && test.result)
    .sort((left, right) => (right.result?.submittedAt ?? '').localeCompare(left.result?.submittedAt ?? ''))
  const allProjectTasks = input.projects.flatMap((project) => project.tasks)

  return {
    summary,
    subjectProgress,
    totalCompletedMinutes: tasks.reduce((total, task) => total + (completedIds.has(task.id) ? task.estimatedMinutes : 0), 0),
    weekly: {
      startDate: week.startDate,
      learningDaysCompleted: completedDates.size,
      tasksCompleted: weeklyTaskIds.size,
      minutesCompleted: tasks.reduce((total, task) => total + (weeklyTaskIds.has(task.id) ? task.estimatedMinutes : 0), 0),
    },
    recentActivity: taskEvents,
    projects: {
      total: input.projects.length,
      inProgress: input.projects.filter((project) => project.status === 'IN_PROGRESS').length,
      completed: input.projects.filter((project) => project.status === 'COMPLETED').length,
      portfolioReady: input.projects.filter((project) => project.portfolioReadiness.portfolioReady).length,
      completedTasks: allProjectTasks.filter((task) => task.status === 'COMPLETED').length,
      totalTasks: allProjectTasks.length,
    },
    assessments: { completed: completedTests.length, latest: completedTests[0] },
    career: { ...CareerService.getOverview([], [], input.applications), totalApplications: input.applications.length },
  }
}