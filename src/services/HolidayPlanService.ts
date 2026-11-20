import { curriculum, getCurriculumTasks } from '../data/curriculum'
import type { CalendarDate } from '../domain/calendar'
import type { TaskProgressMap } from '../domain/curriculum'
import type { DailySchedule } from '../domain/dailySchedule'
import type { ProgressEvent } from '../domain/progress'
import type { ScheduledTask } from '../domain/task'
import { addDays, getTodayDate } from './DateService'

export type StudyBudget = 60 | 120 | 180
export type HolidayPlanSettings = { startDate: CalendarDate; dailyMinutes: StudyBudget; budgetsByDate: Record<string, StudyBudget>; readinessChecks: Record<string, boolean> }

const primaryIds = ['python', 'numpy-pandas', 'data-visualization', 'math-statistics', 'machine-learning', 'fastapi', 'llm-fundamentals', 'applied-ai-core', 'portfolio-work', 'nlp', 'neural-networks', 'pytorch', 'transformer-attention', 'rag', 'mlops', 'generative-ai-specialization', 'voice-ai-specialization', 'full-time-preparation']
const supportIds = ['computer-networks', 'operating-systems', 'git-github', 'sql', 'dsa']
function tasksFor(id: string) {
  const subject = curriculum.subjects.find((item) => item.id === id)
  return subject ? getCurriculumTasks({ ...curriculum, subjects: [subject] }) : []
}
const primary = primaryIds.flatMap(tasksFor)
const support = supportIds.map(tasksFor)
const allPlanned = [...primary, ...support.flat()]
export const internshipTaskIds = ['python-task-06', 'numpy-pandas-task-03', 'machine-learning-task-03', 'git-github-task-03', 'sql-join-practice', 'computer-networks-task-03', 'operating-systems-task-03', 'dsa-arrays-practice', 'portfolio-work-task-06']

export const HolidayPlanService = {
  budgetFor(settings: HolidayPlanSettings, date: CalendarDate): StudyBudget {
    return settings.budgetsByDate[date] ?? settings.dailyMinutes
  },

  createPlan(settings: HolidayPlanSettings, progress: TaskProgressMap, events: ProgressEvent[] = [], asOf = getTodayDate()): DailySchedule[] {
    const projected = { ...progress }
    const start = settings.startDate > asOf ? settings.startDate : asOf
    const days: DailySchedule[] = []
    // A guard prevents a broken prerequisite graph from producing an infinite forecast.
    for (let index = 0; index < 1460; index += 1) {
      const date = addDays(start, index)
      const budget = this.budgetFor(settings, date)
      const spent = events.filter((event) => event.type === 'TASK_COMPLETED' && event.date === date).reduce((sum, event) => sum + Math.max(0, event.pointsDelta), 0)
      let remaining = Math.max(0, budget - spent)
      const selected: ScheduledTask[] = []
      const excluded = new Set(events.filter((event) => event.type === 'TASK_SKIPPED' && event.date === date).map((event) => event.taskId))
      const eligible = (task: typeof primary[number]) => projected[task.id] !== 'COMPLETED' && !excluded.has(task.id) && task.estimatedMinutes <= remaining && task.prerequisiteTaskIds.every((id) => projected[id] === 'COMPLETED')
      const add = (task: typeof primary[number]) => {
        const availableNow = task.prerequisiteTaskIds.every((id) => progress[id] === 'COMPLETED')
        selected.push({ ...task, status: 'Pending', progressStatus: availableNow ? 'IN_PROGRESS' : 'LOCKED', plannedDate: date, dueDate: date })
        remaining -= task.estimatedMinutes
        projected[task.id] = 'COMPLETED'
      }
      // Reserve a rotating supporting activity, while always giving Python/AI first choice.
      const rotationIndex = index % support.length
      const supportTask = support[rotationIndex].find(eligible)
      const primaryTask = primary.find(eligible)
      if (primaryTask) add(primaryTask)
      if (supportTask && eligible(supportTask)) add(supportTask)
      while (true) {
        const next = primary.find(eligible) ?? support[rotationIndex].find(eligible)
        if (!next) break
        add(next)
      }
      days.push({ date, tasks: selected, generated: true, availableMinutes: budget, calendarStatus: 'LEARNING_DAY' })
      if (allPlanned.every((task) => projected[task.id] === 'COMPLETED')) break
      if (selected.length === 0 && spent === 0 && support.flat().every((task) => !eligible(task)) && primary.every((task) => !eligible(task))) break
    }
    return days
  },

  createDay(settings: HolidayPlanSettings, index: number, progress: TaskProgressMap, events: ProgressEvent[] = []): DailySchedule {
    const date = addDays(settings.startDate, index)
    const day = this.createPlan(settings, progress, events).find((item) => item.date === date)
    return day ?? { date, tasks: [], generated: true, availableMinutes: this.budgetFor(settings, date), calendarStatus: 'LEARNING_DAY' }
  },

  indexOf(settings: HolidayPlanSettings, date: CalendarDate): number {
    const delta = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${settings.startDate}T00:00:00Z`)) / 86400000)
    return delta >= 0 && delta < 1460 ? delta : -1
  },
}
